'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Language } from '@/lib/i18n'
import { completeTranslations } from '@/lib/translations-complete'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

export { LanguageContext }

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>('fa')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Load saved language immediately
    try {
      const saved = localStorage.getItem('language') as Language
      if (saved && ['fa', 'en', 'ps'].includes(saved)) {
        setLanguageState(saved)
        updateDocumentLanguage(saved)
      } else {
        setLanguageState('fa')
        updateDocumentLanguage('fa')
      }
    } catch (error) {
      setLanguageState('fa')
      updateDocumentLanguage('fa')
    }
  }, [])

  const updateDocumentLanguage = (lang: Language) => {
    if (typeof window !== 'undefined') {
      const isRTL = lang === 'fa' || lang === 'ps'
      document.documentElement.lang = lang
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr'
      document.documentElement.setAttribute('data-language', lang)
      
      // Update body class
      const bodyClasses = document.body.className.split(' ').filter(c => !c.startsWith('lang-'))
      bodyClasses.push(`lang-${lang}`)
      document.body.className = bodyClasses.join(' ')
    }
  }

  const setLanguage = (lang: Language) => {
    try {
      console.log('Changing language to:', lang)
      setLanguageState(lang)
      localStorage.setItem('language', lang)
      updateDocumentLanguage(lang)
      
      // Trigger re-render by dispatching custom event
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }))
    } catch (error) {
      console.error('Error setting language:', error)
    }
  }

  const t = (key: string): string => {
    if (!mounted) return key
    try {
      return completeTranslations[language]?.[key] || completeTranslations.fa[key] || key
    } catch (error) {
      console.warn('Translation error for key:', key, error)
      return key
    }
  }

  if (!mounted) {
    return null
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}