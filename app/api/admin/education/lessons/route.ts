import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    const where: any = {}
    if (courseId) {
      where.courseId = courseId
    }

    const lessons = await prisma.educationLesson.findMany({
      where,
      orderBy: { order: 'asc' },
      include: {
        course: {
          select: {
            title: true,
            id: true
          }
        },
        progress: {
          select: {
            userId: true,
            isCompleted: true,
            watchTime: true
          }
        }
      }
    })

    return NextResponse.json(lessons)

  } catch (error) {
    console.error('Lessons fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lessons' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate required fields
    if (!body.courseId || !body.title || !body.content) {
      return NextResponse.json({ 
        error: 'Missing required fields: courseId, title, content' 
      }, { status: 400 })
    }

    // Verify course exists
    const course = await prisma.educationCourse.findUnique({
      where: { id: body.courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Get next order number
    const lastLesson = await prisma.educationLesson.findFirst({
      where: { courseId: body.courseId },
      orderBy: { order: 'desc' }
    })

    const nextOrder = lastLesson ? lastLesson.order + 1 : 1

    // Sanitize inputs
    const lessonData = {
      courseId: body.courseId,
      title: sanitizeInput(body.title),
      description: body.description ? sanitizeInput(body.description) : null,
      content: sanitizeInput(body.content),
      videoUrl: body.videoUrl ? sanitizeInput(body.videoUrl) : null,
      duration: parseInt(body.duration) || 0,
      order: body.order || nextOrder,
      isPublished: Boolean(body.isPublished)
    }

    const lesson = await prisma.educationLesson.create({
      data: lessonData,
      include: {
        course: {
          select: {
            title: true,
            id: true
          }
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'LESSON_CREATED',
        resource: 'EDUCATION',
        resourceId: lesson.id,
        details: JSON.stringify({
          lessonTitle: lesson.title,
          courseTitle: lesson.course.title,
          courseId: lesson.courseId
        })
      }
    })

    return NextResponse.json(lesson)

  } catch (error) {
    console.error('Lesson creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create lesson' },
      { status: 500 }
    )
  }
}
