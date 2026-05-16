import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseId = sanitizeInput(params.id)

    // Check if course exists and is published
    const course = await prisma.educationCourse.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    if (!course.isPublished) {
      return NextResponse.json({ error: 'Course not available' }, { status: 400 })
    }

    // Check if user is already enrolled
    const existingEnrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    if (existingEnrollment) {
      return NextResponse.json({ 
        error: 'Already enrolled in this course',
        enrollment: existingEnrollment
      }, { status: 400 })
    }

    if (course.isPremium && course.price > 0) {
      return NextResponse.json({ 
        error: 'Payment required',
        requiresPayment: true,
        amount: course.price
      }, { status: 402 })
    }

    // Create enrollment
    const enrollment = await prisma.userCourseEnrollment.create({
      data: {
        userId: session.user.id,
        courseId: courseId,
        progress: 0,
        isCompleted: false
      }
    })

    // Update course enrollment count
    await prisma.educationCourse.update({
      where: { id: courseId },
      data: {
        enrollments: {
          increment: 1
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COURSE_ENROLLED',
        resource: 'EDUCATION',
        resourceId: courseId,
        details: JSON.stringify({
          courseTitle: course.title,
          courseCategory: course.category
        })
      }
    })

    // Create notification for user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'ثبت نام موفق',
        message: `شما با موفقیت در دوره "${course.title}" ثبت نام کردید.`,
        type: 'success',
        action: 'COURSE_ENROLLED',
        resource: 'COURSE',
        resourceId: courseId
      }
    })

    return NextResponse.json({
      success: true,
      enrollment,
      message: 'Successfully enrolled in course'
    })

  } catch (error) {
    console.error('Course enrollment error:', error)
    return NextResponse.json(
      { error: 'Failed to enroll in course' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const courseId = sanitizeInput(params.id)

    // Find and delete enrollment
    const enrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this course' }, { status: 404 })
    }

    // Delete enrollment
    await prisma.userCourseEnrollment.delete({
      where: {
        userId_courseId: {
          userId: session.user.id,
          courseId: courseId
        }
      }
    })

    // Update course enrollment count
    await prisma.educationCourse.update({
      where: { id: courseId },
      data: {
        enrollments: {
          decrement: 1
        }
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COURSE_UNENROLLED',
        resource: 'EDUCATION',
        resourceId: courseId
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Successfully unenrolled from course'
    })

  } catch (error) {
    console.error('Course unenrollment error:', error)
    return NextResponse.json(
      { error: 'Failed to unenroll from course' },
      { status: 500 }
    )
  }
}
