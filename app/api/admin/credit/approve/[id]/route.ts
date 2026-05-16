import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = params

    const approvedAt = new Date()

    const newBalance = await prisma.$transaction(async (tx) => {
      const transaction = await tx.creditTransaction.findUnique({
        where: { id },
        include: {
          saraf: {
            select: {
              id: true,
              userId: true,
              creditBalance: true,
            },
          },
        },
      })

      if (!transaction) {
        throw new Error('NOT_FOUND')
      }

      if (transaction.type !== 'PURCHASE') {
        throw new Error('INVALID_TYPE')
      }

      if (transaction.status !== 'PENDING') {
        throw new Error('ALREADY_PROCESSED')
      }

      if (transaction.amount <= 0) {
        throw new Error('INVALID_AMOUNT')
      }

      const updatedSaraf = await tx.saraf.update({
        where: { id: transaction.sarafId },
        data: {
          creditBalance: { increment: transaction.amount },
        },
        select: { creditBalance: true, userId: true },
      })

      await tx.creditTransaction.update({
        where: { id },
        data: {
          status: 'APPROVED',
          balance: updatedSaraf.creditBalance,
          approvedBy: session.user.id,
          approvedAt,
        },
      })

      await tx.notification.create({
        data: {
          userId: updatedSaraf.userId,
          title: 'درخواست کریدیت تایید شد',
          message: `${transaction.amount} کریدیت به حساب شما اضافه شد. موجودی جدید: ${updatedSaraf.creditBalance}`,
          type: 'success',
          action: 'CREDIT_APPROVED',
          resource: 'CREDIT',
          resourceId: id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREDIT_APPROVED',
          resource: 'CREDIT_TRANSACTION',
          resourceId: id,
          details: JSON.stringify({
            sarafId: transaction.sarafId,
            amount: transaction.amount,
            newBalance: updatedSaraf.creditBalance,
          }),
        },
      })

      return updatedSaraf.creditBalance
    })

    return NextResponse.json({
      success: true,
      message: 'Credit approved successfully',
      newBalance
    })

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
      }
      if (error.message === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: 'Transaction already processed' }, { status: 400 })
      }
      if (error.message === 'INVALID_TYPE') {
        return NextResponse.json({ error: 'Invalid transaction type' }, { status: 400 })
      }
      if (error.message === 'INVALID_AMOUNT') {
        return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
      }
    }
    console.error('Credit approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve credit' },
      { status: 500 }
    )
  }
}
