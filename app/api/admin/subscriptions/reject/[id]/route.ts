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

    const rejectedAt = new Date()

    await prisma.$transaction(async (tx) => {
      const subscription = await tx.subscription.findUnique({
        where: { id: params.id },
        include: {
          saraf: {
            select: {
              userId: true,
              businessName: true,
            },
          },
        },
      })

      if (!subscription) {
        throw new Error('NOT_FOUND')
      }

      if (subscription.status !== 'PENDING') {
        throw new Error('ALREADY_PROCESSED')
      }

      await tx.subscription.update({
        where: { id: params.id },
        data: {
          status: 'CANCELLED',
          approvedBy: session.user.id,
          approvedAt: rejectedAt,
        },
      })

      await tx.notification.create({
        data: {
          userId: subscription.saraf.userId,
          // Notifications are stored as plain text (not per-user localized).
          // Keep them readable for all supported languages.
          title: 'درخواست اشتراک رد شد / Subscription rejected / د ګډون غوښتنه رد شوه',
          message: `درخواست پکیج ${subscription.packageType} برای ${subscription.saraf.businessName} رد شد. / Package request rejected. / د پکیج غوښتنه رد شوه.`,
          type: 'error',
          action: 'SUBSCRIPTION_REJECTED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SUBSCRIPTION_REJECTED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
          details: JSON.stringify({
            sarafId: subscription.sarafId,
            packageType: subscription.packageType,
            price: subscription.price,
            rejectedAt: rejectedAt.toISOString(),
          }),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Subscription rejected successfully',
    })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
      }

      if (error.message === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: 'Subscription already processed' }, { status: 400 })
      }
    }

    console.error('Subscription rejection error:', error)
    return NextResponse.json(
      { error: 'Failed to reject subscription' },
      { status: 500 }
    )
  }
}
