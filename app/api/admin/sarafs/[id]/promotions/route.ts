import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { getEffectivePromotionEffectsForSaraf } from '@/lib/promotion-effects'

export const dynamic = 'force-dynamic'

function daysToMs(days: number) {
  return days * 24 * 60 * 60 * 1000
}

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
  if (saraf.subscriptionExpiry && saraf.subscriptionExpiry >= now) candidates.push(saraf.subscriptionExpiry)

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
    candidates.length === 0 ? null : candidates.reduce((max, d) => (d.getTime() > max.getTime() ? d : max), candidates[0])

  if (!nextExpiry) {
    await tx.saraf.update({ where: { id: sarafId }, data: { isPremium: false, premiumExpiry: null } })
    return
  }

  await tx.saraf.update({ where: { id: sarafId }, data: { isPremium: true, premiumExpiry: nextExpiry } })
}

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sarafId = sanitizeInput(params.id)
    if (!sarafId) return NextResponse.json({ error: 'Missing saraf id' }, { status: 400 })

    const now = new Date()

    const [saraf, requests, configs, effects] = await Promise.all([
      prisma.saraf.findUnique({
        where: { id: sarafId },
        select: { id: true, businessName: true, userId: true },
      }),
      prisma.promotionRequest.findMany({
        where: { sarafId },
        orderBy: [{ createdAt: 'desc' }],
        take: 50,
      }),
      prisma.promotionConfig.findMany({
        where: { isActive: true },
        orderBy: [{ displayOrder: 'asc' }, { type: 'asc' }],
      }),
      getEffectivePromotionEffectsForSaraf(sarafId, now),
    ])

    if (!saraf) return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })

    const active = requests.filter((r) => r.status === 'APPROVED' && (!r.expiresAt || r.expiresAt >= now))

    return NextResponse.json({
      success: true,
      saraf,
      requests,
      activeTypes: Array.from(new Set(active.map((r) => r.type))).sort(),
      effects,
      configs,
      now: now.toISOString(),
    })
  } catch (error) {
    console.error('Admin saraf promotions GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sarafId = sanitizeInput(params.id)
    if (!sarafId) return NextResponse.json({ error: 'Missing saraf id' }, { status: 400 })

    const body = await request.json().catch(() => null)
    const type = sanitizeInput(body?.type || '').toUpperCase()
    const durationRaw = Number(body?.duration)
    const duration = Number.isFinite(durationRaw) ? Math.trunc(durationRaw) : 0
    const notes = body?.notes ? sanitizeInput(body.notes) : null
    const paymentMethod = sanitizeInput(body?.paymentMethod || 'ADMIN_GRANT') || 'ADMIN_GRANT'
    const amountRaw = body?.amount === undefined ? 0 : Number(body.amount)
    const amount = Number.isFinite(amountRaw) ? Number(amountRaw) : 0

    if (!type) return NextResponse.json({ error: 'Missing promotion type' }, { status: 400 })
    if (!Number.isFinite(duration) || duration <= 0 || duration > 3650) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }

    const now = new Date()
    const expiresAt = new Date(now.getTime() + daysToMs(duration))

    const created = await prisma.$transaction(async (tx) => {
      const saraf = await tx.saraf.findUnique({
        where: { id: sarafId },
        select: { id: true, userId: true, businessName: true },
      })
      if (!saraf) throw new Error('SARAF_NOT_FOUND')

      const row = await tx.promotionRequest.create({
        data: {
          sarafId,
          type,
          duration,
          amount: amount < 0 ? 0 : amount,
          paymentMethod,
          status: 'APPROVED',
          notes,
          expiresAt,
        },
      })

      // Keep premium flag consistent with BOTH subscriptions and promotions.
      if (type === 'PREMIUM') await recomputeSarafPremium(tx, sarafId, now)

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ADMIN_PROMOTION_GRANTED',
          resource: 'PROMOTION',
          resourceId: row.id,
          details: JSON.stringify({
            sarafId,
            type,
            duration,
            amount,
            paymentMethod,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      })

      await tx.notification.create({
        data: {
          userId: saraf.userId,
          title: 'Promotion granted',
          message: `An admin granted ${type} for ${duration} day(s). Expiry: ${expiresAt.toISOString()}`,
          type: 'success',
          action: 'PROMOTION_GRANTED',
          resource: 'PROMOTION',
          resourceId: row.id,
        },
      })

      return row
    })

    return NextResponse.json({ success: true, promotion: created })
  } catch (error) {
    if (error instanceof Error && error.message === 'SARAF_NOT_FOUND') {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }
    console.error('Admin saraf promotions POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
