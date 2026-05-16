import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fromGuestChatSessionRef } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    const guestSessionId = fromGuestChatSessionRef(sessionId)

    if (guestSessionId) {
      const guestSession = await prisma.guestChatSession.findUnique({
        where: { id: guestSessionId },
        select: { id: true, type: true },
      })

      if (!guestSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      if (guestSession.type !== 'VISITOR_TO_ADMIN') {
        return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
      }

      await prisma.guestChatMessage.updateMany({
        where: {
          sessionId: guestSessionId,
          senderType: 'VISITOR',
          isRead: false,
        },
        data: {
          isRead: true,
        },
      })

      return NextResponse.json({ success: true })
    }

    try {
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { id: true, type: true }
      })

      if (!chatSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      if (chatSession.type !== 'SUPPORT') {
        return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
      }

      // Mark all messages in this session as read
      await prisma.chatMessage.updateMany({
        where: {
          sessionId,
          senderRole: { not: 'ADMIN' },
          isRead: false
        },
        data: {
          isRead: true
        }
      })

      return NextResponse.json({ success: true })
    } catch (dbError) {
      console.error('Database error in mark read:', dbError)
      return NextResponse.json({ error: 'Database operation failed' }, { status: 503 })
    }

  } catch (error) {
    console.error('Mark read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
