import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fromGuestChatSessionRef } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, message, sarafId, fileUrl, fileName } = await request.json()

    if (!sessionId || (!message?.trim() && !fileUrl)) {
      return NextResponse.json({ error: 'Session ID and message or file required' }, { status: 400 })
    }

    const guestSessionId = fromGuestChatSessionRef(sessionId)

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
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      if (
        guestSession.type !== 'VISITOR_TO_SARAF' ||
        guestSession.saraf?.userId !== session.user.id
      ) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      const guestMessage = await prisma.guestChatMessage.create({
        data: {
          sessionId: guestSessionId,
          senderType: 'SARAF',
          senderUserId: session.user.id,
          senderName: guestSession.saraf.businessName || session.user.name || 'Saraf',
          message: message?.trim() || '',
          fileUrl: fileUrl || null,
          fileName: fileName || null,
          isRead: false,
        },
      })

      await prisma.guestChatSession.update({
        where: { id: guestSessionId },
        data: {
          updatedAt: new Date(),
          lastMessageAt: guestMessage.createdAt,
        },
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SARAF_GUEST_CHAT_MESSAGE_SENT',
          resource: 'GUEST_CHAT',
          resourceId: guestSessionId,
          details: JSON.stringify({
            messageId: guestMessage.id,
            messageLength: message?.length || 0,
            hasFile: !!fileUrl,
            sarafId: guestSession.sarafId,
          }),
        },
      }).catch(() => null)

      return NextResponse.json({
        success: true,
        message: {
          ...guestMessage,
          timestamp: guestMessage.createdAt,
          senderRole: guestMessage.senderType,
        },
      })
    }

    // Verify session exists and user has access
    const chatSession = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      select: { userId: true, sarafId: true }
    })

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
    }

    // Verify user has access to this session
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

    // Create the message
    const chatMessage = await prisma.chatMessage.create({
      data: {
        sessionId,
        senderId: session.user.id,
        senderName: session.user.name || 'کاربر',
        senderRole: session.user.role || 'USER',
        message: message?.trim() || '',
        fileUrl: fileUrl || null,
        isRead: false
      }
    })

    // Update session timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() }
    })

    // Notify the other party
    const targetUserId = isUserOwner && chatSession.sarafId ? 
      (await prisma.saraf.findUnique({ where: { id: chatSession.sarafId }, select: { userId: true } }))?.userId :
      chatSession.userId

    if (targetUserId && targetUserId !== session.user.id) {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
          title: 'پیام جدید',
          message: `${session.user.name}: ${message?.substring(0, 50) || 'فایل جدید'}${message && message.length > 50 ? '...' : ''}`,
          type: 'info',
          action: 'NEW_SARAF_MESSAGE',
          resource: 'SARAF_CHAT',
          resourceId: sessionId,
          data: JSON.stringify({
            senderName: session.user.name,
            senderRole: session.user.role,
            messagePreview: message?.substring(0, 100) || 'File attachment'
          })
        }
      })
    }

    // Log the message
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_CHAT_MESSAGE_SENT',
        resource: 'CHAT',
        resourceId: sessionId,
        details: JSON.stringify({
          messageId: chatMessage.id,
          messageLength: message?.length || 0,
          hasFile: !!fileUrl,
          sarafId: chatSession.sarafId || null
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: {
        id: chatMessage.id,
        sessionId: chatMessage.sessionId,
        senderId: chatMessage.senderId,
        senderName: chatMessage.senderName,
        senderRole: chatMessage.senderRole,
        message: chatMessage.message,
        fileUrl: chatMessage.fileUrl,
        timestamp: chatMessage.timestamp,
        isRead: chatMessage.isRead,
        createdAt: chatMessage.createdAt
      }
    })

  } catch (error) {
    console.error('Saraf chat send error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
