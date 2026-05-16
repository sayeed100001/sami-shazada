import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sessionId, message, fileUrl } = await request.json()

    if (!sessionId || (!message?.trim() && !fileUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
      // Verify session belongs to user
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { userId: true }
      })

      if (!chatSession || chatSession.userId !== session.user.id) {
        return NextResponse.json({ error: 'Invalid session' }, { status: 403 })
      }

      // Create the user message
      const chatMessage = await prisma.chatMessage.create({
        data: {
          sessionId,
          senderId: session.user.id,
          senderName: session.user.name || 'کاربر',
          senderRole: session.user.role || 'USER',
          message: message?.trim() || '',
          fileUrl: fileUrl || null,
          timestamp: new Date(),
          isRead: false
        }
      })

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { updatedAt: new Date() }
      })

      // Create notifications for admins
      const adminUsers = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true }
      })

      for (const admin of adminUsers) {
        await prisma.notification.create({
          data: {
            userId: admin.id,
            title: 'پیام جدید از کاربر',
            message: `${session.user.name}: ${message?.trim()?.substring(0, 50) || 'فایل جدید دریافت شد'}`,
            type: 'info',
            action: 'NEW_USER_MESSAGE',
            resource: 'CHAT',
            resourceId: sessionId,
            data: JSON.stringify({
              messageId: chatMessage.id,
              senderName: session.user.name,
              senderRole: session.user.role,
              messagePreview: message?.trim()?.substring(0, 100)
            })
          }
        })
      }

      // Log the message for audit
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CHAT_MESSAGE_SENT',
          resource: 'CHAT',
          resourceId: sessionId,
          details: JSON.stringify({
            messageId: chatMessage.id,
            messageLength: message?.length || 0,
            hasFile: !!fileUrl
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

    } catch (dbError) {
      console.error('Database error in chat send:', dbError)
      return NextResponse.json(
        { error: 'Failed to send message. Database error.' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('User chat send error:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}
