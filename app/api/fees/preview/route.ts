import { NextRequest, NextResponse } from 'next/server'
import { calculateCommission } from '@/lib/commission'
import { calculateCreditsRequiredForCommission } from '@/lib/credit-usage'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { ConfigService } from '@/lib/config-service'

export const dynamic = 'force-dynamic'

type FeeType = 'HAWALA' | 'EXCHANGE'

function parseAmounts(raw: string | null): number[] {
  if (!raw) return [1000, 5000, 10000]
  const parts = raw
    .split(',')
    .map((x) => Number.parseFloat(x.trim()))
    .filter((n) => Number.isFinite(n) && n > 0)
  return parts.length ? parts.slice(0, 10) : [1000, 5000, 10000]
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const typeParam = (searchParams.get('type') || 'HAWALA').toUpperCase() as FeeType
    const type: FeeType = typeParam === 'EXCHANGE' ? 'EXCHANGE' : 'HAWALA'
    const amounts = parseAmounts(searchParams.get('amounts'))
    const currency = (searchParams.get('currency') || 'USD').toUpperCase()
    const quotedToCurrency = searchParams.get('toCurrency')?.toUpperCase() || null
    const quotedRateRaw = Number.parseFloat(searchParams.get('rate') || '')
    const quotedRate = Number.isFinite(quotedRateRaw) && quotedRateRaw > 0 ? quotedRateRaw : null

    const enabledKey = type === 'HAWALA' ? 'feature_hawala_enabled' : 'feature_exchange_enabled'
    const featureEnabled = await ConfigEnforcer.isFeatureEnabled(enabledKey)

    const exchangeOverridePercent =
      type === 'EXCHANGE' ? await ConfigEnforcer.getExchangeSystemFeePercent() : null

    const fallbackRateKey = type === 'EXCHANGE' ? 'default_exchange_commission_rate' : 'default_hawala_commission_rate'
    const fallbackRateStr = await ConfigService.get(fallbackRateKey, type === 'EXCHANGE' ? '0.5' : '0.8')
    const fallbackRatePercent = Number.parseFloat(fallbackRateStr || '') || (type === 'EXCHANGE' ? 0.5 : 0.8)

    const rows = await Promise.all(
      amounts.map(async (amount) => {
        let commission = null as Awaited<ReturnType<typeof calculateCommission>>
        try {
          commission = await calculateCommission({
            type,
            amount,
            currency,
            quotedRate,
            quotedToCurrency,
          })
        } catch (err) {
          if (!(err instanceof Error && err.message === 'FX_RATE_UNAVAILABLE')) {
            throw err
          }
        }

        const commissionSystemPercent = commission
          ? (commission.systemCommission / amount) * 100
          : fallbackRatePercent

        const effectiveSystemPercent =
          type === 'EXCHANGE' && exchangeOverridePercent !== null
            ? exchangeOverridePercent
            : commissionSystemPercent

        const systemCommission = Number((amount * (effectiveSystemPercent / 100)).toFixed(2))

        let creditsRequired: number | null = null
        try {
          creditsRequired = commission
            ? commission.creditsRequired
            : await calculateCreditsRequiredForCommission({
                commissionAmount: systemCommission,
                commissionCurrency: currency,
                quotedRate,
                quotedToCurrency,
              })
        } catch (err) {
          if (err instanceof Error && err.message === 'FX_RATE_UNAVAILABLE') {
            creditsRequired = null
          } else {
            throw err
          }
        }

        return {
          amount,
          systemFeePercent: Number(effectiveSystemPercent.toFixed(4)),
          systemCommission,
          creditsRequired,
          source:
            type === 'EXCHANGE' && exchangeOverridePercent !== null
              ? 'exchange_system_fee_percent'
              : commission
                ? 'commission_settings'
                : 'fallback_default_rate',
        }
      })
    )

    return NextResponse.json({
      type,
      featureEnabled,
      rows,
      meta: {
        exchangeOverridePercent,
        currency,
      },
    })
  } catch (error) {
    console.error('Fee preview error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
