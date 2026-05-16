import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function safeParseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const level = searchParams.get('level')

    const where: any = { isPublished: true }
    if (category && category !== 'all') where.category = category
    if (level && level !== 'all') where.level = level

    const courses = await prisma.educationCourse.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        description: true,
        category: true,
        level: true,
        duration: true,
        price: true,
        isPremium: true,
        thumbnailUrl: true,
        videoUrl: true,
        tags: true,
        rating: true,
        enrollments: true,
        createdAt: true
      },
      take: 100
    })

    return NextResponse.json(
      courses.map((c) => ({
        ...c,
        tags: safeParseTags(c.tags),
        createdAt: c.createdAt.toISOString()
      })),
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Courses fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}
