import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    if (courseId) {
      const enrollment = await prisma.userCourseEnrollment.findUnique({
        where: {
          userId_courseId: {
            userId: session.user.id,
            courseId: sanitizeInput(courseId)
          }
        },
        include: {
          course: {
            select: {
              id: true,
              title: true,
              description: true,
              thumbnailUrl: true
            }
          }
        }
      })

      return NextResponse.json(enrollment)
    }

    const enrollments = await prisma.userCourseEnrollment.findMany({
      where: { userId: session.user.id },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            duration: true,
            level: true,
            category: true
          }
        }
      },
      orderBy: { enrolledAt: 'desc' }
    })

    return NextResponse.json(enrollments)
  } catch (error) {
    console.error('Enrollment fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId } = await request.json()
    
    if (!courseId) {
      return NextResponse.json({ error: 'Course ID required' }, { status: 400 })
    }

    const sanitizedCourseId = sanitizeInput(courseId)

    const course = await prisma.educationCourse.findUnique({
      where: { id: sanitizedCourseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ error: 'Course not available' }, { status: 400 })
    }

    const existing = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: sanitizedCourseId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Already enrolled' }, { status: 400 })
    }

    if (course.isPremium && course.price > 0) {
      return NextResponse.json({ 
        error: 'Payment required',
        requiresPayment: true,
        amount: course.price
      }, { status: 402 })
    }

    const enrollment = await prisma.userCourseEnrollment.create({
      data: {
        userId: session.user.id,
        courseId: sanitizedCourseId,
        progress: 0,
        isCompleted: false
      }
    })

    await prisma.educationCourse.update({
      where: { id: sanitizedCourseId },
      data: {
        enrollments: { increment: 1 }
      }
    })

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'ثبت نام در دوره',
        message: `شما با موفقیت در دوره "${course.title}" ثبت نام کردید`,
        type: 'success',
        action: 'COURSE_ENROLLED',
        resource: 'COURSE',
        resourceId: sanitizedCourseId
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COURSE_ENROLLED',
        resource: 'EDUCATION',
        resourceId: sanitizedCourseId,
        details: JSON.stringify({ courseTitle: course.title })
      }
    })

    return NextResponse.json({
      success: true,
      enrollment: {
        id: enrollment.id,
        courseId: enrollment.courseId,
        enrolledAt: enrollment.enrolledAt
      }
    })

  } catch (error) {
    console.error('Course enrollment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
