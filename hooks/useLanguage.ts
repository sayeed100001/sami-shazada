'use client'

import { useContext } from 'react'
import { LanguageContext } from '@/contexts/LanguageContext'

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    // Return default values instead of throwing error to prevent crashes
    return {
      language: 'fa' as const,
      setLanguage: () => {},
      t: (key: string) => key
    }
  }
  return context
}