import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { toGuestChatSessionRef } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    try {
      const [supportMessages, guestMessages] = await Promise.all([
        prisma.chatMessage.findMany({
          where: {
            senderRole: { not: 'ADMIN' },
            session: { type: 'SUPPORT' }
          },
          orderBy: { timestamp: 'desc' },
          take: limit
        }),
        prisma.guestChatMessage.findMany({
          where: {
            senderType: 'VISITOR',
            session: { type: 'VISITOR_TO_ADMIN' }
          },
          orderBy: { createdAt: 'desc' },
          take: limit
        })
      ])

      const formattedMessages = [
        ...supportMessages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          timestamp: msg.timestamp.toISOString(),
          senderName: msg.senderName,
          senderRole: msg.senderRole,
          sessionId: msg.sessionId,
          isRead: msg.isRead
        })),
        ...guestMessages.map((msg) => ({
          id: msg.id,
          message: msg.message,
          timestamp: msg.createdAt.toISOString(),
          senderName: msg.senderName,
          senderRole: msg.senderType,
          sessionId: toGuestChatSessionRef(msg.sessionId),
          isRead: msg.isRead
        }))
      ]
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, limit)

      return NextResponse.json({ messages: formattedMessages })
    } catch (dbError) {
      console.error('Database error in recent messages:', dbError)
      return NextResponse.json({ messages: [] })
    }

  } catch (error) {
    console.error('Recent messages error:', error)
    return NextResponse.json({ error: 'Failed to fetch recent messages' }, { status: 500 })
  }
}
