'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { BookOpen, Building, Calculator, Search, Shield, Smartphone, TrendingUp, Users, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import type { HomePageContentRecord } from '@/lib/home-page-content'

interface QuickActionViewModel {
  id: string
  title: string
  description?: string | null
  icon?: string | null
  href: string
  color: string
}

const colorPalette = [
  'bg-blue-500 hover:bg-blue-600',
  'bg-green-500 hover:bg-green-600',
  'bg-purple-500 hover:bg-purple-600',
  'bg-orange-500 hover:bg-orange-600',
  'bg-pink-500 hover:bg-pink-600',
  'bg-indigo-500 hover:bg-indigo-600',
]

const iconMap = {
  search: Search,
  calculator: Calculator,
  building: Building,
  'book-open': BookOpen,
  smartphone: Smartphone,
  'trending-up': TrendingUp,
  users: Users,
  shield: Shield,
  'message-square': MessageSquare,
} as const

function resolveIcon(icon: string | null | undefined, href: string, title: string) {
  const normalizedIcon = (icon || '').trim().toLowerCase()
  const iconFromMap = normalizedIcon ? iconMap[normalizedIcon as keyof typeof iconMap] : null
  if (iconFromMap) {
    return { type: 'component' as const, value: iconFromMap }
  }

  if (icon && /[^\w-]/.test(icon)) {
    return { type: 'emoji' as const, value: icon }
  }

  if (href.includes('track')) return { type: 'component' as const, value: Search }
  if (href.includes('calculator')) return { type: 'component' as const, value: Calculator }
  if (href.includes('saraf')) return { type: 'component' as const, value: Building }
  if (href.includes('education')) return { type: 'component' as const, value: BookOpen }
  if (href.includes('mobile')) return { type: 'component' as const, value: Smartphone }
  if (href.includes('chart')) return { type: 'component' as const, value: TrendingUp }
  if (title.toLowerCase().includes('security')) return { type: 'component' as const, value: Shield }

  return { type: 'component' as const, value: Search }
}

export function QuickActions({ items }: { items?: HomePageContentRecord[] }) {
  const { t } = useLanguage()
  const [key, setKey] = useState(0)

  useEffect(() => {
    const handleLanguageChange = () => setKey((prev) => prev + 1)
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  const fallbackActions: QuickActionViewModel[] = [
    {
      id: 'track',
      title: t('quickActions.trackHawala'),
      description: t('quickActions.trackHawalaDesc'),
      icon: 'search',
      href: '/hawala/track',
      color: colorPalette[0],
    },
    {
      id: 'calculator',
      title: t('quickActions.calculator'),
      description: t('quickActions.calculatorDesc'),
      icon: 'calculator',
      href: '/calculator',
      color: colorPalette[1],
    },
    {
      id: 'sarafs',
      title: t('quickActions.sarafs'),
      description: t('quickActions.sarafsDesc'),
      icon: 'building',
      href: '/sarafs',
      color: colorPalette[2],
    },
    {
      id: 'education',
      title: t('quickActions.education'),
      description: t('quickActions.educationDesc'),
      icon: 'book-open',
      href: '/education',
      color: colorPalette[3],
    },
    {
      id: 'mobile-app',
      title: t('quickActions.mobileApp'),
      description: t('quickActions.mobileAppDesc'),
      icon: 'smartphone',
      href: '/mobile-app',
      color: colorPalette[4],
    },
    {
      id: 'charts',
      title: t('quickActions.charts'),
      description: t('quickActions.chartsDesc'),
      icon: 'trending-up',
      href: '/charts',
      color: colorPalette[5],
    },
  ]

  const actions: QuickActionViewModel[] =
    items !== undefined
      ? items.map((item, index) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          icon: item.icon,
          href: item.linkUrl || '#',
          color: colorPalette[index % colorPalette.length],
        }))
      : fallbackActions

  return (
    <div key={key} className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {actions.map((action) => {
        const resolvedIcon = resolveIcon(action.icon, action.href, action.title)
        const IconComponent = resolvedIcon.type === 'component' ? resolvedIcon.value : null
        const emojiIcon = resolvedIcon.type === 'emoji' ? resolvedIcon.value : null

        return (
          <Button
            key={action.id}
            variant="ghost"
            className="h-auto flex-col gap-3 border border-white/10 bg-white/5 p-4 text-center text-white shadow-lg shadow-black/10 backdrop-blur-sm transition-all duration-200 hover:scale-105 hover:bg-white/10 hover:text-white"
            asChild
          >
            <Link href={action.href}>
              <div className={`mb-2 flex h-12 w-12 items-center justify-center rounded-full ${action.color} text-white`}>
                {IconComponent ? (
                  <IconComponent className="h-6 w-6" />
                ) : (
                  <span className="text-2xl leading-none">{emojiIcon}</span>
                )}
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{action.title}</div>
                <div className="hidden text-xs leading-5 text-blue-100/85 md:block">
                  {action.description}
                </div>
              </div>
            </Link>
          </Button>
        )
      })}
    </div>
  )
}
