import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { releaseReservedTransferReward } from '@/lib/user-reward-service'
import {
  assertSarafTransactionCanBeCancelled,
  mapCancellationConstraintError,
} from '@/lib/transaction-cancellation'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactionId, reason } = await request.json()
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    const sanitizedId = sanitizeInput(transactionId)
    const sanitizedReason = sanitizeInput(reason || '')

    const transaction = await prisma.transaction.findUnique({
      where: { id: sanitizedId },
      include: { saraf: true }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.status !== 'PENDING') {
      return NextResponse.json({ error: 'Only pending transactions can be cancelled' }, { status: 400 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isSender = transaction.senderId === session.user.id
    const isSaraf = session.user.role === 'SARAF' && transaction.sarafId === session.user.sarafId
    
    if (!isAdmin && !isSender && !isSaraf) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      if (!isAdmin) {
        await assertSarafTransactionCanBeCancelled(tx, {
          sarafId: transaction.sarafId,
          createdAt: transaction.createdAt,
          transactionId: transaction.id,
        })
      }

      const statusUpdate = await tx.transaction.updateMany({
        where: { id: sanitizedId, status: 'PENDING' },
        data: {
          status: 'CANCELLED',
          internalNotes: `${transaction.internalNotes || ''}\n${new Date().toISOString()}: Cancelled by ${session.user.name}. Reason: ${sanitizedReason}`.trim(),
        },
      })

      if (statusUpdate.count !== 1) {
        // Already cancelled/processed by another request.
        return tx.transaction.findUnique({ where: { id: sanitizedId } })
      }

      if (transaction.creditsDeducted > 0) {
        const updatedSaraf = await tx.saraf.update({
          where: { id: transaction.sarafId },
          data: { creditBalance: { increment: transaction.creditsDeducted } },
          select: { creditBalance: true },
        })

        await tx.creditTransaction.create({
          data: {
            sarafId: transaction.sarafId,
            type: 'REFUND',
            amount: transaction.creditsDeducted,
            balance: updatedSaraf.creditBalance,
            description: `Refund for cancelled hawala ${transaction.referenceCode}`,
            status: 'APPROVED',
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
        })
      }

      await releaseReservedTransferReward(tx, transaction.appliedRewardId)

      return tx.transaction.findUnique({ where: { id: sanitizedId } })
    })

    await prisma.notification.create({
      data: {
        userId: transaction.senderId || session.user.id,
        title: 'حواله لغو شد',
        message: `حواله ${transaction.referenceCode} لغو شد. ${sanitizedReason}`,
        type: 'warning',
        action: 'TRANSACTION_CANCELLED',
        resource: 'TRANSACTION',
        resourceId: transaction.id
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_CANCELLED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
        details: JSON.stringify({ reason: sanitizedReason })
      }
    })

    clearAdminStatsCache()

    if (!updatedTransaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        referenceCode: updatedTransaction.referenceCode
      }
    })

  } catch (error) {
    console.error('Hawala cancellation error:', error)
    const cancellationError = mapCancellationConstraintError(error)
    if (cancellationError) {
      return NextResponse.json({ error: cancellationError.error }, { status: cancellationError.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
