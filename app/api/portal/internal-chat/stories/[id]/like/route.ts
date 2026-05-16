import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const type = typeof body.type === 'string' ? body.type.toUpperCase() : 'LIKE'
    const allowedTypes = ['LIKE', 'LOVE', 'HAHA', 'WOW', 'SAD']
    const reactionType = allowedTypes.includes(type) ? type : 'LIKE'

    const storyId = params.id

    const story = await prisma.portalStory.findUnique({
      where: { id: storyId },
      select: { userId: true },
    })

    if (!story) {
      return NextResponse.json({ error: 'Story not found' }, { status: 404 })
    }

    const existingLike = await prisma.portalStoryLike.findUnique({
      where: {
        storyId_userId: {
          storyId,
          userId: session.user.id,
        },
      },
    })

    if (existingLike) {
      if (existingLike.type === reactionType) {
        // Toggle off if same type
        await prisma.portalStoryLike.delete({
          where: { id: existingLike.id },
        })
        return NextResponse.json({ liked: false, type: null })
      } else {
        // Update type if different
        await prisma.portalStoryLike.update({
          where: { id: existingLike.id },
          data: { type: reactionType },
        })
        return NextResponse.json({ liked: true, type: reactionType })
      }
    } else {
      await prisma.portalStoryLike.create({
        data: {
          storyId,
          userId: session.user.id,
          type: reactionType,
        },
      })
      return NextResponse.json({ liked: true, type: reactionType })
    }
  } catch (error) {
    console.error('Story like error:', error)
    return NextResponse.json({ error: 'Failed to like story' }, { status: 500 })
  }
}
