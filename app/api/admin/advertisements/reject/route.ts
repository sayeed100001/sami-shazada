import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const advertisementId = typeof body.id === 'string' ? body.id.trim() : ''
    const rejectionReason =
      typeof body.reason === 'string' && body.reason.trim().length > 0
        ? body.reason.trim()
        : null

    if (!advertisementId) {
      return NextResponse.json({ error: 'Advertisement id is required' }, { status: 400 })
    }

    const rejectedAt = new Date()

    await prisma.$transaction(async (tx) => {
      const advertisement = await tx.advertisement.findUnique({
        where: { id: advertisementId },
        include: {
          saraf: {
            select: {
              userId: true,
            },
          },
        },
      })

      if (!advertisement) {
        throw new Error('NOT_FOUND')
      }

      if (advertisement.status !== 'PENDING') {
        throw new Error('ALREADY_PROCESSED')
      }

      await tx.advertisement.update({
        where: { id: advertisementId },
        data: {
          status: 'REJECTED',
          approvedBy: session.user.id,
          approvedAt: rejectedAt,
        },
      })

      await tx.notification.create({
        data: {
          userId: advertisement.saraf.userId,
          title: 'درخواست تبلیغ شما رد شد',
          message: rejectionReason
            ? `درخواست تبلیغ "${advertisement.title}" رد شد. دلیل: ${rejectionReason}`
            : `درخواست تبلیغ "${advertisement.title}" رد شد.`,
          type: 'error',
          action: 'ADVERTISEMENT_REJECTED',
          resource: 'ADVERTISEMENT',
          resourceId: advertisement.id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ADVERTISEMENT_REJECTED',
          resource: 'ADVERTISEMENT',
          resourceId: advertisement.id,
          details: JSON.stringify({
            sarafId: advertisement.sarafId,
            title: advertisement.title,
            position: advertisement.position,
            price: advertisement.price,
            reason: rejectionReason,
          }),
        },
      })
    })

    return NextResponse.json({
      success: true,
      message: 'Advertisement rejected successfully',
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
      return NextResponse.json({ error: 'Advertisement already processed' }, { status: 400 })
    }

    console.error('Advertisement rejection error:', error)
    return NextResponse.json(
      { error: 'Failed to reject advertisement' },
      { status: 500 }
    )
  }
}
