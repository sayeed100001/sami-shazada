import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'
import { getSarafOperationalState } from '@/lib/hawala-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  calculateTransactionCharges,
  resolveSystemFeeWaiver,
  type ChargeableFeature,
} from '@/lib/transaction-pricing'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const typeParam = (searchParams.get('type') || 'HAWALA').toUpperCase()
    const type: ChargeableFeature = typeParam === 'EXCHANGE' ? 'EXCHANGE' : 'HAWALA'
    const amount = Number.parseFloat(searchParams.get('amount') || '0')
    const currency = (searchParams.get('currency') || 'USD').toUpperCase()
    const quotedToCurrency = searchParams.get('toCurrency')?.toUpperCase() || null
    const quotedRateRaw = Number.parseFloat(searchParams.get('rate') || '')
    const quotedRate = Number.isFinite(quotedRateRaw) && quotedRateRaw > 0 ? quotedRateRaw : null

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    const operationalState = await getSarafOperationalState(accessContext.sarafId)
    if (!operationalState.saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const saraf = operationalState.saraf
    const feeWaiver = await resolveSystemFeeWaiver(type, saraf)
    const exchangeOverridePercent =
      type === 'EXCHANGE' ? await ConfigEnforcer.getExchangeSystemFeePercent() : null

    const pricing = await calculateTransactionCharges({
      type,
      amount,
      amountCurrency: currency,
      quotedRate,
      quotedToCurrency,
      sarafFeePercent: type === 'EXCHANGE' ? saraf.exchangeFeePercent : saraf.hawalaFeePercent,
      fallbackSystemFeePercent: type === 'EXCHANGE' ? 0.5 : 0.8,
      overrideSystemFeePercent: exchangeOverridePercent,
      waiveSystemFee: feeWaiver.waiveSystemFee,
      waiverReason: feeWaiver.waiverReason,
    })

    const configuredFeePercent =
      type === 'EXCHANGE' ? saraf.exchangeFeePercent : saraf.hawalaFeePercent

    return NextResponse.json({
      type,
      amount,
      currency,
      quotedRate,
      quotedToCurrency,
      configuredFeePercent,
      systemFeeWaiverReason: pricing.systemFeeWaiverReason,
      waiveSystemFee: feeWaiver.waiveSystemFee,
      systemCommission: pricing.systemCommission,
      sarafCommission: pricing.sarafCommission,
      totalCommission: pricing.totalCommission,
      creditsRequired: pricing.creditsRequired,
      customerPays: Number((amount + pricing.totalCommission).toFixed(2)),
      receiverGets:
        quotedRate && quotedToCurrency ? Number((amount * quotedRate).toFixed(2)) : null,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'FX_RATE_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'FX rate unavailable. Please try again later.' },
        { status: 503 }
      )
    }
    console.error('Portal fee preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
