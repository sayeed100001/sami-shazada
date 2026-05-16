import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function safeParseDetails(details: string | null) {
  if (!details) return {}

  try {
    const parsed = JSON.parse(details)
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get comprehensive analytics data
    const [
      totalCourses,
      publishedCourses,
      premiumCourses,
      totalEnrollments,
      coursesByCategory,
      topCourses,
      recentActivity,
      revenueCourses
    ] = await Promise.all([
      // Total courses
      prisma.educationCourse.count(),
      
      // Published courses
      prisma.educationCourse.count({
        where: { isPublished: true }
      }),
      
      // Premium courses
      prisma.educationCourse.count({
        where: { isPremium: true }
      }),
      
      // Total enrollments
      prisma.userCourseEnrollment.count(),
      
      // Courses by category
      prisma.educationCourse.groupBy({
        by: ['category'],
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } }
      }),
      
      // Top performing courses
      prisma.educationCourse.findMany({
        select: {
          id: true,
          title: true,
          enrollments: true,
          rating: true,
          price: true,
          isPremium: true
        },
        orderBy: { enrollments: 'desc' },
        take: 10
      }),
      
      // Recent activity from audit logs
      prisma.auditLog.findMany({
        where: {
          resource: 'EDUCATION',
          action: {
            in: ['COURSE_CREATED', 'COURSE_UPDATED', 'COURSE_PUBLISHED', 'COURSE_ENROLLED']
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
        select: {
          action: true,
          createdAt: true,
          details: true,
          resourceId: true
        }
      }),
      
      prisma.educationCourse.findMany({
        where: {
          isPremium: true,
          price: { gt: 0 }
        },
        select: {
          price: true,
          enrollments: true
        }
      })
    ])

    // Calculate average rating
    const avgRating = await prisma.educationCourse.aggregate({
      _avg: { rating: true }
    })

    // Calculate completion rate
    const completedEnrollments = await prisma.userCourseEnrollment.count({
      where: { isCompleted: true }
    })
    
    const completionRate = totalEnrollments > 0 
      ? (completedEnrollments / totalEnrollments) * 100 
      : 0

    // Format category data
    const formattedCategories = coursesByCategory.map(cat => ({
      category: cat.category,
      count: cat._count.id
    }))

    // Calculate estimated revenue (enrollments * course price)
    const estimatedRevenue = revenueCourses.reduce(
      (sum, course) => sum + course.enrollments * course.price,
      0
    )

    const analytics = {
      overview: {
        totalCourses,
        publishedCourses,
        premiumCourses,
        totalEnrollments,
        totalRevenue: estimatedRevenue,
        averageRating: avgRating._avg.rating || 0,
        completionRate: Math.round(completionRate * 100) / 100
      },
      coursesByCategory: formattedCategories,
      topPerformingCourses: topCourses,
      recentActivity: recentActivity.map(activity => ({
        action: activity.action,
        timestamp: activity.createdAt.toISOString(),
        details: safeParseDetails(activity.details),
        resourceId: activity.resourceId
      }))
    }

    return NextResponse.json(analytics)

  } catch (error) {
    console.error('Education analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
