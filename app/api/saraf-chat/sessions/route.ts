import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getGuestDisplayContact, toGuestChatSessionRef } from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

type SarafChatSessionSummary = {
  id: string
  userId: string
  userName: string
  userRole: string
  userEmail?: string
  sarafId: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  isActive: boolean
}

type UserChatSessionSummary = {
  id: string
  sarafId: string | null
  sarafName: string
  lastMessage: string
  lastMessageTime: Date
  unreadCount: number
  isActive: boolean
}

type ChatSessionSummary = SarafChatSessionSummary | UserChatSessionSummary

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let chatSessions: ChatSessionSummary[] = []

    if (session.user.role === 'SARAF') {
      const saraf = await prisma.saraf.findFirst({
        where: { userId: session.user.id },
        select: { id: true },
      })

      if (saraf) {
        const [sessions, guestSessions] = await Promise.all([
          prisma.chatSession.findMany({
            where: {
              sarafId: saraf.id,
              type: 'SARAF',
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  role: true,
                },
              },
              messages: {
                orderBy: { timestamp: 'desc' },
                take: 1,
                select: {
                  id: true,
                  message: true,
                  timestamp: true,
                  createdAt: true,
                },
              },
              _count: {
                select: {
                  messages: {
                    where: {
                      isRead: false,
                      senderRole: { not: 'SARAF' },
                    },
                  },
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          }),
          prisma.guestChatSession.findMany({
            where: {
              sarafId: saraf.id,
              type: 'VISITOR_TO_SARAF',
            },
            include: {
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: {
                  id: true,
                  message: true,
                  createdAt: true,
                },
              },
              _count: {
                select: {
                  messages: {
                    where: {
                      isRead: false,
                      senderType: 'VISITOR',
                    },
                  },
                },
              },
            },
            orderBy: { updatedAt: 'desc' },
          }),
        ])

        chatSessions = [
          ...sessions.map((chat) => ({
            id: chat.id,
            userId: chat.user.id,
            userName: chat.user.name,
            userRole: chat.user.role,
            userEmail: chat.user.email,
            sarafId: saraf.id,
            lastMessage: chat.messages[0]?.message || '',
            lastMessageTime:
              chat.messages[0]?.timestamp || chat.messages[0]?.createdAt || chat.updatedAt,
            unreadCount: chat._count.messages,
            isActive: chat.isActive,
          })),
          ...guestSessions.map((chat) => ({
            id: toGuestChatSessionRef(chat.id),
            userId: toGuestChatSessionRef(chat.id),
            userName: chat.visitorName,
            userRole: 'VISITOR',
            userEmail: getGuestDisplayContact(chat.visitorEmail, chat.visitorPhone),
            sarafId: saraf.id,
            lastMessage: chat.messages[0]?.message || '',
            lastMessageTime: chat.messages[0]?.createdAt || chat.updatedAt,
            unreadCount: chat._count.messages,
            isActive: chat.isActive,
          })),
        ].sort((a, b) => b.lastMessageTime.getTime() - a.lastMessageTime.getTime())
      }
    } else {
      const sessions = await prisma.chatSession.findMany({
        where: {
          userId: session.user.id,
          type: 'SARAF',
          isActive: true,
          sarafId: { not: null },
        },
        include: {
          messages: {
            orderBy: { timestamp: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              senderName: true,
              senderRole: true,
              isRead: true,
              timestamp: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: {
                where: {
                  isRead: false,
                  senderRole: 'SARAF',
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
      })

      const sarafIds = sessions.map((item) => item.sarafId).filter(Boolean) as string[]
      const sarafs = sarafIds.length
        ? await prisma.saraf.findMany({
            where: { id: { in: sarafIds } },
            select: { id: true, businessName: true },
          })
        : []

      const sarafNameById = new Map(sarafs.map((item) => [item.id, item.businessName]))

      chatSessions = sessions.map((chat) => ({
        id: chat.id,
        sarafId: chat.sarafId,
        sarafName: (chat.sarafId ? sarafNameById.get(chat.sarafId) : null) || 'Saraf',
        lastMessage: chat.messages[0]?.message || '',
        lastMessageTime: chat.messages[0]?.timestamp || chat.messages[0]?.createdAt || chat.updatedAt,
        unreadCount: chat._count.messages,
        isActive: chat.isActive,
      }))
    }

    return NextResponse.json(chatSessions)
  } catch (error) {
    console.error('Saraf chat sessions error:', error)
    return NextResponse.json({ error: 'Failed to fetch chat sessions' }, { status: 500 })
  }
}
