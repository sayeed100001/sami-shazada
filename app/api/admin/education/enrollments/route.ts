import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where = courseId ? { courseId } : {}

    const [enrollments, total] = await Promise.all([
      prisma.userCourseEnrollment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { enrolledAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          },
          course: {
            select: {
              id: true,
              title: true,
              category: true,
              price: true,
              isPremium: true
            }
          }
        }
      }),
      prisma.userCourseEnrollment.count({ where })
    ])

    return NextResponse.json({
      enrollments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Enrollments fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch enrollments' },
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
    const { userId, courseId } = body

    if (!userId || !courseId) {
      return NextResponse.json({ 
        error: 'Missing required fields: userId, courseId' 
      }, { status: 400 })
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if course exists
    const course = await prisma.educationCourse.findUnique({
      where: { id: courseId }
    })

    if (!course) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 })
    }

    // Check if already enrolled
    const existingEnrollment = await prisma.userCourseEnrollment.findUnique({
      where: {
        userId_courseId: {
          userId,
          courseId
        }
      }
    })

    if (existingEnrollment) {
      return NextResponse.json({ 
        error: 'User is already enrolled in this course' 
      }, { status: 400 })
    }

    // Create enrollment
    const enrollment = await prisma.userCourseEnrollment.create({
      data: {
        userId,
        courseId
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        course: {
          select: {
            id: true,
            title: true,
            category: true
          }
        }
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
        action: 'ENROLLMENT_CREATED',
        resource: 'EDUCATION',
        resourceId: enrollment.id,
        details: JSON.stringify({
          enrolledUserId: userId,
          courseTitle: enrollment.course.title,
          courseId: courseId
        })
      }
    })

    return NextResponse.json(enrollment)

  } catch (error) {
    console.error('Enrollment creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create enrollment' },
      { status: 500 }
    )
  }
}
