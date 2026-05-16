import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fromGuestChatSessionRef } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

export async function GET(
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

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

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

      const messages = await prisma.guestChatMessage.findMany({
        where: { sessionId: guestSessionId },
        orderBy: { createdAt: 'asc' },
      })

      await prisma.guestChatMessage.updateMany({
        where: {
          sessionId: guestSessionId,
          senderType: 'VISITOR',
          isRead: false,
        },
        data: { isRead: true },
      })

      return NextResponse.json(
        messages.map((message) => ({
          ...message,
          timestamp: message.createdAt,
          senderRole: message.senderType,
        }))
      )
    }

    try {
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { id: true, type: true },
      })

      if (!chatSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      if (chatSession.type !== 'SUPPORT') {
        return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { timestamp: 'asc' }
      })

      await prisma.chatMessage.updateMany({
        where: {
          sessionId,
          senderRole: { not: 'ADMIN' },
          isRead: false,
        },
        data: { isRead: true },
      })

      return NextResponse.json(messages)

    } catch (dbError) {
      console.error('Database error in get messages:', dbError)
      return NextResponse.json([])
    }

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
