import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const now = new Date()
      const startOfToday = new Date(now)
      startOfToday.setHours(0, 0, 0, 0)

      const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000)
      const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      const [
        totalSessions,
        activeSessions,
        unreadMessages,
        pendingResponses,
        todayMessages,
        recentMessages,
        guestTotalSessions,
        guestActiveSessions,
        guestUnreadMessages,
        guestPendingResponses,
        guestTodayMessages,
        recentGuestMessages,
      ] = await Promise.all([
        // Total chat sessions
        prisma.chatSession.count({ where: { type: 'SUPPORT' } }),
        
        // Active sessions
        prisma.chatSession.count({
          where: { isActive: true, type: 'SUPPORT' }
        }),
        
        // Unread messages from users
        prisma.chatMessage.count({
          where: {
            isRead: false,
            senderRole: { not: 'ADMIN' },
            session: { type: 'SUPPORT' },
          }
        }),
        
        // Sessions with pending responses (last message from user)
        prisma.chatSession.count({
          where: {
            isActive: true,
            type: 'SUPPORT',
            messages: {
              some: {
                senderRole: { not: 'ADMIN' },
                createdAt: {
                  gte: last24Hours // Last 24 hours
                }
              }
            }
          }
        }),
        
        // Today's messages
        prisma.chatMessage.count({
          where: {
            session: { type: 'SUPPORT' },
            createdAt: {
              gte: startOfToday
            }
          }
        }),
        
        prisma.chatMessage.findMany({
          where: {
            session: { type: 'SUPPORT' },
            createdAt: {
              gte: last7Days,
            },
          },
          select: {
            sessionId: true,
            senderRole: true,
            createdAt: true,
          },
          orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }],
          take: 5000,
        }),
        prisma.guestChatSession.count({
          where: { type: 'VISITOR_TO_ADMIN' },
        }),
        prisma.guestChatSession.count({
          where: { type: 'VISITOR_TO_ADMIN', isActive: true },
        }),
        prisma.guestChatMessage.count({
          where: {
            senderType: 'VISITOR',
            isRead: false,
            session: { type: 'VISITOR_TO_ADMIN' },
          },
        }),
        prisma.guestChatSession.count({
          where: {
            isActive: true,
            type: 'VISITOR_TO_ADMIN',
            messages: {
              some: {
                senderType: 'VISITOR',
                createdAt: {
                  gte: last24Hours,
                },
              },
            },
          },
        }),
        prisma.guestChatMessage.count({
          where: {
            session: { type: 'VISITOR_TO_ADMIN' },
            createdAt: {
              gte: startOfToday,
            },
          },
        }),
        prisma.guestChatMessage.findMany({
          where: {
            session: { type: 'VISITOR_TO_ADMIN' },
            createdAt: {
              gte: last7Days,
            },
          },
          select: {
            sessionId: true,
            senderType: true,
            createdAt: true,
          },
          orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }],
          take: 5000,
        }),
      ])

      const weeklyStats = recentMessages.reduce(
        (accumulator, message) => {
          if (message.senderRole === 'USER') accumulator.userMessages += 1
          if (message.senderRole === 'ADMIN') accumulator.adminMessages += 1
          if (message.senderRole === 'SYSTEM') accumulator.systemMessages += 1
          return accumulator
        },
        {
          userMessages: 0,
          adminMessages: 0,
          systemMessages: 0,
        }
      )

      const guestWeeklyStats = recentGuestMessages.reduce(
        (accumulator, message) => {
          if (message.senderType === 'VISITOR') accumulator.userMessages += 1
          if (message.senderType === 'ADMIN') accumulator.adminMessages += 1
          if (message.senderType === 'SYSTEM') accumulator.systemMessages += 1
          return accumulator
        },
        {
          userMessages: 0,
          adminMessages: 0,
          systemMessages: 0,
        }
      )

      let responsePairs = 0
      let totalResponseMinutes = 0
      const lastUserMessageAtBySession = new Map<string, Date>()

      for (const msg of recentMessages) {
        if (msg.senderRole === 'USER') {
          lastUserMessageAtBySession.set(msg.sessionId, msg.createdAt)
          continue
        }

        if (msg.senderRole === 'ADMIN') {
          const lastUserAt = lastUserMessageAtBySession.get(msg.sessionId)
          if (!lastUserAt) continue

          const diffMs = msg.createdAt.getTime() - lastUserAt.getTime()
          if (diffMs >= 0) {
            totalResponseMinutes += diffMs / (60 * 1000)
            responsePairs += 1
            lastUserMessageAtBySession.delete(msg.sessionId)
          }
        }
      }

      const lastGuestVisitorMessageAtBySession = new Map<string, Date>()

      for (const msg of recentGuestMessages) {
        if (msg.senderType === 'VISITOR') {
          lastGuestVisitorMessageAtBySession.set(msg.sessionId, msg.createdAt)
          continue
        }

        if (msg.senderType === 'ADMIN') {
          const lastVisitorAt = lastGuestVisitorMessageAtBySession.get(msg.sessionId)
          if (!lastVisitorAt) continue

          const diffMs = msg.createdAt.getTime() - lastVisitorAt.getTime()
          if (diffMs >= 0) {
            totalResponseMinutes += diffMs / (60 * 1000)
            responsePairs += 1
            lastGuestVisitorMessageAtBySession.delete(msg.sessionId)
          }
        }
      }

      const avgResponseTime = responsePairs > 0 ? totalResponseMinutes / responsePairs : 0

      // Hourly distribution for today (cross-db)
      const todayMsgs = await prisma.chatMessage.findMany({
        where: {
          session: { type: 'SUPPORT' },
          createdAt: { gte: startOfToday },
        },
        select: { createdAt: true },
        take: 5000,
      })

      const hourlyCounts = new Map<number, number>()
      for (const m of todayMsgs) {
        const h = m.createdAt.getHours()
        hourlyCounts.set(h, (hourlyCounts.get(h) || 0) + 1)
      }

      const guestTodayMsgs = await prisma.guestChatMessage.findMany({
        where: {
          session: { type: 'VISITOR_TO_ADMIN' },
          createdAt: { gte: startOfToday },
        },
        select: { createdAt: true },
        take: 5000,
      })

      for (const m of guestTodayMsgs) {
        const h = m.createdAt.getHours()
        hourlyCounts.set(h, (hourlyCounts.get(h) || 0) + 1)
      }

      const hourlyDistribution = Array.from(hourlyCounts.entries())
        .sort((a, b) => a[0] - b[0])
        .map(([hour, count]) => ({ hour, count }))

      return NextResponse.json({
        totalSessions: totalSessions + guestTotalSessions,
        activeSessions: activeSessions + guestActiveSessions,
        unreadMessages: unreadMessages + guestUnreadMessages,
        pendingResponses: pendingResponses + guestPendingResponses,
        todayMessages: todayMessages + guestTodayMessages,
        avgResponseTimeMinutes: Math.round(avgResponseTime),
        weeklyStats: {
          userMessages: weeklyStats.userMessages + guestWeeklyStats.userMessages,
          adminMessages: weeklyStats.adminMessages + guestWeeklyStats.adminMessages,
          systemMessages: weeklyStats.systemMessages + guestWeeklyStats.systemMessages,
        },
        hourlyDistribution
      })

    } catch (dbError) {
      console.error('Database error in admin chat stats:', dbError)
      return NextResponse.json({ error: 'Failed to fetch chat stats' }, { status: 500 })
    }

  } catch (error) {
    console.error('Admin chat stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
