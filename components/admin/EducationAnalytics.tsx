'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, BookOpen, DollarSign, RefreshCw, Star, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface AnalyticsData {
  overview: {
    totalCourses: number
    publishedCourses: number
    premiumCourses: number
    totalEnrollments: number
    totalRevenue: number
    averageRating: number
    completionRate: number
  }
  coursesByCategory: Array<{ category: string; count: number }>
  topPerformingCourses: Array<{
    id: string
    title: string
    enrollments: number
    rating: number
    price: number
  }>
  recentActivity: Array<{
    action: string
    timestamp: string
    details: Record<string, unknown>
  }>
}

const categoryLabels: Record<string, string> = {
  finance: 'مالی',
  trading: 'معاملات',
  crypto: 'ارزهای دیجیتال',
  hawala: 'حواله',
  business: 'کسب و کار',
}

const activityLabels: Record<string, string> = {
  COURSE_CREATED: 'دوره جدید ایجاد شد',
  COURSE_UPDATED: 'دوره به‌روزرسانی شد',
  COURSE_PUBLISHED: 'دوره منتشر شد',
  COURSE_ENROLLED: 'ثبت‌نام جدید در دوره انجام شد',
}

export function EducationAnalytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/admin/education/analytics', {
        cache: 'no-store',
      })

      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to fetch analytics')
      }

      const data = await response.json()
      setAnalytics(data)
    } catch (fetchError) {
      console.error('Failed to fetch analytics:', fetchError)
      setAnalytics(null)
      setError('بارگذاری آمار آموزش ناموفق بود.')
    } finally {
      setIsLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => categoryLabels[category] || category
  const totalCourses = analytics?.overview.totalCourses || 0
  const getCategoryPercentage = (count: number) =>
    totalCourses > 0 ? Math.round((count / totalCourses) * 100) : 0

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((item) => (
          <Card key={item} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-3" />
              <div className="h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error || !analytics) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center gap-4 py-10 text-center">
          <AlertTriangle className="h-10 w-10 text-amber-500" />
          <div>
            <p className="font-medium">{error || 'اطلاعات آماری در دسترس نیست.'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              این بخش فقط با داده واقعی نمایش داده می‌شود.
            </p>
          </div>
          <Button variant="outline" onClick={fetchAnalytics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            تلاش مجدد
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button variant="outline" onClick={fetchAnalytics}>
          <RefreshCw className="h-4 w-4 mr-2" />
          به‌روزرسانی آمار
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">کل دوره‌ها</p>
                <p className="text-2xl font-bold">{analytics.overview.totalCourses}</p>
                <p className="text-xs text-green-600">
                  {analytics.overview.publishedCourses} منتشر شده
                </p>
              </div>
              <BookOpen className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">کل ثبت‌نام‌ها</p>
                <p className="text-2xl font-bold">
                  {analytics.overview.totalEnrollments.toLocaleString('fa-IR')}
                </p>
                <p className="text-xs text-blue-600">
                  {analytics.overview.completionRate}% تکمیل شده
                </p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">درآمد تخمینی</p>
                <p className="text-2xl font-bold">
                  {analytics.overview.totalRevenue.toLocaleString('fa-IR')}
                </p>
                <p className="text-xs text-emerald-600">
                  {analytics.overview.premiumCourses} دوره پریمیوم
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">میانگین امتیاز</p>
                <p className="text-2xl font-bold">{analytics.overview.averageRating.toFixed(1)}</p>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-3 w-3 ${
                        star <= Math.floor(analytics.overview.averageRating)
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Star className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>توزیع دوره‌ها بر اساس دسته‌بندی</CardTitle>
          <CardDescription>آمار واقعی دوره‌های ثبت‌شده در سیستم</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.coursesByCategory.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز داده‌ای برای نمایش وجود ندارد.</p>
          ) : (
            <div className="space-y-4">
              {analytics.coursesByCategory.map((category) => {
                const percentage = getCategoryPercentage(category.count)

                return (
                  <div key={category.category} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-[140px]">
                      <Badge variant="outline">{getCategoryLabel(category.category)}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {category.count} دوره
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                    <span className="text-sm font-medium min-w-[44px] text-left">
                      {percentage}%
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>دوره‌های پربازده</CardTitle>
          <CardDescription>مرتب‌شده بر اساس تعداد ثبت‌نام</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.topPerformingCourses.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز ثبت‌نامی برای تحلیل وجود ندارد.</p>
          ) : (
            <div className="space-y-4">
              {analytics.topPerformingCourses.map((course, index) => (
                <div
                  key={course.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                      {index + 1}
                    </div>
                    <div>
                      <h4 className="font-medium">{course.title}</h4>
                      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {course.enrollments} ثبت‌نام
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500" />
                          {course.rating.toFixed(1)}
                        </span>
                        <span className="flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {course.price === 0 ? 'رایگان' : `${course.price.toLocaleString('fa-IR')} افغانی`}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Badge variant={course.price > 0 ? 'default' : 'secondary'}>
                    {course.price > 0 ? 'پریمیوم' : 'رایگان'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>فعالیت‌های اخیر</CardTitle>
          <CardDescription>آخرین رویدادهای ثبت‌شده در Audit Log آموزش</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">هنوز فعالیت ثبت‌شده‌ای برای نمایش وجود ندارد.</p>
          ) : (
            <div className="space-y-3">
              {analytics.recentActivity.map((activity, index) => (
                <div
                  key={`${activity.action}-${activity.timestamp}-${index}`}
                  className="flex items-start gap-3 p-3 border rounded-lg"
                >
                  <div className="w-2 h-2 rounded-full bg-blue-500 mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {activityLabels[activity.action] || activity.action}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(activity.timestamp).toLocaleString('fa-IR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
