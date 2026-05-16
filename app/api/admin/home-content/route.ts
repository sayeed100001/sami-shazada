import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertAllowedManagedOrInternalImageUrl } from '@/lib/image-url-policy'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import {
  getAllDefaultHomePageContents,
  HOME_PAGE_INITIALIZED_CONFIG_KEY,
  HOME_PAGE_POSITION,
  HOME_PAGE_SECTIONS,
  normalizeHomePageLanguage,
  parseHomePageContentItem,
  serializeHomePageContent,
  sortHomePageContents,
  type HomePageSection,
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

  const defaults = getAllDefaultHomePageContents()
  await prisma.contentItem.createMany({
    data: defaults.map((item) => serializeHomePageContent(item)),
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

async function listHomeContents(language: string, section?: string | null) {
  await ensureHomeContentSeeded()

  const items = await prisma.contentItem.findMany({
    where: {
      position: HOME_PAGE_POSITION,
    },
    orderBy: [{ createdAt: 'asc' }],
  })

  const parsed = items
    .map((item) => parseHomePageContentItem(item))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .filter((item) => item.language === language)

  const filtered = section ? parsed.filter((item) => item.section === section) : parsed

  return sortHomePageContents(filtered)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const section = searchParams.get('section')
    const language = normalizeHomePageLanguage(searchParams.get('language'))

    const contents = await listHomeContents(language, section)

    return NextResponse.json({ contents })
  } catch (error) {
    console.error('Error fetching home page content:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const section = sanitizeInput(body.section) as HomePageSection
    const title = sanitizeInput(body.title)
    const badgeText = body.badgeText ? sanitizeInput(body.badgeText) : null
    const subtitle = body.subtitle ? sanitizeInput(body.subtitle) : null
    const description = body.description ? sanitizeInput(body.description) : null
    const icon = body.icon ? sanitizeInput(body.icon) : null
    const value = body.value ? sanitizeInput(body.value) : null
    const linkUrl = body.linkUrl ? sanitizeInput(body.linkUrl) : null
    const linkText = body.linkText ? sanitizeInput(body.linkText) : null
    const imageUrl = body.imageUrl ? sanitizeInput(body.imageUrl) : null
    const order = body.order !== undefined ? validateNumericInput(body.order) : 0
    const isActive = body.isActive !== undefined ? Boolean(body.isActive) : true
    const language = normalizeHomePageLanguage(body.language)

    if (!section || !title) {
      return NextResponse.json({ error: 'Section and title are required' }, { status: 400 })
    }

    if (!HOME_PAGE_SECTIONS.includes(section)) {
      return NextResponse.json({ error: 'Invalid section type' }, { status: 400 })
    }

    assertAllowedManagedOrInternalImageUrl(imageUrl, 'imageUrl')

    const content = await prisma.contentItem.create({
      data: serializeHomePageContent({
        section,
        title,
        badgeText,
        subtitle,
        description,
        icon,
        value,
        linkUrl,
        linkText,
        imageUrl,
        order,
        isActive,
        language,
      }),
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

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HOME_CONTENT_CREATED',
        resource: 'HOME_PAGE_CONTENT',
        resourceId: content.id,
        details: JSON.stringify({ section, title, language }),
      },
    })

    const parsed = parseHomePageContentItem(content)
    return NextResponse.json({ success: true, content: parsed })
  } catch (error) {
    console.error('Error creating home page content:', error)
    if (error instanceof Error && /managed upload storage|internal asset path/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
