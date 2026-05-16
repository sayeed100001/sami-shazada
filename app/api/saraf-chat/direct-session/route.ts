import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
    }

    if (!isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Only saraf portal users can start user chats.' }, { status: 403 })
    }

    const { userId } = await request.json()
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    const [saraf, targetUser] = await Promise.all([
      prisma.saraf.findUnique({
        where: { id: accessContext.sarafId },
        select: {
          id: true,
          status: true,
          isActive: true,
        },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          name: true,
          role: true,
        },
      }),
    ])

    if (!saraf || saraf.status !== 'APPROVED' || !saraf.isActive) {
      return NextResponse.json({ error: 'Saraf not found or not active' }, { status: 404 })
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    let chatSession = await prisma.chatSession.findFirst({
      where: {
        userId: targetUser.id,
        sarafId: saraf.id,
        type: 'SARAF',
      },
    })

    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: targetUser.id,
          sarafId: saraf.id,
          type: 'SARAF',
          isActive: true,
        },
      })
    }

    return NextResponse.json({
      success: true,
      sessionId: chatSession.id,
      user: targetUser,
    })
  } catch (error) {
    console.error('Direct saraf chat session creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
