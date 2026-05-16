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

    const deactivatedAt = new Date()

    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: params.id },
        include: {
          saraf: {
            select: {
              id: true,
              userId: true,
              businessName: true,
              subscriptionType: true,
            },
          },
        },
      })

      if (!subscription) {
        throw new Error('NOT_FOUND')
      }

      // Only allow deactivating ACTIVE subscriptions
      if (subscription.status !== 'ACTIVE') {
        throw new Error('NOT_ACTIVE')
      }

      // Update subscription status to CANCELLED
      await tx.subscription.update({
        where: { id: params.id },
        data: {
          status: 'CANCELLED',
          endDate: deactivatedAt,
          approvedBy: session.user.id,
          approvedAt: deactivatedAt,
        },
      })

      // Reset saraf subscription status if this was their current subscription
      if (subscription.saraf.subscriptionType === subscription.packageType) {
        await tx.saraf.update({
          where: { id: subscription.sarafId },
          data: {
            subscriptionType: 'BASIC',
            subscriptionExpiry: null,
            isPremium: false,
            premiumExpiry: null,
          },
        })
      }

      await tx.notification.create({
        data: {
          userId: subscription.saraf.userId,
          title: 'اشتراک غیرفعال شد',
          message: `پکیج ${subscription.packageType} برای ${subscription.saraf.businessName} غیرفعال شد.`,
          type: 'warning',
          action: 'SUBSCRIPTION_DEACTIVATED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SUBSCRIPTION_DEACTIVATED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
          details: JSON.stringify({
            sarafId: subscription.sarafId,
            packageType: subscription.packageType,
            price: subscription.price,
            deactivatedAt: deactivatedAt.toISOString(),
            previousStatus: 'ACTIVE',
          }),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription deactivated successfully',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }

      if (error.message === 'NOT_ACTIVE') {
        return NextResponse.json({ error: 'Only active subscriptions can be deactivated' }, { status: 400 })
      }
    }

    console.error('Subscription deactivation error:', error)
    return NextResponse.json(
      { error: 'Failed to deactivate subscription' },
      { status: 500 }
    )
  }
}
