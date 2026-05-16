import { NextRequest, NextResponse } from 'next/server'
import { fetchAllPersianTechNews } from '@/lib/rssParser-tech-only'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '10')
    const refresh = searchParams.get('refresh') === 'true'

    if (refresh) {
      const freshNews = await fetchAllPersianTechNews()

      // Upsert into DB by URL (unique)
      for (const item of freshNews) {
        if (!item?.url) continue
        await prisma.techNews.upsert({
          where: { url: item.url },
          update: {
            title: item.title || 'بدون عنوان',
            description: item.description || null,
            content: item.content || null,
            source: item.source || 'unknown',
            category: item.category || 'technology',
            language: item.language || 'fa',
            imageUrl: item.imageUrl || null,
            publishedAt: item.publishedAt ? new Date(item.publishedAt) : new Date(),
            isActive: true,
          },
          create: {
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
            views: 0,
          }
        })
      }
    }

    const where: any = { isActive: true }
    if (category && category !== 'all') where.category = category

    const news = await prisma.techNews.findMany({
      where,
      orderBy: { publishedAt: 'desc' },
      take: Math.min(limit, 50),
      select: {
        id: true,
        title: true,
        description: true,
        url: true,
        source: true,
        category: true,
        imageUrl: true,
        publishedAt: true,
        views: true,
        isActive: true
      }
    })

    return NextResponse.json(
      news.map((n) => ({
        ...n,
        publishedAt: n.publishedAt.toISOString()
      })),
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Tech news fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch tech news' }, { status: 500 })
  }
}
