import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const PACKAGE_TYPES = ['PRO', 'PREMIUM', 'ENTERPRISE'] as const
type PackageType = (typeof PACKAGE_TYPES)[number]

function parseOverrideValue(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n =
    typeof value === 'number'
      ? value
      : typeof value === 'string'
        ? Number(value)
        : NaN
  if (!Number.isFinite(n)) return null
  const rounded = Math.trunc(n)
  return rounded >= 0 ? rounded : null
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
    const overridesInput = body?.overrides

    const cleaned: Partial<Record<PackageType, number>> = {}
    if (overridesInput && typeof overridesInput === 'object') {
      for (const key of PACKAGE_TYPES) {
        const raw = (overridesInput as any)[key]
        const parsed = parseOverrideValue(raw)
        if (parsed !== null) cleaned[key] = parsed
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      const saraf = await tx.saraf.findUnique({
        where: { id: params.id },
        select: { id: true, userId: true, businessName: true, subscriptionPriceOverrides: true },
      })
      if (!saraf) throw new Error('NOT_FOUND')

      const nextOverrides = Object.keys(cleaned).length > 0 ? cleaned : null

      const saved = await tx.saraf.update({
        where: { id: params.id },
        data: { subscriptionPriceOverrides: nextOverrides as any },
        select: { id: true, businessName: true, subscriptionPriceOverrides: true },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SARAF_SUBSCRIPTION_PRICING_UPDATED',
          resource: 'SARAF',
          resourceId: saraf.id,
          details: JSON.stringify({
            sarafId: saraf.id,
            businessName: saraf.businessName,
            before: saraf.subscriptionPriceOverrides,
            after: nextOverrides,
          }),
        },
      })

      await tx.notification.create({
        data: {
          userId: saraf.userId,
          title: 'Subscription pricing updated',
          message: 'Your subscription pricing has been updated by the administrator.',
          type: 'info',
          action: 'SUBSCRIPTION_PRICING_UPDATED',
          resource: 'SARAF',
          resourceId: saraf.id,
        },
      })

      return saved
    })

    return NextResponse.json({ success: true, saraf: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }
    console.error('Update saraf subscription pricing error:', error)
    return NextResponse.json({ error: 'Failed to update subscription pricing' }, { status: 500 })
  }
}

