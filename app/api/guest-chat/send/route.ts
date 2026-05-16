import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeGuestChatMessage, normalizeOptionalContact } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const sessionId = typeof body.sessionId === 'string' ? body.sessionId.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const fileUrl = normalizeOptionalContact(body.fileUrl)
    const fileName = normalizeOptionalContact(body.fileName)
    const accessToken = normalizeOptionalContact(body.accessToken)

    if (!sessionId || (!message && !fileUrl)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const guestSession = await prisma.guestChatSession.findUnique({
      where: { id: sessionId },
      include: {
        saraf: {
          select: {
            id: true,
            userId: true,
            businessName: true,
          },
        },
      },
    })

    if (!guestSession) {
      return NextResponse.json({ error: 'Guest chat session not found' }, { status: 404 })
    }

    let senderType: 'VISITOR' | 'ADMIN' | 'SARAF'
    let senderUserId: string | null = null
    let senderName: string

    if (session?.user?.id) {
      if (session.user.role === 'ADMIN' && guestSession.type === 'VISITOR_TO_ADMIN') {
        senderType = 'ADMIN'
        senderUserId = session.user.id
        senderName = session.user.name || 'Admin'
      } else if (
        session.user.role === 'SARAF' &&
        guestSession.type === 'VISITOR_TO_SARAF' &&
        guestSession.saraf?.userId === session.user.id
      ) {
        senderType = 'SARAF'
        senderUserId = session.user.id
        senderName = guestSession.saraf.businessName || session.user.name || 'Saraf'
      } else {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    } else {
      if (!accessToken || accessToken !== guestSession.accessToken) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }

      senderType = 'VISITOR'
      senderName = guestSession.visitorName
    }

    const createdMessage = await prisma.$transaction(async (tx) => {
      const newMessage = await tx.guestChatMessage.create({
        data: {
          sessionId,
          senderType,
          senderUserId,
          senderName,
          message,
          fileUrl,
          fileName,
          isRead: false,
        },
      })

      await tx.guestChatSession.update({
        where: { id: sessionId },
        data: {
          isActive: true,
          lastMessageAt: newMessage.createdAt,
          updatedAt: new Date(),
        },
      })

      if (senderType === 'VISITOR') {
        if (guestSession.type === 'VISITOR_TO_ADMIN') {
          const admins = await tx.user.findMany({
            where: { role: 'ADMIN', isActive: true },
            select: { id: true },
          })

          if (admins.length > 0) {
            await tx.notification.createMany({
              data: admins.map((admin) => ({
                userId: admin.id,
                title: 'New visitor message',
                message: `${guestSession.visitorName}: ${(message || fileName || 'Attachment').slice(0, 80)}`,
                type: 'info',
                action: 'NEW_GUEST_MESSAGE',
                resource: 'GUEST_CHAT',
                resourceId: guestSession.id,
              })),
            })
          }
        } else if (guestSession.saraf?.userId) {
          await tx.notification.create({
            data: {
              userId: guestSession.saraf.userId,
              title: 'New visitor message',
              message: `${guestSession.visitorName}: ${(message || fileName || 'Attachment').slice(0, 80)}`,
              type: 'info',
              action: 'NEW_GUEST_MESSAGE',
              resource: 'GUEST_CHAT',
              resourceId: guestSession.id,
            },
          })
        }
      }

      await tx.auditLog.create({
        data: {
          userId: senderUserId,
          action: 'GUEST_CHAT_MESSAGE_SENT',
          resource: 'GUEST_CHAT',
          resourceId: guestSession.id,
          details: JSON.stringify({
            senderType,
            messageLength: message.length,
            hasFile: !!fileUrl,
            guestChatType: guestSession.type,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return newMessage
    })

    return NextResponse.json({
      success: true,
      message: normalizeGuestChatMessage(createdMessage),
    })
  } catch (error) {
    console.error('Guest chat send error:', error)
    return NextResponse.json({ error: 'Failed to send guest chat message' }, { status: 500 })
  }
}
