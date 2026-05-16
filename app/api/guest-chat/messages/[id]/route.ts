import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeGuestChatMessage } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)
    const token = new URL(request.url).searchParams.get('token')?.trim() || null

    const guestSession = await prisma.guestChatSession.findUnique({
      where: { id },
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
      return NextResponse.json({ error: 'Guest chat session not found' }, { status: 404 })
    }

    let viewer: 'VISITOR' | 'ADMIN' | 'SARAF'

    if (session?.user?.id) {
      if (session.user.role === 'ADMIN' && guestSession.type === 'VISITOR_TO_ADMIN') {
        viewer = 'ADMIN'
      } else if (
        session.user.role === 'SARAF' &&
        guestSession.type === 'VISITOR_TO_SARAF' &&
        guestSession.saraf?.userId === session.user.id
      ) {
        viewer = 'SARAF'
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    } else if (token && token === guestSession.accessToken) {
      viewer = 'VISITOR'
    } else {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const messages = await prisma.guestChatMessage.findMany({
      where: { sessionId: id },
      orderBy: { createdAt: 'asc' },
    })

    if (viewer === 'VISITOR') {
      await prisma.guestChatMessage.updateMany({
        where: {
          sessionId: id,
          senderType: { in: ['ADMIN', 'SARAF', 'SYSTEM'] },
          isRead: false,
        },
        data: { isRead: true },
      })
    } else {
      await prisma.guestChatMessage.updateMany({
        where: {
          sessionId: id,
          senderType: 'VISITOR',
          isRead: false,
        },
        data: { isRead: true },
      })
    }

    return NextResponse.json({
      messages: messages.map(normalizeGuestChatMessage),
      session: {
        id: guestSession.id,
        type: guestSession.type,
        visitorName: guestSession.visitorName,
        visitorPhone: guestSession.visitorPhone,
        visitorEmail: guestSession.visitorEmail,
        sarafName: guestSession.saraf?.businessName || null,
      },
    })
  } catch (error) {
    console.error('Guest chat messages fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch guest chat messages' }, { status: 500 })
  }
}
