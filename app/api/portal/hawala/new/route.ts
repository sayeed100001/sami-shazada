import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { upgradeVipIfNeeded, type VipLevel } from '@/lib/vip'
import { unifiedNotificationService } from '@/lib/unified-notification-service'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { hasRequiredBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { calculateHawalaCharges, getSarafOperationalState } from '@/lib/hawala-service'
import { getRequestAppOrigin } from '@/lib/app-url'
import { reserveBestTransferReward } from '@/lib/user-reward-service'
import { assertNotBlacklisted, normalizeBlacklistValue } from '@/lib/blacklist-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { resolveSystemFeeWaiver } from '@/lib/transaction-pricing'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function buildIdentityNotes(senderTazkiraNumber?: string | null, receiverTazkiraNumber?: string | null) {
  const lines = [
    senderTazkiraNumber ? `sender-tazkira:${senderTazkiraNumber}` : null,
    receiverTazkiraNumber ? `receiver-tazkira:${receiverTazkiraNumber}` : null,
  ].filter((value): value is string => Boolean(value))

  return lines.length > 0 ? lines.join('\n') : null
}

async function createPortalHawala(request: NextRequest) {
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

    const hawalaEnabled = await ConfigEnforcer.isFeatureEnabled('feature_hawala_enabled')
    if (!hawalaEnabled) {
      return NextResponse.json({ error: 'Hawala feature is disabled', details: 'FEATURE_DISABLED' }, { status: 403 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      console.error('[HAWALA_NEW] Access context not found:', {
        userId: session.user.id,
        role: session.user.role,
        sarafId: session.user.sarafId
      })
      return NextResponse.json({ 
        error: 'Saraf access denied. Please ensure your account is approved and active.',
        details: 'ACCESS_CONTEXT_NULL'
      }, { status: 403 })
    }

    const operationalState = await getSarafOperationalState(accessContext.sarafId)
    if (!operationalState.saraf) {
      console.error('[HAWALA_NEW] Saraf operational check failed:', {
        sarafId: accessContext.sarafId,
        error: operationalState.error
      })
      return NextResponse.json({ 
        error: 'Saraf not found or not approved',
        details: operationalState.error
      }, { status: 403 })
    }

    const saraf = operationalState.saraf
    const feeWaiver = await resolveSystemFeeWaiver('HAWALA', saraf)

    if (!operationalState.isOperational) {
      return NextResponse.json(
        {
        error: operationalState.error || 'Saraf is not operational',
        message: 'لطفاً یک پکیج اشتراک خریداری کنید',
        requiresSubscription: operationalState.requiresSubscription
      }, { status: operationalState.requiresSubscription ? 403 : 400 })
    }

    const body = await request.json()
    
    const senderName = sanitizeInput(body.senderName)
    const senderPhone = sanitizeInput(body.senderPhone)
    const senderEmail = sanitizeInput(body.senderEmail)
    const senderTazkiraNumber = sanitizeInput(body.senderTazkiraNumber)
    const rawSenderId = body.senderId ? sanitizeInput(body.senderId) : null
    const senderCity = sanitizeInput(body.senderCity)
    const senderCountry = sanitizeInput(body.senderCountry) || 'Afghanistan'
    const receiverName = sanitizeInput(body.receiverName)
    const receiverPhone = sanitizeInput(body.receiverPhone)
    const receiverTazkiraNumber = sanitizeInput(body.receiverTazkiraNumber)
    const receiverCity = sanitizeInput(body.receiverCity)
    const receiverCountry = sanitizeInput(body.receiverCountry) || 'Afghanistan'
    const fromCurrency = sanitizeInput(body.fromCurrency)
    const toCurrency = sanitizeInput(body.toCurrency)
    const fromAmount = validateNumericInput(body.fromAmount)
    const rate = validateNumericInput(body.rate)
    const originBranchId = sanitizeInput(body.originBranchId)
    const destinationBranchId = sanitizeInput(body.destinationBranchId)
    const notes = sanitizeInput(body.notes)
    const isGuestTransaction = body.isGuestTransaction === true || !rawSenderId
    const senderId = isGuestTransaction ? null : rawSenderId

    // Capture sender VIP level so pricing stays aligned with public/user flows
    let senderVipLevel: VipLevel | null = null
    let senderNormalizedEmail: string | null = null
    let senderNormalizedPhone: string | null = null
    if (senderId) {
      const sender = await prisma.user.findUnique({
        where: { id: senderId },
        select: { vipLevel: true, email: true, phone: true }
      })
      
      if (!sender) {
        return NextResponse.json({ error: 'Invalid sender' }, { status: 400 })
      }

      senderVipLevel = sender.vipLevel as VipLevel
      senderNormalizedEmail = sender.email
      senderNormalizedPhone = sender.phone || null
    }

    if (!senderName || !senderPhone || !receiverName || !receiverPhone || 
        !fromCurrency || !toCurrency || !fromAmount || !rate || !receiverCity) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        details: 'Please fill all required fields'
      }, { status: 400 })
    }

    if (!originBranchId || !destinationBranchId) {
      console.error('[HAWALA_NEW] Missing branch IDs:', { originBranchId, destinationBranchId })
      return NextResponse.json({ 
        error: 'Origin and destination branches are required',
        details: 'MISSING_BRANCHES'
      }, { status: 400 })
    }

    if (!hasRequiredBranchAccess(accessContext, originBranchId)) {
      return NextResponse.json(
        { error: 'You do not have access to create hawala from this branch' },
        { status: 403 }
      )
    }

    await assertNotBlacklisted({
      sarafId: saraf.id,
      candidates: [
        senderNormalizedPhone
          ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', senderNormalizedPhone) }
          : null,
        senderNormalizedEmail
          ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', senderNormalizedEmail) }
          : null,
        senderPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', senderPhone) } : null,
        senderEmail ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', senderEmail) } : null,
        receiverPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', receiverPhone) } : null,
      ],
    })

    // Validate transaction amount against system limits
    const amountValidation = await ConfigEnforcer.validateTransactionAmount(fromAmount)
    if (!amountValidation.valid) {
      return NextResponse.json({ error: amountValidation.error || 'Invalid amount' }, { status: 400 })
    }

    const toAmount = fromAmount * rate
    const referenceCode = `HW-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    // Verify origin branch belongs to origin saraf; destination branch may belong to another saraf (partnership).
    const [originBranch, destinationBranch] = await Promise.all([
      prisma.sarafBranch.findFirst({
        where: { id: originBranchId, sarafId: saraf.id, isActive: true },
        select: { id: true },
      }),
      prisma.sarafBranch.findFirst({
        where: { id: destinationBranchId, isActive: true },
        select: { id: true, sarafId: true },
      }),
    ])

    if (!originBranch) {
      return NextResponse.json(
        { error: 'Invalid origin branch selection.', details: 'INVALID_ORIGIN_BRANCH' },
        { status: 400 }
      )
    }

    if (!destinationBranch) {
      return NextResponse.json(
        { error: 'Invalid destination branch selection.', details: 'INVALID_DESTINATION_BRANCH' },
        { status: 400 }
      )
    }

    if (destinationBranch.id === originBranch.id) {
      return NextResponse.json(
        { error: 'Origin and destination branches must be different.', details: 'SAME_BRANCH' },
        { status: 400 }
      )
    }

    const destinationSaraf = await prisma.saraf.findUnique({
      where: { id: destinationBranch.sarafId },
      select: { id: true, status: true, isActive: true },
    })

    if (!destinationSaraf || destinationSaraf.status !== 'APPROVED' || !destinationSaraf.isActive) {
      return NextResponse.json(
        { error: 'Destination saraf is not available.', details: 'DESTINATION_SARAF_NOT_AVAILABLE' },
        { status: 400 }
      )
    }

    // Generate tracking token for guest transactions
    const trackingToken = isGuestTransaction
      ? `TRK-${crypto.randomBytes(16).toString('hex').toUpperCase()}`
      : null

    // Create transaction and deduct credits in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const reservedReward = feeWaiver.waiveSystemFee
        ? null
        : await reserveBestTransferReward(tx, senderId)
      const pricing = await calculateHawalaCharges(
        fromAmount,
        senderVipLevel,
        reservedReward?.discountRate || 0,
        {
          amountCurrency: fromCurrency,
          quotedRate: rate,
          quotedToCurrency: toCurrency,
          sarafFeePercent: saraf.hawalaFeePercent,
          waiveSystemFee: feeWaiver.waiveSystemFee,
          waiverReason: feeWaiver.waiverReason,
        }
      )

      systemCommission = pricing.systemCommission
      sarafCommission = pricing.sarafCommission
      totalCommission = pricing.totalCommission
      creditsRequired = pricing.creditsRequired
      systemDiscountAmount = pricing.systemDiscountAmount
      waivedSystemCommission = pricing.waivedSystemCommission
      systemFeeWaiverReason = pricing.systemFeeWaiverReason

      // Deduct credits atomically (prevents negative balance under concurrency)
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

      // Create hawala transaction
      const transaction = await tx.transaction.create({
        data: {
          referenceCode,
          type: 'HAWALA',
          status: 'PENDING',
          senderId,
          sarafId: saraf.id,
          originBranchId,
          destinationBranchId,
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
          appliedRewardId: reservedReward?.rewardId || null,
          creditsDeducted: creditsRequired,
          senderName,
          senderPhone,
          senderCity,
          senderCountry,
          receiverName,
          receiverPhone,
          receiverCity,
          receiverCountry,
          notes,
          internalNotes: buildIdentityNotes(senderTazkiraNumber, receiverTazkiraNumber),
          isGuestTransaction,
          guestEmail: isGuestTransaction ? senderEmail : null,
          guestTrackingToken: trackingToken
        }
      })

      // Update user transaction count for VIP level calculation
      if (senderId) {
        await tx.user.update({
          where: { id: senderId },
          data: {
            totalTransactions: { increment: 1 }
          }
        })

        await upgradeVipIfNeeded(tx, senderId)
      }

      let guestTransactionId: string | null = null

      // Create guest transaction record if needed
      if (isGuestTransaction && trackingToken) {
        const guest = await tx.guestTransaction.create({
          data: {
            transactionId: transaction.id,
            senderName,
            senderPhone,
            senderEmail: senderEmail || null,
            receiverName,
            receiverPhone,
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
          description: `حواله ${referenceCode} - کمیسیون سیستم`,
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: new Date()
        }
      })
      
      return { transaction, trackingToken, guestTransactionId }
    })

    // Send notification to destination branch staff (if notifications enabled)
    const notificationsEnabled = await ConfigEnforcer.areNotificationsEnabled()
    if (notificationsEnabled) {
      const destBranchStaff = await prisma.branchStaff.findMany({
        where: {
          branchId: destinationBranchId,
          isActive: true
        }
      })

      for (const staff of destBranchStaff) {
        await unifiedNotificationService.sendDatabaseNotification({
          userId: staff.userId,
          title: 'حواله جدید دریافتی',
          message: `حواله ${referenceCode} با مبلغ ${toAmount} ${toCurrency} دریافت شد`,
          type: 'success',
          action: 'HAWALA_RECEIVED',
          resource: 'TRANSACTION',
          resourceId: result.transaction.id
        })
      }
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_CREATED',
        resource: 'TRANSACTION',
        resourceId: result.transaction.id,
        details: JSON.stringify({
          referenceCode,
          fromAmount,
          creditsDeducted: creditsRequired,
          systemCommission,
          sarafCommission,
          totalCommission,
          systemDiscountAmount,
          waivedSystemCommission,
          systemFeeWaiverReason,
          originBranchId,
          destinationBranchId,
          isGuestTransaction
        })
      }
    })

    // Queue guest notifications OUTSIDE DB transaction to avoid side effects
    // causing transaction failures in production.
    if (isGuestTransaction && result.trackingToken && result.guestTransactionId) {
      try {
        const baseUrl = getRequestAppOrigin(request)
        const trackingUrl = `${baseUrl}/track?token=${result.trackingToken}`
        const message = `حواله شما ثبت شد.\nکد: ${referenceCode}\nلینک پیگیری: ${trackingUrl}`

        const smsPromise = unifiedNotificationService.sendNotification({
          type: 'SMS',
          recipient: senderPhone,
          message,
          transactionId: result.transaction.id,
          priority: 'HIGH',
        })

        const emailPromise = senderEmail
          ? unifiedNotificationService.sendNotification({
              type: 'EMAIL',
              recipient: senderEmail,
              subject: 'Hawala tracking link',
              message,
              transactionId: result.transaction.id,
              priority: 'HIGH',
            })
          : Promise.resolve({ success: false })

        const [smsResult, emailResult] = await Promise.all([smsPromise, emailPromise])
        if (smsResult.success || emailResult.success) {
          await prisma.guestTransaction.update({
            where: { id: result.guestTransactionId },
            data: { notificationSent: true },
          })
        }
      } catch (notificationError) {
        console.error('[HAWALA_NEW] Notification queue failed after transaction commit:', notificationError)
      }
    }

    clearAdminStatsCache()

    return NextResponse.json({
      success: true,
      transaction: {
        id: result.transaction.id,
        referenceCode: result.transaction.referenceCode,
        status: result.transaction.status,
        fromAmount: result.transaction.fromAmount,
        toAmount: result.transaction.toAmount,
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
      message: isGuestTransaction 
        ? 'حواله ثبت شد. لینک پیگیری به مشتری ارسال شد'
        : 'حواله با موفقیت ثبت شد'
    })

  } catch (error: any) {
    console.error('Hawala creation error:', error)

    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return NextResponse.json(
        { error: 'Transaction blocked because one of the parties is blacklisted for this saraf.' },
        { status: 403 }
      )
    }

    if (
      error instanceof Error &&
      (error.message.includes('Invalid phone number') || error.message.includes('Invalid email'))
    ) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
      return NextResponse.json(
        { error: 'Insufficient credits', required: creditsRequired },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.message === 'SARAF_NOT_FOUND') {
      return NextResponse.json(
        { error: 'Saraf not found while creating transaction' },
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

export const POST = withRateLimit(createPortalHawala, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many hawala creation attempts. Please slow down.',
})
