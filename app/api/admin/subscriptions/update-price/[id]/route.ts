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

    const { price } = await request.json()

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { error: 'Invalid price. Price must be a positive number.' },
        { status: 400 }
      )
    }

    const updatedAt = new Date()

    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: params.id },
        include: {
          saraf: {
            select: {
              id: true,
              userId: true,
              businessName: true,
            },
          },
        },
      })

      if (!subscription) {
        throw new Error('NOT_FOUND')
      }

      // Only allow updating price for PENDING subscriptions
      if (subscription.status !== 'PENDING') {
        throw new Error('NOT_PENDING')
      }

      const oldPrice = subscription.price

      await tx.subscription.update({
        where: { id: params.id },
        data: {
          price,
        },
      })

      await tx.notification.create({
        data: {
          userId: subscription.saraf.userId,
          title: 'قیمت اشتراک تغییر کرد',
          message: `قیمت پکیج ${subscription.packageType} برای ${subscription.saraf.businessName} از ${oldPrice} به ${price} اعتبار تغییر کرد.`,
          type: 'info',
          action: 'SUBSCRIPTION_PRICE_UPDATED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SUBSCRIPTION_PRICE_UPDATED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
          details: JSON.stringify({
            sarafId: subscription.sarafId,
            packageType: subscription.packageType,
            oldPrice,
            newPrice: price,
            updatedAt: updatedAt.toISOString(),
          }),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription price updated successfully',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }

      if (error.message === 'NOT_PENDING') {
        return NextResponse.json(
          { error: 'Price can only be updated for pending subscriptions' },
          { status: 400 }
        )
      }
    }

    console.error('Subscription price update error:', error)
    return NextResponse.json(
      { error: 'Failed to update subscription price' },
      { status: 500 }
    )
  }
}
