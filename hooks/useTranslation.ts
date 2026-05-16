'use client'

import { useLanguage } from '@/contexts/LanguageContext'
import { enterpriseTranslations, Language } from '@/lib/enterprise-translations'

export function useTranslation() {
  const { language } = useLanguage()
  
  const t = (key: string): string => {
    return enterpriseTranslations[language]?.[key] || enterpriseTranslations.fa[key] || key
  }
  
  return { t, language }
}
