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
    const rejectedAt = new Date()

    const body = await request.json().catch(() => ({} as any))
    const notes: string | undefined = typeof body?.notes === 'string' ? body.notes : undefined

    await prisma.$transaction(async (tx) => {
      const transaction = await tx.creditTransaction.findUnique({
        where: { id },
        select: {
          id: true,
          type: true,
          status: true,
          amount: true,
          sarafId: true,
          discountCode: true,
          saraf: { select: { userId: true } },
        },
      })

      if (!transaction) throw new Error('NOT_FOUND')
      if (transaction.type !== 'PURCHASE') throw new Error('INVALID_TYPE')
      if (transaction.status !== 'PENDING') throw new Error('ALREADY_PROCESSED')

      await tx.creditTransaction.update({
        where: { id },
        data: {
          status: 'REJECTED',
          approvedBy: session.user.id,
          approvedAt: rejectedAt,
          ...(notes ? { description: notes } : null),
        },
      })

      // Release reserved discount-code usage (this codebase increments usedCount at request time)
      if (transaction.discountCode) {
        await tx.discountCode.updateMany({
          where: { code: transaction.discountCode, usedCount: { gt: 0 } },
          data: { usedCount: { decrement: 1 } },
        })
      }

      await tx.notification.create({
        data: {
          userId: transaction.saraf.userId,
          title: 'درخواست کریدیت رد شد',
          message: `متأسفانه درخواست خرید ${transaction.amount} کریدیت شما رد شد.${notes ? ` دلیل: ${notes}` : ''}`,
          type: 'error',
          action: 'CREDIT_REJECTED',
          resource: 'CREDIT',
          resourceId: id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREDIT_REJECTED',
          resource: 'CREDIT_TRANSACTION',
          resourceId: id,
          details: JSON.stringify({
            sarafId: transaction.sarafId,
            amount: transaction.amount,
            notes: notes || null,
          }),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Credit rejected successfully',
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
    }

    console.error('Credit rejection error:', error)
    return NextResponse.json({ error: 'Failed to reject credit' }, { status: 500 })
  }
}
