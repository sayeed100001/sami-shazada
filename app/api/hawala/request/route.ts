import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { ApiResponse } from '@/lib/api-response'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { getSarafOperationalState, resolveHawalaRate } from '@/lib/hawala-service'
import { assertNotBlacklisted, normalizeBlacklistValue } from '@/lib/blacklist-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { unifiedNotificationService } from '@/lib/unified-notification-service'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

function buildIdentityNotes(senderTazkiraNumber?: string | null, receiverTazkiraNumber?: string | null) {
  const lines = [
    senderTazkiraNumber ? `sender-tazkira:${senderTazkiraNumber}` : null,
    receiverTazkiraNumber ? `receiver-tazkira:${receiverTazkiraNumber}` : null,
  ].filter((value): value is string => Boolean(value))

  return lines.length > 0 ? lines.join('\n') : null
}

async function createHawalaRequest(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required to create a hawala request')
    }

    const body = await request.json()

    const receiverName = sanitizeInput(body.receiverName)
    const receiverPhone = sanitizeInput(body.receiverPhone)
    const receiverCity = sanitizeInput(body.receiverCity)
    const receiverCountry = sanitizeInput(body.receiverCountry) || 'Afghanistan'
    const senderTazkiraNumber = sanitizeInput(body.senderTazkiraNumber)
    const receiverTazkiraNumber = sanitizeInput(body.receiverTazkiraNumber)
    const senderCity = sanitizeInput(body.senderCity) // Get from user input
    const senderCountry = sanitizeInput(body.senderCountry) || 'Afghanistan'
    const fromCurrency = sanitizeInput(body.fromCurrency) || 'AFN'
    const toCurrency = sanitizeInput(body.toCurrency) || 'USD'
    const fromAmount = validateNumericInput(body.fromAmount)
    const notes = sanitizeInput(body.notes)
    const sarafId = sanitizeInput(body.sarafId)

    if (!receiverName || !receiverPhone || !fromAmount || !receiverCity || !sarafId) {
      return ApiResponse.error('Please fill all required fields', 400, 'VALIDATION_ERROR')
    }

    const amountValidation = await ConfigEnforcer.validateTransactionAmount(fromAmount)
    if (!amountValidation.valid) {
      return ApiResponse.error(amountValidation.error || 'Invalid amount', 400, 'INVALID_AMOUNT')
    }

    const operationalState = await getSarafOperationalState(sarafId)
    if (!operationalState.saraf) {
      return ApiResponse.error('Selected saraf is not available', 400, 'SARAF_NOT_AVAILABLE')
    }

    if (!operationalState.isOperational) {
      return ApiResponse.error(
        operationalState.error || 'Selected saraf is not operational',
        operationalState.requiresSubscription ? 403 : 400,
        operationalState.requiresSubscription ? 'SUBSCRIPTION_REQUIRED' : 'SARAF_NOT_AVAILABLE'
      )
    }

    const saraf = operationalState.saraf
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, phone: true, email: true },
    })

    await assertNotBlacklisted({
      sarafId: saraf.id,
      candidates: [
        user?.phone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', user.phone) } : null,
        user?.email ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', user.email) } : null,
        receiverPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', receiverPhone) } : null,
      ],
    })

    const rate = await resolveHawalaRate(saraf.id, fromCurrency, toCurrency)
    if (!rate || rate <= 0) {
      return ApiResponse.error('Rate unavailable for selected saraf', 503, 'RATE_UNAVAILABLE')
    }

    const toAmount = fromAmount * rate
    const referenceCode = `REQ-${crypto.randomBytes(10).toString('hex').toUpperCase()}`

    const transaction = await prisma.transaction.create({
      data: {
        referenceCode,
        type: 'HAWALA_REQUEST',
        status: 'PENDING',
        senderId: session.user.id,
        sarafId: saraf.id,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        rate,
        systemCommission: 0,
        sarafCommission: 0,
        totalCommission: 0,
        creditsDeducted: 0,
        senderName: user?.name || 'User',
        senderPhone: user?.phone || '',
        senderCity: senderCity || null,
        senderCountry,
        receiverName,
        receiverPhone,
        receiverCity,
        receiverCountry,
        notes: notes || 'Customer hawala request awaiting saraf approval',
        internalNotes: buildIdentityNotes(senderTazkiraNumber, receiverTazkiraNumber),
      },
    })

    const notificationsEnabled = await ConfigEnforcer.areNotificationsEnabled()
    if (notificationsEnabled) {
      await unifiedNotificationService.sendDatabaseNotification({
        userId: session.user.id,
        title: 'Hawala request created',
        message: `Request ${referenceCode} was created successfully for ${saraf.businessName}.`,
        type: 'transaction',
        action: 'HAWALA_REQUEST_CREATED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
      })

      await unifiedNotificationService.sendDatabaseNotification({
        userId: saraf.userId,
        title: 'New hawala request',
        message: `New hawala request ${referenceCode} from ${user?.name || 'User'} for ${fromAmount} ${fromCurrency}.`,
        type: 'transaction',
        action: 'HAWALA_REQUEST_RECEIVED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_REQUEST_CREATED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
        details: JSON.stringify({
          referenceCode,
          fromAmount,
          fromCurrency,
          toCurrency,
          sarafId,
          sarafName: saraf.businessName,
          rate,
        }),
      },
    })

    clearAdminStatsCache()

    return ApiResponse.ok({
      referenceCode: transaction.referenceCode,
      message: 'Hawala request created successfully. Please visit the selected saraf to continue.',
      transaction: {
        id: transaction.id,
        referenceCode: transaction.referenceCode,
        status: transaction.status,
        fromAmount: transaction.fromAmount,
        toAmount: transaction.toAmount,
        fromCurrency: transaction.fromCurrency,
        toCurrency: transaction.toCurrency,
        rate: transaction.rate,
        createdAt: transaction.createdAt,
        saraf: {
          businessName: saraf.businessName,
          businessPhone: saraf.businessPhone,
          businessAddress: saraf.businessAddress,
        },
      },
    })
  } catch (error) {
    console.error('Hawala request creation error:', error)
    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return ApiResponse.error(
        'This request cannot be created because one of the parties is blacklisted for the selected saraf.',
        403,
        'BLACKLISTED'
      )
    }
    if (
      error instanceof Error &&
      (error.message.includes('Invalid phone number') || error.message.includes('Invalid email'))
    ) {
      return ApiResponse.error(error.message, 400, 'VALIDATION_ERROR')
    }
    return ApiResponse.error('Failed to create hawala request', 500, 'INTERNAL_ERROR')
  }
}

export const POST = withRateLimit(createHawalaRequest, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  message: 'Too many hawala requests. Please try again later.',
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Unauthorized')
    }

    const requests = await prisma.transaction.findMany({
      where: {
        senderId: session.user.id,
        type: 'HAWALA_REQUEST',
      },
      include: {
        saraf: {
          select: {
            businessName: true,
            businessPhone: true,
            businessAddress: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    return ApiResponse.ok({
      requests: requests.map((req) => ({
        id: req.id,
        referenceCode: req.referenceCode,
        status: req.status,
        fromAmount: req.fromAmount,
        toAmount: req.toAmount,
        fromCurrency: req.fromCurrency,
        toCurrency: req.toCurrency,
        receiverName: req.receiverName,
        receiverCity: req.receiverCity,
        createdAt: req.createdAt,
        saraf: req.saraf,
      })),
    })
  } catch (error) {
    console.error('Hawala requests fetch error:', error)
    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}
