import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertAllowedManagedOrInternalImageUrl } from '@/lib/image-url-policy'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

type CourseWithDatesAndTags = {
  tags: string
  createdAt: Date
  updatedAt: Date
}

function parseCourseTags(tags: string): string[] {
  try {
    const parsed = JSON.parse(tags || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function serializeCourse<T extends CourseWithDatesAndTags>(course: T) {
  return {
    ...course,
    tags: parseCourseTags(course.tags),
    createdAt: course.createdAt.toISOString(),
    updatedAt: course.updatedAt.toISOString(),
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courses = await prisma.educationCourse.findMany({
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
        isPublished: true,
        thumbnailUrl: true,
        videoUrl: true,
        content: true,
        tags: true,
        rating: true,
        enrollments: true,
        createdAt: true,
        updatedAt: true
      },
      take: 200
    })

    return NextResponse.json(courses.map(serializeCourse), {
      headers: { 'Cache-Control': 'no-store' }
    })

  } catch (error) {
    console.error('Admin courses fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch courses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    if (!body.title || !body.description || !body.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const courseData = {
      title: sanitizeInput(body.title),
      description: sanitizeInput(body.description),
      category: sanitizeInput(body.category) || 'finance',
      level: sanitizeInput(body.level) || 'beginner',
      duration: parseInt(body.duration) || 30,
      price: parseFloat(body.price) || 0,
      isPremium: Boolean(body.isPremium),
      isPublished: Boolean(body.isPublished),
      thumbnailUrl: body.thumbnailUrl ? sanitizeInput(body.thumbnailUrl) : null,
      videoUrl: body.videoUrl ? sanitizeInput(body.videoUrl) : null,
      content: sanitizeInput(body.content),
      tags: Array.isArray(body.tags) && body.tags.length > 0 
        ? JSON.stringify(body.tags.map((tag: string) => sanitizeInput(tag)))
        : JSON.stringify([])
    }

    assertAllowedManagedOrInternalImageUrl(courseData.thumbnailUrl, 'thumbnailUrl')

    const course = await prisma.educationCourse.create({ data: courseData })
    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COURSE_CREATED',
        resource: 'EDUCATION',
        resourceId: course.id,
        details: JSON.stringify({ title: course.title, category: course.category })
      }
    })
    
    return NextResponse.json(serializeCourse(course), { status: 201 })

  } catch (error) {
    console.error('Course creation error:', error)
    if (error instanceof Error && /managed upload storage|internal asset path/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create course' }, { status: 500 })
  }
}
