import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { resolveInternalPortalChatAccess } from '@/lib/portal-internal-chat'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const action = typeof body.action === 'string' ? body.action.trim().toLowerCase() : ''

    if (!['accept', 'decline', 'cancel'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    const connectionRequest = await prisma.portalConnectionRequest.findUnique({
      where: { id: params.id },
    })

    if (!connectionRequest) {
      return NextResponse.json({ error: 'Connection request not found' }, { status: 404 })
    }

    if (action === 'cancel') {
      if (connectionRequest.requesterId !== session.user.id || connectionRequest.status !== 'PENDING') {
        return NextResponse.json({ error: 'Cannot cancel this request' }, { status: 403 })
      }

      const cancelled = await prisma.portalConnectionRequest.update({
        where: { id: connectionRequest.id },
        data: {
          status: 'CANCELLED',
          respondedAt: new Date(),
        },
      })

      return NextResponse.json({ success: true, request: cancelled })
    }

    if (connectionRequest.targetId !== session.user.id || connectionRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Cannot update this request' }, { status: 403 })
    }

    const updated = await prisma.portalConnectionRequest.update({
      where: { id: connectionRequest.id },
      data: {
        status: action === 'accept' ? 'ACCEPTED' : 'DECLINED',
        respondedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, request: updated })
  } catch (error) {
    console.error('Portal connection request update error:', error)
    return NextResponse.json({ error: 'Failed to update connection request' }, { status: 500 })
  }
}
