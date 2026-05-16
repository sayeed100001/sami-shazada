'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface ThemeConfig {
  THEME_PRIMARY_COLOR: string
  THEME_SECONDARY_COLOR: string
  THEME_ACCENT_COLOR: string
  THEME_BACKGROUND_COLOR: string
  THEME_TEXT_COLOR: string
  THEME_FONT_PRIMARY: string
  THEME_FONT_HEADINGS: string
  THEME_LOGO_MAIN: string
  THEME_LOGO_FAVICON: string
  THEME_LOGO_DARK: string
  THEME_SIDEBAR_POSITION: 'left' | 'right'
  THEME_HEADER_STYLE: 'fixed' | 'static'
  THEME_BORDER_RADIUS: string
  THEME_SPACING: string
  SITE_NAME: string
  SITE_DESCRIPTION: string
  CONTACT_EMAIL: string
  CONTACT_PHONE: string
}

interface ThemeContextType {
  theme: ThemeConfig
  loading: boolean
  refreshTheme: () => Promise<void>
}

const defaultTheme: ThemeConfig = {
  THEME_PRIMARY_COLOR: '#6366f1',
  THEME_SECONDARY_COLOR: '#8b5cf6',
  THEME_ACCENT_COLOR: '#ec4899',
  THEME_BACKGROUND_COLOR: '#ffffff',
  THEME_TEXT_COLOR: '#1f2937',
  THEME_FONT_PRIMARY: 'Helvetica',
  THEME_FONT_HEADINGS: 'Helvetica',
  THEME_LOGO_MAIN: '/logo.png',
  THEME_LOGO_FAVICON: '/favicon.ico',
  THEME_LOGO_DARK: '/logo-dark.png',
  THEME_SIDEBAR_POSITION: 'right',
  THEME_HEADER_STYLE: 'fixed',
  THEME_BORDER_RADIUS: '8',
  THEME_SPACING: '16',
  SITE_NAME: 'سرای شهزاده',
  SITE_DESCRIPTION: 'پلتفرم جامع مالی افغانستان',
  CONTACT_EMAIL: 'info@saray.af',
  CONTACT_PHONE: '+93700000000'
}

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  loading: true,
  refreshTheme: async () => {}
})

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme)
  const [loading, setLoading] = useState(true)

  const fetchTheme = async () => {
    try {
      const response = await fetch('/api/admin/theme')
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.theme) {
          setTheme(data.theme)
          applyTheme(data.theme)
        }
      } else {
        // If API fails (401 or other), just use default theme
        applyTheme(defaultTheme)
      }
    } catch (error) {
      // Silently use default theme on error
      applyTheme(defaultTheme)
    } finally {
      setLoading(false)
    }
  }

  const applyTheme = (themeConfig: ThemeConfig) => {
    const root = document.documentElement
    
    root.style.setProperty('--color-primary', themeConfig.THEME_PRIMARY_COLOR)
    root.style.setProperty('--color-secondary', themeConfig.THEME_SECONDARY_COLOR)
    root.style.setProperty('--color-accent', themeConfig.THEME_ACCENT_COLOR)
    root.style.setProperty('--color-background', themeConfig.THEME_BACKGROUND_COLOR)
    root.style.setProperty('--color-text', themeConfig.THEME_TEXT_COLOR)
    root.style.setProperty('--border-radius', `${themeConfig.THEME_BORDER_RADIUS}px`)
    root.style.setProperty('--spacing', `${themeConfig.THEME_SPACING}px`)
    
    root.style.setProperty('--font-primary', themeConfig.THEME_FONT_PRIMARY)
    root.style.setProperty('--font-headings', themeConfig.THEME_FONT_HEADINGS)
  }

  useEffect(() => {
    fetchTheme()
  }, [])

  const refreshTheme = async () => {
    setLoading(true)
    await fetchTheme()
  }

  return (
    <ThemeContext.Provider value={{ theme, loading, refreshTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
