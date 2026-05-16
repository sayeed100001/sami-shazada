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

    const startDate = new Date()
    const endDate = new Date(startDate)
    endDate.setDate(endDate.getDate() + 30) // 30 days subscription

    const approvedAt = new Date()

    try {
      await prisma.$transaction(async (tx) => {
        const subscription = await tx.subscription.findUnique({
          where: { id: params.id },
          include: { saraf: { select: { id: true, userId: true, creditBalance: true } } },
        })

        if (!subscription) throw new Error('NOT_FOUND')
        if (subscription.status !== 'PENDING') throw new Error('ALREADY_PROCESSED')

        const creditUpdate = await tx.saraf.updateMany({
          where: { id: subscription.sarafId, creditBalance: { gte: subscription.price } },
          data: {
            creditBalance: { decrement: subscription.price },
            subscriptionType: subscription.packageType,
            subscriptionExpiry: endDate,
            isPremium: true,
            premiumExpiry: endDate,
            isOnFreeTrial: false,
          },
        })

        if (creditUpdate.count !== 1) {
          throw new Error('INSUFFICIENT_CREDITS')
        }

        await tx.subscription.update({
          where: { id: params.id },
          data: {
            status: 'ACTIVE',
            startDate,
            endDate,
            approvedBy: session.user.id,
            approvedAt,
          },
        })

        const updatedSaraf = await tx.saraf.findUnique({
          where: { id: subscription.sarafId },
          select: { creditBalance: true, userId: true },
        })

        await tx.creditTransaction.create({
          data: {
            sarafId: subscription.sarafId,
            type: 'USAGE',
            amount: -subscription.price,
            balance: updatedSaraf?.creditBalance ?? 0,
            description: `خرید پکیج ${subscription.packageType}`,
            status: 'APPROVED',
            approvedBy: session.user.id,
            approvedAt,
          },
        })

        await tx.notification.create({
          data: {
            userId: subscription.saraf.userId,
            title: 'پکیج اشتراک فعال شد',
            message: `پکیج ${subscription.packageType} شما فعال شد. تاریخ انقضا: ${endDate.toLocaleDateString('fa-IR')}`,
            type: 'success',
            action: 'SUBSCRIPTION_APPROVED',
            resource: 'SUBSCRIPTION',
            resourceId: subscription.id,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'SUBSCRIPTION_APPROVED',
            resource: 'SUBSCRIPTION',
            resourceId: subscription.id,
            details: JSON.stringify({
              sarafId: subscription.sarafId,
              packageType: subscription.packageType,
              price: subscription.price,
              newBalance: updatedSaraf?.creditBalance ?? null,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }),
          },
        })
      })
    } catch (err) {
      if (err instanceof Error && err.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }
      if (err instanceof Error && err.message === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: 'Subscription already processed' }, { status: 400 })
      }
      if (err instanceof Error && err.message === 'INSUFFICIENT_CREDITS') {
        return NextResponse.json({ error: 'Insufficient credits' }, { status: 400 })
      }
      throw err
    }

    return NextResponse.json({
      success: true,
      message: 'Subscription approved successfully'
    })

  } catch (error) {
    console.error('Subscription approval error:', error)
    return NextResponse.json(
      { error: 'Failed to approve subscription' },
      { status: 500 }
    )
  }
}
