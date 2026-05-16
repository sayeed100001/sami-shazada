'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ManagedImageUploadField } from '@/components/shared/managed-image-upload-field'
import { IMAGE_UPLOAD_LIMITS } from '@/lib/image-upload-limits'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { Plus, Edit, Trash2, Home, Star, TrendingUp } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface HomeContent {
  id: string
  section: string
  title: string
  badgeText?: string
  subtitle?: string
  description?: string
  icon?: string
  value?: string
  linkUrl?: string
  linkText?: string
  imageUrl?: string
  order: number
  isActive: boolean
  language: string
}

export default function HomeContentManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [contents, setContents] = useState<HomeContent[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingContent, setEditingContent] = useState<HomeContent | null>(null)
  const [selectedLanguage, setSelectedLanguage] = useState('fa')
  const [formData, setFormData] = useState({
    section: 'HERO',
    title: '',
    badgeText: '',
    subtitle: '',
    description: '',
    icon: '',
    value: '',
    linkUrl: '',
    linkText: '',
    imageUrl: '',
    order: 0,
    isActive: true,
    language: 'fa'
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchContents()
  }, [session, status, router, selectedLanguage])

  const seedContents = async () => {
    try {
      const response = await fetch('/api/admin/home-content/seed', { method: 'POST' })
      const data = await response.json()
      if (response.ok) {
        toast.success(`${data.created} محتوا اضافه شد`)
        fetchContents()
      } else {
        toast.error(data.error || 'خطا در seed')
      }
    } catch {
      toast.error('خطا در اتصال')
    }
  }

  const fetchContents = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/admin/home-content?language=${selectedLanguage}`)
      if (response.ok) {
        const data = await response.json()
        setContents(data.contents)
      }
    } catch (error) {
      toast.error('خطا در دریافت محتوا')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title) {
      toast.error('عنوان الزامی است')
      return
    }

    try {
      const url = editingContent 
        ? `/api/admin/home-content/${editingContent.id}`
        : '/api/admin/home-content'
      
      const method = editingContent ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success(editingContent ? 'محتوا بروزرسانی شد' : 'محتوا اضافه شد')
        setIsDialogOpen(false)
        resetForm()
        fetchContents()
      } else {
        const error = await response.json()
        toast.error(error.error || 'خطا در ذخیره محتوا')
      }
    } catch (error) {
      toast.error('خطا در ذخیره محتوا')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('آیا مطمئن هستید که میخواهید این محتوا را حذف کنید؟')) {
      return
    }

    try {
      const response = await fetch(`/api/admin/home-content/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('محتوا حذف شد')
        fetchContents()
      } else {
        toast.error('خطا در حذف محتوا')
      }
    } catch (error) {
      toast.error('خطا در حذف محتوا')
    }
  }

  const handleEdit = (content: HomeContent) => {
    setEditingContent(content)
    setFormData({
      section: content.section,
      title: content.title,
      badgeText: content.badgeText || '',
      subtitle: content.subtitle || '',
      description: content.description || '',
      icon: content.icon || '',
      value: content.value || '',
      linkUrl: content.linkUrl || '',
      linkText: content.linkText || '',
      imageUrl: content.imageUrl || '',
      order: content.order,
      isActive: content.isActive,
      language: content.language
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingContent(null)
    setFormData({
      section: 'HERO',
      title: '',
      badgeText: '',
      subtitle: '',
      description: '',
      icon: '',
      value: '',
      linkUrl: '',
      linkText: '',
      imageUrl: '',
      order: 0,
      isActive: true,
      language: selectedLanguage
    })
  }

  const getSectionIcon = (section: string) => {
    switch (section) {
      case 'HERO': return <Home className="h-4 w-4" />
      case 'FEATURE_CARD': return <Star className="h-4 w-4" />
      case 'STAT_CARD': return <TrendingUp className="h-4 w-4" />
      default: return null
    }
  }

  const getSectionName = (section: string) => {
    switch (section) {
      case 'HERO': return 'هیرو'
      case 'FEATURE_CARD': return 'کارت ویژگی'
      case 'STAT_CARD': return 'کارت آمار'
      default: return section
    }
  }

  if (status === 'loading' || !session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Home className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">{t('admin.homeContent')}</h1>
                <p className="text-purple-50 text-lg">{t('admin.homeContent.subtitle')}</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
        </div>

        {/* Language Selector & Add Button */}
        <div className="flex justify-between items-center">
          <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fa">🇦🇫 فارسی</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
              <SelectItem value="ps">🇦🇫 پشتو</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button variant="outline" onClick={seedContents}>
              بارگذاری محتوای پیشفرض
            </Button>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-2" />
                محتوای جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingContent ? 'ویرایش محتوا' : 'افزودن محتوای جدید'}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  فرم مدیریت محتوای صفحه اصلی
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>بخش *</Label>
                    <Select 
                      value={formData.section} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, section: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="HERO">هیرو (سربرگ)</SelectItem>
                        <SelectItem value="FEATURE_CARD">کارت ویژگی</SelectItem>
                        <SelectItem value="STAT_CARD">کارت آمار</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>زبان *</Label>
                    <Select 
                      value={formData.language} 
                      onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fa">فارسی</SelectItem>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ps">پشتو</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>عنوان *</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان محتوا"
                  />
                </div>

                {formData.section === 'HERO' ? (
                  <div>
                    <Label>متن نشان (Live update)</Label>
                    <Input
                      value={formData.badgeText}
                      onChange={(e) => setFormData(prev => ({ ...prev, badgeText: e.target.value }))}
                      placeholder="بروزرسانی لحظهای"
                    />
                  </div>
                ) : null}

                <div>
                  <Label>زیرعنوان</Label>
                  <Input
                    value={formData.subtitle}
                    onChange={(e) => setFormData(prev => ({ ...prev, subtitle: e.target.value }))}
                    placeholder="زیرعنوان (اختیاری)"
                  />
                </div>

                <div>
                  <Label>توضیحات</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="توضیحات کامل (اختیاری)"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>آیکون / ایموجی</Label>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData(prev => ({ ...prev, icon: e.target.value }))}
                      placeholder="🎯 یا نام آیکون"
                    />
                  </div>
                  <div>
                    <Label>مقدار (برای آمار)</Label>
                    <Input
                      value={formData.value}
                      onChange={(e) => setFormData(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="10K+ یا 100%"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>لینک URL</Label>
                    <Input
                      value={formData.linkUrl}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkUrl: e.target.value }))}
                      placeholder="/track یا https://..."
                    />
                  </div>
                  <div>
                    <Label>متن لینک</Label>
                    <Input
                      value={formData.linkText}
                      onChange={(e) => setFormData(prev => ({ ...prev, linkText: e.target.value }))}
                      placeholder="پیگیری حواله"
                    />
                  </div>
                </div>

                <ManagedImageUploadField
                  label="تصویر"
                  value={formData.imageUrl}
                  onChange={(value) => setFormData(prev => ({ ...prev, imageUrl: value }))}
                  scope="home-content"
                  maxSizeBytes={IMAGE_UPLOAD_LIMITS.homeContent.maxBytes}
                  maxSizeLabel={IMAGE_UPLOAD_LIMITS.homeContent.label}
                  helperText="تصویر در storage مدیریت‌شده ذخیره می‌شود و دیگر نیازی به لینک دستی نیست."
                  previewAlt={formData.title || 'Home content image'}
                  uploadLabel="آپلود تصویر"
                  clearLabel="حذف تصویر"
                  emptyLabel="هنوز تصویری بارگذاری نشده است"
                  uploadSuccessMessage="تصویر محتوا آپلود شد."
                  previewHeightClassName="h-40"
                />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>ترتیب نمایش</Label>
                    <Input
                      type="number"
                      value={formData.order}
                      onChange={(e) => setFormData(prev => ({ ...prev, order: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-8">
                    <Switch
                      checked={formData.isActive}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, isActive: checked }))}
                    />
                    <Label>فعال</Label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    لغو
                  </Button>
                  <Button type="submit">
                    {editingContent ? 'بروزرسانی' : 'افزودن'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Content List */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>محتوای صفحه اصلی</CardTitle>
            <CardDescription>
              {contents.length} محتوا برای زبان {selectedLanguage === 'fa' ? 'فارسی' : selectedLanguage === 'en' ? 'انگلیسی' : 'پشتو'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : contents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Home className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>هنوز محتوایی اضافه نشده است</p>
              </div>
            ) : (
              <div className="space-y-4">
                {contents.map((content) => (
                  <div
                    key={content.id}
                    className="glass-card border-0 shadow-md p-4 rounded-xl hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="flex items-center gap-1">
                            {getSectionIcon(content.section)}
                            {getSectionName(content.section)}
                          </Badge>
                          <Badge variant={content.isActive ? 'default' : 'secondary'}>
                            {content.isActive ? 'فعال' : 'غیرفعال'}
                          </Badge>
                          <span className="text-xs text-muted-foreground">ترتیب: {content.order}</span>
                        </div>
                        
                        <h3 className="font-medium text-lg mb-1">
                          {content.icon && <span className="mr-2">{content.icon}</span>}
                          {content.title}
                        </h3>
                        
                        {content.subtitle && (
                          <p className="text-sm text-muted-foreground mb-1">{content.subtitle}</p>
                        )}

                        {content.badgeText && content.section === 'HERO' ? (
                          <p className="text-xs text-muted-foreground mb-1">
                            نشان: {content.badgeText}
                          </p>
                        ) : null}
                        
                        {content.description && (
                          <p className="text-sm text-muted-foreground">{content.description}</p>
                        )}
                        
                        {content.value && (
                          <div className="mt-2">
                            <Badge variant="secondary">{content.value}</Badge>
                          </div>
                        )}
                        
                        {content.linkUrl && (
                          <div className="mt-2 text-sm">
                            <span className="text-muted-foreground">لینک: </span>
                            <a href={content.linkUrl} className="text-primary hover:underline">
                              {content.linkText || content.linkUrl}
                            </a>
                          </div>
                        )}

                        {content.imageUrl && (
                          <div className="mt-3">
                            <img
                              src={content.imageUrl}
                              alt={content.title}
                              className="h-20 w-32 rounded-lg border object-cover"
                            />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(content)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(content.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
