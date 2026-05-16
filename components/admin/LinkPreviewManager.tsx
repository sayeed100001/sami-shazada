'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ExternalLink, Globe, Image, Loader2 } from 'lucide-react'

interface LinkPreview {
  title: string
  description: string
  image: string
  url: string
  siteName: string
  type: string
  favicon: string
}

interface LinkPreviewManagerProps {
  onPreviewGenerated: (preview: LinkPreview) => void
  initialUrl?: string
}

export function LinkPreviewManager({ onPreviewGenerated, initialUrl = '' }: LinkPreviewManagerProps) {
  const [url, setUrl] = useState(initialUrl)
  const [preview, setPreview] = useState<LinkPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const generatePreview = async () => {
    if (!url.trim()) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/link-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate preview')
      }

      const previewData = await response.json()
      setPreview(previewData)
      onPreviewGenerated(previewData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در تولید پیش‌نمایش')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="آدرس وب سایت را وارد کنید..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && generatePreview()}
        />
        <Button 
          onClick={generatePreview} 
          disabled={loading || !url.trim()}
          className="flex-shrink-0"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          {loading ? 'در حال بارگذاری...' : 'پیش‌نمایش'}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {preview && (
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">پیش‌نمایش لینک</CardTitle>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Globe className="h-3 w-3" />
                {preview.siteName}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              {preview.image && (
                <div className="flex-shrink-0">
                  <img
                    src={preview.image}
                    alt={preview.title}
                    className="w-24 h-24 object-cover rounded-lg border"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement
                      target.style.display = 'none'
                    }}
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                  {preview.title}
                </h3>
                {preview.description && (
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-3">
                    {preview.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  {preview.favicon && (
                    <img
                      src={preview.favicon}
                      alt=""
                      className="w-4 h-4"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement
                        target.style.display = 'none'
                      }}
                    />
                  )}
                  <span className="truncate">{preview.url}</span>
                  <a
                    href={preview.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}