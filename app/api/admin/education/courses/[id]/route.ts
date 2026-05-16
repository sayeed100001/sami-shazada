import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteManagedImage } from '@/lib/managed-image-storage'
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const courseId = params.id

    const existingCourse = await prisma.educationCourse.findUnique({
      where: { id: courseId },
      select: { id: true, thumbnailUrl: true },
    })

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }
    
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
        : JSON.stringify([]),
      updatedAt: new Date()
    }

    assertAllowedManagedOrInternalImageUrl(courseData.thumbnailUrl, 'thumbnailUrl')

    const course = await prisma.educationCourse.update({
      where: { id: courseId },
      data: courseData
    })

    if (existingCourse.thumbnailUrl && existingCourse.thumbnailUrl !== courseData.thumbnailUrl) {
      await deleteManagedImage(existingCourse.thumbnailUrl)
    }
    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COURSE_UPDATED',
        resource: 'EDUCATION',
        resourceId: course.id,
        details: JSON.stringify({ title: course.title, category: course.category })
      }
    })
    
    return NextResponse.json(serializeCourse(course))

  } catch (error) {
    console.error('Course update error:', error)
    if (error instanceof Error && /managed upload storage|internal asset path/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update course' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseId = params.id

    const existingCourse = await prisma.educationCourse.findUnique({
      where: { id: courseId },
      select: { id: true, thumbnailUrl: true },
    })

    if (!existingCourse) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    await prisma.educationCourse.delete({
      where: { id: courseId }
    })

    await deleteManagedImage(existingCourse.thumbnailUrl)
    
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COURSE_DELETED',
        resource: 'EDUCATION',
        resourceId: courseId,
        details: JSON.stringify({ courseId })
      }
    })
    
    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Course deletion error:', error)
    return NextResponse.json({ error: 'Failed to delete course' }, { status: 500 })
  }
}
