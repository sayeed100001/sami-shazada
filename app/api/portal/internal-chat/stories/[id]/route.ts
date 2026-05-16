import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolveInternalPortalChatAccess } from '@/lib/portal-internal-chat'

export const dynamic = 'force-dynamic'

export async function GET(
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

    const story = await prisma.portalStory.findUnique({
      where: { id: params.id },
      include: {
        views: {
          include: {
            viewer: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
          orderBy: { viewedAt: 'desc' },
        },
        likes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    // Only allow creator or admin to see full stats
    if (story.userId !== session.user.id && session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json({
      views: story.views.map(v => ({
        user: v.viewer,
        at: v.viewedAt,
      })),
      likes: story.likes.map(l => ({
        user: l.user,
        at: l.createdAt,
        type: l.type,
      })),
    })
  } catch (error) {
    console.error('Portal story stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 })
  }
}

export async function DELETE(
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

    const story = await prisma.portalStory.findFirst({
      where: {
        id: params.id,
        ...(session.user.role === 'ADMIN' ? {} : { userId: session.user.id }),
      },
      select: {
        id: true,
      },
    })

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    await prisma.$transaction([
      prisma.portalStory.delete({
        where: {
          id: story.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PORTAL_STORY_DELETED',
          resource: 'PORTAL_STORY',
          resourceId: story.id,
        },
      }),
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal story delete error:', error)
    return NextResponse.json({ error: 'Failed to delete story' }, { status: 500 })
  }
}
