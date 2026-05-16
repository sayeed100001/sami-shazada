import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  BLACKLIST_TYPES,
  getBlacklistScopeKey,
  normalizeBlacklistType,
  normalizeBlacklistValue,
} from '@/lib/blacklist-service'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = sanitizeInput(searchParams.get('search') || '')
    const type = sanitizeInput(searchParams.get('type') || '').toUpperCase()
    const scope = sanitizeInput(searchParams.get('scope') || 'ALL').toUpperCase()

    const where: any = {}
    if (search) {
      where.OR = [{ value: caseInsensitiveContains(search) }, { reason: caseInsensitiveContains(search) }]
    }
    if (type && BLACKLIST_TYPES.includes(type as (typeof BLACKLIST_TYPES)[number])) {
      where.type = type
    }
    if (scope === 'GLOBAL') {
      where.sarafId = null
    } else if (scope === 'SARAF') {
      where.NOT = { sarafId: null }
    }

    const entries = await prisma.blacklist.findMany({
      where,
      include: {
        saraf: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 250,
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Blacklist fetch error:', error)
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
    const type = normalizeBlacklistType(body.type)
    const value = normalizeBlacklistValue(type, body.value)
    const reason = sanitizeInput(body.reason).trim()
    const sarafId = body.sarafId ? sanitizeInput(body.sarafId).trim() : null

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    if (sarafId) {
      const saraf = await prisma.saraf.findUnique({
        where: { id: sarafId },
        select: { id: true },
      })

      if (!saraf) {
        return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
      }
    }

    const entry = await prisma.blacklist.create({
      data: {
        type,
        value,
        normalizedValue: value,
        reason,
        addedBy: session.user.id,
        sarafId,
        scopeKey: getBlacklistScopeKey(sarafId),
      },
      include: {
        saraf: {
          select: {
            id: true,
            businessName: true,
          },
        },
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BLACKLIST_CREATED',
        resource: 'BLACKLIST',
        resourceId: entry.id,
        details: JSON.stringify({
          type,
          value,
          sarafId,
        }),
      },
    })

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch (error: any) {
    console.error('Blacklist creation error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Blacklist entry already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
