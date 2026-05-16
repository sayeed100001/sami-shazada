import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action, courseIds, newsIds } = body

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    let result = { success: 0, failed: 0, message: '' }

    switch (action) {
      case 'PUBLISH_COURSES':
        if (!courseIds || !Array.isArray(courseIds)) {
          return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
        }
        
        try {
          const updateResult = await prisma.educationCourse.updateMany({
            where: { id: { in: courseIds } },
            data: { isPublished: true }
          })
          
          result.success = updateResult.count
          result.message = `${updateResult.count} courses published successfully`
        } catch (error) {
          result.failed = courseIds.length
          result.message = 'Failed to publish courses'
        }
        break

      case 'UNPUBLISH_COURSES':
        if (!courseIds || !Array.isArray(courseIds)) {
          return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
        }
        
        try {
          const updateResult = await prisma.educationCourse.updateMany({
            where: { id: { in: courseIds } },
            data: { isPublished: false }
          })
          
          result.success = updateResult.count
          result.message = `${updateResult.count} courses unpublished successfully`
        } catch (error) {
          result.failed = courseIds.length
          result.message = 'Failed to unpublish courses'
        }
        break

      case 'DELETE_COURSES':
        if (!courseIds || !Array.isArray(courseIds)) {
          return NextResponse.json({ error: 'Course IDs are required' }, { status: 400 })
        }
        
        try {
          const deleteResult = await prisma.educationCourse.deleteMany({
            where: { id: { in: courseIds } }
          })
          
          result.success = deleteResult.count
          result.message = `${deleteResult.count} courses deleted successfully`
        } catch (error) {
          result.failed = courseIds.length
          result.message = 'Failed to delete courses'
        }
        break

      case 'ACTIVATE_NEWS':
        if (!newsIds || !Array.isArray(newsIds)) {
          return NextResponse.json({ error: 'News IDs are required' }, { status: 400 })
        }
        
        try {
          const updateResult = await prisma.techNews.updateMany({
            where: { id: { in: newsIds } },
            data: { isActive: true }
          })
          
          result.success = updateResult.count
          result.message = `${updateResult.count} news items activated successfully`
        } catch (error) {
          result.failed = newsIds.length
          result.message = 'Failed to activate news items'
        }
        break

      case 'DEACTIVATE_NEWS':
        if (!newsIds || !Array.isArray(newsIds)) {
          return NextResponse.json({ error: 'News IDs are required' }, { status: 400 })
        }
        
        try {
          const updateResult = await prisma.techNews.updateMany({
            where: { id: { in: newsIds } },
            data: { isActive: false }
          })
          
          result.success = updateResult.count
          result.message = `${updateResult.count} news items deactivated successfully`
        } catch (error) {
          result.failed = newsIds.length
          result.message = 'Failed to deactivate news items'
        }
        break

      case 'DELETE_NEWS':
        if (!newsIds || !Array.isArray(newsIds)) {
          return NextResponse.json({ error: 'News IDs are required' }, { status: 400 })
        }
        
        try {
          const deleteResult = await prisma.techNews.deleteMany({
            where: { id: { in: newsIds } }
          })
          
          result.success = deleteResult.count
          result.message = `${deleteResult.count} news items deleted successfully`
        } catch (error) {
          result.failed = newsIds.length
          result.message = 'Failed to delete news items'
        }
        break

      case 'SEED_SAMPLE_DATA':
        if (!isDevAdminEndpointEnabled()) {
          return devEndpointDisabledResponse()
        }

        try {
          // Create sample courses
          const sampleCourses = [
            {
              title: 'مبانی معاملات ارزی',
              description: 'آموزش کامل معاملات در بازار ارز و نحوه تحلیل بازار',
              category: 'finance',
              level: 'beginner',
              duration: 120,
              price: 0,
              isPremium: false,
              isPublished: true,
              content: 'در این دوره با مبانی معاملات ارزی، انواع ارزها، عوامل موثر بر قیمت و نحوه تحلیل بازار آشنا خواهید شد.',
              tags: '["معاملات", "ارز", "مبتدی", "بازار"]',
              rating: 4.5,
              enrollments: 324
            },
            {
              title: 'تحلیل تکنیکال پیشرفته',
              description: 'تکنیکهای پیشرفته تحلیل تکنیکال و استراتژیهای معاملاتی',
              category: 'trading',
              level: 'advanced',
              duration: 180,
              price: 50000,
              isPremium: true,
              isPublished: true,
              content: 'در این دوره تکنیکهای پیشرفته تحلیل تکنیکال، اندیکاتورهای پیشرفته، الگوهای قیمتی و استراتژیهای معاملاتی را یاد خواهید گرفت.',
              tags: '["تحلیل تکنیکال", "پیشرفته", "معاملات", "استراتژی"]',
              rating: 4.7,
              enrollments: 287
            },
            {
              title: 'آشنایی با ارزهای دیجیتال',
              description: 'مقدمهای کامل بر دنیای کریپتو و بلاک چین',
              category: 'crypto',
              level: 'beginner',
              duration: 90,
              price: 0,
              isPremium: false,
              isPublished: true,
              content: 'در این دوره با مفاهیم اولیه ارزهای دیجیتال، بلاک چین، بیت کوین، اتریوم و نحوه خرید و فروش آشنا خواهید شد.',
              tags: '["کریپتو", "بیت کوین", "مبتدی", "بلاک چین"]',
              rating: 4.3,
              enrollments: 256
            },
            {
              title: 'مدیریت ریسک در معاملات',
              description: 'آموزش مدیریت ریسک و حفظ سرمایه در معاملات',
              category: 'trading',
              level: 'intermediate',
              duration: 150,
              price: 75000,
              isPremium: true,
              isPublished: true,
              content: 'در این دوره با انواع ریسکهای معاملاتی، نحوه محاسبه و مدیریت ریسک، استراتژیهای حفظ سرمایه و نحوه تعیین سایز پوزیشن آشنا خواهید شد.',
              tags: '["مدیریت ریسک", "معاملات", "سرمایه", "متوسط"]',
              rating: 4.6,
              enrollments: 198
            },
            {
              title: 'سیستم حواله و انتقال پول',
              description: 'آموزش کامل سیستم حواله و نحوه انتقال پول',
              category: 'hawala',
              level: 'beginner',
              duration: 100,
              price: 25000,
              isPremium: false,
              isPublished: true,
              content: 'در این دوره با مفهوم حواله، انواع روشهای انتقال پول، مزایا و معایب هر روش، هزینهها و نکات امنیتی آشنا خواهید شد.',
              tags: '["حواله", "انتقال پول", "مبتدی", "امنیت"]',
              rating: 4.2,
              enrollments: 182
            }
          ]

          let coursesCreated = 0
          for (const courseData of sampleCourses) {
            try {
              await prisma.educationCourse.create({ data: courseData })
              coursesCreated++
            } catch (error) {
              console.error('Error creating sample course:', error)
            }
          }

          result.success = coursesCreated
          result.message = `${coursesCreated} دوره نمونه با موفقیت ایجاد شد`
        } catch (error) {
          result.message = 'خطا در ایجاد دادههای نمونه'
        }
        break

      case 'RESET_ANALYTICS':
        try {
          // Reset all course analytics
          const resetResult = await prisma.educationCourse.updateMany({
            data: {
              rating: 0,
              enrollments: 0
            }
          })
          
          // Delete all enrollments
          await prisma.userCourseEnrollment.deleteMany({})
          
          // Delete all lesson progress
          await prisma.userLessonProgress.deleteMany({})
          
          result.success = resetResult.count
          result.message = `آمار ${resetResult.count} دوره بازنشانی شد`
        } catch (error) {
          result.message = 'خطا در بازنشانی آمار'
        }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: `BULK_${action}`,
        resource: 'EDUCATION',
        resourceId: 'bulk-operation',
        details: JSON.stringify({
          action,
          courseIds: courseIds || [],
          newsIds: newsIds || [],
          result
        })
      }
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json(
      { error: 'Failed to perform bulk operation' },
      { status: 500 }
    )
  }
}
