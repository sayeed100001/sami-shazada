'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Play, Download, Star, Clock, Users, ArrowRight, Globe, Video, ExternalLink, RefreshCw, Eye } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useSession } from 'next-auth/react'

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
  tags: string[]
  rating: number
  enrollments: number
  createdAt: string
}

interface TechNews {
  id: string
  title: string
  description?: string
  url: string
  source: string
  category: string
  imageUrl?: string
  publishedAt: string
  views: number
}

export default function EducationPage() {
  const placeholderImage = '/placeholder-avatar.jpg'
  const [courses, setCourses] = useState<Course[]>([])
  const [techNews, setTechNews] = useState<TechNews[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')
  const [activeTab, setActiveTab] = useState('courses')
  const [newsHistory, setNewsHistory] = useState<any[]>([])
  const [historyPagination, setHistoryPagination] = useState<any>({})
  const [historyFilters, setHistoryFilters] = useState<any>({})
  const [currentPage, setCurrentPage] = useState(1)
  const [newsSelectedCategory, setNewsSelectedCategory] = useState('all')
  const [selectedSource, setSelectedSource] = useState('all')

  useEffect(() => {
    fetchCourses()
    fetchTechNews()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedLevel])

  useEffect(() => {
    if (activeTab === 'news-history') {
      fetchNewsHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, currentPage, newsSelectedCategory, selectedSource])

  const fetchCourses = async () => {
    try {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedLevel !== 'all') params.append('level', selectedLevel)
      
      const response = await fetch(`/api/education/courses?${params}`)
      if (!response.ok) throw new Error('Failed to fetch courses')
      const data = await response.json()
      setCourses(data)
    } catch (error) {
      toast.error('خطا در بارگذاری دورهها')
    }
  }

  const fetchTechNews = async () => {
    try {
      const response = await fetch('/api/education/tech-news?limit=6')
      if (!response.ok) throw new Error('Failed to fetch tech news')
      const data = await response.json()
      setTechNews(data)
    } catch (error) {
      toast.error('خطا در بارگذاری اخبار فناوری')
    } finally {
      setLoading(false)
    }
  }

  const fetchTechNewsWithRefresh = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/education/tech-news?limit=6&refresh=true')
      if (!response.ok) throw new Error('Failed to fetch fresh tech news')
      const data = await response.json()
      setTechNews(data)
      toast.success('اخبار جدید از منابع فارسی دریافت شد')
    } catch (error) {
      toast.error('خطا در دریافت اخبار جدید')
    } finally {
      setLoading(false)
    }
  }

  const fetchNewsHistory = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '12'
      })
      
      if (newsSelectedCategory !== 'all') params.append('category', newsSelectedCategory)
      if (selectedSource !== 'all') params.append('source', selectedSource)
      
      const response = await fetch(`/api/education/tech-news/history?${params}`)
      if (!response.ok) throw new Error('Failed to fetch news history')
      const data = await response.json()
      
      setNewsHistory(data.news)
      setHistoryPagination(data.pagination)
      setHistoryFilters(data.filters)
    } catch (error) {
      toast.error('خطا در بارگذاری تاریخچه اخبار')
    } finally {
      setLoading(false)
    }
  }

  const getTypeIcon = (course: Course) => {
    if (course.videoUrl) {
      return <Video className="h-4 w-4 text-red-500" />
    }
    return <BookOpen className="h-4 w-4" />
  }

  const getTypeColor = (course: Course) => {
    if (course.videoUrl) {
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              مرکز آموزش
            </h1>
            <p className="text-lg text-white/90">
              آموزش مفاهیم مالی و ارزی برای استفاده بهتر از خدمات
            </p>
          </div>
        </div>

        <div className="space-y-8">

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="courses">دورههای آموزشی</TabsTrigger>
            <TabsTrigger value="tech-news">اخبار فناوری</TabsTrigger>
            <TabsTrigger value="news-history">تاریخچه اخبار</TabsTrigger>
            <TabsTrigger value="resources">منابع آموزشی</TabsTrigger>
          </TabsList>

          <TabsContent value="courses" className="space-y-6">
            {/* Filters */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle>فیلترها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">دستهبندی</label>
                    <div className="flex flex-wrap gap-2">
                      {[{key: 'all', label: 'همه'}, {key: 'finance', label: 'مالی'}, {key: 'crypto', label: 'ارز دیجیتال'}, {key: 'trading', label: 'معاملات'}, {key: 'security', label: 'امنیت'}].map((cat) => (
                        <Button
                          key={cat.key}
                          variant={selectedCategory === cat.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedCategory(cat.key)}
                        >
                          {cat.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">سطح</label>
                    <div className="flex flex-wrap gap-2">
                      {[{key: 'all', label: 'همه'}, {key: 'beginner', label: 'مبتدی'}, {key: 'intermediate', label: 'متوسط'}, {key: 'advanced', label: 'پیشرفته'}].map((level) => (
                        <Button
                          key={level.key}
                          variant={selectedLevel === level.key ? "default" : "outline"}
                          size="sm"
                          onClick={() => setSelectedLevel(level.key)}
                        >
                          {level.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Courses Grid */}
            {loading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <Card key={course.id} className="glass-card border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                    {course.videoUrl && (() => {
                      const videoId = course.videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/)?.[1]
                      return videoId ? (
                        <div className="aspect-video w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
                          <img 
                            src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                            alt={course.title}
                            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = placeholderImage
                            }}
                          />
                        </div>
                      ) : null
                    })()}
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge className={getTypeColor(course)}>
                          <div className="flex items-center gap-1">
                            {getTypeIcon(course)}
                            <span className="text-xs">
                              {course.videoUrl ? 'ویدیو' : 'دوره'}
                            </span>
                          </div>
                        </Badge>
                        <div className="flex gap-1">
                          <Badge className={getCategoryColor(course.category)}>
                            {getCategoryLabel(course.category)}
                          </Badge>
                          <Badge className={getLevelColor(course.level)}>
                            {getLevelLabel(course.level)}
                          </Badge>
                        </div>
                      </div>
                      
                      <CardTitle className="text-lg leading-tight">
                        {course.title}
                      </CardTitle>
                      
                      <CardDescription className="text-sm">
                        {course.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Rating and Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            {renderStars(course.rating)}
                          </div>
                          <span className="persian-numbers">{course.rating}</span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            <span className="persian-numbers">{course.duration} دقیقه</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="persian-numbers">{course.enrollments}</span>
                          </div>
                        </div>
                      </div>

                      {/* Price and Premium */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {course.isPremium && (
                            <Badge variant="secondary" className="text-xs">
                              پریمیوم
                            </Badge>
                          )}
                          {course.price > 0 && (
                            <span className="text-sm font-medium">
                              {course.price} افغانی
                            </span>
                          )}
                          {course.price === 0 && (
                            <Badge variant="outline" className="text-xs">
                              رایگان
                            </Badge>
                          )}
                        </div>
                      </div>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1">
                        {(() => {
                          try {
                            const tags = typeof course.tags === 'string' ? JSON.parse(course.tags) : (Array.isArray(course.tags) ? course.tags : [])
                            return (
                              <>
                                {tags.slice(0, 3).map((tag: string) => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {tags.length > 3 && (
                                  <Badge variant="secondary" className="text-xs">
                                    +{tags.length - 3}
                                  </Badge>
                                )}
                              </>
                            )
                          } catch {
                            return null
                          }
                        })()}
                      </div>

                      {/* Action Button */}
                      <Button 
                        className="w-full" 
                        onClick={() => {
                          if (course.videoUrl) {
                            window.open(course.videoUrl, '_blank')
                          } else {
                            toast.success('دوره در حال بارگذاری است')
                          }
                        }}
                      >
                        مشاهده آموزش
                        <Play className="h-4 w-4 mr-2" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="tech-news" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">آخرین اخبار فناوری</h2>
              <div className="flex gap-2">
                <Button onClick={fetchTechNews} disabled={loading} variant="outline">
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  بروزرسانی
                </Button>
                <Button onClick={() => fetchTechNewsWithRefresh()} disabled={loading}>
                  <Globe className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  دریافت اخبار جدید
                </Button>
                <Button onClick={() => setActiveTab('news-history')} variant="secondary">
                  <Clock className="mr-2 h-4 w-4" />
                  تاریخچه اخبار
                </Button>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {techNews.map((news) => (
                  <Card key={news.id} className="glass-card border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                    <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                      <img 
                        src={news.imageUrl || placeholderImage} 
                        alt={news.title}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement
                          target.src = placeholderImage
                        }}
                      />
                    </div>
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <Badge variant="outline" className="text-xs">
                          <Globe className="h-3 w-3 mr-1" />
                          {news.source}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          {getCategoryLabel(news.category)}
                        </Badge>
                      </div>
                      
                      <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">
                        {news.title}
                      </CardTitle>
                      
                      {news.description && (
                        <CardDescription className="text-sm line-clamp-3">
                          {news.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                        </CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>{new Date(news.publishedAt).toLocaleDateString('fa-IR')}</span>
                        <div className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          <span className="persian-numbers">{news.views.toLocaleString('fa-IR')} بازدید</span>
                        </div>
                      </div>

                      <Button className="w-full" variant="outline" asChild>
                        <a href={news.url} target="_blank" rel="noopener noreferrer">
                          مطالعه کامل
                          <ExternalLink className="h-4 w-4 mr-2" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="news-history" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">تاریخچه اخبار فناوری</h2>
              <div className="flex gap-2">
                <select 
                  value={newsSelectedCategory} 
                  onChange={(e) => setNewsSelectedCategory(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">همه دستهبندیها</option>
                  {historyFilters.categories?.map((cat: any) => (
                    <option key={cat.category} value={cat.category}>
                      {getCategoryLabel(cat.category)} ({cat._count.category})
                    </option>
                  ))}
                </select>
                <select 
                  value={selectedSource} 
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="px-3 py-1 border rounded-md text-sm"
                >
                  <option value="all">همه منابع</option>
                  {historyFilters.sources?.map((src: any) => (
                    <option key={src.source} value={src.source}>
                      {src.source} ({src._count.source})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {newsHistory.map((news) => (
                    <Card key={news.id} className="glass-card border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300 overflow-hidden">
                      <div className="aspect-video w-full overflow-hidden bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20">
                        <img 
                          src={news.imageUrl || placeholderImage} 
                          alt={news.title}
                          className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement
                            target.src = placeholderImage
                          }}
                        />
                      </div>
                      <CardHeader>
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs">
                            <Globe className="h-3 w-3 mr-1" />
                            {news.source}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {getCategoryLabel(news.category)}
                          </Badge>
                        </div>
                        
                        <CardTitle className="text-lg leading-tight hover:text-primary transition-colors">
                          {news.title}
                        </CardTitle>
                        
                        {news.description && (
                          <CardDescription className="text-sm line-clamp-3">
                            {news.description.replace(/<[^>]*>/g, '').substring(0, 150)}...
                          </CardDescription>
                        )}
                      </CardHeader>

                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span>{new Date(news.publishedAt).toLocaleDateString('fa-IR')}</span>
                          <div className="flex items-center gap-1">
                            <Eye className="h-3 w-3" />
                            <span className="persian-numbers">{news.views.toLocaleString('fa-IR')} بازدید</span>
                          </div>
                        </div>

                        <Button className="w-full" variant="outline" asChild>
                          <a href={news.url} target="_blank" rel="noopener noreferrer">
                            مطالعه کامل
                            <ExternalLink className="h-4 w-4 mr-2" />
                          </a>
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {historyPagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-8">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!historyPagination.hasPrev}
                      onClick={() => setCurrentPage(currentPage - 1)}
                    >
                      قبلی
                    </Button>
                    
                    <span className="text-sm text-muted-foreground">
                      صفحه {historyPagination.currentPage} از {historyPagination.totalPages}
                    </span>
                    
                    <Button 
                      variant="outline" 
                      size="sm" 
                      disabled={!historyPagination.hasNext}
                      onClick={() => setCurrentPage(currentPage + 1)}
                    >
                      بعدی
                    </Button>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="resources" className="space-y-6">
            {/* Featured Resources */}
            <Card className="glass-card border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  منابع آموزشی ویژه
                </CardTitle>
                <CardDescription>
                  مجموعه کاملی از منابع آموزشی برای یادگیری مفاهیم مالی و ارزی
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      ویدیوهای آموزشی
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      مجموعه کاملی از ویدیوهای آموزشی در زمینه مالی و ارزی
                    </p>
                    <Button size="sm" onClick={() => setActiveTab('courses')}>
                      مشاهده ویدیوها
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      کتابخانه مقالات
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      مقالات تخصصی و راهنماهای کاربردی برای یادگیری عمیقتر
                    </p>
                    <Button size="sm" variant="outline" onClick={() => setActiveTab('tech-news')}>
                      مطالعه مقالات
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      فایلهای قابل دانلود
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      راهنماها، چک لیستها و ابزارهای کاربردی برای دانلود
                    </p>
                    <Button size="sm" variant="outline" onClick={() => window.open('/api/education/resources/download', '_blank')}>
                      دانلود منابع
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Learning Paths */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle>مسیرهای یادگیری پیشنهادی</CardTitle>
                <CardDescription>مسیرهای ساختاریافته برای یادگیری موثر</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg">مسیر مبتدی</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>مبانی ارزهای دیجیتال</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>امنیت مالی شخصی</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span>بازار سرمایه افغانستان</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full" onClick={() => setActiveTab('courses')}>
                      شروع مسیر
                    </Button>
                  </div>

                  <div className="border rounded-lg p-4 space-y-3">
                    <h3 className="font-semibold text-lg">مسیر پیشرفته</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>تحلیل تکنیکال پیشرفته</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>مدیریت ریسک در معاملات</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                        <span>معاملات الگوریتمی</span>
                      </div>
                    </div>
                    <Button size="sm" className="w-full" variant="outline" onClick={() => setActiveTab('courses')}>
                      شروع مسیر
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Statistics */}
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <CardTitle>آمار مرکز آموزش</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{courses.length}</div>
                    <div className="text-sm text-muted-foreground">دوره آموزشی</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{techNews.length}</div>
                    <div className="text-sm text-muted-foreground">خبر فناوری</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{courses.reduce((sum, course) => sum + course.enrollments, 0).toLocaleString('fa-IR')}</div>
                    <div className="text-sm text-muted-foreground">دانشجو</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-primary">{courses.filter(c => c.price === 0).length}</div>
                    <div className="text-sm text-muted-foreground">دوره رایگان</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* FAQ Section */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>سوالات متداول</CardTitle>
            <CardDescription>پاسخ سوالات رایج کاربران در مورد آموزش</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">چگونه در دورهها ثبتنام کنم؟</h3>
              <p className="text-sm text-muted-foreground">
                برای ثبتنام در دورهها، روی دوره مورد نظر کلیک کرده و دکمه &quot;شروع یادگیری&quot; را انتخاب کنید. دورههای رایگان بلافاصله در دسترس خواهند بود.
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">آیا گواهینامه دریافت میکنم؟</h3>
              <p className="text-sm text-muted-foreground">
                بله، پس از تکمیل موفقیتآمیز هر دوره، گواهینامه معتبری دریافت خواهید کرد که قابل دانلود و چاپ است.
              </p>
            </div>
            
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">دورههای پریمیوم چه مزایایی دارند؟</h3>
              <p className="text-sm text-muted-foreground">
                دورههای پریمیوم شامل محتوای تخصصیتر، پشتیبانی مستقیم، ویدیوهای اضافی و دسترسی به منابع ویژه هستند.
              </p>
            </div>

            <div className="border rounded-lg p-4">
              <h3 className="font-semibold mb-2">چگونه پیشرفت خود را پیگیری کنم؟</h3>
              <p className="text-sm text-muted-foreground">
                در پنل کاربری خود میتوانید پیشرفت دورهها، نمرات آزمونها و گواهینامههای دریافتی را مشاهده کنید.
              </p>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
