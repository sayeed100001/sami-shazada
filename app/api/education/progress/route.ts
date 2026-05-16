import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lessonId, watchTime, isCompleted } = await request.json()
    
    if (!lessonId) {
      return NextResponse.json({ error: 'Lesson ID required' }, { status: 400 })
    }

    const sanitizedLessonId = sanitizeInput(lessonId)
    const sanitizedWatchTime = validateNumericInput(watchTime) || 0

    const lesson = await prisma.educationLesson.findUnique({
      where: { id: sanitizedLessonId },
      include: { course: true }
    })

    if (!lesson) {
      return NextResponse.json({ error: 'Lesson not found' }, { status: 404 })
    }

    const enrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 403 })
    }

    const progress = await prisma.userLessonProgress.upsert({
      where: {
        userId_lessonId: {
          userId: session.user.id,
          lessonId: sanitizedLessonId
        }
      },
      update: {
        watchTime: sanitizedWatchTime,
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null
      },
      create: {
        userId: session.user.id,
        lessonId: sanitizedLessonId,
        watchTime: sanitizedWatchTime,
        isCompleted: Boolean(isCompleted),
        completedAt: isCompleted ? new Date() : null
      }
    })

    const totalLessons = await prisma.educationLesson.count({
      where: { courseId: lesson.courseId }
    })

    const completedLessons = await prisma.userLessonProgress.count({
      where: {
        userId: session.user.id,
        lesson: { courseId: lesson.courseId },
        isCompleted: true
      }
    })

    const courseProgress = (completedLessons / totalLessons) * 100

    await prisma.userCourseEnrollment.update({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: lesson.courseId
        }
      },
      data: {
        progress: courseProgress,
        isCompleted: courseProgress === 100,
        completedAt: courseProgress === 100 ? new Date() : null
      }
    })

    if (courseProgress === 100) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: 'تبریک! دوره تکمیل شد',
          message: `شما دوره "${lesson.course.title}" را با موفقیت تکمیل کردید`,
          type: 'success',
          action: 'COURSE_COMPLETED',
          resource: 'COURSE',
          resourceId: lesson.courseId
        }
      })
    }

    return NextResponse.json({
      success: true,
      progress: {
        lessonProgress: progress,
        courseProgress: courseProgress,
        completedLessons,
        totalLessons
      }
    })

  } catch (error) {
    console.error('Update lesson progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = sanitizeInput(searchParams.get('courseId') || '')
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
    }

    const enrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled' }, { status: 404 })
    }

    const lessonsProgress = await prisma.userLessonProgress.findMany({
      where: {
        userId: session.user.id,
        lesson: { courseId }
      },
      include: {
        lesson: {
          select: {
            id: true,
            title: true,
            order: true,
            duration: true
          }
        }
      },
      orderBy: {
        lesson: { order: 'asc' }
      }
    })

    return NextResponse.json({
      enrollment,
      lessonsProgress
    })

  } catch (error) {
    console.error('Get progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
