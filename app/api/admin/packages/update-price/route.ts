import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

const VALID_TYPES = new Set(['PRO', 'PREMIUM', 'ENTERPRISE'])

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const typeRaw = sanitizeInput(body?.type || '')
    const type = String(typeRaw).toUpperCase()
    const priceRaw = validateNumericInput(body?.price)
    const price = Number.isFinite(priceRaw) ? Math.trunc(priceRaw as number) : NaN

    if (!VALID_TYPES.has(type)) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: 'Invalid price' }, { status: 400 })
    }

    const updated = await prisma.$transaction(async (tx) => {
      const existing = await tx.packageConfig.findUnique({ where: { type: type as any } })
      if (!existing) {
        throw new Error('NOT_FOUND')
      }

      const saved = await tx.packageConfig.update({
        where: { type: type as any },
        data: { price },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PACKAGE_PRICE_UPDATED',
          resource: 'PACKAGE_CONFIG',
          resourceId: saved.id,
          details: JSON.stringify({
            type,
            oldPrice: existing.price,
            newPrice: price,
          }),
        },
      })

      return saved
    })

    return NextResponse.json({ success: true, package: updated })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 })
    }
    console.error('Update package price error:', error)
    return NextResponse.json({ error: 'Failed to update package price' }, { status: 500 })
  }
}

