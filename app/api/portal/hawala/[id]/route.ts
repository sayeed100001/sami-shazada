import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasTransactionBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'
import { releaseReservedTransferReward } from '@/lib/user-reward-service'
import {
  assertSarafTransactionCanBeCancelled,
  mapCancellationConstraintError,
} from '@/lib/transaction-cancellation'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        originBranch: true,
        destinationBranch: true,
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    const isOwnerOriginSaraf = transaction?.sarafId === accessContext.sarafId
    const isDestinationSarafOwner =
      transaction?.destinationBranch?.sarafId === accessContext.sarafId

    if (!transaction || transaction.type !== 'HAWALA' || (!isOwnerOriginSaraf && !isDestinationSarafOwner)) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (accessContext.accessMode === 'BRANCH') {
      if (!hasTransactionBranchAccess(accessContext, transaction.originBranchId, transaction.destinationBranchId)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    return NextResponse.json(transaction)

  } catch (error) {
    console.error('Transaction fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { status } = body

    if (!['PENDING', 'WITHDRAWN', 'COMPLETED', 'CANCELLED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    const existingTransaction = await prisma.transaction.findUnique({
      where: { id: params.id }
    })

    if (!existingTransaction || existingTransaction.sarafId !== accessContext.sarafId || existingTransaction.type !== 'HAWALA') {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (!hasTransactionBranchAccess(accessContext, existingTransaction.originBranchId, existingTransaction.destinationBranchId)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const currentStatus = existingTransaction.status
    const nextStatus = status as typeof existingTransaction.status

    // Enforce safe status transitions to prevent data corruption
    const allowedNext: Record<string, string[]> = {
      PENDING: ['PENDING', 'WITHDRAWN', 'COMPLETED', 'CANCELLED'],
      WITHDRAWN: ['WITHDRAWN', 'COMPLETED'],
      COMPLETED: ['COMPLETED'],
      CANCELLED: ['CANCELLED']
    }

    if (!allowedNext[currentStatus]?.includes(nextStatus)) {
      return NextResponse.json(
        { error: `Invalid status transition: ${currentStatus} → ${nextStatus}` },
        { status: 400 }
      )
    }

    if (status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Use the destination-branch confirm-payment flow to complete a hawala payout.' },
        { status: 400 }
      )
    }

    if (status === 'WITHDRAWN') {
      return NextResponse.json(
        { error: 'Use the branch payout flow to mark hawala payout steps.' },
        { status: 400 }
      )
    }

    if (status === 'CANCELLED' && accessContext.accessMode !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the saraf owner can cancel hawala transactions.' },
        { status: 403 }
      )
    }

    // If cancelling, refund credits
    if (status === 'CANCELLED' && existingTransaction.status === 'PENDING') {
      await prisma.$transaction(async (tx) => {
        await assertSarafTransactionCanBeCancelled(tx, {
          sarafId: accessContext.sarafId,
          createdAt: existingTransaction.createdAt,
          transactionId: existingTransaction.id,
        })

        // Update transaction status
        const updated = await tx.transaction.updateMany({
          where: {
            id: params.id,
            sarafId: accessContext.sarafId,
            type: 'HAWALA',
            status: 'PENDING',
          },
          data: {
            status: 'CANCELLED',
            completedAt: null,
            paidAt: null,
            paidBy: null,
            updatedAt: new Date()
          }
        })

        if (updated.count !== 1) {
          // Already cancelled/processed by another request.
          return
        }

        // Refund credits
        if (existingTransaction.creditsDeducted > 0) {
          const sarafAfterRefund = await tx.saraf.update({
            where: { id: accessContext.sarafId },
            data: {
              creditBalance: {
                increment: existingTransaction.creditsDeducted
              }
            },
            select: { creditBalance: true }
          })

          // Record credit refund
          await tx.creditTransaction.create({
            data: {
              sarafId: accessContext.sarafId,
              type: 'REFUND',
              amount: existingTransaction.creditsDeducted,
              balance: sarafAfterRefund.creditBalance,
              description: `بازگشت کریدیت حواله ${existingTransaction.referenceCode}`,
              status: 'APPROVED',
              approvedBy: session.user.id,
              approvedAt: new Date()
            }
          })
        }

        await releaseReservedTransferReward(tx, existingTransaction.appliedRewardId)
      })
    } else {
      // Just update status
      await prisma.transaction.update({
        where: { id: params.id },
        data: {
          status,
          paidAt: status === 'WITHDRAWN' ? new Date() : existingTransaction.paidAt,
          paidBy: status === 'WITHDRAWN' ? session.user.id : existingTransaction.paidBy,
          completedAt: status === 'COMPLETED' ? new Date() : existingTransaction.completedAt,
          updatedAt: new Date()
        }
      })
    }

    // Create notification
    if (existingTransaction.senderId) {
      await prisma.notification.create({
        data: {
          userId: existingTransaction.senderId,
          title: 'وضعیت حواله تغییر کرد',
          message: `حواله ${existingTransaction.referenceCode} به وضعیت ${
            status === 'COMPLETED' ? 'تکمیل شده' :
            status === 'CANCELLED' ? 'لغو شده' : 'در انتظار'
          } تغییر یافت.`,
          type: status === 'COMPLETED' ? 'success' : status === 'CANCELLED' ? 'error' : 'info',
          action: 'TRANSACTION_STATUS_CHANGED',
          resource: 'TRANSACTION',
          resourceId: params.id
        }
      })
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_STATUS_UPDATED',
        resource: 'TRANSACTION',
        resourceId: params.id,
        details: JSON.stringify({
          referenceCode: existingTransaction.referenceCode,
          oldStatus: existingTransaction.status,
          newStatus: status,
          creditsRefunded: status === 'CANCELLED' ? existingTransaction.creditsDeducted : 0
        })
      }
    })

    clearAdminStatsCache()

    const updatedTransaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        originBranch: true,
        destinationBranch: true
      }
    })

    return NextResponse.json(updatedTransaction)

  } catch (error) {
    console.error('Transaction update error:', error)
    const cancellationError = mapCancellationConstraintError(error)
    if (cancellationError) {
      return NextResponse.json({ error: cancellationError.error }, { status: cancellationError.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    if (accessContext.accessMode !== 'OWNER') {
      return NextResponse.json(
        { error: 'Only the saraf owner can delete transactions' },
        { status: 403 }
      )
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: accessContext.sarafId },
      select: { id: true, creditBalance: true }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id }
    })

    if (!transaction || transaction.sarafId !== saraf.id || transaction.type !== 'HAWALA') {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // Only allow deletion of PENDING transactions
    if (transaction.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Can only delete pending transactions' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Delete transaction
      await tx.transaction.delete({
        where: { id: params.id }
      })

      // Refund credits
      if (transaction.creditsDeducted > 0) {
        const updatedSaraf = await tx.saraf.update({
          where: { id: saraf.id },
          data: {
            creditBalance: {
              increment: transaction.creditsDeducted
            }
          },
          select: { creditBalance: true }
        })

        // Record credit refund
        await tx.creditTransaction.create({
          data: {
            sarafId: saraf.id,
            type: 'REFUND',
            amount: transaction.creditsDeducted,
            balance: updatedSaraf.creditBalance,
            description: `بازگشت کریدیت حذف حواله ${transaction.referenceCode}`,
            status: 'APPROVED',
            approvedBy: session.user.id,
            approvedAt: new Date()
          }
        })
      }

      await releaseReservedTransferReward(tx, transaction.appliedRewardId)
    })

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_DELETED',
        resource: 'TRANSACTION',
        resourceId: params.id,
        details: JSON.stringify({
          referenceCode: transaction.referenceCode,
          creditsRefunded: transaction.creditsDeducted
        })
      }
    })

    return NextResponse.json({ success: true, message: 'Transaction deleted successfully' })

  } catch (error) {
    console.error('Transaction deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
