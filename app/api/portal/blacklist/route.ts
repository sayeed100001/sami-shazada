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
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

async function resolvePortalBlacklistAccess(session: any) {
  if (!session?.user?.id || !isPortalRole(session.user.role)) {
    return null
  }

  return resolvePortalAccessContext({
    userId: session.user.id,
    role: session.user.role,
    sarafId: session.user.sarafId,
  })
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessContext = await resolvePortalBlacklistAccess(session)
    if (!accessContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = sanitizeInput(searchParams.get('search') || '')
    const type = sanitizeInput(searchParams.get('type') || '').toUpperCase()
    const scope = sanitizeInput(searchParams.get('scope') || '').toUpperCase()

    const where: any =
      scope === 'GLOBAL'
        ? { sarafId: null }
        : scope === 'SARAF'
          ? { sarafId: accessContext.sarafId }
          : {
              OR: [{ sarafId: accessContext.sarafId }, { sarafId: null }],
            }

    if (search) {
      where.AND = [
        {
          OR: [{ value: caseInsensitiveContains(search) }, { reason: caseInsensitiveContains(search) }],
        },
      ]
    }

    if (type && BLACKLIST_TYPES.includes(type as (typeof BLACKLIST_TYPES)[number])) {
      where.type = type
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
      orderBy: [{ sarafId: 'desc' }, { createdAt: 'desc' }],
      take: 250,
    })

    return NextResponse.json({ entries })
  } catch (error) {
    console.error('Portal blacklist fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const accessContext = await resolvePortalBlacklistAccess(session)
    if (!session?.user?.id || !accessContext) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const type = normalizeBlacklistType(body.type)
    const value = normalizeBlacklistValue(type, body.value)
    const reason = sanitizeInput(body.reason).trim()

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const entry = await prisma.blacklist.create({
      data: {
        type,
        value,
        normalizedValue: value,
        reason,
        addedBy: session.user.id,
        sarafId: accessContext.sarafId,
        scopeKey: getBlacklistScopeKey(accessContext.sarafId),
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_BLACKLIST_CREATED',
        resource: 'BLACKLIST',
        resourceId: entry.id,
        details: JSON.stringify({
          type,
          value,
          sarafId: accessContext.sarafId,
        }),
      },
    })

    return NextResponse.json({ success: true, entry }, { status: 201 })
  } catch (error: any) {
    console.error('Portal blacklist creation error:', error)
    if (error?.code === 'P2002') {
      return NextResponse.json({ error: 'Blacklist entry already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
