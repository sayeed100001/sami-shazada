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
import { unifiedNotificationService } from '@/lib/unified-notification-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { transactionId, status, notes } = await request.json()
    
    if (!transactionId || !status) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const sanitizedTransactionId = sanitizeInput(transactionId)
    const sanitizedStatus = sanitizeInput(status)
    const sanitizedNotes = sanitizeInput(notes || '')

    // Validate status
    const validStatuses = ['PENDING', 'COMPLETED', 'CANCELLED', 'WITHDRAWN']
    if (!validStatuses.includes(sanitizedStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get transaction
    const transaction = await prisma.transaction.findUnique({
      where: { id: sanitizedTransactionId },
      include: { saraf: true }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (transaction.type === 'HAWALA' && sanitizedStatus === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Use the destination-branch confirm-payment flow to complete a hawala payout.' },
        { status: 400 }
      )
    }

    if (transaction.type === 'HAWALA_REQUEST' && sanitizedStatus !== 'CANCELLED') {
      return NextResponse.json(
        { error: 'Use the dedicated approval or reject flow for hawala requests.' },
        { status: 400 }
      )
    }

    const isAdmin = true

    const updatedTransaction = await prisma.$transaction(async (tx) => {
      if (sanitizedStatus === 'CANCELLED' && transaction.status === 'PENDING') {
        if (!isAdmin) {
          await assertSarafTransactionCanBeCancelled(tx, {
            sarafId: transaction.sarafId,
            createdAt: transaction.createdAt,
            transactionId: transaction.id,
          })
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
              description: `Refund for cancelled transaction ${transaction.referenceCode}`,
              status: 'APPROVED',
              approvedBy: session.user.id,
              approvedAt: new Date(),
            },
          })
        }

        await releaseReservedTransferReward(tx, transaction.appliedRewardId)
      }

      return tx.transaction.update({
        where: { id: sanitizedTransactionId },
        data: {
          status: sanitizedStatus as any,
          completedAt: sanitizedStatus === 'COMPLETED' ? new Date() : null,
          paidAt: sanitizedStatus === 'WITHDRAWN' ? new Date() : transaction.paidAt,
          paidBy: sanitizedStatus === 'WITHDRAWN' ? session.user.id : transaction.paidBy,
          internalNotes: sanitizedNotes ? `${transaction.internalNotes || ''}\n${new Date().toISOString()}: ${sanitizedNotes}` : transaction.internalNotes
        }
      })
    })

    // Log the status change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TRANSACTION_STATUS_UPDATE',
        resource: 'transaction',
        resourceId: sanitizedTransactionId,
        details: JSON.stringify({
          oldStatus: transaction.status,
          newStatus: sanitizedStatus,
          notes: sanitizedNotes
        })
      }
    })

    clearAdminStatsCache()

    // Send notifications based on status
    const recipients = [transaction.senderPhone, transaction.receiverPhone].filter(Boolean)
    
    if (recipients.length > 0) {
      const notificationMessage =
        sanitizedStatus === 'COMPLETED'
          ? `حواله ${transaction.referenceCode} تکمیل شد.`
          : sanitizedStatus === 'CANCELLED'
            ? `حواله ${transaction.referenceCode} لغو شد.`
            : sanitizedStatus === 'WITHDRAWN'
              ? `حواله ${transaction.referenceCode} پرداخت شد.`
              : `وضعیت حواله ${transaction.referenceCode} به ${sanitizedStatus} تغییر کرد.`

      await Promise.allSettled(
        recipients.map((recipient) =>
          unifiedNotificationService.sendNotification({
            type: 'SMS',
            recipient,
            message: notificationMessage,
            transactionId: sanitizedTransactionId,
            priority: 'HIGH',
          })
        )
      )
    }

    return NextResponse.json({
      success: true,
      transaction: {
        id: updatedTransaction.id,
        status: updatedTransaction.status,
        completedAt: updatedTransaction.completedAt?.toISOString(),
        updatedAt: updatedTransaction.updatedAt.toISOString()
      },
      message: 'Transaction status updated successfully'
    })

  } catch (error) {
    console.error('Update hawala status error:', error)
    const cancellationError = mapCancellationConstraintError(error)
    if (cancellationError) {
      return NextResponse.json({ error: cancellationError.error }, { status: cancellationError.status })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const transactionId = sanitizeInput(searchParams.get('transactionId') || '')
    
    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID required' }, { status: 400 })
    }

    // Get status history from audit logs
    const statusHistory = await prisma.auditLog.findMany({
      where: {
        resourceId: transactionId,
        action: {
          in: ['TRANSACTION_CREATED', 'TRANSACTION_STATUS_UPDATE', 'TRANSACTION_COMPLETED', 'TRANSACTION_CANCELLED']
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    const formattedHistory = statusHistory.map(log => {
      let description = 'تغییر وضعیت'
      
      try {
        const details = JSON.parse(log.details || '{}')
        switch (log.action) {
          case 'TRANSACTION_CREATED':
            description = 'تراکنش ایجاد شد'
            break
          case 'TRANSACTION_COMPLETED':
            description = 'تراکنش تکمیل شد'
            break
          case 'TRANSACTION_CANCELLED':
            description = 'تراکنش لغو شد'
            break
          case 'TRANSACTION_STATUS_UPDATE':
            description = `وضعیت از ${details.oldStatus} به ${details.newStatus} تغییر کرد`
            if (details.notes) {
              description += ` - ${details.notes}`
            }
            break
        }
      } catch (e) {
        // Use default description
      }
      
      return {
        id: log.id,
        action: log.action,
        description,
        timestamp: log.createdAt.toISOString(),
        userId: log.userId
      }
    })

    return NextResponse.json({
      statusHistory: formattedHistory,
      total: formattedHistory.length
    })

  } catch (error) {
    console.error('Get hawala status history error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
