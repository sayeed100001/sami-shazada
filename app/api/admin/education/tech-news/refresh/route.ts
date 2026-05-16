import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { fetchAllPersianTechNews } from '@/lib/rssParser-tech-only'

export const dynamic = 'force-dynamic'

const TECH_NEWS_REFRESH_COOLDOWN_MS = 60 * 1000
let lastTechNewsRefreshAt = 0

export async function POST() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = Date.now()
    const cooldownRemainingMs = lastTechNewsRefreshAt + TECH_NEWS_REFRESH_COOLDOWN_MS - now
    if (cooldownRemainingMs > 0) {
      return NextResponse.json(
        {
          error: 'Tech news refresh is on cooldown. Please wait before refreshing again.',
          retryAfterSeconds: Math.ceil(cooldownRemainingMs / 1000),
        },
        { status: 429 }
      )
    }

    const freshNews = await fetchAllPersianTechNews()

    if (!Array.isArray(freshNews) || freshNews.length === 0) {
      return NextResponse.json(
        { error: 'No news fetched from RSS sources' },
        { status: 502 }
      )
    }

    lastTechNewsRefreshAt = now

    let newsCreated = 0
    let newsUpdated = 0
    let errors = 0

    for (const item of freshNews) {
      try {
        if (!item?.url) continue

        const existed = await prisma.techNews.findUnique({
          where: { url: item.url },
          select: { id: true }
        })

        if (existed) {
          await prisma.techNews.update({
            where: { id: existed.id },
            data: {
              title: item.title || 'بدون عنوان',
              description: item.description || null,
              content: item.content || null,
              source: item.source || 'unknown',
              category: item.category || 'technology',
              language: item.language || 'fa',
              imageUrl: item.imageUrl || null,
              publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
              isActive: true
            }
          })
          newsUpdated++
        } else {
          await prisma.techNews.create({
            data: {
              title: item.title || 'بدون عنوان',
              description: item.description || null,
              content: item.content || null,
              url: item.url,
              source: item.source || 'unknown',
              category: item.category || 'technology',
              language: item.language || 'fa',
              imageUrl: item.imageUrl || null,
              publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
              isActive: true,
              views: 0
            }
          })
          newsCreated++
        }
      } catch (error) {
        console.error('Error processing tech news item:', error)
        errors++
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'TECH_NEWS_REFRESHED',
        resource: 'EDUCATION',
        resourceId: 'tech-news-refresh',
        details: JSON.stringify({
          newsCreated,
          newsUpdated,
          errors,
          fetched: freshNews.length,
          timestamp: new Date().toISOString()
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: `Tech news refreshed. Created: ${newsCreated}, Updated: ${newsUpdated}, Errors: ${errors}`,
      stats: {
        fetched: freshNews.length,
        created: newsCreated,
        updated: newsUpdated,
        errors
      }
    })
  } catch (error) {
    console.error('Tech news refresh error:', error)
    return NextResponse.json({ error: 'Failed to refresh tech news' }, { status: 500 })
  }
}
