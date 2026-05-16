import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { calculateHawalaCharges, getSarafOperationalState } from '@/lib/hawala-service'
import { upgradeVipIfNeeded, type VipLevel } from '@/lib/vip'
import { reserveBestTransferReward } from '@/lib/user-reward-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { resolveSystemFeeWaiver } from '@/lib/transaction-pricing'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return ApiResponse.unauthorized('Unauthorized')
    if (session.user.role !== 'SARAF') return ApiResponse.forbidden('Forbidden')

    const body = await request.json()
    const { requestId } = body

    if (!requestId) {
      return ApiResponse.error('Request ID required', 400, 'VALIDATION_ERROR')
    }

    const sarafId =
      session.user.sarafId ||
      (await prisma.saraf
        .findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
        .then((saraf) => saraf?.id))

    if (!sarafId) {
      return ApiResponse.notFound('Saraf not found')
    }

    const operationalState = await getSarafOperationalState(sarafId)
    if (!operationalState.saraf) {
      return ApiResponse.notFound('Saraf not found')
    }

    if (!operationalState.isOperational) {
      return ApiResponse.error(
        operationalState.error || 'Saraf is not operational',
        operationalState.requiresSubscription ? 403 : 400,
        operationalState.requiresSubscription ? 'SUBSCRIPTION_REQUIRED' : 'SARAF_NOT_AVAILABLE'
      )
    }

    const saraf = operationalState.saraf
    const feeWaiver = await resolveSystemFeeWaiver('HAWALA', saraf)
    const hawalaRequest = await prisma.transaction.findFirst({
      where: {
        id: requestId,
        sarafId: saraf.id,
        type: 'HAWALA_REQUEST',
        status: 'PENDING',
      },
    })

    if (!hawalaRequest) {
      return ApiResponse.notFound('Request not found or already processed')
    }

    const branches = await prisma.sarafBranch.findMany({
      where: { sarafId: saraf.id, isActive: true },
      select: { id: true, name: true, city: true, country: true },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })

    if (branches.length < 2) {
      return ApiResponse.error(
        'At least two active branches are required to route a hawala request between branches',
        400,
        'INSUFFICIENT_ACTIVE_BRANCHES'
      )
    }

    const destinationBranch =
      branches.find(
        (branch) =>
          branch.city.toLowerCase() === hawalaRequest.receiverCity.toLowerCase() &&
          branch.country.toLowerCase() === hawalaRequest.receiverCountry.toLowerCase()
      ) ||
      branches.find((branch) => branch.city.toLowerCase() === hawalaRequest.receiverCity.toLowerCase())

    if (!destinationBranch) {
      return ApiResponse.error(
        'No active destination branch matches the receiver city/country',
        400,
        'DESTINATION_BRANCH_NOT_FOUND'
      )
    }

    const originBranch =
      (hawalaRequest.originBranchId
        ? branches.find((branch) => branch.id === hawalaRequest.originBranchId)
        : null) || branches.find((branch) => branch.id !== destinationBranch.id)

    if (!originBranch || originBranch.id === destinationBranch.id) {
      return ApiResponse.error(
        'Origin and destination branches must be different for a routed hawala request',
        400,
        'INVALID_BRANCH_ROUTE'
      )
    }
    const sender =
      hawalaRequest.senderId
        ? await prisma.user.findUnique({
            where: { id: hawalaRequest.senderId },
            select: { vipLevel: true },
          })
        : null

    const senderVipLevel = (sender?.vipLevel || 'NONE') as VipLevel
    const now = new Date()
    const result = await prisma.$transaction(async (tx) => {
      const reservedReward = feeWaiver.waiveSystemFee
        ? null
        : await reserveBestTransferReward(tx, hawalaRequest.senderId)
      const pricing = await calculateHawalaCharges(
        hawalaRequest.fromAmount,
        senderVipLevel,
        reservedReward?.discountRate || 0,
        {
          amountCurrency: hawalaRequest.fromCurrency,
          quotedRate: hawalaRequest.rate,
          quotedToCurrency: hawalaRequest.toCurrency,
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

      const updatedMany = await tx.transaction.updateMany({
        where: {
          id: requestId,
          sarafId: saraf.id,
          type: 'HAWALA_REQUEST',
          status: 'PENDING',
        },
        data: {
          type: 'HAWALA',
          status: 'PENDING',
          completedAt: null,
          paidAt: null,
          paidBy: null,
          systemCommission: pricing.systemCommission,
          sarafCommission: pricing.sarafCommission,
          totalCommission: pricing.totalCommission,
          systemDiscountAmount: pricing.systemDiscountAmount,
          waivedSystemCommission: pricing.waivedSystemCommission,
          systemFeeWaiverReason: pricing.systemFeeWaiverReason,
          appliedRewardId: reservedReward?.rewardId || null,
          creditsDeducted: pricing.creditsRequired,
          originBranchId: hawalaRequest.originBranchId || originBranch.id,
          destinationBranchId: hawalaRequest.destinationBranchId || destinationBranch.id,
          notes: `${hawalaRequest.notes || ''}\nApproved by saraf and routed to destination branch ${destinationBranch.name}.`.trim(),
        },
      })

      if (updatedMany.count !== 1) {
        throw new Error('REQUEST_ALREADY_PROCESSED')
      }

      const updated = await tx.transaction.findUnique({ where: { id: requestId } })
      if (!updated) {
        throw new Error('REQUEST_ALREADY_PROCESSED')
      }

      if (hawalaRequest.senderId) {
        await tx.user.update({
          where: { id: hawalaRequest.senderId },
          data: {
            totalTransactions: { increment: 1 },
          },
        })

        await upgradeVipIfNeeded(tx, hawalaRequest.senderId)

        await tx.notification.create({
          data: {
            userId: hawalaRequest.senderId,
            title: 'Hawala request approved',
            message: `Request ${hawalaRequest.referenceCode} was approved and sent to ${destinationBranch.city}, ${destinationBranch.country} for payout.`,
            type: 'transaction',
            action: 'HAWALA_APPROVED',
            resource: 'TRANSACTION',
            resourceId: updated.id,
          },
        })
      }

      const destinationStaff = await tx.branchStaff.findMany({
        where: {
          branchId: destinationBranch.id,
          isActive: true,
        },
        select: { userId: true },
      })

      for (const staff of destinationStaff) {
        await tx.notification.create({
          data: {
            userId: staff.userId,
            title: 'New payout waiting',
            message: `Hawala ${hawalaRequest.referenceCode} is waiting for payout in ${destinationBranch.city}.`,
            type: 'info',
            action: 'HAWALA_PAYOUT_PENDING',
            resource: 'TRANSACTION',
            resourceId: updated.id,
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
          description: `Hawala request ${hawalaRequest.referenceCode} - System commission`,
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: now,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'HAWALA_APPROVED',
          resource: 'TRANSACTION',
          resourceId: updated.id,
          details: JSON.stringify({
            referenceCode: hawalaRequest.referenceCode,
            creditsDeducted: pricing.creditsRequired,
            routedOriginBranchId: originBranch.id,
            routedDestinationBranchId: destinationBranch.id,
            systemCommission: pricing.systemCommission,
            sarafCommission: pricing.sarafCommission,
            totalCommission: pricing.totalCommission,
            systemDiscountAmount: pricing.systemDiscountAmount,
            waivedSystemCommission: pricing.waivedSystemCommission,
            systemFeeWaiverReason: pricing.systemFeeWaiverReason,
          }),
        },
      })

      return updated
    }).catch((error) => {
      if (error instanceof Error && error.message === 'INSUFFICIENT_CREDITS') {
        return null
      }
      throw error
    })

    if (!result) {
      return ApiResponse.error('Insufficient credits', 400, 'INSUFFICIENT_CREDITS')
    }

    clearAdminStatsCache()

    return ApiResponse.ok({
      message: 'Hawala request approved and routed to destination branch successfully',
      transactionStatus: result.status,
      destinationBranch: {
        id: destinationBranch.id,
        name: destinationBranch.name,
        city: destinationBranch.city,
        country: destinationBranch.country,
      },
    })
  } catch (error) {
    console.error('Approve hawala request error:', error)
    if (error instanceof Error && error.message === 'FX_RATE_UNAVAILABLE') {
      return ApiResponse.error(
        'FX rate unavailable. Please try again later.',
        503,
        'FX_RATE_UNAVAILABLE'
      )
    }
    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}
