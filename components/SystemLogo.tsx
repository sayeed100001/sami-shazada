'use client'

import Image from 'next/image'
import { useSystemConfig } from '@/hooks/useSystemConfig'

interface SystemLogoProps {
  className?: string
  width?: number
  height?: number
}

export function SystemLogo({ className = '', width = 120, height = 40 }: SystemLogoProps) {
  const { config } = useSystemConfig()
  
  const logoUrl = config.logo_url || '/logo.png'
  const siteTitle = config.site_title || 'سرای شهزاده'

  return (
    <Image
      src={logoUrl}
      alt={siteTitle}
      width={width}
      height={height}
      className={className}
      priority
    />
  )
}
