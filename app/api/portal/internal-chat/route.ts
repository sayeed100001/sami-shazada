import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ensureInternalChatSqliteSchema } from '@/lib/ensure-sqlite-internal-chat-schema'
import {
  buildPortalParticipantUserSelect,
  listAvailablePortalChatContacts,
  listPortalDirectChatContacts,
  mapPortalParticipantUser,
  resolveInternalPortalChatAccess,
} from '@/lib/portal-internal-chat'

export const dynamic = 'force-dynamic'

async function resolveChatSarafIdFromParticipants(participantIds: string[]) {
  if (!participantIds.length) return null

  const users = await prisma.user.findMany({
    where: {
      id: { in: participantIds },
      isActive: true,
    },
    select: {
      id: true,
      saraf: {
        select: {
          id: true,
          status: true,
          isActive: true,
        },
      },
      managedBranches: {
        where: { isActive: true },
        select: {
          sarafId: true,
          saraf: {
            select: {
              status: true,
              isActive: true,
            },
          },
        },
      },
      branchStaff: {
        where: {
          isActive: true,
          branch: {
            isActive: true,
          },
        },
        select: {
          branch: {
            select: {
              sarafId: true,
              saraf: {
                select: {
                  status: true,
                  isActive: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (users.length !== participantIds.length) {
    return null
  }

  const sarafIds = new Set<string>()

  for (const user of users) {
    if (user.saraf?.id && user.saraf.status === 'APPROVED' && user.saraf.isActive) {
      sarafIds.add(user.saraf.id)
    }

    for (const branch of user.managedBranches) {
      if (branch.saraf.status === 'APPROVED' && branch.saraf.isActive) {
        sarafIds.add(branch.sarafId)
      }
    }

    for (const assignment of user.branchStaff) {
      if (assignment.branch.saraf.status === 'APPROVED' && assignment.branch.saraf.isActive) {
        sarafIds.add(assignment.branch.sarafId)
      }
    }
  }

  return sarafIds.size === 1 ? Array.from(sarafIds)[0] : null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureInternalChatSqliteSchema()

    const accessContext = await resolveInternalPortalChatAccess(session)

    if (!accessContext) {
      return NextResponse.json({ error: 'Messenger access not found' }, { status: 404 })
    }

    const sarafId = accessContext.sarafId

    const chats = await prisma.internalChat.findMany({
      where:
        accessContext.accessMode === 'ADMIN'
          ? undefined
          : accessContext.accessMode === 'OWNER'
            ? {
                OR: [
                  { sarafId },
                  {
                    participants: {
                      some: {
                        userId: session.user.id,
                      },
                    },
                  },
                ],
              }
            : {
                participants: {
                  some: {
                    userId: session.user.id,
                  },
                },
              },
      include: {
        participants: {
          include: {
            user: {
              select: buildPortalParticipantUserSelect(sarafId, accessContext.accessMode),
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    const chatIds = chats.map((chat) => chat.id)
    const unreadCountByChat = new Map<string, number>()

    if (chatIds.length > 0) {
      try {
        const grouped = await prisma.internalChatMessage.groupBy({
          by: ['chatId'],
          where: {
            chatId: { in: chatIds },
            senderId: { not: session.user.id },
            isRead: false,
          },
          _count: { _all: true },
        })

        for (const row of grouped) {
          unreadCountByChat.set(row.chatId, row._count._all)
        }
      } catch (error) {
        // Fallback for connectors that can't groupBy reliably.
        const unreadMessages = await prisma.internalChatMessage.findMany({
          where: {
            chatId: { in: chatIds },
            senderId: { not: session.user.id },
            isRead: false,
          },
          select: { chatId: true },
          take: 5000,
        })

        for (const message of unreadMessages) {
          unreadCountByChat.set(message.chatId, (unreadCountByChat.get(message.chatId) || 0) + 1)
        }
      }
    }

    const contacts = await listAvailablePortalChatContacts(session.user.id, sarafId, accessContext.accessMode)

    return NextResponse.json({
      chats: chats.map((chat) => ({
        ...chat,
        unreadCount: unreadCountByChat.get(chat.id) || 0,
        participants: chat.participants.map((participant) => ({
          ...participant,
          user: mapPortalParticipantUser(participant.user),
        })),
      })),
      contacts,
    })
  } catch (error) {
    console.error('Internal chat fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch chats' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureInternalChatSqliteSchema()

    const accessContext = await resolveInternalPortalChatAccess(session)

    if (!accessContext) {
      return NextResponse.json({ error: 'Messenger access not found' }, { status: 404 })
    }

    const sarafId = accessContext.sarafId

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const type = typeof body.type === 'string' ? body.type.trim().toUpperCase() : 'DIRECT'
    const participantIds: string[] = Array.isArray(body.participantIds)
      ? Array.from(
          new Set(
            body.participantIds.filter(
              (value): value is string => typeof value === 'string' && value.trim().length > 0
            )
          )
        )
      : []
    const trimmedParticipantIds: string[] = participantIds.filter((id) => id !== session.user.id)
    const name = typeof body.name === 'string' ? body.name.trim() : ''

    if (!['DIRECT', 'GROUP', 'BRANCH_TO_BRANCH'].includes(type)) {
      return NextResponse.json({ error: 'Invalid chat type' }, { status: 400 })
    }

    if (trimmedParticipantIds.length === 0) {
      return NextResponse.json({ error: 'At least one participant is required' }, { status: 400 })
    }

    if (type === 'GROUP' && !name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 })
    }

    if (type === 'DIRECT' && trimmedParticipantIds.length !== 1) {
      return NextResponse.json({ error: 'Direct chat requires exactly one participant' }, { status: 400 })
    }

    const [groupEligibleContacts, directEligibleContacts] = await Promise.all([
      listAvailablePortalChatContacts(session.user.id, sarafId, accessContext.accessMode),
      listPortalDirectChatContacts(session.user.id, sarafId, accessContext.accessMode),
    ])

    const allowedUserIds = new Set(
      (type === 'DIRECT' ? directEligibleContacts : groupEligibleContacts).map((contact) => contact.id)
    )

    if (!trimmedParticipantIds.every((id) => allowedUserIds.has(id))) {
      return NextResponse.json(
        {
          error:
            type === 'DIRECT'
              ? 'Selected participant is not available for direct chat'
              : 'One or more participants must be connected before they can join this group',
        },
        { status: 400 }
      )
    }

    const resolvedSarafId =
      accessContext.accessMode === 'ADMIN' || accessContext.accessMode === 'USER'
        ? await resolveChatSarafIdFromParticipants(trimmedParticipantIds)
        : sarafId

    if (!resolvedSarafId) {
      return NextResponse.json(
        { error: 'Selected participants must belong to one approved saraf network' },
        { status: 400 }
      )
    }

    if (type !== 'GROUP') {
      const expectedUserIds = [session.user.id, ...trimmedParticipantIds].sort()

      const existingChats = await prisma.internalChat.findMany({
        where: {
          sarafId: resolvedSarafId,
          type,
          participants: {
            some: {
              userId: session.user.id,
            },
          },
        },
        select: {
          id: true,
          type: true,
          name: true,
          sarafId: true,
          createdAt: true,
          updatedAt: true,
          participants: {
            include: {
              user: {
                select: buildPortalParticipantUserSelect(resolvedSarafId, accessContext.accessMode),
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      })

      const reusableChat = existingChats.find((chat) => {
        const participantUserIds = chat.participants.map((participant) => participant.userId).sort()
        return (
          participantUserIds.length === expectedUserIds.length &&
          participantUserIds.every((userId, index) => userId === expectedUserIds[index])
        )
      })

      if (reusableChat) {
        return NextResponse.json({
          success: true,
          reused: true,
          chat: {
            ...reusableChat,
            participants: reusableChat.participants.map((participant) => ({
              ...participant,
              user: mapPortalParticipantUser(participant.user),
            })),
          },
        })
      }
    }

    const chat = await prisma.$transaction(async (tx) => {
      const createdChat = await tx.internalChat.create({
        data: {
          sarafId: resolvedSarafId,
          type,
          name: name || null,
        },
      })

      await tx.internalChatParticipant.createMany({
        data: [
          {
            chatId: createdChat.id,
            userId: session.user.id,
          },
          ...trimmedParticipantIds.map((userId) => ({
            chatId: createdChat.id,
            userId,
          })),
        ],
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'INTERNAL_CHAT_CREATED',
          resource: 'INTERNAL_CHAT',
          resourceId: createdChat.id,
          details: JSON.stringify({
            type,
            participantIds: trimmedParticipantIds,
            name: name || null,
          }),
        },
      })

      return createdChat
    })

    return NextResponse.json({
      success: true,
      chat,
    })
  } catch (error) {
    console.error('Internal chat creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create chat' },
      { status: 500 }
    )
  }
}
