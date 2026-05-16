import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id

    // Verify the requester has access to this session (owner, related saraf, or admin)
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { id: true, userId: true, sarafId: true, type: true }
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    const isAdmin = session.user.role === 'ADMIN'
    const isUserOwner = chatSession.userId === session.user.id

    let isSarafOwner = false
    if (!isAdmin && !isUserOwner && chatSession.sarafId) {
      const saraf = await prisma.saraf.findUnique({
        where: { id: chatSession.sarafId },
        select: { userId: true }
      })
      isSarafOwner = saraf?.userId === session.user.id
    }

    if (!isAdmin && !isUserOwner && !isSarafOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages for this session
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    })

    // Mark messages as read if user is viewing them
    if (!isAdmin) {
      if (isUserOwner) {
        await prisma.chatMessage.updateMany({
          where: {
            sessionId,
            senderId: { not: session.user.id },
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
    }

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
