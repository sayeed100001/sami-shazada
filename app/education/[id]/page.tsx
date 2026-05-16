'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { BookOpen, Video, Clock, Users, Star, ArrowLeft, Play, Download } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface Course {
  id: string
  title: string
  description: string
  category: string
  level: string
  duration: number
  price: number
  isPremium: boolean
  thumbnailUrl?: string
  videoUrl?: string
  content: string
  tags: string[]
  rating: number
  enrollments: number
  createdAt: string
}

export default function CourseDetailPage() {
  const params = useParams()
  const courseId =
    typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : null
  const [course, setCourse] = useState<Course | null>(null)
  const [loading, setLoading] = useState(true)
  const [enrolled, setEnrolled] = useState(false)

  useEffect(() => {
    if (courseId) {
      fetchCourse(courseId)
    }
  }, [courseId])

  const fetchCourse = async (id: string) => {
    try {
      const response = await fetch(`/api/education/courses/${id}`)
      if (!response.ok) throw new Error('Failed to fetch course')
      const data = await response.json()
      setCourse(data)
    } catch (error) {
      toast.error('خطا در بارگذاری دوره')
    } finally {
      setLoading(false)
    }
  }

  const handleEnroll = async () => {
    if (!course) return
    
    try {
      const response = await fetch(`/api/education/courses/${course.id}/enroll`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Failed to enroll')
      
      setEnrolled(true)
      toast.success('با موفقیت در دوره ثبت نام شدید')
      
      // Update enrollment count
      setCourse(prev => prev ? { ...prev, enrollments: prev.enrollments + 1 } : null)
    } catch (error) {
      toast.error('خطا در ثبت نام')
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels = {
      finance: 'مالی',
      crypto: 'ارز دیجیتال',
      trading: 'معاملات',
      security: 'امنیت'
    }
    return labels[category as keyof typeof labels] || category
  }

  const getLevelLabel = (level: string) => {
    const labels = {
      beginner: 'مبتدی',
      intermediate: 'متوسط',
      advanced: 'پیشرفته'
    }
    return labels[level as keyof typeof labels] || level
  }

  const getCategoryColor = (category: string) => {
    const colors = {
      finance: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      crypto: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      trading: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      security: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[category as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const getLevelColor = (level: string) => {
    const colors = {
      beginner: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      intermediate: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      advanced: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return colors[level as keyof typeof colors] || 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
  }

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">در حال بارگذاری...</div>
      </DashboardLayout>
    )
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-8">
          <h2 className="text-xl font-semibold mb-4">دوره یافت نشد</h2>
          <Button asChild>
            <Link href="/education">
              <ArrowLeft className="mr-2 h-4 w-4" />
              بازگشت به لیست دورهها
            </Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/education" className="hover:text-primary">مرکز آموزش</Link>
          <span>/</span>
          <span>{course.title}</span>
        </div>

        {/* Course Header */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-2">
                    <Badge className={getCategoryColor(course.category)}>
                      {getCategoryLabel(course.category)}
                    </Badge>
                    <Badge className={getLevelColor(course.level)}>
                      {getLevelLabel(course.level)}
                    </Badge>
                    {course.isPremium && (
                      <Badge variant="secondary">پریمیوم</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {renderStars(course.rating)}
                    <span className="text-sm text-muted-foreground ml-2">
                      ({course.rating})
                    </span>
                  </div>
                </div>

                <CardTitle className="text-2xl leading-tight">
                  {course.title}
                </CardTitle>
                
                <CardDescription className="text-base">
                  {course.description}
                </CardDescription>

                <div className="flex items-center gap-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    <span>{course.duration} دقیقه</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{course.enrollments.toLocaleString('fa-IR')} دانشجو</span>
                  </div>
                  {course.videoUrl && (
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4 text-red-500" />
                      <span>شامل ویدیو</span>
                    </div>
                  )}
                </div>
              </CardHeader>
            </Card>

            {/* Course Content */}
            <Card>
              <CardHeader>
                <CardTitle>محتوای دوره</CardTitle>
              </CardHeader>
              <CardContent>
                <div 
                  className="prose prose-sm max-w-none dark:prose-invert"
                  dangerouslySetInnerHTML={{ 
                    __html: (course.content || '').replace(/\n/g, '<br>').replace(/#{1,6}\s/g, '<h3>').replace(/<h3>/g, '<h3 class="font-semibold text-lg mt-4 mb-2">') 
                  }}
                />
              </CardContent>
            </Card>

            {/* Tags */}
            {course.tags.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>برچسب‌ها</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {course.tags.map((tag) => (
                      <Badge key={tag} variant="outline">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Video Preview */}
            {course.videoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Video className="h-5 w-5 text-red-500" />
                    پیش‌نمایش ویدیو
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden">
                    {course.videoUrl.includes('youtube.com') || course.videoUrl.includes('youtu.be') ? (
                      <iframe
                        src={course.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                        className="w-full h-full"
                        allowFullScreen
                        title={course.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20">
                        <div className="text-center">
                          <Video className="h-12 w-12 mx-auto mb-2 text-red-500" />
                          <p className="text-sm text-muted-foreground">ویدیو در دسترس است</p>
                          <Button 
                            size="sm" 
                            className="mt-2"
                            onClick={() => window.open(course.videoUrl, '_blank')}
                          >
                            مشاهده ویدیو
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Enrollment Card */}
            <Card>
              <CardHeader>
                <CardTitle>ثبت نام در دوره</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  {course.price > 0 ? (
                    <div className="text-2xl font-bold text-primary">
                      {course.price.toLocaleString('fa-IR')} افغانی
                    </div>
                  ) : (
                    <div className="text-2xl font-bold text-green-600">
                      رایگان
                    </div>
                  )}
                </div>

                <Separator />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>سطح:</span>
                    <span>{getLevelLabel(course.level)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>مدت زمان:</span>
                    <span>{course.duration} دقیقه</span>
                  </div>
                  <div className="flex justify-between">
                    <span>دانشجویان:</span>
                    <span>{course.enrollments.toLocaleString('fa-IR')}</span>
                  </div>
                </div>

                <Separator />

                {enrolled ? (
                  <div className="space-y-2">
                    <div className="text-center text-green-600 font-medium">
                      ✓ شما در این دوره ثبت نام کرده‌اید
                    </div>
                    <Button className="w-full" asChild>
                      <Link href={`/education/${course.id}/learn`}>
                        <Play className="mr-2 h-4 w-4" />
                        شروع یادگیری
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <Button 
                    className="w-full" 
                    onClick={handleEnroll}
                    disabled={course.isPremium && course.price > 0}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {course.price > 0 ? 'خرید دوره' : 'ثبت نام رایگان'}
                  </Button>
                )}

                {course.isPremium && (
                  <div className="text-xs text-muted-foreground text-center">
                    این دوره پریمیوم است و نیاز به اشتراک ویژه دارد
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Course Features */}
            <Card>
              <CardHeader>
                <CardTitle>ویژگی‌های دوره</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span>دسترسی مادام‌العمر</span>
                  </div>
                  {course.videoUrl && (
                    <div className="flex items-center gap-2">
                      <Video className="h-4 w-4 text-primary" />
                      <span>ویدیوهای آموزشی</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-primary" />
                    <span>منابع قابل دانلود</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 text-primary" />
                    <span>گواهینامه تکمیل</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
