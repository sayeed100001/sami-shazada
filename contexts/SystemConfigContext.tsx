'use client'

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'

interface SystemConfigContextType {
  config: Record<string, string>
  loading: boolean
  refreshConfig: () => Promise<void>
}

const SystemConfigContext = createContext<SystemConfigContextType | undefined>(undefined)

export function SystemConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const fetchConfig = async () => {
    try {
      const response = await fetch('/api/system/config/public', { cache: 'no-store' })
      if (response.ok) {
        const data = await response.json()
        setConfig(data)
        applyConfigToDOM(data)
      }
    } catch (error) {
      console.error('Failed to fetch system config:', error)
    } finally {
      setLoading(false)
    }
  }

  const applyConfigToDOM = (cfg: Record<string, string>) => {
    if (cfg.default_language) {
      document.documentElement.lang = cfg.default_language
      document.documentElement.dir = cfg.default_language === 'en' ? 'ltr' : 'rtl'
    }

    if (cfg.primary_color) {
      document.documentElement.style.setProperty('--primary', cfg.primary_color)
    }
    if (cfg.secondary_color) {
      document.documentElement.style.setProperty('--secondary', cfg.secondary_color)
    }
    if (cfg.success_color) {
      document.documentElement.style.setProperty('--success', cfg.success_color)
    }

    if (cfg.ui_scale) {
      const parsed = Number(cfg.ui_scale)
      const clamped = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0.75), 1) : null
      if (clamped) {
        document.documentElement.style.setProperty('--ui-scale', String(clamped))
      }
    }

    if (cfg.favicon_url) {
      const existingIcon = document.querySelector("link[rel*='icon']") as HTMLLinkElement | null
      const link = existingIcon || document.createElement('link')
      link.type = 'image/x-icon'
      link.rel = 'shortcut icon'
      link.href = cfg.favicon_url
      if (!existingIcon) {
        document.getElementsByTagName('head')[0].appendChild(link)
      }
    }

    if (cfg.site_title) {
      document.title = cfg.site_title
    }
  }

  useEffect(() => {
    void fetchConfig()

    const interval = setInterval(() => {
      void fetchConfig()
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <SystemConfigContext.Provider value={{ config, loading, refreshConfig: fetchConfig }}>
      {children}
    </SystemConfigContext.Provider>
  )
}

export function useSystemConfigContext() {
  const context = useContext(SystemConfigContext)
  if (!context) {
    throw new Error('useSystemConfigContext must be used within SystemConfigProvider')
  }
  return context
}
