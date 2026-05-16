import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const baseStats = {
        totalConversations: 0,
        unreadMessages: 0,
        averageResponseTime: '5 دقیقه',
        todayMessages: 0,
        activeConversations: 0,
        responseRate: 95,
      }

      if (session.user.role !== 'SARAF') {
        return NextResponse.json(baseStats)
      }

      const saraf = await prisma.saraf.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      })

      if (!saraf) {
        return NextResponse.json(baseStats)
      }

      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)

      const yesterdayStart = new Date(todayStart)
      yesterdayStart.setDate(yesterdayStart.getDate() - 1)

      const [totalConversations, unreadMessages, todayMessages, activeConversations, guestConversations, guestUnreadMessages, guestTodayMessages, guestActiveConversations] =
        await Promise.all([
          prisma.chatSession.count({
            where: {
              sarafId: saraf.id,
              type: 'SARAF',
            },
          }),
          prisma.chatMessage.count({
            where: {
              session: {
                sarafId: saraf.id,
                type: 'SARAF',
              },
              senderRole: 'USER',
              isRead: false,
            },
          }),
          prisma.chatMessage.count({
            where: {
              session: {
                sarafId: saraf.id,
                type: 'SARAF',
              },
              timestamp: { gte: todayStart },
            },
          }),
          prisma.chatSession.count({
            where: {
              sarafId: saraf.id,
              type: 'SARAF',
              updatedAt: { gte: yesterdayStart },
            },
          }),
          prisma.guestChatSession.count({
            where: {
              sarafId: saraf.id,
              type: 'VISITOR_TO_SARAF',
            },
          }),
          prisma.guestChatMessage.count({
            where: {
              session: {
                sarafId: saraf.id,
                type: 'VISITOR_TO_SARAF',
              },
              senderType: 'VISITOR',
              isRead: false,
            },
          }),
          prisma.guestChatMessage.count({
            where: {
              session: {
                sarafId: saraf.id,
                type: 'VISITOR_TO_SARAF',
              },
              createdAt: { gte: todayStart },
            },
          }),
          prisma.guestChatSession.count({
            where: {
              sarafId: saraf.id,
              type: 'VISITOR_TO_SARAF',
              updatedAt: { gte: yesterdayStart },
            },
          }),
        ])

      return NextResponse.json({
        ...baseStats,
        totalConversations: totalConversations + guestConversations,
        unreadMessages: unreadMessages + guestUnreadMessages,
        todayMessages: todayMessages + guestTodayMessages,
        activeConversations: activeConversations + guestActiveConversations,
      })
    } catch (dbError) {
      console.error('Database error in saraf chat stats:', dbError)
      throw dbError
    }

  } catch (error) {
    console.error('Saraf chat stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
