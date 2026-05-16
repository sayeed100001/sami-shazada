import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import {
  getAllDefaultHomePageContents,
  getDefaultHomePageContents,
  groupHomePageContents,
  HOME_PAGE_INITIALIZED_CONFIG_KEY,
  HOME_PAGE_POSITION,
  normalizeHomePageLanguage,
  parseHomePageContentItem,
  serializeHomePageContent,
  sortHomePageContents,
} from '@/lib/home-page-content'

export const dynamic = 'force-dynamic'

async function ensureHomeContentSeeded() {
  const existingCount = await prisma.contentItem.count({
    where: { position: HOME_PAGE_POSITION },
  })

  if (existingCount > 0) {
    return
  }

  const initializedConfig = await prisma.systemConfig.findUnique({
    where: { key: HOME_PAGE_INITIALIZED_CONFIG_KEY },
    select: { value: true },
  })

  if (initializedConfig?.value === 'true') {
    return
  }

  await prisma.contentItem.createMany({
    data: getAllDefaultHomePageContents().map((item) => serializeHomePageContent(item)),
  })

  await prisma.systemConfig.upsert({
    where: { key: HOME_PAGE_INITIALIZED_CONFIG_KEY },
    update: { value: 'true' },
    create: {
      key: HOME_PAGE_INITIALIZED_CONFIG_KEY,
      value: 'true',
      description: 'Tracks whether home page content has been initialized at least once',
    },
  })
}

export async function GET(request: NextRequest) {
  const normalizedLanguage = normalizeHomePageLanguage(new URL(request.url).searchParams.get('language'))

  try {
    await ensureHomeContentSeeded()

    const items = await prisma.contentItem.findMany({
      where: {
        position: HOME_PAGE_POSITION,
        isActive: true,
      },
      orderBy: [{ createdAt: 'asc' }],
      select: {
        id: true,
        title: true,
        type: true,
        content: true,
        url: true,
        isActive: true,
      },
    })

    const contents = sortHomePageContents(
      items
        .map((item) => parseHomePageContentItem(item))
        .filter((item): item is NonNullable<typeof item> => Boolean(item))
        .filter((item) => item.language === normalizedLanguage)
    )

    const grouped = groupHomePageContents(contents)

    return NextResponse.json(grouped, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      },
    })
  } catch (error) {
    console.error('Error fetching home page content:', error)
    const fallback = groupHomePageContents(getDefaultHomePageContents(normalizedLanguage))
    return NextResponse.json(fallback, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store',
        'X-Content-Fallback': 'true',
      },
    })
  }
}
