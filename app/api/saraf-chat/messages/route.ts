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

    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 })
    }

    // Verify session exists
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, sarafId: true }
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Check if user has access (either session owner or saraf)
    const isUserOwner = chatSession.userId === session.user.id
    let isSarafOwner = false

    if (chatSession.sarafId) {
      const saraf = await prisma.saraf.findUnique({
        where: { id: chatSession.sarafId },
        select: { userId: true }
      })
      isSarafOwner = saraf?.userId === session.user.id
    }

    if (!isUserOwner && !isSarafOwner) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get messages
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { timestamp: 'asc' }
    })

    // Mark messages as read based on user role
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

    return NextResponse.json({ messages })

  } catch (error) {
    console.error('Get saraf messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
