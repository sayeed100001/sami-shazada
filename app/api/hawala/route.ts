import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  calculateHawalaCharges,
  getSarafOperationalState,
  resolveHawalaRate,
} from '@/lib/hawala-service'
import type { VipLevel } from '@/lib/vip'
import { reserveBestTransferReward } from '@/lib/user-reward-service'
import { assertNotBlacklisted, normalizeBlacklistValue } from '@/lib/blacklist-service'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
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

async function createHawala(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent credit-drain abuse: end-users must use the HAWALA_REQUEST flow.
    // Direct hawala creation is restricted to portal/admin roles.
    if (session.user.role === 'USER') {
      return NextResponse.json(
        { error: 'Please create a hawala request instead of a direct hawala.' },
        { status: 403 }
      )
    }

    const hawalaEnabled = await ConfigEnforcer.isFeatureEnabled('feature_hawala_enabled')
    if (!hawalaEnabled) {
      return NextResponse.json({ error: 'Hawala feature is disabled', details: 'FEATURE_DISABLED' }, { status: 403 })
    }

    const body = await request.json()

    const senderName = sanitizeInput(body.senderName)
    const senderPhone = sanitizeInput(body.senderPhone)
    const senderTazkiraNumber = sanitizeInput(body.senderTazkiraNumber)
    const senderCity = sanitizeInput(body.senderCity) || 'Kabul'
    const receiverName = sanitizeInput(body.receiverName)
    const receiverPhone = sanitizeInput(body.receiverPhone)
    const receiverTazkiraNumber = sanitizeInput(body.receiverTazkiraNumber)
    const receiverCity = sanitizeInput(body.receiverCity)
    const receiverCountry = sanitizeInput(body.receiverCountry) || 'Afghanistan'
    const fromCurrency = sanitizeInput(body.fromCurrency) || 'USD'
    const toCurrency = sanitizeInput(body.toCurrency) || 'AFN'
    const fromAmount = validateNumericInput(body.fromAmount)
    const requestedRate = validateNumericInput(body.rate)
    const notes = sanitizeInput(body.notes)
    const sarafId = sanitizeInput(body.sarafId)
    const originBranchIdInput = body.originBranchId ? sanitizeInput(body.originBranchId) : null
    const destinationBranchIdInput = body.destinationBranchId
      ? sanitizeInput(body.destinationBranchId)
      : null

    if (
      !senderName ||
      !senderPhone ||
      !receiverName ||
      !receiverPhone ||
      !fromAmount ||
      !receiverCity ||
      !sarafId
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const amountValidation = await ConfigEnforcer.validateTransactionAmount(fromAmount)
    if (!amountValidation.valid) {
      return NextResponse.json(
        { error: amountValidation.error || 'Invalid amount' },
        { status: 400 }
      )
    }

    const operationalState = await getSarafOperationalState(sarafId)
    if (!operationalState.saraf) {
      return NextResponse.json({ error: 'Selected saraf is not available' }, { status: 400 })
    }

    if (!operationalState.isOperational) {
      return NextResponse.json(
        {
          error: operationalState.error || 'Selected saraf is not operational',
          requiresSubscription: operationalState.requiresSubscription,
        },
        { status: operationalState.requiresSubscription ? 403 : 400 }
      )
    }

    const saraf = operationalState.saraf
    const feeWaiver = await resolveSystemFeeWaiver('HAWALA', saraf)
    const sender = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { vipLevel: true, email: true, phone: true },
    })
    const senderVipLevel = (sender?.vipLevel || 'NONE') as VipLevel

    await assertNotBlacklisted({
      sarafId: saraf.id,
      candidates: [
        sender?.phone
          ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', sender.phone) }
          : null,
        sender?.email
          ? { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', sender.email) }
          : null,
        senderPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', senderPhone) } : null,
        receiverPhone
          ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', receiverPhone) }
          : null,
      ],
    })

    const resolvedRate = await resolveHawalaRate(saraf.id, fromCurrency, toCurrency)

    if (!resolvedRate || resolvedRate <= 0) {
      return NextResponse.json(
        { error: 'Rate unavailable for selected saraf' },
        { status: 503 }
      )
    }

    if (requestedRate && requestedRate > 0) {
      // Prevent rate spoofing: only allow a small tolerance from the current saraf/server rate.
      const tolerance = 0.02 // 2%
      const delta = Math.abs(requestedRate - resolvedRate) / resolvedRate
      if (!Number.isFinite(delta) || delta > tolerance) {
        return NextResponse.json(
          { error: 'Rate mismatch. Please refresh and try again.' },
          { status: 400 }
        )
      }
    }

    const rate = resolvedRate

    const toAmount = fromAmount * rate
    const referenceCode = `HW-${crypto.randomBytes(8).toString('hex').toUpperCase()}`

    const activeBranches = await prisma.sarafBranch.findMany({
      where: { sarafId: saraf.id, isActive: true },
      select: { id: true, city: true, country: true },
      orderBy: { createdAt: 'asc' },
      take: 50,
    })

    if (activeBranches.length < 2) {
      return NextResponse.json(
        { error: 'Saraf must have at least two active branches for routed hawala' },
        { status: 400 }
      )
    }

    const branchIdSet = new Set(activeBranches.map((branch) => branch.id))
    const destinationBranch =
      (destinationBranchIdInput && branchIdSet.has(destinationBranchIdInput)
        ? activeBranches.find((branch) => branch.id === destinationBranchIdInput)
        : null) ||
      activeBranches.find(
        (branch) =>
          branch.city.toLowerCase() === receiverCity.toLowerCase() &&
          branch.country.toLowerCase() === receiverCountry.toLowerCase()
      ) ||
      activeBranches.find((branch) => branch.city.toLowerCase() === receiverCity.toLowerCase())

    if (!destinationBranch) {
      return NextResponse.json(
        { error: 'No active destination branch matches the receiver city' },
        { status: 400 }
      )
    }

    const originBranch =
      (originBranchIdInput && branchIdSet.has(originBranchIdInput)
        ? activeBranches.find((branch) => branch.id === originBranchIdInput)
        : null) || activeBranches.find((branch) => branch.id !== destinationBranch.id)

    if (!originBranch || originBranch.id === destinationBranch.id) {
      return NextResponse.json(
        { error: 'Origin and destination branches must be different' },
        { status: 400 }
      )
    }

    const originBranchId = originBranch.id
    const destinationBranchId = destinationBranch.id

    const transaction = await prisma.$transaction(async (tx) => {
      const reservedReward = feeWaiver.waiveSystemFee
        ? null
        : await reserveBestTransferReward(tx, session.user.id)
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

      const creditUpdate = await tx.saraf.updateMany({
        where: { id: saraf.id, creditBalance: { gte: pricing.creditsRequired } },
        data: { creditBalance: { decrement: pricing.creditsRequired } },
      })

      if (creditUpdate.count !== 1) {
        throw new Error('INSUFFICIENT_CREDITS')
      }

      const created = await tx.transaction.create({
        data: {
          referenceCode,
          type: 'HAWALA',
          status: 'PENDING',
          senderId: session.user.id,
          sarafId: saraf.id,
          originBranchId,
          destinationBranchId,
          fromCurrency,
          toCurrency,
          fromAmount,
          toAmount,
          rate,
          systemCommission: pricing.systemCommission,
          sarafCommission: pricing.sarafCommission,
          totalCommission: pricing.totalCommission,
          systemDiscountAmount: pricing.systemDiscountAmount,
          waivedSystemCommission: pricing.waivedSystemCommission,
          systemFeeWaiverReason: pricing.systemFeeWaiverReason,
          appliedRewardId: reservedReward?.rewardId || null,
          creditsDeducted: pricing.creditsRequired,
          senderName,
          senderPhone,
          senderCity,
          senderCountry: 'Afghanistan',
          receiverName,
          receiverPhone,
          receiverCity,
          receiverCountry,
          notes,
          internalNotes: buildIdentityNotes(senderTazkiraNumber, receiverTazkiraNumber),
        },
      })

      const updatedSaraf = await tx.saraf.findUnique({
        where: { id: saraf.id },
        select: { creditBalance: true },
      })

      await tx.creditTransaction.create({
        data: {
          sarafId: saraf.id,
          type: 'USAGE',
          amount: -pricing.creditsRequired,
          balance: updatedSaraf?.creditBalance ?? 0,
          description: `Hawala ${referenceCode} - System commission`,
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      })

      return created
    }).catch((error) => {
      if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
        return null
      }
      throw error
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
    }

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'New hawala created',
        message: `Hawala ${referenceCode} created for ${fromAmount} ${fromCurrency}`,
        type: 'transaction',
        action: 'HAWALA_CREATED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_CREATED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
        details: JSON.stringify({
          referenceCode,
          fromAmount,
          fromCurrency,
          toCurrency,
          sarafId,
          rate,
        }),
      },
    })

    clearAdminStatsCache()

    return NextResponse.json({
      success: true,
      transaction: {
        id: transaction.id,
        referenceCode: transaction.referenceCode,
        status: transaction.status,
        fromAmount: transaction.fromAmount,
        toAmount: transaction.toAmount,
        fromCurrency: transaction.fromCurrency,
        toCurrency: transaction.toCurrency,
        createdAt: transaction.createdAt,
      },
    })
  } catch (error) {
    console.error('Hawala creation error:', error)

    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return NextResponse.json(
        { error: 'Transaction blocked because one of the parties is blacklisted for this saraf.' },
        { status: 403 }
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

export const POST = withRateLimit(createHawala, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 15,
  message: 'Too many hawala creation attempts. Please try again later.',
})

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const referenceCode = sanitizeInput(searchParams.get('tracking'))

    if (referenceCode) {
      const transaction = await prisma.transaction.findFirst({
        where: {
          referenceCode,
          type: { in: ['HAWALA', 'HAWALA_REQUEST'] },
        },
        include: {
          saraf: {
            select: {
              businessName: true,
              businessPhone: true,
            },
          },
        },
      })

      if (!transaction) {
        return NextResponse.json({ error: 'Hawala not found' }, { status: 404 })
      }

      const role = session.user.role
      const isAdmin = role === 'ADMIN'
      const isSender = role === 'USER' && transaction.senderId === session.user.id
      const isSarafOwner =
        role === 'SARAF' &&
        !!session.user.sarafId &&
        transaction.sarafId === session.user.sarafId

      let isBranchStaff = false
      if (
        !isAdmin &&
        !isSender &&
        !isSarafOwner &&
        (role === 'BRANCH_MANAGER' || role === 'BRANCH_STAFF')
      ) {
        const branchIds = [transaction.originBranchId, transaction.destinationBranchId].filter(
          Boolean
        ) as string[]
        if (branchIds.length > 0) {
          const [staffCount, managedCount] = await Promise.all([
            prisma.branchStaff.count({
              where: { userId: session.user.id, isActive: true, branchId: { in: branchIds } },
            }),
            prisma.sarafBranch.count({
              where: { id: { in: branchIds }, managerId: session.user.id, isActive: true },
            }),
          ])
          isBranchStaff = staffCount > 0 || managedCount > 0
        }
      }

      if (!isAdmin && !isSender && !isSarafOwner && !isBranchStaff) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      return NextResponse.json({
        id: transaction.id,
        referenceCode: transaction.referenceCode,
        type: transaction.type,
        status: transaction.status,
        fromAmount: transaction.fromAmount,
        toAmount: transaction.toAmount,
        fromCurrency: transaction.fromCurrency,
        toCurrency: transaction.toCurrency,
        rate: transaction.rate,
        fee: transaction.totalCommission || transaction.systemCommission || 0,
        senderName: transaction.senderName,
        senderPhone: transaction.senderPhone,
        senderCity: transaction.senderCity,
        senderCountry: transaction.senderCountry,
        receiverName: transaction.receiverName,
        receiverPhone: transaction.receiverPhone,
        receiverCity: transaction.receiverCity,
        receiverCountry: transaction.receiverCountry,
        notes: transaction.notes,
        createdAt: transaction.createdAt,
        updatedAt: transaction.updatedAt,
        completedAt: transaction.completedAt,
        saraf: transaction.saraf,
      })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        senderId: session.user.id,
        type: 'HAWALA',
      },
      include: {
        saraf: {
          select: {
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })

    const formattedTransactions = transactions.map((transaction) => ({
      id: transaction.id,
      referenceCode: transaction.referenceCode,
      status: transaction.status,
      fromAmount: transaction.fromAmount,
      toAmount: transaction.toAmount,
      fromCurrency: transaction.fromCurrency,
      toCurrency: transaction.toCurrency,
      senderName: transaction.senderName,
      receiverName: transaction.receiverName,
      createdAt: transaction.createdAt,
      saraf: transaction.saraf,
    }))

    return NextResponse.json({
      transactions: formattedTransactions,
      total: formattedTransactions.length,
    })
  } catch (error) {
    console.error('Hawala fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
