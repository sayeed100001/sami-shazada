import crypto from 'crypto'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { ApiResponse } from '@/lib/api-response'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { getSarafOperationalState, resolveHawalaRate } from '@/lib/hawala-service'
import { isSarafOnActiveFreeTrial } from '@/lib/transaction-pricing'
import { assertNotBlacklisted, normalizeBlacklistValue } from '@/lib/blacklist-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { unifiedNotificationService } from '@/lib/unified-notification-service'

export const dynamic = 'force-dynamic'

async function createExchangeRequest(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.unauthorized('Authentication required to create an exchange request')
    }

    const exchangeFeatureEnabled = await ConfigEnforcer.isFeatureEnabled('feature_exchange_enabled')
    if (!exchangeFeatureEnabled) {
      return ApiResponse.error('Currency exchange feature is currently disabled', 403, 'FEATURE_DISABLED')
    }

    const enabledForUser = await ConfigEnforcer.isExchangeEnabledForUser(session.user.id)
    if (!enabledForUser) {
      return ApiResponse.error('Currency exchange feature is currently disabled', 403, 'FEATURE_DISABLED')
    }

    const body = await request.json()
    const sarafId = sanitizeInput(body.sarafId)
    const branchId = sanitizeInput(body.branchId)
    const fromCurrency = sanitizeInput(body.fromCurrency) || 'AFN'
    const toCurrency = sanitizeInput(body.toCurrency) || 'USD'
    const fromAmount = validateNumericInput(body.fromAmount)
    const contactPhone = sanitizeInput(body.contactPhone)
    const notes = sanitizeInput(body.notes)

    if (!sarafId || !branchId || !fromAmount || !contactPhone) {
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

    if (isSarafOnActiveFreeTrial(operationalState.saraf)) {
      const trialIncludesExchange = await ConfigEnforcer.isExchangeIncludedInFreeTrial()
      if (!trialIncludesExchange) {
        return ApiResponse.error(
          'Currency exchange is not included in the selected saraf free trial',
          403,
          'EXCHANGE_NOT_INCLUDED_IN_TRIAL'
        )
      }
    }

    if (!operationalState.isOperational) {
      return ApiResponse.error(
        operationalState.error || 'Selected saraf is not operational',
        operationalState.requiresSubscription ? 403 : 400,
        operationalState.requiresSubscription ? 'SUBSCRIPTION_REQUIRED' : 'SARAF_NOT_AVAILABLE'
      )
    }

    const saraf = operationalState.saraf
    const branch = await prisma.sarafBranch.findFirst({
      where: {
        id: branchId,
        sarafId: saraf.id,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        address: true,
      },
    })

    if (!branch) {
      return ApiResponse.error('Selected branch is not available', 400, 'INVALID_BRANCH')
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true },
    })

    if (!user) {
      return ApiResponse.notFound('User not found')
    }

    await assertNotBlacklisted({
      sarafId: saraf.id,
      candidates: [
        user.phone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', user.phone) } : null,
        user.email ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', user.email) } : null,
        contactPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', contactPhone) } : null,
      ],
    })

    const rate = await resolveHawalaRate(saraf.id, fromCurrency, toCurrency)
    if (!rate || rate <= 0) {
      return ApiResponse.error('Rate unavailable for selected saraf', 503, 'RATE_UNAVAILABLE')
    }

    const toAmount = Number((fromAmount * rate).toFixed(2))
    const referenceCode = `EXR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    const transaction = await prisma.transaction.create({
      data: {
        referenceCode,
        type: 'EXCHANGE',
        status: 'PENDING',
        senderId: user.id,
        sarafId: saraf.id,
        originBranchId: branch.id,
        destinationBranchId: branch.id,
        fromCurrency,
        toCurrency,
        fromAmount,
        toAmount,
        rate,
        systemCommission: 0,
        sarafCommission: 0,
        totalCommission: 0,
        creditsDeducted: 0,
        senderName: user.name,
        senderPhone: contactPhone,
        receiverName: user.name,
        receiverPhone: contactPhone,
        receiverCity: branch.city,
        receiverCountry: branch.country,
        notes: notes || 'Customer exchange request awaiting saraf completion',
      },
    })

    const notificationsEnabled = await ConfigEnforcer.areNotificationsEnabled()
    if (notificationsEnabled) {
      await unifiedNotificationService.sendDatabaseNotification({
        userId: user.id,
        title: 'Exchange request created',
        message: `Request ${referenceCode} was created successfully for ${saraf.businessName}.`,
        type: 'transaction',
        action: 'EXCHANGE_REQUEST_CREATED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
      })

      await unifiedNotificationService.sendDatabaseNotification({
        userId: saraf.userId,
        title: 'New exchange request',
        message: `New exchange request ${referenceCode} from ${user.name} for ${fromAmount} ${fromCurrency}.`,
        type: 'transaction',
        action: 'EXCHANGE_REQUEST_RECEIVED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'EXCHANGE_REQUEST_CREATED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
        details: JSON.stringify({
          referenceCode,
          sarafId: saraf.id,
          sarafName: saraf.businessName,
          branchId: branch.id,
          branchName: branch.name,
          fromAmount,
          fromCurrency,
          toCurrency,
          rate,
        }),
      },
    })

    clearAdminStatsCache()

    return ApiResponse.ok({
      message: 'Exchange request created successfully. Please visit the selected branch to continue.',
      branch,
      saraf: {
        id: saraf.id,
        businessName: saraf.businessName,
        businessPhone: saraf.businessPhone,
        businessAddress: saraf.businessAddress,
      },
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
      },
    })
  } catch (error) {
    console.error('Exchange request creation error:', error)
    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return ApiResponse.error(
        'This request cannot be created because the selected customer details are blacklisted for this saraf.',
        403,
        'BLACKLISTED'
      )
    }

    return ApiResponse.error('Failed to create exchange request', 500, 'INTERNAL_ERROR')
  }
}

export const POST = withRateLimit(createExchangeRequest, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 12,
  message: 'Too many exchange requests. Please try again later.',
})
