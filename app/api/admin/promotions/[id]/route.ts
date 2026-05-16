import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Status = 'PENDING' | 'APPROVED' | 'REJECTED'

async function recomputeSarafPremium(tx: any, sarafId: string, now: Date) {
  const saraf = await tx.saraf.findUnique({
    where: { id: sarafId },
    select: {
      id: true,
      isPremium: true,
      premiumExpiry: true,
      subscriptionExpiry: true,
    },
  })

  if (!saraf) return

  // Permanent premium flag wins (used by some admin flows).
  if (saraf.isPremium && saraf.premiumExpiry === null) return

  const candidates: Date[] = []

  if (saraf.subscriptionExpiry && saraf.subscriptionExpiry >= now) {
    candidates.push(saraf.subscriptionExpiry)
  }

  const activePremiumPromotion = await tx.promotionRequest.findFirst({
    where: {
      sarafId,
      type: 'PREMIUM',
      status: 'APPROVED',
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    orderBy: [{ expiresAt: 'desc' }, { createdAt: 'desc' }],
    select: { expiresAt: true },
  })

  if (activePremiumPromotion?.expiresAt) candidates.push(activePremiumPromotion.expiresAt)

  const nextExpiry =
    candidates.length === 0
      ? null
      : candidates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max), candidates[0])

  if (!nextExpiry) {
    await tx.saraf.update({
      where: { id: sarafId },
      data: { isPremium: false, premiumExpiry: null },
    })
    return
  }

  await tx.saraf.update({
    where: { id: sarafId },
    data: { isPremium: true, premiumExpiry: nextExpiry },
  })
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promotionId = params.id
    const body = await request.json().catch(() => null)
    const requestedStatus = body?.status as Status | undefined
    const expireNow = Boolean(body?.expireNow)
    const extendDaysRaw = body?.extendDays
    const extendDays = Number.isFinite(Number(extendDaysRaw)) ? Math.trunc(Number(extendDaysRaw)) : 0

    const newStatus: Status | undefined = expireNow ? 'APPROVED' : requestedStatus

    if (!newStatus || !['PENDING', 'APPROVED', 'REJECTED'].includes(newStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updatedPromotion = await prisma.$transaction(async (tx) => {
      const promotion = await tx.promotionRequest.findUnique({
        where: { id: promotionId },
        include: {
          saraf: {
            select: {
              id: true,
              userId: true,
              businessName: true,
              businessPhone: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      if (!promotion) throw new Error('NOT_FOUND')

      const now = new Date()
      if (!expireNow && extendDays > 0 && promotion.status !== 'APPROVED') {
        throw new Error('CANNOT_EXTEND')
      }
      const expiresAt = expireNow
        ? new Date(now.getTime() - 1000)
        : newStatus === 'APPROVED'
          ? new Date(now.getTime() + promotion.duration * 24 * 60 * 60 * 1000)
          : null

      const effectiveExpiresAt =
        !expireNow && extendDays > 0
          ? promotion.expiresAt
            ? new Date(new Date(promotion.expiresAt).getTime() + extendDays * 24 * 60 * 60 * 1000)
            : new Date(now.getTime() + extendDays * 24 * 60 * 60 * 1000)
          : expiresAt

      const updated = await tx.promotionRequest.update({
        where: { id: promotionId },
        data: {
          status: newStatus,
          expiresAt: effectiveExpiresAt,
          updatedAt: now,
        },
        include: {
          saraf: {
            select: {
              businessName: true,
              businessPhone: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
      })

      // PREMIUM: keep saraf.isPremium / premiumExpiry consistent with BOTH subscriptions and promotions.
      // FEATURED: do not set a permanent flag; APIs derive featured from active promotion_requests.
      if (promotion.type === 'PREMIUM') {
        await recomputeSarafPremium(tx, promotion.sarafId, now)
      }

      await tx.notification.create({
        data: {
          userId: promotion.saraf.userId,
          title: 'Promotion request status updated',
          message:
            expireNow
              ? `Your ${promotion.type} promotion was deactivated.`
              : extendDays > 0
                ? `Your ${promotion.type} promotion was extended by ${extendDays} day(s).`
              : newStatus === 'APPROVED'
                ? `Your ${promotion.type} promotion request was approved. Expiry: ${effectiveExpiresAt?.toISOString() ?? ''}`
                : newStatus === 'REJECTED'
                  ? `Your ${promotion.type} promotion request was rejected.`
                  : `Your ${promotion.type} promotion request status changed to ${newStatus}.`,
          type: expireNow ? 'info' : newStatus === 'APPROVED' ? 'success' : newStatus === 'REJECTED' ? 'error' : 'info',
          action: 'PROMOTION_STATUS_UPDATED',
          resource: 'PROMOTION',
          resourceId: promotion.id,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PROMOTION_STATUS_UPDATED',
          resource: 'PROMOTION',
          resourceId: promotion.id,
          details: JSON.stringify({
            status: newStatus,
            expiresAt: effectiveExpiresAt?.toISOString() || null,
            extendDays: extendDays > 0 ? extendDays : null,
            sarafId: promotion.sarafId,
            type: promotion.type,
          }),
        },
      })

      return updated
    })

    return NextResponse.json(updatedPromotion)
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Promotion not found' }, { status: 404 })
    }
    if (error instanceof Error && error.message === 'CANNOT_EXTEND') {
      return NextResponse.json({ error: 'Only approved promotions can be extended' }, { status: 400 })
    }
    console.error('Promotion update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
