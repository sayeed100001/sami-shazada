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
    
    if (!session?.user) {
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
        include: {
          saraf: {
            select: {
              userId: true,
              businessName: true,
            },
          },
        },
      })

      if (!guestSession) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }

      if (
        guestSession.type !== 'VISITOR_TO_SARAF' ||
        guestSession.saraf?.userId !== session.user.id
      ) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
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

      return NextResponse.json({
        messages: messages.map((message) => ({
          ...message,
          timestamp: message.createdAt,
          senderRole: message.senderType,
        })),
        sarafInfo: {
          id: guestSession.sarafId,
          name: guestSession.saraf?.businessName || 'Saraf',
        },
      })
    }

    // Verify session exists
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { 
        userId: true,
        sarafId: true
      }
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    if (!chatSession.sarafId) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    // Get saraf info
    const saraf = await prisma.saraf.findUnique({
      where: { id: chatSession.sarafId },
      select: { userId: true, businessName: true }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const isUserOwner = chatSession.userId === session.user.id
    const isSarafOwner = saraf.userId === session.user.id

    if (!isUserOwner && !isSarafOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    })

    // Mark messages as read
    if (isUserOwner) {
      await prisma.chatMessage.updateMany({
        where: {
          sessionId,
          senderRole: 'SARAF',
          isRead: false
        },
        data: { isRead: true }
      })
    } else if (isSarafOwner) {
      await prisma.chatMessage.updateMany({
        where: {
          sessionId,
          senderRole: 'USER',
          isRead: false
        },
        data: { isRead: true }
      })
    }

    return NextResponse.json({
      messages,
      sarafInfo: {
        id: chatSession.sarafId,
        name: saraf.businessName
      }
    })

  } catch (error) {
    console.error('Get saraf messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
