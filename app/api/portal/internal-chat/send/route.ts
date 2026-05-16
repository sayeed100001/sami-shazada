import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { emitInternalChatMessage } from '@/lib/websocket-server'
import { ensureInternalChatSqliteSchema } from '@/lib/ensure-sqlite-internal-chat-schema'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureInternalChatSqliteSchema()

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const chatId = typeof body.chatId === 'string' ? body.chatId.trim() : ''
    const message = typeof body.message === 'string' ? body.message.trim() : ''
    const fileUrl = typeof body.fileUrl === 'string' && body.fileUrl.trim() ? body.fileUrl.trim() : null
    const fileName = typeof body.fileName === 'string' && body.fileName.trim() ? body.fileName.trim() : null
    const replyToId = typeof body.replyToId === 'string' && body.replyToId.trim() ? body.replyToId.trim() : null
    const forwardedFromId = typeof body.forwardedFromId === 'string' && body.forwardedFromId.trim() ? body.forwardedFromId.trim() : null

    if (!chatId) {
      return NextResponse.json({ error: 'Chat ID is required' }, { status: 400 })
    }

    const participant = await prisma.internalChatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    })

    const isAdmin = session.user.role === 'ADMIN'

    if (!participant && !isAdmin) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    if (replyToId) {
      const replyTarget = await prisma.internalChatMessage.findUnique({
        where: { id: replyToId },
        select: { id: true, chatId: true },
      })
      if (!replyTarget || replyTarget.chatId !== chatId) {
        return NextResponse.json({ error: 'Invalid reply target' }, { status: 400 })
      }
    }

    const forwardSource = forwardedFromId
      ? await prisma.internalChatMessage.findUnique({
          where: { id: forwardedFromId },
          select: { id: true, chatId: true, message: true, fileUrl: true, fileName: true, deletedAt: true },
        })
      : null

    if (forwardedFromId) {
      if (!forwardSource) {
        return NextResponse.json({ error: 'Invalid forward source' }, { status: 400 })
      }

      const forwardParticipant = await prisma.internalChatParticipant.findUnique({
        where: {
          chatId_userId: {
            chatId: forwardSource.chatId,
            userId: session.user.id,
          },
        },
        select: { id: true },
      })

      if (!forwardParticipant) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const isForwardDeleted = !!forwardSource?.deletedAt
    const normalizedMessage = message || (isForwardDeleted ? 'Message deleted' : forwardSource?.message) || ''
    const normalizedFileUrl = fileUrl || (isForwardDeleted ? null : forwardSource?.fileUrl) || null
    const normalizedFileName = fileName || (isForwardDeleted ? null : forwardSource?.fileName) || null

    if (!normalizedMessage && !normalizedFileUrl) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    const otherParticipants = await prisma.internalChatParticipant.findMany({
      where: {
        chatId,
        userId: { not: session.user.id },
      },
      select: { userId: true },
    })

    const notificationPreview = normalizedMessage || normalizedFileName || 'Attachment'
    const notificationMessage = `${session.user.name || 'Unknown'}: ${notificationPreview.substring(0, 80)}${notificationPreview.length > 80 ? '...' : ''}`

    const chatMessage = await prisma.$transaction(async (tx) => {
      if (!participant && isAdmin) {
        await tx.internalChatParticipant.upsert({
          where: {
            chatId_userId: {
              chatId,
              userId: session.user.id,
            },
          },
          update: {
            lastSeen: new Date(),
          },
          create: {
            chatId,
            userId: session.user.id,
            lastSeen: new Date(),
          },
        })
      }

      const createdMessage = await tx.internalChatMessage.create({
        data: {
          chatId,
          senderId: session.user.id,
          senderName: session.user.name || 'Unknown',
          message: normalizedMessage,
          fileUrl: normalizedFileUrl,
          fileName: normalizedFileName,
          replyToId,
          forwardedFromId,
        },
      })

      await tx.internalChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      })

      if (otherParticipants.length > 0) {
        await tx.notification.createMany({
          data: otherParticipants.map((recipient) => ({
            userId: recipient.userId,
            title: 'New internal message',
            message: notificationMessage,
            type: 'info',
            action: 'NEW_INTERNAL_MESSAGE',
            resource: 'INTERNAL_CHAT',
            resourceId: chatId,
          })),
        })
      }

      return createdMessage
    })

    emitInternalChatMessage(chatId, {
      id: chatMessage.id,
      chatId: chatMessage.chatId,
      senderId: chatMessage.senderId,
      senderName: chatMessage.senderName,
      message: chatMessage.message,
      fileUrl: chatMessage.fileUrl,
      fileName: chatMessage.fileName,
      replyToId: chatMessage.replyToId ?? null,
      forwardedFromId: chatMessage.forwardedFromId ?? null,
      isRead: chatMessage.isRead,
      createdAt: chatMessage.createdAt,
    })

    return NextResponse.json({
      success: true,
      message: chatMessage,
    })
  } catch (error) {
    console.error('Internal chat send error:', error)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}
