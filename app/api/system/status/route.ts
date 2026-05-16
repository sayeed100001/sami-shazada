import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { rateLimitConfigs, withRateLimit } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

const SYSTEM_STATUS_CACHE_TTL_MS = 30 * 1000

let cachedSystemStatus:
  | {
      expiresAt: number
      payload: Record<string, unknown>
    }
  | null = null

async function handler(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = Date.now()
    if (cachedSystemStatus && cachedSystemStatus.expiresAt > now) {
      return NextResponse.json(cachedSystemStatus.payload, {
        headers: { 'Cache-Control': 'private, no-store' }
      })
    }

    const [
      userRoleCounts,
      sarafStatusCounts,
      transactionCount,
      chatSessionCount,
      chatMessageCount,
      courseCount,
      contentItemCount,
      notificationCount
    ] = await Promise.all([
      prisma.user.groupBy({
        by: ['role'],
        _count: { _all: true }
      }),
      prisma.saraf.groupBy({
        by: ['status'],
        _count: { _all: true }
      }),
      prisma.transaction.count(),
      prisma.chatSession.count(),
      prisma.chatMessage.count(),
      prisma.educationCourse.count(),
      prisma.contentItem.count(),
      prisma.notification.count()
    ])

    const adminCount = userRoleCounts.find((entry) => entry.role === 'ADMIN')?._count._all || 0
    const totalUsers = userRoleCounts.reduce((sum, entry) => sum + entry._count._all, 0)
    const approvedSarafs = sarafStatusCounts.find((entry) => entry.status === 'APPROVED')?._count._all || 0
    const pendingSarafs = sarafStatusCounts.find((entry) => entry.status === 'PENDING')?._count._all || 0
    const totalSarafs = sarafStatusCounts.reduce((sum, entry) => sum + entry._count._all, 0)

    const payload = {
      status: 'operational',
      timestamp: new Date().toISOString(),
      database: 'connected',
      systems: {
        users: {
          total: totalUsers,
          admins: adminCount,
          status: 'operational'
        },
        sarafs: {
          total: totalSarafs,
          approved: approvedSarafs,
          pending: pendingSarafs,
          status: 'operational'
        },
        transactions: {
          total: transactionCount,
          status: 'operational'
        },
        messaging: {
          sessions: chatSessionCount,
          messages: chatMessageCount,
          status: 'operational'
        },
        education: {
          courses: courseCount,
          status: 'operational'
        },
        content: {
          items: contentItemCount,
          status: 'operational'
        },
        notifications: {
          total: notificationCount,
          status: 'operational'
        }
      }
    }

    cachedSystemStatus = {
      expiresAt: now + SYSTEM_STATUS_CACHE_TTL_MS,
      payload
    }

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' }
    })
  } catch (error) {
    console.error('System status error:', error)
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: 'Failed to fetch system status'
    }, { status: 500 })
  }
}

export const GET = withRateLimit(handler, rateLimitConfigs.admin)
