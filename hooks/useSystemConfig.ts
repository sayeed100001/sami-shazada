'use client'

import { useEffect, useState } from 'react'

interface SystemConfig {
  site_title?: string
  site_description?: string
  contact_email?: string
  contact_phone?: string
  support_email?: string
  logo_url?: string
  favicon_url?: string
  ui_scale?: string
  primary_color?: string
  secondary_color?: string
  maintenance_mode?: string
  [key: string]: string | undefined
}

let cachedConfig: SystemConfig | null = null
let cacheTime = 0
const CACHE_DURATION = 60000 // 1 minute

export function useSystemConfig() {
  const [config, setConfig] = useState<SystemConfig>(cachedConfig || {})
  const [loading, setLoading] = useState(!cachedConfig)

  useEffect(() => {
    const fetchConfig = async () => {
      // Use cache if fresh
      if (cachedConfig && Date.now() - cacheTime < CACHE_DURATION) {
        setConfig(cachedConfig)
        setLoading(false)
        return
      }

      try {
        const response = await fetch('/api/system/config/public', {
          cache: 'no-store'
        })
        if (response.ok) {
          const data = await response.json()
          cachedConfig = data
          cacheTime = Date.now()
          setConfig(data)
        }
      } catch (error) {
        console.error('Failed to fetch system config:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchConfig()
  }, [])

  return { config, loading }
}

export function clearConfigCache() {
  cachedConfig = null
  cacheTime = 0
}
