'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { BookOpen, Play, Clock, Star, Users, Search, TrendingUp, Award, CheckCircle } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'

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
  tags: string[]
  rating: number
  enrollments: number
}

interface TechNews {
  id: string
  title: string
  description: string
  source: string
  url: string
  publishedAt: string
}

export function EducationDashboard() {
  const { data: session } = useSession()
  const [courses, setCourses] = useState<Course[]>([])
  const [techNews, setTechNews] = useState<TechNews[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setIsLoading(true)
    try {
      const [coursesRes, newsRes] = await Promise.all([
        fetch('/api/education/courses'),
        fetch('/api/education/tech-news')
      ])

      if (coursesRes.ok) {
        const coursesData = await coursesRes.json()
        setCourses(Array.isArray(coursesData) ? coursesData : [])
      }

      if (newsRes.ok) {
        const newsData = await newsRes.json()
        setTechNews(Array.isArray(newsData) ? newsData : [])
      }
    } catch (error) {
      console.error('Failed to fetch education data:', error)
      toast.error('خطا در بارگذاری اطلاعات')
    } finally {
      setIsLoading(false)
    }
  }

  const handleEnrollCourse = async (courseId: string) => {
    if (!session) {
      toast.error('برای ثبت نام در دوره ابتدا وارد شوید')
      return
    }

    try {
      const response = await fetch(`/api/education/courses/${courseId}/enroll`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('با موفقیت در دوره ثبت نام شدید')
        fetchData()
      } else {
        const error = await response.json()
        toast.error(error.message || 'خطا در ثبت نام')
      }
    } catch (error) {
      console.error('Enrollment error:', error)
      toast.error('خطا در ثبت نام')
    }
  }

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || course.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryLabel = (category: string) => {
    const labels: { [key: string]: string } = {
      finance: 'مالی',
      trading: 'معاملات',
      crypto: 'ارزهای دیجیتال',
      hawala: 'حواله',
      business: 'کسب و کار'
    }
    return labels[category] || category
  }

  const getLevelLabel = (level: string) => {
    const labels: { [key: string]: string } = {
      beginner: 'مبتدی',
      intermediate: 'متوسط',
      advanced: 'پیشرفته'
    }
    return labels[level] || level
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded mb-4"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold gradient-text mb-4">مرکز آموزش</h1>
        <p className="text-muted-foreground">
          دورههای آموزشی و اخبار فناوری برای توسعه دانش مالی شما
        </p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="courses" className="flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            دورهها
          </TabsTrigger>
          <TabsTrigger value="tech-news" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            اخبار فناوری
          </TabsTrigger>
        </TabsList>

        <TabsContent value="courses" className="space-y-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="جستجو در دورهها..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger className="w-full md:w-48">
                    <SelectValue placeholder="دستهبندی" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">همه دستهها</SelectItem>
                    <SelectItem value="finance">مالی</SelectItem>
                    <SelectItem value="trading">معاملات</SelectItem>
                    <SelectItem value="crypto">ارزهای دیجیتال</SelectItem>
                    <SelectItem value="hawala">حواله</SelectItem>
                    <SelectItem value="business">کسب و کار</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-2">{course.title}</CardTitle>
                      <CardDescription className="text-sm">
                        {course.description}
                      </CardDescription>
                    </div>
                    {course.isPremium && (
                      <Badge className="bg-yellow-100 text-yellow-800 ml-2">
                        پریمیوم
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {course.duration} دقیقه
                    </span>
                    <Badge variant="outline">
                      {getLevelLabel(course.level)}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-500" />
                      {course.rating.toFixed(1)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {course.enrollments} نفر
                    </span>
                    <span className="font-medium">
                      {course.price === 0 ? 'رایگان' : `${course.price.toLocaleString()} افغانی`}
                    </span>
                  </div>

                  <Badge variant="outline" className="text-xs">
                    {getCategoryLabel(course.category)}
                  </Badge>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEnrollCourse(course.id)}
                      className="flex-1"
                    >
                      <BookOpen className="h-4 w-4 mr-2" />
                      ثبت نام
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href={`/education/${course.id}`}>
                        مشاهده
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredCourses.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">دورهای یافت نشد</h3>
                <p className="text-muted-foreground">
                  با فیلترهای مختلف جستجو کنید یا بعداً مراجعه کنید
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="tech-news" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {techNews.map((news) => (
              <Card key={news.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{news.title}</CardTitle>
                  <CardDescription>{news.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>منبع: {news.source}</span>
                    <span>{new Date(news.publishedAt).toLocaleDateString('fa-IR')}</span>
                  </div>
                  <Button asChild className="w-full">
                    <a href={news.url} target="_blank" rel="noopener noreferrer">
                      مطالعه کامل
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {techNews.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">اخباری یافت نشد</h3>
                <p className="text-muted-foreground">
                  بعداً برای مشاهده آخرین اخبار فناوری مراجعه کنید
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}