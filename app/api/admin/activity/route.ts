import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function parseDetails(details: string | null) {
  if (!details) {
    return { text: null, metadata: null as Record<string, unknown> | null }
  }

  try {
    const parsed = JSON.parse(details)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return { text: null, metadata: parsed as Record<string, unknown> }
    }
  } catch {
    return { text: details, metadata: null as Record<string, unknown> | null }
  }

  return { text: details, metadata: null as Record<string, unknown> | null }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const activities = await prisma.auditLog.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    })

    const userIds = [...new Set(activities.map((activity) => activity.userId).filter(Boolean))] as string[]
    const users =
      userIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, email: true },
          })
        : []

    const userMap = new Map(users.map((user) => [user.id, user]))

    const formattedActivities = activities.map((activity) => {
      const { text, metadata } = parseDetails(activity.details)

      return {
        id: activity.id,
        action: activity.action,
        resource: activity.resource,
        details: text,
        metadata,
        createdAt: activity.createdAt.toISOString(),
        userId: activity.userId,
        user: activity.userId ? userMap.get(activity.userId) ?? null : null,
      }
    })

    return NextResponse.json(formattedActivities)
  } catch (error) {
    console.error('Admin activity fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
