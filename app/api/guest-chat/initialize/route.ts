import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeGuestChatMessage, normalizeOptionalContact } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

function buildWelcomeMessage(type: string, visitorName: string, sarafName?: string | null) {
  if (type === 'VISITOR_TO_SARAF' && sarafName) {
    return `Welcome ${visitorName}. ${sarafName} received your message request and can reply here.`
  }

  return `Welcome ${visitorName}. Our support team received your message request and can reply here.`
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : ''
    const sarafId = typeof body.sarafId === 'string' ? body.sarafId.trim() : null
    const visitorName = typeof body.visitorName === 'string' ? body.visitorName.trim() : ''
    const visitorPhone = normalizeOptionalContact(body.visitorPhone)
    const visitorEmail = normalizeOptionalContact(body.visitorEmail)
    const accessToken = normalizeOptionalContact(body.accessToken)

    if (!visitorName || (!visitorPhone && !visitorEmail)) {
      return NextResponse.json(
        { error: 'Visitor name and at least one contact method are required' },
        { status: 400 }
      )
    }

    if (type !== 'VISITOR_TO_ADMIN' && type !== 'VISITOR_TO_SARAF') {
      return NextResponse.json({ error: 'Invalid guest chat type' }, { status: 400 })
    }

    if (type === 'VISITOR_TO_SARAF' && !sarafId) {
      return NextResponse.json({ error: 'Saraf id is required' }, { status: 400 })
    }

    if (accessToken) {
      const existingSession = await prisma.guestChatSession.findUnique({
        where: { accessToken },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
          saraf: {
            select: {
              id: true,
              businessName: true,
              businessPhone: true,
              businessAddress: true,
            },
          },
        },
      })

      if (
        existingSession &&
        existingSession.type === type &&
        (type !== 'VISITOR_TO_SARAF' || existingSession.sarafId === sarafId)
      ) {
        return NextResponse.json({
          sessionId: existingSession.id,
          accessToken: existingSession.accessToken,
          messages: existingSession.messages.map(normalizeGuestChatMessage),
          sarafInfo: existingSession.saraf
            ? {
                id: existingSession.saraf.id,
                name: existingSession.saraf.businessName,
                phone: existingSession.saraf.businessPhone,
                address: existingSession.saraf.businessAddress,
              }
            : null,
        })
      }
    }

    const saraf =
      type === 'VISITOR_TO_SARAF' && sarafId
        ? await prisma.saraf.findFirst({
            where: {
              id: sarafId,
              status: 'APPROVED',
              isActive: true,
            },
            select: {
              id: true,
              userId: true,
              businessName: true,
              businessPhone: true,
              businessAddress: true,
            },
          })
        : null

    if (type === 'VISITOR_TO_SARAF' && !saraf) {
      return NextResponse.json({ error: 'Saraf not found or inactive' }, { status: 404 })
    }

    const newAccessToken = crypto.randomBytes(24).toString('hex')

    const createdSession = await prisma.$transaction(async (tx) => {
      const session = await tx.guestChatSession.create({
        data: {
          accessToken: newAccessToken,
          type,
          sarafId: saraf?.id || null,
          visitorName,
          visitorPhone,
          visitorEmail,
          lastMessageAt: new Date(),
        },
      })

      await tx.guestChatMessage.create({
        data: {
          sessionId: session.id,
          senderType: 'SYSTEM',
          senderName: type === 'VISITOR_TO_SARAF' ? saraf?.businessName || 'Saraf' : 'Support',
          message: buildWelcomeMessage(type, visitorName, saraf?.businessName),
          isRead: false,
        },
      })

      if (type === 'VISITOR_TO_ADMIN') {
        const admins = await tx.user.findMany({
          where: { role: 'ADMIN', isActive: true },
          select: { id: true },
        })

        if (admins.length > 0) {
          await tx.notification.createMany({
            data: admins.map((admin) => ({
              userId: admin.id,
              title: 'New visitor support message',
              message: `${visitorName} started a visitor support conversation.`,
              type: 'info',
              action: 'NEW_GUEST_MESSAGE',
              resource: 'GUEST_CHAT',
              resourceId: session.id,
            })),
          })
        }
      } else if (saraf) {
        await tx.notification.create({
          data: {
            userId: saraf.userId,
            title: 'New visitor message',
            message: `${visitorName} started a new conversation with ${saraf.businessName}.`,
            type: 'info',
            action: 'NEW_GUEST_MESSAGE',
            resource: 'GUEST_CHAT',
            resourceId: session.id,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          action: 'GUEST_CHAT_SESSION_CREATED',
          resource: 'GUEST_CHAT',
          resourceId: session.id,
          details: JSON.stringify({
            type,
            sarafId: saraf?.id || null,
            visitorName,
            hasPhone: !!visitorPhone,
            hasEmail: !!visitorEmail,
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return session
    })

    const messages = await prisma.guestChatMessage.findMany({
      where: { sessionId: createdSession.id },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      sessionId: createdSession.id,
      accessToken: createdSession.accessToken,
      messages: messages.map(normalizeGuestChatMessage),
      sarafInfo: saraf
        ? {
            id: saraf.id,
            name: saraf.businessName,
            phone: saraf.businessPhone,
            address: saraf.businessAddress,
          }
        : null,
    })
  } catch (error) {
    console.error('Guest chat initialization error:', error)
    return NextResponse.json({ error: 'Failed to initialize guest chat' }, { status: 500 })
  }
}
