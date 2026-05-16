import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  buildPortalParticipantUserSelect,
  listAvailablePortalChatContacts,
  mapPortalParticipantUser,
  resolveInternalPortalChatAccess,
} from '@/lib/portal-internal-chat'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

const STORY_TTL_MS = 24 * 60 * 60 * 1000
const MAX_ACTIVE_STORIES_PER_USER = 8
const ALLOWED_MEDIA_TYPES = new Set(['IMAGE', 'GIF'])
const ALLOWED_BACKGROUND_STYLES = new Set(['amethyst', 'ocean', 'sunset', 'graphite'])

function isValidStoryMediaUrl(value: string) {
  return value.startsWith('/') || /^https?:\/\//i.test(value)
}

function normalizeStoryMediaType(value: string | null, mediaUrl: string | null) {
  const normalized = (value || '').trim().toUpperCase()
  if (normalized && ALLOWED_MEDIA_TYPES.has(normalized)) return normalized
  if (!mediaUrl) return null
  return /\.gif(\?.*)?$/i.test(mediaUrl) ? 'GIF' : 'IMAGE'
}

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

    const now = new Date()
    const sarafId = accessContext.sarafId

    try {
      await prisma.portalStory.deleteMany({
        where: {
          expiresAt: { lte: now },
        },
      })
    } catch (deleteError) {
      console.error('[STORY_FETCH_WARN] Failed to delete expired stories:', deleteError)
      // Continue anyway, it's not critical
    }

    const contacts = await listAvailablePortalChatContacts(session.user.id, sarafId, accessContext.accessMode)
    const visibleUserIds = Array.from(new Set([
      session.user.id, 
      ...contacts.filter(c => c && c.id).map(contact => contact.id)
    ]))
    
    // Removed large userSelect log
    const stories = await prisma.portalStory.findMany({
      where: {
        userId: { in: visibleUserIds },
        expiresAt: { gt: now },
      },
      include: {
        user: {
          select: buildPortalParticipantUserSelect(sarafId, accessContext.accessMode),
        },
        views: {
          where: {
            viewerId: session.user.id,
          },
          select: {
            id: true,
          },
        },
        likes: {
          where: {
            userId: session.user.id,
          },
          select: {
            id: true,
            type: true,
          },
        },
        _count: {
          select: {
            views: true,
            likes: true,
          },
        },
      },
      orderBy: [
        { createdAt: 'asc' },
      ],
    }) as any[]

    const groupMap = new Map<string, {
      user: ReturnType<typeof mapPortalParticipantUser>
      stories: Array<{
        id: string
        caption: string | null
        mediaUrl: string | null
        mediaType: string | null
        backgroundStyle: string | null
        createdAt: string
        expiresAt: string
        seen: boolean
        liked: boolean
        likedType: string | null
        viewCount: number
        likeCount: number
      }>
      latestAt: string
      unseenCount: number
    }>()

    for (const story of stories) {
      if (!story.user) {
        console.warn(`[STORY_FETCH_WARN] Story ${story.id} has no user attached. skipping.`)
        continue
      }
      const user = mapPortalParticipantUser(story.user)
      const existing = groupMap.get(story.userId) || ({
        user,
        stories: [],
        latestAt: story.createdAt.toISOString(),
        unseenCount: 0,
      } as typeof groupMap extends Map<any, infer V> ? V : never)
      const seen = story.userId === session.user.id ? true : story.views.length > 0
      const liked = story.likes.length > 0
      const likedType = story.likes[0]?.type || null
      existing.stories.push({
        id: story.id,
        caption: story.caption,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        backgroundStyle: story.backgroundStyle,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
        seen,
        liked,
        likedType,
        viewCount: story._count.views,
        likeCount: story._count.likes,
      })
      existing.latestAt = story.createdAt.toISOString()
      if (!seen) existing.unseenCount += 1
      groupMap.set(story.userId, existing)
    }

    const storyGroups = Array.from(groupMap.values())
      .map((group) => ({
        ...group,
        allSeen: group.unseenCount === 0,
      }))
      .sort((left, right) => {
        if (left.user.id === session.user.id) return -1
        if (right.user.id === session.user.id) return 1
        if (left.allSeen !== right.allSeen) return left.allSeen ? 1 : -1
        return new Date(right.latestAt).getTime() - new Date(left.latestAt).getTime()
      })

    return NextResponse.json({
      storyGroups,
      maxActiveStoriesPerUser: MAX_ACTIVE_STORIES_PER_USER,
    })
  } catch (error) {
    console.error('[STORY_FETCH_ERROR] Full detail:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
    return NextResponse.json({ 
      error: 'Failed to fetch stories', 
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
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
    const caption = sanitizeInput(typeof body.caption === 'string' ? body.caption : '').trim()
    const mediaUrlRaw = sanitizeInput(typeof body.mediaUrl === 'string' ? body.mediaUrl : '').trim()
    const mediaUrl = mediaUrlRaw || null
    const mediaType = normalizeStoryMediaType(typeof body.mediaType === 'string' ? body.mediaType : null, mediaUrl)
    const backgroundStyleRaw = sanitizeInput(typeof body.backgroundStyle === 'string' ? body.backgroundStyle : '').trim().toLowerCase()
    const backgroundStyle = backgroundStyleRaw && ALLOWED_BACKGROUND_STYLES.has(backgroundStyleRaw) ? backgroundStyleRaw : 'amethyst'

    if (!caption && !mediaUrl) {
      return NextResponse.json({ error: 'Caption or media is required' }, { status: 400 })
    }

    if (caption.length > 240) {
      return NextResponse.json({ error: 'Story caption is too long' }, { status: 400 })
    }

    if (mediaUrl && !isValidStoryMediaUrl(mediaUrl)) {
      return NextResponse.json({ error: 'Invalid story media URL' }, { status: 400 })
    }

    if (mediaUrl && !mediaType) {
      return NextResponse.json({ error: 'Unsupported story media type' }, { status: 400 })
    }

    const now = new Date()
    const activeCount = await prisma.portalStory.count({
      where: {
        userId: session.user.id,
        expiresAt: { gt: now },
      },
    })

    if (activeCount >= MAX_ACTIVE_STORIES_PER_USER) {
      return NextResponse.json({ error: 'Active story limit reached' }, { status: 400 })
    }

    const story = await prisma.$transaction(async (tx) => {
      const createdStory = await tx.portalStory.create({
        data: {
          userId: session.user.id,
          caption: caption || null,
          mediaUrl,
          mediaType,
          backgroundStyle,
          expiresAt: new Date(now.getTime() + STORY_TTL_MS),
        },
        include: {
          user: {
            select: buildPortalParticipantUserSelect(accessContext.sarafId, accessContext.accessMode),
          },
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PORTAL_STORY_CREATED',
          resource: 'PORTAL_STORY',
          resourceId: createdStory.id,
          details: JSON.stringify({
            mediaType,
            hasCaption: !!caption,
          }),
        },
      })

      return createdStory
    })

    return NextResponse.json({
      success: true,
      story: {
        id: story.id,
        caption: story.caption,
        mediaUrl: story.mediaUrl,
        mediaType: story.mediaType,
        backgroundStyle: story.backgroundStyle,
        createdAt: story.createdAt.toISOString(),
        expiresAt: story.expiresAt.toISOString(),
        seen: true,
        liked: false,
        likedType: null,
        viewCount: 0,
        likeCount: 0,
        user: story.user ? mapPortalParticipantUser(story.user) : null,
      },
    })
  } catch (error) {
    console.error('Portal story create error:', error)
    return NextResponse.json({ error: 'Failed to create story' }, { status: 500 })
  }
}
