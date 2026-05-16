import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fromGuestChatSessionRef, getGuestDisplayContact } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return null
  }

  return session
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    const guestSessionId = fromGuestChatSessionRef(sessionId)

    if (guestSessionId) {
      const guestSession = await prisma.guestChatSession.findUnique({
        where: { id: guestSessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      })

      if (!guestSession || guestSession.type !== 'VISITOR_TO_ADMIN') {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      const messageCount = await prisma.guestChatMessage.count({
        where: { sessionId: guestSessionId },
      })

      return NextResponse.json({
        id: sessionId,
        isActive: guestSession.isActive,
        createdAt: guestSession.createdAt,
        updatedAt: guestSession.updatedAt,
        user: {
          id: sessionId,
          name: guestSession.visitorName,
          email: getGuestDisplayContact(guestSession.visitorEmail, guestSession.visitorPhone),
          role: 'VISITOR',
          isActive: true,
        },
        messages: guestSession.messages.map((message) => ({
          id: message.id,
          message: message.message,
          timestamp: message.createdAt,
          senderRole: message.senderType,
          isRead: message.isRead,
        })),
        _count: {
          messages: messageCount,
        },
      })
    }

    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
        messages: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          select: {
            id: true,
            message: true,
            timestamp: true,
            senderRole: true,
            isRead: true,
          },
        },
        _count: {
          select: {
            messages: true,
          },
        },
      },
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    if (chatSession.type !== 'SUPPORT') {
      return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
    }

    return NextResponse.json(chatSession)
  } catch (error) {
    console.error('Chat session fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    const guestSessionId = fromGuestChatSessionRef(sessionId)

    if (guestSessionId) {
      const existingGuestSession = await prisma.guestChatSession.findUnique({
        where: { id: guestSessionId },
        select: { id: true, type: true },
      })

      if (!existingGuestSession || existingGuestSession.type !== 'VISITOR_TO_ADMIN') {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      await prisma.guestChatMessage.deleteMany({
        where: { sessionId: guestSessionId },
      })

      await prisma.guestChatSession.delete({
        where: { id: guestSessionId },
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CHAT_SESSION_DELETED',
          resource: 'GUEST_CHAT',
          resourceId: guestSessionId,
          details: 'Guest chat session and all messages deleted',
        },
      }).catch(() => null)

      return NextResponse.json({ success: true })
    }

    const existingSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, type: true },
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    if (existingSession.type !== 'SUPPORT') {
      return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
    }

    await prisma.chatMessage.deleteMany({
      where: { sessionId },
    })

    await prisma.chatSession.delete({
      where: { id: sessionId },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'CHAT_SESSION_DELETED',
        resource: 'CHAT_SESSION',
        resourceId: sessionId,
        details: 'Chat session and all messages deleted',
      },
    }).catch(() => null)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Chat session deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id
    const guestSessionId = fromGuestChatSessionRef(sessionId)
    const { isActive } = await request.json()

    if (guestSessionId) {
      const existingGuestSession = await prisma.guestChatSession.findUnique({
        where: { id: guestSessionId },
        select: { id: true, type: true },
      })

      if (!existingGuestSession || existingGuestSession.type !== 'VISITOR_TO_ADMIN') {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      const guestSession = await prisma.guestChatSession.update({
        where: { id: guestSessionId },
        data: {
          isActive: isActive !== false,
          updatedAt: new Date(),
        },
      })

      return NextResponse.json({
        success: true,
        chatSession: {
          ...guestSession,
          id: sessionId,
        },
      })
    }

    const existingSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, type: true },
    })

    if (!existingSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    if (existingSession.type !== 'SUPPORT') {
      return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
    }

    const chatSession = await prisma.chatSession.update({
      where: { id: sessionId },
      data: {
        isActive: isActive !== false,
        updatedAt: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      chatSession,
    })
  } catch (error) {
    console.error('Chat session update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH delegates to PUT for compatibility
export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  return PUT(request, context)
}
