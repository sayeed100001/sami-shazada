'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Globe, ExternalLink, Facebook, Twitter, Youtube, Instagram } from 'lucide-react'

interface LinkPreviewData {
  title: string
  description: string
  image: string
  url: string
  siteName: string
  type: string
  favicon: string
}

interface LinkPreviewCardProps {
  data: LinkPreviewData
  className?: string
}

export function LinkPreviewCard({ data, className = '' }: LinkPreviewCardProps) {
  const [imageError, setImageError] = useState(false)
  const [faviconError, setFaviconError] = useState(false)

  const getSiteIcon = (siteName: string, url: string) => {
    const domain = new URL(url).hostname.toLowerCase()
    
    if (domain.includes('facebook.com')) return <Facebook className="h-4 w-4 text-blue-600" />
    if (domain.includes('twitter.com') || domain.includes('x.com')) return <Twitter className="h-4 w-4 text-blue-400" />
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) return <Youtube className="h-4 w-4 text-red-600" />
    if (domain.includes('instagram.com')) return <Instagram className="h-4 w-4 text-pink-600" />
    
    return <Globe className="h-4 w-4 text-gray-600" />
  }

  const getSiteBadgeColor = (url: string) => {
    const domain = new URL(url).hostname.toLowerCase()
    
    if (domain.includes('facebook.com')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (domain.includes('twitter.com') || domain.includes('x.com')) return 'bg-blue-100 text-blue-800 border-blue-200'
    if (domain.includes('youtube.com') || domain.includes('youtu.be')) return 'bg-red-100 text-red-800 border-red-200'
    if (domain.includes('instagram.com')) return 'bg-pink-100 text-pink-800 border-pink-200'
    
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  return (
    <Card className={`overflow-hidden hover:shadow-lg transition-all duration-300 border-2 hover:border-blue-200 ${className}`}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image Section */}
          {data.image && !imageError && (
            <div className="sm:w-1/3 lg:w-1/4 flex-shrink-0">
              <img
                src={data.image}
                alt={data.title}
                className="w-full h-48 sm:h-full object-cover"
                onError={() => setImageError(true)}
                loading="lazy"
              />
            </div>
          )}
          
          {/* Content Section */}
          <div className="flex-1 p-4 sm:p-6 space-y-3">
            {/* Header with site info */}
            <div className="flex items-center justify-between gap-2">
              <Badge 
                variant="secondary" 
                className={`flex items-center gap-1.5 px-2 py-1 text-xs font-medium border ${getSiteBadgeColor(data.url)}`}
              >
                {!faviconError && data.favicon ? (
                  <img
                    src={data.favicon}
                    alt=""
                    className="w-3 h-3"
                    onError={() => setFaviconError(true)}
                  />
                ) : (
                  getSiteIcon(data.siteName, data.url)
                )}
                <span className="truncate max-w-[120px]">{data.siteName}</span>
              </Badge>
              
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="باز کردن در تب جدید"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            {/* Title */}
            <h3 className="font-bold text-lg sm:text-xl leading-tight line-clamp-2 text-gray-900 dark:text-white">
              {data.title}
            </h3>

            {/* Description */}
            {data.description && (
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 line-clamp-3 leading-relaxed">
                {data.description}
              </p>
            )}

            {/* URL */}
            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
              <Globe className="h-3 w-3 flex-shrink-0" />
              <span className="truncate font-mono">
                {new URL(data.url).hostname}
              </span>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <a
                href={data.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
              >
                {getSiteIcon(data.siteName, data.url)}
                <span>مشاهده کامل</span>
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}