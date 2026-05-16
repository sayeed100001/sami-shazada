import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureInternalChatSqliteSchema } from '@/lib/ensure-sqlite-internal-chat-schema'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureInternalChatSqliteSchema()

    const url = new URL(request.url)
    const limitParam = url.searchParams.get('limit')
    const afterParam = url.searchParams.get('after')
    const beforeParam = url.searchParams.get('before')
    const markReadParam = url.searchParams.get('markRead')

    const limit = limitParam
      ? Math.min(Math.max(parseInt(limitParam, 10) || 0, 1), 200)
      : undefined

    const afterDate = afterParam ? new Date(afterParam) : null
    const hasAfter = !!afterDate && !Number.isNaN(afterDate.getTime())

    const beforeDate = beforeParam ? new Date(beforeParam) : null
    const hasBefore = !!beforeDate && !Number.isNaN(beforeDate.getTime())

    const markRead =
      markReadParam === '1' ||
      markReadParam === 'true' ||
      markReadParam === 'yes'

    // Check if user is participant
    const participant = await prisma.internalChatParticipant.findUnique({
      where: {
        chatId_userId: {
          chatId: params.id,
          userId: session.user.id,
        },
      }
    })

    const isAdmin = session.user.role === 'ADMIN'

    if (!participant && !isAdmin) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 })
    }

    const chatId = params.id

    const includeMessageMeta = {
      replyTo: {
        select: {
          id: true,
          message: true,
          senderName: true,
          deletedAt: true,
        },
      },
      reactions: {
        select: {
          userId: true,
          emoji: true,
        },
      },
    } as const

    const orderedMessages = hasAfter
      ? await prisma.internalChatMessage.findMany({
          where: { chatId, createdAt: { gt: afterDate as Date } },
          orderBy: { createdAt: 'asc' },
          take: limit ?? 100,
          include: includeMessageMeta,
        })
      : hasBefore
        ? await prisma.internalChatMessage
            .findMany({
              where: { chatId, createdAt: { lt: beforeDate as Date } },
              orderBy: { createdAt: 'desc' },
              take: limit ?? 50,
              include: includeMessageMeta,
            })
            .then((rows) => rows.reverse())
        : limit
          ? await prisma.internalChatMessage
              .findMany({
                where: { chatId },
                orderBy: { createdAt: 'desc' },
                take: limit,
                include: includeMessageMeta,
              })
              .then((rows) => rows.reverse())
          : await prisma.internalChatMessage.findMany({
              where: { chatId },
              orderBy: { createdAt: 'asc' },
              include: includeMessageMeta,
            })

    // Mark messages as read (avoid write load when nothing is unread)
    const shouldMarkRead =
      markRead &&
      orderedMessages.length > 0 &&
      participant &&
      orderedMessages.some((message) => message.senderId !== session.user.id && message.isRead === false)

    if (shouldMarkRead && participant) {
      await prisma.$transaction([
        prisma.internalChatMessage.updateMany({
          where: {
            chatId,
            senderId: { not: session.user.id },
            isRead: false,
          },
          data: { isRead: true },
        }),
        prisma.internalChatParticipant.update({
          where: {
            chatId_userId: {
              chatId,
              userId: session.user.id,
            },
          },
          data: { lastSeen: new Date() },
        }),
      ])
    }

    const normalizedMessages = orderedMessages.map((row) => {
      const { replyTo, reactions, ...rest } = row as any
      return {
        ...rest,
        replyToMessage: replyTo
          ? replyTo.deletedAt
            ? 'Message deleted'
            : replyTo.message
          : null,
        replyToSenderName: replyTo ? replyTo.senderName : null,
        reactions:
          reactions?.map((reaction: { userId: string; emoji: string }) => ({
            userId: reaction.userId,
            emoji: reaction.emoji,
          })) ?? [],
      }
    })

    return NextResponse.json({ messages: normalizedMessages })

  } catch (error) {
    console.error('Internal chat messages fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
