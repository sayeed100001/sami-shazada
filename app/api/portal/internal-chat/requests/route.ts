import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import {
  buildPortalParticipantUserSelect,
  listPortalDirectoryEntries,
  mapPortalParticipantUser,
  resolveInternalPortalChatAccess,
} from '@/lib/portal-internal-chat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolveInternalPortalChatAccess(session)
    if (!accessContext) {
      return NextResponse.json({ error: 'Messenger access not found' }, { status: 404 })
    }

    const [directory, incomingRequests, outgoingRequests] = await Promise.all([
      listPortalDirectoryEntries(session.user.id, accessContext.sarafId, accessContext.accessMode),
      prisma.portalConnectionRequest.findMany({
        where: {
          targetId: session.user.id,
          status: 'PENDING',
        },
        include: {
          requester: {
            select: buildPortalParticipantUserSelect(accessContext.sarafId, accessContext.accessMode),
          },
          target: {
            select: buildPortalParticipantUserSelect(accessContext.sarafId, accessContext.accessMode),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
      prisma.portalConnectionRequest.findMany({
        where: {
          requesterId: session.user.id,
          status: 'PENDING',
        },
        include: {
          requester: {
            select: buildPortalParticipantUserSelect(accessContext.sarafId, accessContext.accessMode),
          },
          target: {
            select: buildPortalParticipantUserSelect(accessContext.sarafId, accessContext.accessMode),
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({
      directory,
      incomingRequests: incomingRequests.map((request) => ({
        ...request,
        requester: mapPortalParticipantUser(request.requester),
        target: mapPortalParticipantUser(request.target),
      })),
      outgoingRequests: outgoingRequests.map((request) => ({
        ...request,
        requester: mapPortalParticipantUser(request.requester),
        target: mapPortalParticipantUser(request.target),
      })),
    })
  } catch (error) {
    console.error('Portal connection request fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch connection requests' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolveInternalPortalChatAccess(session)
    if (!accessContext) {
      return NextResponse.json({ error: 'Messenger access not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const targetId = typeof body.targetId === 'string' ? body.targetId.trim() : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 240) : null

    if (!targetId || targetId === session.user.id) {
      return NextResponse.json({ error: 'Invalid connection target' }, { status: 400 })
    }

    const directory = await listPortalDirectoryEntries(session.user.id, accessContext.sarafId, accessContext.accessMode)
    const target = directory.find((entry) => entry.id === targetId)

    if (!target) {
      return NextResponse.json({ error: 'Target user is not available in portal messenger' }, { status: 404 })
    }

    if (target.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Administrative users are visible for oversight only and do not use connection requests here' },
        { status: 400 }
      )
    }

    if (target.connectionStatus === 'CONNECTED') {
      return NextResponse.json({ success: true, status: 'CONNECTED' })
    }

    const existingRequests = await prisma.portalConnectionRequest.findMany({
      where: {
        OR: [
          { requesterId: session.user.id, targetId },
          { requesterId: targetId, targetId: session.user.id },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 4,
    })

    const pendingIncoming = existingRequests.find(
      (entry) => entry.requesterId === targetId && entry.targetId === session.user.id && entry.status === 'PENDING'
    )

    if (pendingIncoming) {
      const accepted = await prisma.portalConnectionRequest.update({
        where: { id: pendingIncoming.id },
        data: {
          status: 'ACCEPTED',
          respondedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, status: 'ACCEPTED', request: accepted })
    }

    const pendingOutgoing = existingRequests.find(
      (entry) => entry.requesterId === session.user.id && entry.targetId === targetId && entry.status === 'PENDING'
    )

    if (pendingOutgoing) {
      return NextResponse.json({ success: true, status: 'PENDING', request: pendingOutgoing })
    }

    const reusableOutgoing = existingRequests.find(
      (entry) => entry.requesterId === session.user.id && entry.targetId === targetId
    )

    const connectionRequest = reusableOutgoing
      ? await prisma.portalConnectionRequest.update({
          where: { id: reusableOutgoing.id },
          data: {
            status: 'PENDING',
            note,
            respondedAt: null,
          },
        })
      : await prisma.portalConnectionRequest.create({
          data: {
            requesterId: session.user.id,
            targetId,
            note,
          },
        })

    return NextResponse.json({ success: true, status: 'PENDING', request: connectionRequest })
  } catch (error) {
    console.error('Portal connection request create error:', error)
    return NextResponse.json({ error: 'Failed to create connection request' }, { status: 500 })
  }
}
