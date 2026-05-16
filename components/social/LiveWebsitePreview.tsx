'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface LiveWebsitePreviewProps {
  url: string
  title: string
  height?: number
  autoRefresh?: boolean
  refreshInterval?: number
}

const EMBED_TIMEOUT_MS = 12000

export function LiveWebsitePreview({
  url,
  title,
  height = 600,
  autoRefresh = true,
  refreshInterval = 30000,
}: LiveWebsitePreviewProps) {
  const [refreshKey, setRefreshKey] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(Date.now())
  const [hasEmbedIssue, setHasEmbedIssue] = useState(false)
  const embedTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!autoRefresh) return

    const interval = window.setInterval(() => {
      handleRefresh()
    }, refreshInterval)

    return () => window.clearInterval(interval)
  }, [autoRefresh, refreshInterval])

  useEffect(() => {
    setIsLoading(true)
    setHasEmbedIssue(false)

    if (embedTimeoutRef.current !== null) {
      window.clearTimeout(embedTimeoutRef.current)
      embedTimeoutRef.current = null
    }

    const timeout = window.setTimeout(() => {
      setIsLoading(false)
      setHasEmbedIssue(true)
    }, EMBED_TIMEOUT_MS)

    embedTimeoutRef.current = timeout

    return () => {
      window.clearTimeout(timeout)
      if (embedTimeoutRef.current === timeout) {
        embedTimeoutRef.current = null
      }
    }
  }, [refreshKey, url])

  const handleRefresh = () => {
    setRefreshKey((previous) => previous + 1)
    setLastRefresh(Date.now())
  }

  const handleLoad = () => {
    if (embedTimeoutRef.current !== null) {
      window.clearTimeout(embedTimeoutRef.current)
      embedTimeoutRef.current = null
    }
    setIsLoading(false)
    setHasEmbedIssue(false)
  }

  const handleEmbedError = () => {
    if (embedTimeoutRef.current !== null) {
      window.clearTimeout(embedTimeoutRef.current)
      embedTimeoutRef.current = null
    }
    setIsLoading(false)
    setHasEmbedIssue(true)
  }

  const embedUrl = useMemo(() => {
    if (url.includes('facebook.com')) {
      return `https://www.facebook.com/plugins/page.php?href=${encodeURIComponent(url)}&tabs=timeline&width=500&height=${height}&small_header=false&adapt_container_width=true&hide_cover=false&show_facepile=true&appId`
    }

    return `${url}${url.includes('?') ? '&' : '?'}_t=${refreshKey}`
  }, [height, refreshKey, url])

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="text-lg truncate">{title}</CardTitle>
            <div className="text-xs text-muted-foreground mt-1">
              آخرین به‌روزرسانی: {new Date(lastRefresh).toLocaleTimeString('fa-IR')}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="relative bg-muted/30" style={{ height: `${height}px` }}>
          {isLoading && !hasEmbedIssue && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm text-muted-foreground">در حال بارگذاری پیش‌نمایش...</p>
              </div>
            </div>
          )}

          {hasEmbedIssue && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/95 p-6 text-center">
              <div className="max-w-sm space-y-3">
                <p className="font-medium">نمایش زنده این منبع در داخل سایت ممکن نشد.</p>
                <p className="text-sm text-muted-foreground">
                  بعضی سایت‌ها یا شبکه‌های اجتماعی اجازه نمایش در iframe را نمی‌دهند. لینک اصلی همچنان در دسترس است.
                </p>
                <Button asChild>
                  <a href={url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    باز کردن منبع اصلی
                  </a>
                </Button>
              </div>
            </div>
          )}

          <iframe
            key={refreshKey}
            src={embedUrl}
            className={`w-full h-full border-0 ${hasEmbedIssue ? 'opacity-0 pointer-events-none' : ''}`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
            onLoad={handleLoad}
            onError={handleEmbedError}
          />
        </div>
      </CardContent>
    </Card>
  )
}
