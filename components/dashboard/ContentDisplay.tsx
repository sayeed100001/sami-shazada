'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Facebook, Globe, MessageSquare, RefreshCw, Video } from 'lucide-react'
import Image from 'next/image'
import { LiveWebsitePreview } from '@/components/social/LiveWebsitePreview'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface ContentItem {
  id: string
  title: string
  type: 'IFRAME' | 'VIDEO' | 'FACEBOOK' | 'ANNOUNCEMENT' | 'IMAGE'
  content: string
  url?: string
  isActive: boolean
  position: string
  createdAt: string
  updatedAt: string
}

function getYoutubeVideoId(url?: string) {
  if (!url) return null

  if (url.includes('youtu.be/')) {
    return url.split('youtu.be/')[1]?.split('?')[0] || null
  }

  if (url.includes('youtube.com/watch?v=')) {
    return url.split('v=')[1]?.split('&')[0] || null
  }

  return null
}

function getTypeIcon(type: ContentItem['type']) {
  switch (type) {
    case 'IFRAME':
      return <Globe className="h-4 w-4" />
    case 'VIDEO':
      return <Video className="h-4 w-4" />
    case 'FACEBOOK':
      return <Facebook className="h-4 w-4" />
    case 'ANNOUNCEMENT':
      return <MessageSquare className="h-4 w-4" />
    case 'IMAGE':
      return <span className="grid h-4 w-4 place-items-center text-[11px] font-black">IMG</span>
    default:
      return <Globe className="h-4 w-4" />
  }
}

function getTypeLabel(type: ContentItem['type']) {
  switch (type) {
    case 'IFRAME':
      return 'صفحه وب'
    case 'VIDEO':
      return 'ویدیو'
    case 'FACEBOOK':
      return 'فیسبوک'
    case 'ANNOUNCEMENT':
      return 'اعلان'
    case 'IMAGE':
      return 'تصویر'
    default:
      return 'محتوا'
  }
}

export function ContentDisplay() {
  const [contentItems, setContentItems] = useState<ContentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastFetch, setLastFetch] = useState<number | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    void fetchContent()
  }, [])

  const fetchContent = async (force = false) => {
    if (refreshing && !force) return

    try {
      setRefreshing(true)
      setError(null)

      const response = await fetch('/api/content', {
        method: 'GET',
        cache: force ? 'reload' : 'default',
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setContentItems(Array.isArray(data) ? data : [])
      setLastFetch(Date.now())
    } catch (fetchError) {
      console.error('Content fetch error:', fetchError)
      setError('بارگذاری محتوای ویژه ناموفق بود.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useAdaptivePolling(
    async () => {
      await fetchContent()
    },
    {
      enabled: true,
      activeIntervalMs: POLLING_INTERVALS.publicContentActiveMs,
      idleIntervalMs: POLLING_INTERVALS.publicContentIdleMs,
      hiddenIntervalMs: false,
      runImmediately: false,
    }
  )

  const renderContent = (item: ContentItem) => {
    if (item.type === 'ANNOUNCEMENT') {
      return (
        <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-blue-900 dark:text-blue-100 leading-7">{item.content}</p>
        </div>
      )
    }

    if (item.type === 'IMAGE') {
      if (!item.url) {
        return (
          <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-muted-foreground">تصویر ثبت نشده است.</p>
          </div>
        )
      }

      return (
        <div className="space-y-3">
          <div className="relative overflow-hidden rounded-lg border bg-muted/20">
            <div className="relative h-64 w-full">
              <Image
                src={item.url}
                alt={item.title}
                fill
                sizes="(max-width: 768px) 100vw, 50vw"
                className="object-cover"
                priority={false}
              />
            </div>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            <ExternalLink className="h-4 w-4" />
            مشاهده تصویر
          </a>
        </div>
      )
    }

    if ((item.type === 'IFRAME' || item.type === 'FACEBOOK') && item.url) {
      if (item.url.toLowerCase().includes('example.com')) {
        return (
          <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
            <div className="space-y-3">
              <p className="font-medium">این آدرس نمونه است و برای نمایش واقعی مناسب نیست.</p>
              <p className="text-sm text-muted-foreground">
                لطفاً در پنل ادمین یک آدرس واقعی ثبت کنید.
              </p>
            </div>
          </div>
        )
      }

      return (
        <LiveWebsitePreview
          url={item.url}
          title={item.title}
          height={item.type === 'FACEBOOK' ? 420 : 360}
          autoRefresh={false}
        />
      )
    }

    if (item.type === 'VIDEO') {
      const videoId = getYoutubeVideoId(item.url)

      if (!videoId) {
        return (
          <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
            <p className="text-muted-foreground">لینک ویدیو معتبر نیست.</p>
          </div>
        )
      }

      return (
        <div className="space-y-3">
          <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&controls=1`}
              className="w-full h-full"
              title={item.title}
              frameBorder="0"
              allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
          <a
            href={`https://www.youtube.com/watch?v=${videoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-3 py-2 text-sm text-white transition-colors hover:bg-red-700"
          >
            <ExternalLink className="h-4 w-4" />
            مشاهده در یوتیوب
          </a>
        </div>
      )
    }

    return (
      <div className="flex min-h-[220px] items-center justify-center rounded-lg border bg-muted/30 p-6 text-center">
        <p className="text-muted-foreground">این آیتم هنوز محتوای قابل نمایش ندارد.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((item) => (
          <Card key={item}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 w-32 rounded bg-muted mb-4" />
                <div className="h-48 rounded bg-muted" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => fetchContent(true)}
          className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          تلاش مجدد
        </button>
      </div>
    )
  }

  if (contentItems.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">هیچ محتوایی برای نمایش وجود ندارد.</p>
        <p className="text-sm text-muted-foreground mt-2">محتوا را از پنل ادمین اضافه و فعال کنید.</p>
        <button
          onClick={() => fetchContent(true)}
          className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          بارگذاری مجدد
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold">محتوای ویژه</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {contentItems.length} مورد فعال در داشبورد
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            آخرین به‌روزرسانی:{' '}
            {lastFetch ? new Date(lastFetch).toLocaleTimeString('fa-IR') : 'نامشخص'}
          </span>
          <button
            onClick={() => fetchContent(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'در حال به‌روزرسانی...' : 'به‌روزرسانی'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6">
        {contentItems.map((item) => (
          <Card key={item.id} className={item.type === 'ANNOUNCEMENT' ? 'md:col-span-2' : ''}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  {getTypeIcon(item.type)}
                  <span className="truncate">{item.title}</span>
                </CardTitle>
                <Badge variant="outline">{getTypeLabel(item.type)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderContent(item)}
              {item.content && item.type !== 'ANNOUNCEMENT' && (
                <p className="text-sm leading-6 text-muted-foreground">{item.content}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
