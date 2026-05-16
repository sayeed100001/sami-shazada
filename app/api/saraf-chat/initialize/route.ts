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
    
    // Enhanced session validation
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required. Please sign in.' }, { status: 401 })
    }

    const { sarafId, userId } = await request.json()

    if (userId) {
      if (!isPortalRole(session.user.role)) {
        return NextResponse.json({ error: 'Only saraf portal users can start chats with users.' }, { status: 403 })
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
            userId: true,
            businessName: true,
            businessAddress: true,
            businessPhone: true,
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

        await prisma.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'SARAF_CHAT_SESSION_CREATED',
            resource: 'CHAT',
            resourceId: chatSession.id,
            details: JSON.stringify({
              targetUserId: targetUser.id,
              sarafId: saraf.id,
            }),
          },
        }).catch(() => null)
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId: chatSession.id },
        orderBy: { timestamp: 'asc' },
        take: 50,
      })

      return NextResponse.json({
        sessionId: chatSession.id,
        sarafInfo: {
          id: saraf.id,
          name: saraf.businessName,
          address: saraf.businessAddress,
          phone: saraf.businessPhone,
        },
        targetUser: {
          id: targetUser.id,
          name: targetUser.name,
          role: targetUser.role,
        },
        messages,
      })
    }

    if (!sarafId) {
      return NextResponse.json({ error: 'Saraf ID required' }, { status: 400 })
    }

    // Verify saraf exists and is approved
    const saraf = await prisma.saraf.findFirst({
      where: {
        id: sarafId,
        status: 'APPROVED',
        isActive: true
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found or not active' }, { status: 404 })
    }

    // Check if chat session already exists between user and saraf
    let chatSession = await prisma.chatSession.findFirst({
      where: {
        userId: session.user.id,
        sarafId: sarafId,
        type: 'SARAF'
      }
    })

    // Create new session if none exists
    if (!chatSession) {
      chatSession = await prisma.chatSession.create({
        data: {
          userId: session.user.id,
          sarafId: sarafId,
          type: 'SARAF',
          isActive: true
        }
      })

      // Create initial welcome message from saraf
      await prisma.chatMessage.create({
        data: {
          sessionId: chatSession.id,
          senderId: saraf.userId,
          senderName: saraf.businessName,
          senderRole: 'SARAF',
          message: `سلام! من ${saraf.businessName} هستم. چگونه میتوانم به شما کمک کنم؟`,
          isRead: false
        }
      })

      // Notify saraf of new conversation
      await prisma.notification.create({
        data: {
          userId: saraf.userId,
          title: 'گفتگوی جدید',
          message: `${session.user.name} گفتگو جدیدی با شما شروع کرده است`,
          type: 'info',
          action: 'NEW_CHAT',
          resource: 'CHAT',
          resourceId: chatSession.id,
          data: JSON.stringify({
            userName: session.user.name,
            userRole: session.user.role
          })
        }
      })
    }

    // Get recent messages
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: chatSession.id },
      orderBy: { timestamp: 'asc' },
      take: 50
    })

    return NextResponse.json({
      sessionId: chatSession.id,
      sarafInfo: {
        id: saraf.id,
        name: saraf.businessName,
        address: saraf.businessAddress,
        phone: saraf.businessPhone
      },
      messages
    })

  } catch (error) {
    console.error('Saraf chat initialization error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
