import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import {
  getGuestDisplayContact,
  fromGuestChatSessionRef,
  isGuestChatSessionRef,
  toGuestChatSessionRef,
} from '@/lib/guest-chat'

export const dynamic = 'force-dynamic'

type NormalizedSession = {
  id: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
  }
  messages: Array<{
    id: string
    message: string
    timestamp: Date
    senderRole: string
    isRead: boolean
  }>
  _count: {
    messages: number
  }
  unreadCount: number
  kind: 'SUPPORT' | 'VISITOR'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawLimit = parseInt(searchParams.get('limit') || '10', 10)
    const rawPage = parseInt(searchParams.get('page') || '1', 10)
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 10
    const page = Number.isFinite(rawPage) ? Math.max(rawPage, 1) : 1
    const status = (searchParams.get('status') || 'ALL').trim().toUpperCase()
    const search = (searchParams.get('search') || '').trim().slice(0, 100)
    const skip = (page - 1) * limit
    const fetchWindow = skip + limit

    const supportFilters: any[] = [{ type: 'SUPPORT' }]
    const guestFilters: any[] = [{ type: 'VISITOR_TO_ADMIN' }]

    if (status === 'ACTIVE') {
      supportFilters.push({ isActive: true })
      guestFilters.push({ isActive: true })
    } else if (status === 'INACTIVE') {
      supportFilters.push({ isActive: false })
      guestFilters.push({ isActive: false })
    }

    if (search) {
      supportFilters.push({
        user: {
          is: {
            OR: [
              { name: caseInsensitiveContains(search) },
              { email: caseInsensitiveContains(search) },
              { phone: caseInsensitiveContains(search) },
            ],
          },
        },
      })

      guestFilters.push({
        OR: [
          { visitorName: caseInsensitiveContains(search) },
          { visitorEmail: caseInsensitiveContains(search) },
          { visitorPhone: caseInsensitiveContains(search) },
        ],
      })
    }

    const supportWhere = supportFilters.length === 1 ? supportFilters[0] : { AND: supportFilters }
    const guestWhere = guestFilters.length === 1 ? guestFilters[0] : { AND: guestFilters }

    const [
      supportSessions,
      totalSupportCount,
      guestSessions,
      totalGuestCount,
    ] = await Promise.all([
      prisma.chatSession.findMany({
        where: supportWhere,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              isActive: true,
            },
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              timestamp: true,
              senderRole: true,
              isRead: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: fetchWindow,
      }),
      prisma.chatSession.count({ where: supportWhere }),
      prisma.guestChatSession.findMany({
        where: guestWhere,
        include: {
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: {
              id: true,
              message: true,
              senderType: true,
              isRead: true,
              createdAt: true,
            },
          },
          _count: {
            select: {
              messages: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: fetchWindow,
      }),
      prisma.guestChatSession.count({ where: guestWhere }),
    ])

    const supportSessionIds = supportSessions.map((chatSession) => chatSession.id)
    const guestSessionIds = guestSessions.map((guestSession) => guestSession.id)

    const [supportUnreadMessages, guestUnreadMessages] = await Promise.all([
      supportSessionIds.length > 0
        ? prisma.chatMessage.findMany({
            where: {
              sessionId: { in: supportSessionIds },
              senderRole: { not: 'ADMIN' },
              isRead: false,
            },
            select: { sessionId: true },
            take: 5000,
          })
        : Promise.resolve([]),
      guestSessionIds.length > 0
        ? prisma.guestChatMessage.findMany({
            where: {
              sessionId: { in: guestSessionIds },
              senderType: 'VISITOR',
              isRead: false,
            },
            select: { sessionId: true },
            take: 5000,
          })
        : Promise.resolve([]),
    ])

    const supportUnreadCountBySession = new Map<string, number>()
    for (const message of supportUnreadMessages) {
      supportUnreadCountBySession.set(
        message.sessionId,
        (supportUnreadCountBySession.get(message.sessionId) || 0) + 1
      )
    }

    const guestUnreadCountBySession = new Map<string, number>()
    for (const message of guestUnreadMessages) {
      guestUnreadCountBySession.set(
        message.sessionId,
        (guestUnreadCountBySession.get(message.sessionId) || 0) + 1
      )
    }

    const normalizedSupportSessions: NormalizedSession[] = supportSessions.map((chatSession) => ({
      id: chatSession.id,
      isActive: chatSession.isActive,
      createdAt: chatSession.createdAt,
      updatedAt: chatSession.updatedAt,
      user: chatSession.user,
      messages: chatSession.messages.map((message) => ({
        id: message.id,
        message: message.message,
        timestamp: message.timestamp,
        senderRole: message.senderRole,
        isRead: message.isRead,
      })),
      _count: { messages: chatSession._count.messages },
      unreadCount: supportUnreadCountBySession.get(chatSession.id) || 0,
      kind: 'SUPPORT',
    }))

    const normalizedGuestSessions: NormalizedSession[] = guestSessions.map((guestSession) => ({
      id: toGuestChatSessionRef(guestSession.id),
      isActive: guestSession.isActive,
      createdAt: guestSession.createdAt,
      updatedAt: guestSession.updatedAt,
      user: {
        id: toGuestChatSessionRef(guestSession.id),
        name: guestSession.visitorName,
        email: getGuestDisplayContact(guestSession.visitorEmail, guestSession.visitorPhone),
        role: 'VISITOR',
        isActive: true,
      },
      messages: guestSession.messages.map((message) => ({
        id: message.id,
        message: message.message,
        timestamp: message.createdAt,
        senderRole: message.senderType,
        isRead: message.isRead,
      })),
      _count: { messages: guestSession._count.messages },
      unreadCount: guestUnreadCountBySession.get(guestSession.id) || 0,
      kind: 'VISITOR',
    }))

    const combinedSessions = [...normalizedSupportSessions, ...normalizedGuestSessions]
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .slice(skip, skip + limit)

    const totalCount = totalSupportCount + totalGuestCount
    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      sessions: combinedSessions,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    })
  } catch (error) {
    console.error('Admin chat sessions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, sessionIds } = await request.json()

    if (!action || !sessionIds || !Array.isArray(sessionIds)) {
      return NextResponse.json({ error: 'Invalid request data' }, { status: 400 })
    }

    const supportIds = sessionIds.filter((id: string) => !isGuestChatSessionRef(id))
    const guestIds = sessionIds
      .map((id: string) => fromGuestChatSessionRef(id))
      .filter((id: string | null): id is string => Boolean(id))

    let affectedCount = 0

    switch (action) {
      case 'close': {
        const [supportResult, guestResult] = await Promise.all([
          supportIds.length > 0
            ? prisma.chatSession.updateMany({
                where: { id: { in: supportIds }, type: 'SUPPORT' },
                data: { isActive: false },
              })
            : Promise.resolve({ count: 0 }),
          guestIds.length > 0
            ? prisma.guestChatSession.updateMany({
                where: { id: { in: guestIds }, type: 'VISITOR_TO_ADMIN' },
                data: { isActive: false },
              })
            : Promise.resolve({ count: 0 }),
        ])
        affectedCount = supportResult.count + guestResult.count
        break
      }
      case 'reopen': {
        const [supportResult, guestResult] = await Promise.all([
          supportIds.length > 0
            ? prisma.chatSession.updateMany({
                where: { id: { in: supportIds }, type: 'SUPPORT' },
                data: { isActive: true },
              })
            : Promise.resolve({ count: 0 }),
          guestIds.length > 0
            ? prisma.guestChatSession.updateMany({
                where: { id: { in: guestIds }, type: 'VISITOR_TO_ADMIN' },
                data: { isActive: true },
              })
            : Promise.resolve({ count: 0 }),
        ])
        affectedCount = supportResult.count + guestResult.count
        break
      }
      case 'mark_read': {
        const [supportResult, guestResult] = await Promise.all([
          supportIds.length > 0
            ? prisma.chatMessage.updateMany({
                where: {
                  sessionId: { in: supportIds },
                  senderRole: { not: 'ADMIN' },
                },
                data: { isRead: true },
              })
            : Promise.resolve({ count: 0 }),
          guestIds.length > 0
            ? prisma.guestChatMessage.updateMany({
                where: {
                  sessionId: { in: guestIds },
                  senderType: 'VISITOR',
                },
                data: { isRead: true },
              })
            : Promise.resolve({ count: 0 }),
        ])
        affectedCount = supportResult.count + guestResult.count
        break
      }
      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `CHAT_BULK_${String(action).toUpperCase()}`,
        resource: 'CHAT',
        details: JSON.stringify({
          sessionIds,
          affectedCount,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      affectedCount,
      action,
    })
  } catch (error) {
    console.error('Admin chat bulk action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
