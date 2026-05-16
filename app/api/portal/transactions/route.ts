import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { isPortalRole } from '@/lib/portal-access'
import { hasTransactionBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'
import { grantExchangeUsageReward, releaseReservedTransferReward } from '@/lib/user-reward-service'
import {
  assertSarafTransactionCanBeCancelled,
  mapCancellationConstraintError,
} from '@/lib/transaction-cancellation'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { getSarafOperationalState } from '@/lib/hawala-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { calculateTransactionCharges, isSarafOnActiveFreeTrial, resolveSystemFeeWaiver } from '@/lib/transaction-pricing'
import { upgradeVipIfNeeded, type VipLevel } from '@/lib/vip'

export const dynamic = 'force-dynamic'

function getScopedTransactionFilters(accessContext: {
  sarafId: string
  accessMode: 'OWNER' | 'BRANCH'
  accessibleBranchIds: string[]
}) {
  const filters: any[] = [{ sarafId: accessContext.sarafId }]

  if (accessContext.accessMode === 'BRANCH') {
    filters.push({
      OR: [
        { originBranchId: { in: accessContext.accessibleBranchIds } },
        { destinationBranchId: { in: accessContext.accessibleBranchIds } },
      ],
    })
  }

  return filters
}

async function resolveApprovedPortalAccess(session: any) {
  if (!session?.user?.id || !isPortalRole(session.user.role)) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const accessContext = await resolvePortalAccessContext({
    userId: session.user.id,
    role: session.user.role,
    sarafId: session.user.sarafId,
  })

  if (!accessContext) {
    return { error: NextResponse.json({ error: 'Saraf access not found' }, { status: 404 }) }
  }

  const saraf = await prisma.saraf.findUnique({
    where: { id: accessContext.sarafId },
    select: { id: true, status: true },
  })

  if (!saraf || saraf.status !== 'APPROVED') {
    return { error: NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 }) }
  }

  return { accessContext, saraf }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const resolved = await resolveApprovedPortalAccess(session)
    if (resolved.error) {
      return resolved.error
    }

    const { accessContext } = resolved
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '10', 10)
    const status = searchParams.get('status')
    const search = sanitizeInput(searchParams.get('search') || '')

    const filters = getScopedTransactionFilters(accessContext)

    if (status && status !== 'ALL') {
      filters.push({ status })
    }

    if (search) {
      filters.push({
        OR: [
          { referenceCode: { contains: search } },
          { senderName: { contains: search } },
          { receiverName: { contains: search } },
        ],
      })
    }

    const where = filters.length === 1 ? filters[0] : { AND: filters }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        originBranch: { select: { id: true, name: true, city: true } },
        destinationBranch: { select: { id: true, name: true, city: true } },
      },
    })

    const total = await prisma.transaction.count({ where })

    return NextResponse.json({
      transactions: transactions.map((transaction) => ({
        ...transaction,
        fee: transaction.totalCommission || transaction.systemCommission || 0,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Transactions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const resolved = await resolveApprovedPortalAccess(session)
    if (resolved.error) {
      return resolved.error
    }

    const { accessContext, saraf } = resolved
    const body = await request.json()
    const transactionId = sanitizeInput(body.id)
    const statusInput = sanitizeInput(body.status)
    const allowedStatuses = ['PENDING', 'WITHDRAWN', 'COMPLETED', 'CANCELLED'] as const

    if (!transactionId || !statusInput) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!allowedStatuses.includes(statusInput as (typeof allowedStatuses)[number])) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const status = statusInput as (typeof allowedStatuses)[number]

    const existing = await prisma.transaction.findUnique({
      where: { id: transactionId },
    })

    if (!existing || existing.sarafId !== accessContext.sarafId) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (!hasTransactionBranchAccess(accessContext, existing.originBranchId, existing.destinationBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (existing.type === 'HAWALA_REQUEST') {
      return NextResponse.json(
        { error: 'Use the dedicated hawala request approval flow for request transactions' },
        { status: 400 }
      )
    }

    if (existing.type === 'HAWALA') {
      if (status === 'COMPLETED') {
        return NextResponse.json(
          { error: 'Use the destination-branch confirm-payment flow to complete a hawala payout.' },
          { status: 400 }
        )
      }

      if (status === 'WITHDRAWN') {
        return NextResponse.json(
          { error: 'Use the branch payout flow for hawala transactions.' },
          { status: 400 }
        )
      }

      if (status === 'CANCELLED' && accessContext.accessMode !== 'OWNER') {
        return NextResponse.json(
          { error: 'Only the saraf owner can cancel hawala transactions.' },
          { status: 403 }
        )
      }
    }

    if (existing.type === 'EXCHANGE' && status === 'WITHDRAWN') {
      return NextResponse.json(
        { error: 'Exchange requests cannot be moved to withdrawn. Complete or cancel the request instead.' },
        { status: 400 }
      )
    }

    const currentStatus = existing.status
    const nextStatus = status as typeof existing.status
    const allowedNext: Record<string, string[]> = {
      PENDING: ['PENDING', 'WITHDRAWN', 'COMPLETED', 'CANCELLED'],
      WITHDRAWN: ['WITHDRAWN', 'COMPLETED'],
      COMPLETED: ['COMPLETED'],
      CANCELLED: ['CANCELLED'],
    }

    if (!allowedNext[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${currentStatus} -> ${nextStatus}` },
        { status: 400 }
      )
    }

    if (existing.type === 'EXCHANGE' && status === 'COMPLETED' && existing.status === 'PENDING') {
      const operationalState = await getSarafOperationalState(saraf.id)
      if (!operationalState.saraf) {
        return NextResponse.json({ error: 'Saraf not found or not approved' }, { status: 403 })
      }
      const operationalSaraf = operationalState.saraf

      if (isSarafOnActiveFreeTrial(operationalSaraf)) {
        const trialIncludesExchange = await ConfigEnforcer.isExchangeIncludedInFreeTrial()
        if (!trialIncludesExchange) {
          return NextResponse.json(
            { error: 'Currency exchange is not included in free trial' },
            { status: 403 }
          )
        }
      }

      if (!operationalState.isOperational) {
        return NextResponse.json(
          {
            error: operationalState.error || 'Saraf is not operational',
            requiresSubscription: operationalState.requiresSubscription,
          },
          { status: operationalState.requiresSubscription ? 403 : 400 }
        )
      }

      const feeWaiver = await resolveSystemFeeWaiver('EXCHANGE', operationalState.saraf)
      const sender =
        existing.senderId
          ? await prisma.user.findUnique({
              where: { id: existing.senderId },
              select: { id: true, vipLevel: true, role: true },
            })
          : null

      let creditsRequired = 0
      let systemCommission = 0
      let sarafCommission = 0
      let totalCommission = 0
      let systemDiscountAmount = 0
      let waivedSystemCommission = 0
      let systemFeeWaiverReason: string | null = null

      const completedExchange = await prisma
        .$transaction(async (tx) => {
          const configuredSystemFeePercent = await ConfigEnforcer.getExchangeSystemFeePercent()
          const pricing = await calculateTransactionCharges({
            type: 'EXCHANGE',
            amount: existing.fromAmount,
            amountCurrency: existing.fromCurrency,
            quotedRate: existing.rate,
            quotedToCurrency: existing.toCurrency,
            sarafFeePercent: operationalSaraf.exchangeFeePercent,
            vipLevel: (sender?.vipLevel || 'NONE') as VipLevel,
            fallbackSystemFeePercent: 0.5,
            overrideSystemFeePercent: configuredSystemFeePercent,
            waiveSystemFee: feeWaiver.waiveSystemFee,
            waiverReason: feeWaiver.waiverReason,
          })

          creditsRequired = pricing.creditsRequired
          systemCommission = pricing.systemCommission
          sarafCommission = pricing.sarafCommission
          totalCommission = pricing.totalCommission
          systemDiscountAmount = pricing.systemDiscountAmount
          waivedSystemCommission = pricing.waivedSystemCommission
          systemFeeWaiverReason = pricing.systemFeeWaiverReason

          const debit = await tx.saraf.updateMany({
            where: {
              id: saraf.id,
              creditBalance: { gte: pricing.creditsRequired },
            },
            data: {
              creditBalance: { decrement: pricing.creditsRequired },
            },
          })

          if (debit.count !== 1) {
            throw new Error('INSUFFICIENT_CREDITS')
          }

          const toAmount = Number((existing.fromAmount * existing.rate).toFixed(2))

          const updatedMany = await tx.transaction.updateMany({
            where: {
              id: existing.id,
              sarafId: saraf.id,
              type: 'EXCHANGE',
              status: 'PENDING',
            },
            data: {
              status: 'COMPLETED',
              toAmount,
              systemCommission: pricing.systemCommission,
              sarafCommission: pricing.sarafCommission,
              totalCommission: pricing.totalCommission,
              systemDiscountAmount: pricing.systemDiscountAmount,
              waivedSystemCommission: pricing.waivedSystemCommission,
              systemFeeWaiverReason: pricing.systemFeeWaiverReason,
              creditsDeducted: pricing.creditsRequired,
              completedAt: new Date(),
              updatedAt: new Date(),
              notes: `${existing.notes || ''}\nExchange request completed by saraf.`.trim(),
            },
          })

          if (updatedMany.count !== 1) {
            throw new Error('REQUEST_ALREADY_PROCESSED')
          }

          if (sender?.id) {
            await tx.user.update({
              where: { id: sender.id },
              data: {
                totalTransactions: { increment: 1 },
              },
            })

            await upgradeVipIfNeeded(tx, sender.id)

            if (sender.role === 'USER') {
              await grantExchangeUsageReward(tx, sender.id)
            }

            await tx.notification.create({
              data: {
                userId: sender.id,
                title: 'Exchange request completed',
                message: `Exchange ${existing.referenceCode} was completed successfully.`,
                type: 'success',
                action: 'EXCHANGE_COMPLETED',
                resource: 'TRANSACTION',
                resourceId: existing.id,
              },
            })
          }

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
              description: `Exchange request ${existing.referenceCode} - System commission`,
              status: 'APPROVED',
              approvedBy: session!.user.id,
              approvedAt: new Date(),
            },
          })

          await tx.auditLog.create({
            data: {
              userId: session!.user.id,
              action: 'EXCHANGE_REQUEST_COMPLETED',
              resource: 'TRANSACTION',
              resourceId: existing.id,
              details: JSON.stringify({
                referenceCode: existing.referenceCode,
                creditsDeducted: pricing.creditsRequired,
                systemCommission: pricing.systemCommission,
                sarafCommission: pricing.sarafCommission,
                totalCommission: pricing.totalCommission,
                systemDiscountAmount: pricing.systemDiscountAmount,
                waivedSystemCommission: pricing.waivedSystemCommission,
                systemFeeWaiverReason: pricing.systemFeeWaiverReason,
              }),
            },
          })

          return tx.transaction.findUnique({
            where: { id: existing.id },
          })
        })
        .catch((error) => {
          if (error instanceof Error && (error.message === 'INSUFFICIENT_CREDITS' || error.message === 'REQUEST_ALREADY_PROCESSED')) {
            return error
          }
          throw error
        })

      if (completedExchange instanceof Error) {
        if (completedExchange.message === 'INSUFFICIENT_CREDITS') {
          return NextResponse.json(
            { error: 'Insufficient credits', required: creditsRequired },
            { status: 400 }
          )
        }

        return NextResponse.json(
          { error: 'Exchange request was already processed' },
          { status: 409 }
        )
      }

      if (!completedExchange) {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }

      clearAdminStatsCache()

      return NextResponse.json({
        ...completedExchange,
        creditsDeducted: creditsRequired,
        systemCommission,
        sarafCommission,
        totalCommission,
        systemDiscountAmount,
        waivedSystemCommission,
        systemFeeWaiverReason,
      })
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (status === 'CANCELLED' && existing.status === 'PENDING' && existing.creditsDeducted > 0) {
        await assertSarafTransactionCanBeCancelled(tx, {
          sarafId: saraf.id,
          createdAt: existing.createdAt,
          transactionId: existing.id,
        })

        const sarafAfterRefund = await tx.saraf.update({
          where: { id: saraf.id },
          data: { creditBalance: { increment: existing.creditsDeducted } },
          select: { creditBalance: true },
        })

        await tx.creditTransaction.create({
          data: {
            sarafId: saraf.id,
            type: 'REFUND',
            amount: existing.creditsDeducted,
            balance: sarafAfterRefund.creditBalance,
            description: `Credit refund for transaction ${existing.referenceCode}`,
            status: 'APPROVED',
            approvedBy: session!.user.id,
            approvedAt: new Date(),
          },
        })
      }

      if (status === 'CANCELLED') {
        await releaseReservedTransferReward(tx, existing.appliedRewardId)
      }

      return tx.transaction.update({
        where: { id: transactionId },
        data: {
          status,
          paidAt: status === 'WITHDRAWN' && existing.status !== 'WITHDRAWN' ? new Date() : existing.paidAt,
          paidBy: status === 'WITHDRAWN' && existing.status !== 'WITHDRAWN' ? session!.user.id : existing.paidBy,
          completedAt: status === 'COMPLETED' && existing.status !== 'COMPLETED' ? new Date() : existing.completedAt,
          updatedAt: new Date(),
        },
      })
    })

    if (existing.senderId) {
      await prisma.notification.create({
        data: {
          userId: existing.senderId,
          title: 'Transaction status updated',
          message: `Transaction ${updated.referenceCode} changed to ${status}.`,
          type: status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'error' : 'info',
          action: 'STATUS_CHANGED',
          resource: 'TRANSACTION',
          resourceId: updated.id,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session!.user.id,
        action: 'TRANSACTION_STATUS_UPDATED',
        resource: 'TRANSACTION',
        resourceId: updated.id,
        details: JSON.stringify({
          referenceCode: updated.referenceCode,
          newStatus: status,
        }),
      },
    })

    clearAdminStatsCache()

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Transaction update error:', error)
    const cancellationError = mapCancellationConstraintError(error)
    if (cancellationError) {
      return NextResponse.json({ error: cancellationError.error }, { status: cancellationError.status })
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
