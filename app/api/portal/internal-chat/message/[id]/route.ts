import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureInternalChatSqliteSchema } from '@/lib/ensure-sqlite-internal-chat-schema'

export const dynamic = 'force-dynamic'

type PatchAction = 'DELETE' | 'REACT'

function normalizeEmoji(value: unknown) {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  // Keep it conservative: this is stored and rendered back to clients.
  if (!trimmed || trimmed.length > 24) return ''
  return trimmed
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureInternalChatSqliteSchema()

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const actionRaw = typeof body.action === 'string' ? body.action.trim().toUpperCase() : ''
    const action = (actionRaw || '') as PatchAction

    const messageId = params.id
    if (!messageId) {
      return NextResponse.json({ error: 'Missing message id' }, { status: 400 })
    }

    const message = await prisma.internalChatMessage.findUnique({
      where: { id: messageId },
      select: { id: true, chatId: true, senderId: true, deletedAt: true },
    })

    if (!message) {
      return NextResponse.json({ error: 'Message not found' }, { status: 404 })
    }

    const participant = await prisma.internalChatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: message.chatId,
          userId: session.user.id,
        },
      },
      select: { id: true },
    })

    if (!participant && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    if (action === 'DELETE') {
      const canDelete =
        message.senderId === session.user.id || session.user.role === 'ADMIN'

      if (!canDelete) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      const updated = await prisma.internalChatMessage.update({
        where: { id: messageId },
        data: {
          deletedAt: message.deletedAt ?? new Date(),
          deletedById: session.user.id,
          // "Delete for everyone": scrub payload but keep timeline placeholder.
          message: '',
          fileUrl: null,
          fileName: null,
        },
        include: {
          reactions: { select: { userId: true, emoji: true } },
          replyTo: { select: { senderName: true, message: true, deletedAt: true } },
        },
      })

      const { replyTo, reactions, ...rest } = updated as any
      return NextResponse.json({
        success: true,
        message: {
          ...rest,
          replyToMessage: replyTo
            ? replyTo.deletedAt
              ? 'Message deleted'
              : replyTo.message
            : null,
          replyToSenderName: replyTo ? replyTo.senderName : null,
          reactions: (reactions || []).map((r: { userId: string; emoji: string }) => ({ userId: r.userId, emoji: r.emoji })),
        },
      })
    }

    if (action === 'REACT') {
      const emoji = normalizeEmoji(body.emoji)
      if (!emoji) {
        return NextResponse.json({ error: 'Invalid emoji' }, { status: 400 })
      }

      await prisma.$transaction(async (tx) => {
        const existing = await tx.internalChatMessageReaction.findUnique({
          where: { messageId_userId: { messageId, userId: session.user.id } },
          select: { emoji: true },
        })

        if (existing && existing.emoji === emoji) {
          await tx.internalChatMessageReaction.delete({
            where: { messageId_userId: { messageId, userId: session.user.id } },
          })
          return
        }

        await tx.internalChatMessageReaction.upsert({
          where: { messageId_userId: { messageId, userId: session.user.id } },
          update: { emoji },
          create: {
            messageId,
            userId: session.user.id,
            emoji,
          },
        })
      })

      const updated = await prisma.internalChatMessage.findUnique({
        where: { id: messageId },
        include: {
          reactions: { select: { userId: true, emoji: true } },
          replyTo: { select: { senderName: true, message: true, deletedAt: true } },
        },
      })

      if (!updated) {
        return NextResponse.json({ error: 'Message not found' }, { status: 404 })
      }

      const { replyTo, reactions, ...rest } = updated as any
      return NextResponse.json({
        success: true,
        message: {
          ...rest,
          replyToMessage: replyTo
            ? replyTo.deletedAt
              ? 'Message deleted'
              : replyTo.message
            : null,
          replyToSenderName: replyTo ? replyTo.senderName : null,
          reactions: (reactions || []).map((r: { userId: string; emoji: string }) => ({ userId: r.userId, emoji: r.emoji })),
        },
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Internal chat message patch error:', error)
    return NextResponse.json({ error: 'Failed to update message' }, { status: 500 })
  }
}
