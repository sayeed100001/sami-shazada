import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  listAvailablePortalChatContacts,
  resolveInternalPortalChatAccess,
} from '@/lib/portal-internal-chat'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: NextRequest,
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

    const now = new Date()
    const contacts = await listAvailablePortalChatContacts(session.user.id, accessContext.sarafId, accessContext.accessMode)
    const visibleUserIds = new Set([session.user.id, ...contacts.map((contact) => contact.id)])

    const story = await prisma.portalStory.findFirst({
      where: {
        id: params.id,
        userId: { in: Array.from(visibleUserIds) },
        expiresAt: { gt: now },
      },
      select: {
        id: true,
        userId: true,
      },
    })

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    if (story.userId === session.user.id) {
      return NextResponse.json({ success: true, skipped: true })
    }

    await prisma.portalStoryView.upsert({
      where: {
        storyId_viewerId: {
          storyId: story.id,
          viewerId: session.user.id,
        },
      },
      update: {
        viewedAt: now,
      },
      create: {
        storyId: story.id,
        viewerId: session.user.id,
        viewedAt: now,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal story view error:', error)
    return NextResponse.json({ error: 'Failed to mark story as seen' }, { status: 500 })
  }
}
