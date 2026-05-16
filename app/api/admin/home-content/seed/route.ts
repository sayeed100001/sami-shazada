import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getAllDefaultHomePageContents,
  HOME_PAGE_INITIALIZED_CONFIG_KEY,
  HOME_PAGE_POSITION,
  serializeHomePageContent,
} from '@/lib/home-page-content'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.contentItem.findMany({
      where: { position: HOME_PAGE_POSITION },
      select: { title: true, type: true, content: true },
    })

    const existingKeys = new Set(
      existing.map((item) => {
        try {
          const parsed = JSON.parse(item.content)
          return `${parsed.language}:${item.type}:${parsed.order}`
        } catch {
          return `${item.type}:${item.title}`
        }
      })
    )

    let created = 0
    let skipped = 0

    for (const item of getAllDefaultHomePageContents()) {
      const key = `${item.language}:${item.section}:${item.order}`
      if (existingKeys.has(key)) {
        skipped += 1
        continue
      }

      await prisma.contentItem.create({
        data: serializeHomePageContent(item),
      })
      created += 1
    }

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
        action: 'HOME_CONTENT_SEEDED',
        resource: 'HOME_PAGE_CONTENT',
        details: JSON.stringify({ created, skipped }),
      },
    })

    return NextResponse.json({ success: true, created, skipped })
  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json({ error: 'Failed to seed home content' }, { status: 500 })
  }
}
