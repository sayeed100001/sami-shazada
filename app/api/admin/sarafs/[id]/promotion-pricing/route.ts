import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PromotionType = string

function parseTiers(input: unknown): Record<string, number> {
  if (!input || typeof input !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    const duration = Number(k)
    const amount = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    if (!Number.isFinite(duration) || duration <= 0) continue
    if (!Number.isFinite(amount) || amount < 0) continue
    out[String(Math.trunc(duration))] = Math.trunc(amount)
  }
  return out
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const overrides = body?.overrides

    const cleaned: Partial<Record<PromotionType, Record<string, number>>> = {}
    if (overrides && typeof overrides === 'object') {
      const configs = await prisma.promotionConfig.findMany({ select: { type: true } })
      const allowed = new Set(configs.map((c) => c.type))
      for (const [rawType, rawMap] of Object.entries(overrides as Record<string, unknown>)) {
        const type = String(rawType || '').trim().toUpperCase()
        if (!type || !allowed.has(type)) continue
        const tiers = parseTiers(rawMap)
        if (Object.keys(tiers).length > 0) cleaned[type] = tiers
      }
    }

    const saved = await prisma.$transaction(async (tx) => {
      const saraf = await tx.saraf.findUnique({
        where: { id: params.id },
        select: { id: true, userId: true, businessName: true, promotionPriceOverrides: true },
      })
      if (!saraf) throw new Error('NOT_FOUND')

      const nextOverrides = Object.keys(cleaned).length > 0 ? cleaned : null

      const updated = await tx.saraf.update({
        where: { id: params.id },
        data: { promotionPriceOverrides: nextOverrides as any },
        select: { id: true, businessName: true, promotionPriceOverrides: true },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SARAF_PROMOTION_PRICING_UPDATED',
          resource: 'SARAF',
          resourceId: saraf.id,
          details: JSON.stringify({
            before: saraf.promotionPriceOverrides,
            after: nextOverrides,
          }),
        },
      })

      await tx.notification.create({
        data: {
          userId: saraf.userId,
          title: 'Promotion pricing updated',
          message: 'Your promotion pricing has been updated by the administrator.',
          type: 'info',
          action: 'PROMOTION_PRICING_UPDATED',
          resource: 'SARAF',
          resourceId: saraf.id,
        },
      })

      return updated
    })

    return NextResponse.json({ success: true, saraf: saved })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }
    console.error('Update saraf promotion pricing error:', error)
    return NextResponse.json({ error: 'Failed to update promotion pricing' }, { status: 500 })
  }
}
