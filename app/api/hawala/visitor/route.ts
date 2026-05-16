import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  maskPhoneForLog,
  sanitizeInput,
  validateNumericInput,
} from '@/lib/security'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  calculateHawalaCharges,
  getSarafOperationalState,
  resolveHawalaRate,
} from '@/lib/hawala-service'
import {
  assertNotBlacklisted,
  normalizeBlacklistValue,
} from '@/lib/blacklist-service'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { unifiedNotificationService } from '@/lib/unified-notification-service'
import { getRequestAppOrigin } from '@/lib/app-url'
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

async function handler(request: NextRequest) {
  try {
    const body = await request.json()

    const senderName = sanitizeInput(body.senderName)
    const senderPhone = sanitizeInput(body.senderPhone)
    const senderEmail = sanitizeInput(body.senderEmail)
    const senderTazkiraNumber = sanitizeInput(body.senderTazkiraNumber)
    const senderCountry = sanitizeInput(body.senderCountry) || 'Afghanistan'
    const senderCity = sanitizeInput(body.senderCity)
    const receiverName = sanitizeInput(body.receiverName)
    const receiverPhone = sanitizeInput(body.receiverPhone)
    const receiverTazkiraNumber = sanitizeInput(body.receiverTazkiraNumber)
    const receiverCity = sanitizeInput(body.receiverCity)
    const receiverCountry = sanitizeInput(body.receiverCountry) || 'Afghanistan'
    const fromCurrency = sanitizeInput(body.fromCurrency) || 'AFN'
    const toCurrency = sanitizeInput(body.toCurrency) || 'USD'
    const fromAmount = validateNumericInput(body.fromAmount)
    const notes = sanitizeInput(body.notes)

    if (!senderName || !senderPhone || !receiverName || !receiverPhone || !fromAmount || !receiverCity) {
      return NextResponse.json({ error: 'Please fill all required fields' }, { status: 400 })
    }

    const amountValidation = await ConfigEnforcer.validateTransactionAmount(fromAmount)
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error || 'Invalid amount' },
        { status: 400 }
      )
    }

    let systemSaraf = await prisma.saraf.findFirst({
      where: {
        businessName: 'System Hawala',
        status: 'APPROVED',
        isActive: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    if (!systemSaraf) {
      systemSaraf = await prisma.saraf.findFirst({
        where: {
          status: 'APPROVED',
          isActive: true,
        },
        orderBy: { createdAt: 'asc' },
      })
    }

    if (!systemSaraf) {
      return NextResponse.json(
        { error: 'No operational saraf is available right now' },
        { status: 503 }
      )
    }

    const operationalState = await getSarafOperationalState(systemSaraf.id)
    if (!operationalState.saraf || !operationalState.isOperational) {
      return NextResponse.json(
        { error: operationalState.error || 'No operational saraf is available right now' },
        { status: operationalState.requiresSubscription ? 403 : 503 }
      )
    }

    const saraf = operationalState.saraf
    const feeWaiver = await resolveSystemFeeWaiver('HAWALA', saraf)

    await assertNotBlacklisted({
      sarafId: saraf.id,
      candidates: [
        { type: 'PHONE', value: normalizeBlacklistValue('PHONE', senderPhone) },
        { type: 'PHONE', value: normalizeBlacklistValue('PHONE', receiverPhone) },
      ],
    })

    const rate = await resolveHawalaRate(saraf.id, fromCurrency, toCurrency)
    if (!rate || rate <= 0) {
      return NextResponse.json(
        { error: 'Rate unavailable for visitor hawala' },
        { status: 503 }
      )
    }

    const toAmount = fromAmount * rate
    const referenceCode = `HW-${crypto.randomBytes(10).toString('hex').toUpperCase()}`
    const trackingToken = `TRK-${crypto.randomBytes(16).toString('hex').toUpperCase()}`
    const pricing = await calculateHawalaCharges(fromAmount, null, 0, {
      amountCurrency: fromCurrency,
      quotedRate: rate,
      quotedToCurrency: toCurrency,
      sarafFeePercent: saraf.hawalaFeePercent,
      waiveSystemFee: feeWaiver.waiveSystemFee,
      waiverReason: feeWaiver.waiverReason,
    })

    const branches = await prisma.sarafBranch.findMany({
      where: { sarafId: saraf.id, isActive: true },
      select: { id: true, name: true, city: true, country: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    if (branches.length < 2) {
      return NextResponse.json(
        { error: 'At least two active branches are required to process visitor hawala' },
        { status: 503 }
      )
    }

    const destinationBranch =
      branches.find(
        (branch) =>
          branch.city.toLowerCase() === receiverCity.toLowerCase() &&
          branch.country.toLowerCase() === receiverCountry.toLowerCase()
      ) || branches.find((branch) => branch.city.toLowerCase() === receiverCity.toLowerCase())

    if (!destinationBranch) {
      return NextResponse.json(
        { error: 'No destination branch is available for the selected city/country' },
        { status: 400 }
      )
    }

    const originBranch = branches.find((branch) => branch.id !== destinationBranch.id)

    if (!originBranch) {
      return NextResponse.json(
        { error: 'Origin and destination branches must be different' },
        { status: 400 }
      )
    }

    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.transaction.create({
        data: {
          referenceCode,
          type: 'HAWALA',
          status: 'PENDING',
          sarafId: saraf.id,
          originBranchId: originBranch.id,
          destinationBranchId: destinationBranch.id,
          isGuestTransaction: true,
          guestTrackingToken: trackingToken,
          fromCurrency,
          toCurrency,
          fromAmount,
          toAmount,
          rate,
          systemCommission: pricing.systemCommission,
          sarafCommission: pricing.sarafCommission,
          totalCommission: pricing.totalCommission,
          waivedSystemCommission: pricing.waivedSystemCommission,
          systemFeeWaiverReason: pricing.systemFeeWaiverReason,
          creditsDeducted: 0,
          systemDiscountAmount: pricing.systemDiscountAmount,
          senderName,
          senderPhone,
          senderCity: senderCity || null,
          senderCountry,
          receiverName,
          receiverPhone,
          receiverCity,
          receiverCountry,
          notes: notes || 'Visitor hawala request created without authentication',
          internalNotes: buildIdentityNotes(senderTazkiraNumber, receiverTazkiraNumber),
        },
      })

      const guestTransaction = await tx.guestTransaction.create({
        data: {
          transactionId: transaction.id,
          senderName,
          senderPhone,
          senderEmail: senderEmail || null,
          receiverName,
          receiverPhone,
          trackingToken,
        },
      })

      await tx.auditLog.create({
        data: {
          action: 'VISITOR_HAWALA_CREATED',
          resource: 'TRANSACTION',
          resourceId: transaction.id,
          details: JSON.stringify({
            referenceCode,
            fromAmount,
            fromCurrency,
            toCurrency,
            senderPhone: maskPhoneForLog(senderPhone),
            receiverPhone: maskPhoneForLog(receiverPhone),
            sarafId: saraf.id,
            originBranchId: originBranch.id,
            destinationBranchId: destinationBranch.id,
            rate,
            totalCommission: pricing.totalCommission,
            waivedSystemCommission: pricing.waivedSystemCommission,
            systemFeeWaiverReason: pricing.systemFeeWaiverReason,
          }),
        },
      })
      
      // Send SMS/Email with tracking link INSIDE transaction
      const baseUrl = getRequestAppOrigin(request)
      const trackingUrl = `${baseUrl}/track?token=${trackingToken}`
      const message = `حواله شما ثبت شد.\nکد: ${referenceCode}\nلینک پیگیری: ${trackingUrl}`

      // Queue notifications
      const smsPromise = unifiedNotificationService.sendNotification({
        type: 'SMS',
        recipient: senderPhone,
        message,
        transactionId: transaction.id,
        priority: 'HIGH',
      })

      const emailPromise = senderEmail
        ? unifiedNotificationService.sendNotification({
            type: 'EMAIL',
            recipient: senderEmail,
            subject: 'Hawala tracking link',
            message,
            transactionId: transaction.id,
            priority: 'HIGH',
          })
        : Promise.resolve({ success: false })

      const [smsResult, emailResult] = await Promise.all([smsPromise, emailPromise])
      
      // Mark as notification sent if at least one succeeded
      if (smsResult.success || emailResult.success) {
        await tx.guestTransaction.update({
          where: { id: guestTransaction.id },
          data: { notificationSent: true },
        })
      }

      return transaction
    })

    clearAdminStatsCache()

    return NextResponse.json({
      success: true,
      referenceCode: result.referenceCode,
      trackingToken,
      transaction: {
        id: result.id,
        referenceCode: result.referenceCode,
        status: result.status,
        fromAmount: result.fromAmount,
        toAmount: result.toAmount,
        fromCurrency: result.fromCurrency,
        toCurrency: result.toCurrency,
        rate: result.rate,
        fee: result.totalCommission,
        createdAt: result.createdAt,
      },
      routing: {
        originBranch: {
          id: originBranch.id,
          name: originBranch.name,
          city: originBranch.city,
          country: originBranch.country,
        },
        destinationBranch: {
          id: destinationBranch.id,
          name: destinationBranch.name,
          city: destinationBranch.city,
          country: destinationBranch.country,
        },
      },
    })
  } catch (error) {
    console.error('Visitor hawala creation error:', error)

    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return NextResponse.json(
        { error: 'This request cannot be created because one of the phone numbers is blacklisted.' },
        { status: 403 }
      )
    }

    if (error instanceof Error && error.message === 'FX_RATE_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'FX rate unavailable. Please try again later.' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to create hawala request' },
      { status: 500 }
    )
  }
}

export const POST = withRateLimit(handler, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: 'Too many visitor hawala requests. Please try again later.',
})
