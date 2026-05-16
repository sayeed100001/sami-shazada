import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { upgradeVipIfNeeded, type VipLevel } from '@/lib/vip'
import { unifiedNotificationService } from '@/lib/unified-notification-service'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { hasRequiredBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { getSarafOperationalState } from '@/lib/hawala-service'
import { assertNotBlacklisted, normalizeBlacklistValue } from '@/lib/blacklist-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { grantExchangeUsageReward } from '@/lib/user-reward-service'
import {
  calculateTransactionCharges,
  isSarafOnActiveFreeTrial,
  resolveSystemFeeWaiver,
} from '@/lib/transaction-pricing'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

async function createExchange(request: NextRequest) {
  let creditsRequired = 0
  let systemCommission = 0
  let sarafCommission = 0
  let totalCommission = 0
  let systemDiscountAmount = 0
  let waivedSystemCommission = 0
  let systemFeeWaiverReason: string | null = null

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const exchangeFeatureEnabled = await ConfigEnforcer.isFeatureEnabled('feature_exchange_enabled')
    if (!exchangeFeatureEnabled) {
      return NextResponse.json(
        { error: 'Currency exchange feature is currently disabled', details: 'FEATURE_DISABLED' },
        { status: 403 }
      )
    }

    const exchangeEnabledForUser = await ConfigEnforcer.isExchangeEnabledForUser(session.user.id)
    if (!exchangeEnabledForUser) {
      return NextResponse.json({ 
        error: 'Currency exchange feature is currently disabled',
        details: 'FEATURE_DISABLED'
      }, { status: 403 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ 
        error: 'Saraf access denied',
        details: 'ACCESS_CONTEXT_NULL'
      }, { status: 403 })
    }

    const operationalState = await getSarafOperationalState(accessContext.sarafId)
    if (!operationalState.saraf) {
      return NextResponse.json({ 
        error: 'Saraf not found or not approved',
        details: operationalState.error
      }, { status: 403 })
    }

    const saraf = operationalState.saraf

    if (isSarafOnActiveFreeTrial(saraf)) {
      const trialIncludesExchange = await ConfigEnforcer.isExchangeIncludedInFreeTrial()
      if (!trialIncludesExchange) {
        return NextResponse.json(
          {
            error: 'Currency exchange is not included in free trial',
            details: 'EXCHANGE_NOT_INCLUDED_IN_TRIAL',
          },
          { status: 403 }
        )
      }
    }

    if (!operationalState.isOperational) {
      return NextResponse.json({
        error: operationalState.error || 'Saraf is not operational',
        message: 'لطفاً یک پکیج اشتراک خریداری کنید',
        requiresSubscription: operationalState.requiresSubscription
      }, { status: operationalState.requiresSubscription ? 403 : 400 })
    }

    const feeWaiver = await resolveSystemFeeWaiver('EXCHANGE', saraf)

    const body = await request.json()
    
    const customerName = sanitizeInput(body.customerName)
    const customerPhone = sanitizeInput(body.customerPhone)
    const customerEmail = sanitizeInput(body.customerEmail)
    const rawCustomerId = body.customerId ? sanitizeInput(body.customerId) : null
    const fromCurrency = sanitizeInput(body.fromCurrency)
    const toCurrency = sanitizeInput(body.toCurrency)
    const fromAmount = validateNumericInput(body.fromAmount)
    const rate = validateNumericInput(body.rate)
    const branchId = sanitizeInput(body.branchId)
    const notes = sanitizeInput(body.notes)
    const isGuestTransaction = body.isGuestTransaction === true || !rawCustomerId
    const customerId = isGuestTransaction ? null : rawCustomerId

    let customerVipLevel: VipLevel | null = null
    let customerNormalizedEmail: string | null = null
    let customerNormalizedPhone: string | null = null
    let customerEligibleForReward = false

    if (customerId) {
      const customer = await prisma.user.findUnique({
        where: { id: customerId },
        select: { vipLevel: true, email: true, phone: true, role: true }
      })
      
      if (!customer) {
        return NextResponse.json({ error: 'Invalid customer' }, { status: 400 })
      }

      customerVipLevel = customer.vipLevel as VipLevel
      customerNormalizedEmail = customer.email
      customerNormalizedPhone = customer.phone || null
      customerEligibleForReward = customer.role === 'USER'
    }

    if (!customerName || !customerPhone || !fromCurrency || !toCurrency || !fromAmount || !rate) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Please fill all required fields'
      }, { status: 400 })
    }

    if (!branchId) {
      return NextResponse.json({ 
        error: 'Branch is required',
        details: 'MISSING_BRANCH'
      }, { status: 400 })
    }

    if (!hasRequiredBranchAccess(accessContext, branchId)) {
      return NextResponse.json(
        { error: 'You do not have access to create exchange from this branch' },
        { status: 403 }
      )
    }

    await assertNotBlacklisted({
      sarafId: saraf.id,
      candidates: [
        customerNormalizedPhone
          ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', customerNormalizedPhone) }
          : null,
        customerNormalizedEmail
          ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', customerNormalizedEmail) }
          : null,
        customerPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', customerPhone) } : null,
        customerEmail ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', customerEmail) } : null,
      ],
    })

    const amountValidation = await ConfigEnforcer.validateTransactionAmount(fromAmount)
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error || 'Invalid amount' }, { status: 400 })
    }

    const toAmount = fromAmount * rate
    const referenceCode = `EX-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    // Verify branch belongs to this saraf
    const branch = await prisma.sarafBranch.findFirst({
      where: {
        id: branchId,
        sarafId: saraf.id,
        isActive: true
      }
    })

    if (!branch) {
      return NextResponse.json({ 
        error: 'Invalid branch selection',
        details: 'INVALID_BRANCH'
      }, { status: 400 })
    }

    const trackingToken = isGuestTransaction
      ? `TRK-${crypto.randomBytes(16).toString('hex').toUpperCase()}`
      : null

    // Create transaction and deduct credits
    const result = await prisma.$transaction(async (tx) => {
      const configuredSystemFeePercent = await ConfigEnforcer.getExchangeSystemFeePercent()
      const pricing = await calculateTransactionCharges({
        type: 'EXCHANGE',
        amount: fromAmount,
        amountCurrency: fromCurrency,
        quotedRate: rate,
        quotedToCurrency: toCurrency,
        sarafFeePercent: saraf.exchangeFeePercent,
        vipLevel: customerVipLevel,
        fallbackSystemFeePercent: 0.5,
        overrideSystemFeePercent: configuredSystemFeePercent,
        waiveSystemFee: feeWaiver.waiveSystemFee,
        waiverReason: feeWaiver.waiverReason,
      })

      systemCommission = pricing.systemCommission
      sarafCommission = pricing.sarafCommission
      totalCommission = pricing.totalCommission
      creditsRequired = pricing.creditsRequired
      systemDiscountAmount = pricing.systemDiscountAmount
      waivedSystemCommission = pricing.waivedSystemCommission
      systemFeeWaiverReason = pricing.systemFeeWaiverReason

      // Deduct credits atomically
      const debit = await tx.saraf.updateMany({
        where: {
          id: saraf.id,
          creditBalance: { gte: creditsRequired }
        },
        data: {
          creditBalance: { decrement: creditsRequired }
        }
      })

      if (debit.count !== 1) {
        throw new Error('INSUFFICIENT_CREDITS')
      }

      const updatedSaraf = await tx.saraf.findUnique({
        where: { id: saraf.id },
        select: { creditBalance: true }
      })

      if (!updatedSaraf) {
        throw new Error('SARAF_NOT_FOUND')
      }

      // Create exchange transaction
      const transaction = await tx.transaction.create({
        data: {
          referenceCode,
          type: 'EXCHANGE',
          status: 'COMPLETED',
          senderId: customerId,
          sarafId: saraf.id,
          originBranchId: branchId,
          destinationBranchId: branchId,
          fromCurrency,
          toCurrency,
          fromAmount,
          toAmount,
          rate,
          systemCommission,
          sarafCommission,
          totalCommission,
          systemDiscountAmount,
          waivedSystemCommission,
          systemFeeWaiverReason,
          creditsDeducted: creditsRequired,
          senderName: customerName,
          senderPhone: customerPhone,
          receiverName: customerName,
          receiverPhone: customerPhone,
          receiverCity: branch.city,
          receiverCountry: branch.country,
          notes,
          isGuestTransaction,
          guestEmail: isGuestTransaction ? customerEmail : null,
          guestTrackingToken: trackingToken,
          completedAt: new Date()
        }
      })

      // Update user transaction count for VIP
      if (customerId) {
        await tx.user.update({
          where: { id: customerId },
          data: {
            totalTransactions: { increment: 1 }
          }
        })

        await upgradeVipIfNeeded(tx, customerId)
        if (customerEligibleForReward) {
          await grantExchangeUsageReward(tx, customerId)
        }
      }

      let guestTransactionId: string | null = null

      if (isGuestTransaction && trackingToken) {
        const guest = await tx.guestTransaction.create({
          data: {
            transactionId: transaction.id,
            senderName: customerName,
            senderPhone: customerPhone,
            senderEmail: customerEmail || null,
            receiverName: customerName,
            receiverPhone: customerPhone,
            trackingToken
          }
        })
        guestTransactionId = guest.id
      }

      // Record credit transaction
      await tx.creditTransaction.create({
        data: {
          sarafId: saraf.id,
          type: 'USAGE',
          amount: -creditsRequired,
          balance: updatedSaraf.creditBalance,
          description: `تبادله ارز ${referenceCode} - کمیسیون سیستم`,
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: new Date()
        }
      })

      return { transaction, trackingToken, guestTransactionId }
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXCHANGE_CREATED',
        resource: 'TRANSACTION',
        resourceId: result.transaction.id,
        details: JSON.stringify({
          referenceCode,
          fromAmount,
          fromCurrency,
          toCurrency,
          creditsDeducted: creditsRequired,
          systemCommission,
          sarafCommission,
          totalCommission,
          systemDiscountAmount,
          waivedSystemCommission,
          systemFeeWaiverReason,
          branchId,
          isGuestTransaction
        })
      }
    })

    clearAdminStatsCache()

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        referenceCode: result.transaction.referenceCode,
        status: result.transaction.status,
        fromAmount: result.transaction.fromAmount,
        toAmount: result.transaction.toAmount,
        fromCurrency,
        toCurrency,
        rate,
        systemCommission,
        sarafCommission,
        totalCommission,
        systemDiscountAmount,
        waivedSystemCommission,
        systemFeeWaiverReason,
        creditsDeducted: creditsRequired,
        createdAt: result.transaction.createdAt,
        trackingToken: result.trackingToken,
        isGuestTransaction
      },
      message: 'تبادله ارز با موفقیت ثبت شد'
    })

  } catch (error: any) {
    console.error('Exchange creation error:', error)

    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return NextResponse.json(
        { error: 'Transaction blocked because customer is blacklisted' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditsRequired },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'FX_RATE_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'FX rate unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const POST = withRateLimit(createExchange, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 50,
  message: 'Too many exchange requests. Please slow down.',
})
