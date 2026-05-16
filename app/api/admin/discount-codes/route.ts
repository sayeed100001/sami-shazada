import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

function parseOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseRequiredNumber(value: unknown) {
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = sanitizeInput(searchParams.get('search') || '')
    const status = sanitizeInput(searchParams.get('status') || 'ALL')

    const where: any = {}
    if (search) {
      where.code = caseInsensitiveContains(search)
    }

    if (status === 'ACTIVE') {
      where.isActive = true
      where.validUntil = { gt: new Date() }
    } else if (status === 'EXPIRED') {
      where.validUntil = { lte: new Date() }
    } else if (status === 'DISABLED') {
      where.isActive = false
    }

    const codes = await prisma.discountCode.findMany({
      where,
      include: {
        usages: {
          select: {
            id: true,
            userId: true,
            transactionId: true,
            discountAmount: true,
            usedAt: true,
          },
          orderBy: { usedAt: 'desc' },
          take: 20,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ codes })
  } catch (error) {
    console.error('Discount code fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const code = sanitizeInput(body.code).trim().toUpperCase()
    const type = sanitizeInput(body.type).trim().toUpperCase()
    const value = parseRequiredNumber(body.value)
    const maxDiscount = parseOptionalInt(body.maxDiscount)
    const maxUses = parseOptionalInt(body.maxUses)
    const validFrom = body.validFrom ? new Date(body.validFrom) : new Date()
    const validUntil = body.validUntil ? new Date(body.validUntil) : null
    const specificSarafId = body.specificSarafId ? sanitizeInput(body.specificSarafId) : null
    const vipLevelOnly = body.vipLevelOnly ? sanitizeInput(body.vipLevelOnly).toUpperCase() : null

    if (!code || !['PERCENTAGE', 'FIXED'].includes(type) || value === null || value <= 0) {
      return NextResponse.json({ error: 'Invalid code payload' }, { status: 400 })
    }

    if (!(validFrom instanceof Date) || Number.isNaN(validFrom.getTime()) || !validUntil || Number.isNaN(validUntil.getTime())) {
      return NextResponse.json({ error: 'validFrom and validUntil are required' }, { status: 400 })
    }

    if (validUntil <= validFrom) {
      return NextResponse.json({ error: 'validUntil must be after validFrom' }, { status: 400 })
    }

    const created = await prisma.discountCode.create({
      data: {
        code,
        type,
        value,
        maxDiscount,
        maxUses,
        validFrom,
        validUntil,
        specificSarafId,
        vipLevelOnly: vipLevelOnly as any,
        isActive: body.isActive !== false,
        createdBy: session.user.id,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'DISCOUNT_CODE_CREATED',
        resource: 'DISCOUNT_CODE',
        resourceId: created.id,
        details: JSON.stringify({
          code: created.code,
          type: created.type,
          value: created.value,
        }),
      },
    })

    return NextResponse.json({ success: true, code: created })
  } catch (error) {
    console.error('Discount code creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
