import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const rateId = searchParams.get('rateId')
    const limit = parseInt(searchParams.get('limit') || '50')

    const sarafRates = await prisma.rate.findMany({
      where: {
        sarafId: accessContext.sarafId,
        ...(rateId ? { id: rateId } : {}),
      },
      select: { id: true },
      take: rateId ? 1 : undefined,
    })

    if (rateId && sarafRates.length === 0) {
      return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
    }

    const rateIds = sarafRates.map((rate) => rate.id)
    if (rateIds.length === 0) {
      return NextResponse.json({ history: [] })
    }

    const where: any = {
      resource: 'RATE',
      resourceId: { in: rateIds },
      action: { in: ['RATE_CREATED', 'RATE_UPDATED'] }
    }

    const history = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    const userIds = Array.from(new Set(history.map((log) => log.userId).filter(Boolean))) as string[]
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []
    const userMap = new Map(users.map((user) => [user.id, user]))

    const formattedHistory = history.map(log => ({
      id: log.id,
      action: log.action,
      userName: log.userId ? userMap.get(log.userId)?.name || 'Unknown User' : 'System',
      userEmail: log.userId ? userMap.get(log.userId)?.email || '' : '',
      details: JSON.parse(log.details || '{}'),
      createdAt: log.createdAt.toISOString()
    }))

    return NextResponse.json({ history: formattedHistory })

  } catch (error) {
    console.error('Rate history fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
