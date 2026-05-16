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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const courseId = params.id

    const course = await prisma.educationCourse.findFirst({
      where: {
        id: courseId,
        isPublished: true
      },
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
        content: true,
        tags: true,
        rating: true,
        enrollments: true,
        createdAt: true
      }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    return NextResponse.json(
      {
        ...course,
        tags: safeParseTags(course.tags),
        createdAt: course.createdAt.toISOString()
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch (error) {
    console.error('Course fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
