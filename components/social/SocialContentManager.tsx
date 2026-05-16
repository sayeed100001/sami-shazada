'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { LinkPreviewCard } from './LinkPreviewCard'
import { LinkPreviewManager } from '@/components/admin/LinkPreviewManager'
import { Globe, Plus, Edit, Trash2, Share2, Eye, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

interface SocialContent {
  id: string
  title: string
  description: string
  url: string
  previewData?: {
    title: string
    description: string
    image: string
    url: string
    siteName: string
    type: string
    favicon: string
  }
  isActive: boolean
  createdAt: string
  views: number
}

export function SocialContentManager() {
  const [contents, setContents] = useState<SocialContent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingContent, setEditingContent] = useState<SocialContent | null>(null)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    url: '',
    previewData: null as any
  })

  useEffect(() => {
    fetchContents()
  }, [])

  const fetchContents = async () => {
    try {
      setLoading(true)
      // This would fetch from your API
      const mockContents: SocialContent[] = [
        {
          id: '1',
          title: 'آخرین اخبار بازار ارز',
          description: 'بررسی تحولات جدید در بازار ارز افغانستان',
          url: 'https://example.com/news',
          previewData: {
            title: 'آخرین اخبار بازار ارز افغانستان',
            description: 'تحلیل کامل از وضعیت بازار ارز و پیش بینی روند آینده نرخ ها',
            image: 'https://via.placeholder.com/400x200',
            url: 'https://example.com/news',
            siteName: 'سرای شهزاده',
            type: 'article',
            favicon: 'https://example.com/favicon.ico'
          },
          isActive: true,
          createdAt: new Date().toISOString(),
          views: 1250
        }
      ]
      setContents(mockContents)
    } catch (error) {
      toast.error('خطا در بارگذاری محتوا')
    } finally {
      setLoading(false)
    }
  }

  const handlePreviewGenerated = (preview: any) => {
    setFormData(prev => ({
      ...prev,
      title: preview.title || prev.title,
      description: preview.description || prev.description,
      url: preview.url,
      previewData: preview
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title || !formData.url) {
      toast.error('عنوان و آدرس URL الزامی است')
      return
    }

    try {
      setLoading(true)
      
      // Here you would save to your API
      const newContent: SocialContent = {
        id: Date.now().toString(),
        title: formData.title,
        description: formData.description,
        url: formData.url,
        previewData: formData.previewData,
        isActive: true,
        createdAt: new Date().toISOString(),
        views: 0
      }

      if (editingContent) {
        setContents(prev => prev.map(c => c.id === editingContent.id ? { ...newContent, id: editingContent.id } : c))
        toast.success('محتوا بروزرسانی شد')
      } else {
        setContents(prev => [newContent, ...prev])
        toast.success('محتوا ایجاد شد')
      }

      resetForm()
    } catch (error) {
      toast.error('خطا در ذخیره محتوا')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      url: '',
      previewData: null
    })
    setShowCreateForm(false)
    setEditingContent(null)
  }

  const handleEdit = (content: SocialContent) => {
    setEditingContent(content)
    setFormData({
      title: content.title,
      description: content.description,
      url: content.url,
      previewData: content.previewData || null
    })
    setShowCreateForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('آیا از حذف این محتوا اطمینان دارید؟')) return

    try {
      setContents(prev => prev.filter(c => c.id !== id))
      toast.success('محتوا حذف شد')
    } catch (error) {
      toast.error('خطا در حذف محتوا')
    }
  }

  const shareContent = async (content: SocialContent) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: content.title,
          text: content.description,
          url: content.url
        })
      } catch (error) {
        // User cancelled sharing
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(content.url)
        toast.success('لینک کپی شد')
      } catch (error) {
        toast.error('خطا در کپی لینک')
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="h-6 w-6" />
            مدیریت محتوای اجتماعی
          </h2>
          <p className="text-muted-foreground">
            ایجاد و مدیریت پیشنمایش های غنی برای اشتراک گذاری در شبکه های اجتماعی
          </p>
        </div>
        
        <Button onClick={() => setShowCreateForm(true)} disabled={loading}>
          <Plus className="mr-2 h-4 w-4" />
          محتوای جدید
        </Button>
      </div>

      {/* Create/Edit Form */}
      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingContent ? 'ویرایش محتوا' : 'ایجاد محتوای جدید'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">عنوان</label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="عنوان محتوا..."
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">آدرس URL</label>
                  <Input
                    type="url"
                    value={formData.url}
                    onChange={(e) => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">توضیحات</label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="توضیحات محتوا..."
                  rows={3}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">تولید پیشنمایش</label>
                <LinkPreviewManager 
                  onPreviewGenerated={handlePreviewGenerated}
                  initialUrl={formData.url}
                />
              </div>

              {formData.previewData && (
                <div>
                  <label className="text-sm font-medium mb-2 block">پیشنمایش نهایی</label>
                  <LinkPreviewCard data={formData.previewData} />
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  {editingContent ? 'بروزرسانی' : 'ایجاد'}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  لغو
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Content List */}
      <div className="grid gap-6">
        {loading && !showCreateForm ? (
          <div className="text-center py-8">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
            <p>در حال بارگذاری...</p>
          </div>
        ) : contents.length > 0 ? (
          contents.map((content) => (
            <Card key={content.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1">{content.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">{content.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {content.views}
                    </Badge>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" onClick={() => shareContent(content)}>
                        <Share2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(content)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleDelete(content.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {content.previewData ? (
                  <LinkPreviewCard data={content.previewData} />
                ) : (
                  <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-900 text-center">
                    <Globe className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm text-gray-500">پیشنمایش موجود نیست</p>
                    <a 
                      href={content.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 text-sm"
                    >
                      مشاهده لینک اصلی
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12">
            <Share2 className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">محتوایی وجود ندارد</h3>
            <p className="text-muted-foreground mb-4">
              هنوز محتوای اجتماعی ای ایجاد نکرده اید
            </p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              اولین محتوا را ایجاد کنید
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}