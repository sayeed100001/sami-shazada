'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Globe } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { Language } from '@/lib/i18n'

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage()
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  const languages = [
    { code: 'fa' as Language, name: 'فارسی', nativeName: 'فارسی', flag: '🇦🇫' },
    { code: 'ps' as Language, name: 'پښتو', nativeName: 'پښتو', flag: '🇦🇫' },
    { code: 'en' as Language, name: 'English', nativeName: 'English', flag: '🇺🇸' }
  ]

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.language-switcher')) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('click', handleClickOutside)
      return () => document.removeEventListener('click', handleClickOutside)
    }
    return undefined
  }, [isOpen])

  const handleLanguageChange = (langCode: Language) => {
    try {
      console.log('Switching to language:', langCode)
      setLanguage(langCode)
      setIsOpen(false)
    } catch (error) {
      console.error('Language change error:', error)
    }
  }

  if (!mounted) {
    return (
      <Button variant="ghost" size="sm" disabled>
        <Globe className="h-4 w-4" />
      </Button>
    )
  }

  const currentLang = languages.find(l => l.code === language) || languages[0]

  return (
    <div className="relative language-switcher">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-600 hover:bg-indigo-50/80 dark:text-gray-300 dark:hover:bg-indigo-900/30 transition-all duration-200 sm:h-10 sm:w-10 sm:hidden"
      >
        <Globe className="h-6 w-6 sm:h-5 sm:w-5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className="hidden h-9 items-center justify-center gap-2 rounded-xl px-3 text-gray-600 hover:bg-indigo-50/80 dark:text-gray-300 dark:hover:bg-indigo-900/30 transition-all duration-200 sm:flex"
      >
        <Globe className="h-4 w-4" />
        <span className="hidden sm:inline">
          {currentLang.nativeName}
        </span>
      </Button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border rounded-lg shadow-lg z-50 min-w-[160px]">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className={`w-full px-4 py-3 text-right hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                language === lang.code ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300' : ''
              }`}
            >
              <span className="text-xl">{lang.flag}</span>
              <div className="flex flex-col items-start flex-1">
                <span className="text-sm font-medium">{lang.nativeName}</span>
                <span className="text-xs text-muted-foreground">{lang.name}</span>
              </div>
              {language === lang.code && (
                <span className="text-blue-600 dark:text-blue-300 font-bold">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}