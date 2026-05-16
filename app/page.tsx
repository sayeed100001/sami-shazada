'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { QuickActions } from '@/components/dashboard/quick-actions'
import { ExchangeRates } from '@/components/dashboard/exchange-rates'
import { FeaturedSarafs } from '@/components/dashboard/featured-sarafs'
import { ContentDisplay } from '@/components/dashboard/ContentDisplay'
import { UserSarafChatButton } from '@/components/chat/UserSarafChatButton'
import { IncentiveSection } from '@/components/dashboard/incentive-section'
import { CTASection } from '@/components/dashboard/cta-section'
import { useLanguage } from '@/hooks/useLanguage'
import {
  getDefaultHomePageContents,
  groupHomePageContents,
  normalizeHomePageLanguage,
  type HomePageContentGroup,
} from '@/lib/home-page-content'

export default function Home() {
  const { t, language } = useLanguage()
  const normalizedLanguage = normalizeHomePageLanguage(language)
  const [key, setKey] = useState(0)
  const [hasLoadedPublicContent, setHasLoadedPublicContent] = useState(false)
  const defaultHomeContent = useMemo(
    () => groupHomePageContents(getDefaultHomePageContents(normalizedLanguage)),
    [normalizedLanguage]
  )
  const [homeContent, setHomeContent] = useState<HomePageContentGroup>(() =>
    groupHomePageContents(getDefaultHomePageContents(normalizedLanguage))
  )

  useEffect(() => {
    const handleLanguageChange = () => {
      setKey((prev) => prev + 1)
    }
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  useEffect(() => {
    let isCancelled = false

    setHomeContent(defaultHomeContent)
    setHasLoadedPublicContent(false)

    const fetchHomeContent = async () => {
      try {
        const response = await fetch(`/api/public/home-content?language=${normalizedLanguage}`, {
          cache: 'default',
        })

        if (!response.ok) {
          throw new Error(`Failed to load home content: ${response.status}`)
        }

        const data = await response.json()
        if (!isCancelled) {
          setHomeContent(data)
          setHasLoadedPublicContent(true)
        }
      } catch (error) {
        console.error('Failed to load public home content:', error)
        if (!isCancelled) {
          setHasLoadedPublicContent(false)
        }
      }
    }

    void fetchHomeContent()

    return () => {
      isCancelled = true
    }
  }, [defaultHomeContent, normalizedLanguage])

  const hero = hasLoadedPublicContent ? homeContent.hero[0] || null : defaultHomeContent.hero[0]
  const featureCards = hasLoadedPublicContent ? homeContent.featureCards : defaultHomeContent.featureCards
  const statCards = hasLoadedPublicContent ? homeContent.statCards : defaultHomeContent.statCards

  return (
    <DashboardLayout key={key}>
      <div className="space-y-8 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

          <div className="absolute -right-4 top-0 h-72 w-72 animate-blob rounded-full bg-purple-500 opacity-20 mix-blend-multiply blur-3xl filter" />
          <div className="animation-delay-2000 absolute -bottom-8 left-20 h-72 w-72 animate-blob rounded-full bg-blue-500 opacity-20 mix-blend-multiply blur-3xl filter" />
          <div className="animation-delay-4000 absolute left-1/2 top-1/2 h-72 w-72 animate-blob rounded-full bg-pink-500 opacity-20 mix-blend-multiply blur-3xl filter" />

          <div className="relative z-10 p-8 md:p-16">
            <div className="group mb-8 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 backdrop-blur-xl transition-all duration-300 hover:bg-white/15">
              <div className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />
              </div>
              <span className="text-sm font-semibold text-white/90 transition-colors group-hover:text-white">
                {hero?.badgeText || t('hero.liveUpdate')}
              </span>
            </div>

            <h1 className="mb-6 text-5xl font-black leading-tight md:text-7xl">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent drop-shadow-2xl">
                {hero?.title || ''}
              </span>
            </h1>

            <p className="mb-4 max-w-3xl text-xl font-light leading-relaxed text-blue-100/90 md:text-3xl">
              {hero?.subtitle || ''}
            </p>
            <p className="mb-12 max-w-2xl text-lg text-purple-200/70 md:text-xl">
              {hero?.description || ''}
            </p>

            <QuickActions items={featureCards} />

            <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
              {statCards.map((stat) => (
                <div
                  key={stat.id}
                  className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-center backdrop-blur-sm transition-all hover:bg-white/10"
                >
                  <div className="persian-numbers mb-1 text-2xl font-bold text-white transition-transform group-hover:scale-110 md:text-3xl">
                    {stat.value}
                  </div>
                  <div className="text-xs text-blue-200/70 md:text-sm">{stat.title}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ContentDisplay />
        <div className="relative overflow-hidden rounded-3xl border border-gray-200/50 bg-white/80 shadow-2xl backdrop-blur-xl dark:border-gray-700/50 dark:bg-gray-900/80">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative z-10">
            <div className="border-b border-gray-200/50 bg-gradient-to-r from-blue-50/50 to-purple-50/50 px-6 py-5 backdrop-blur-sm dark:border-gray-700/50 dark:from-gray-800/50 dark:to-gray-800/50">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg">
                  <svg className="h-7 w-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{t('rates.title')}</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{t('rates.subtitle')}</p>
                </div>
              </div>
            </div>
            <ExchangeRates />
          </div>
        </div>

        <FeaturedSarafs />
        <CTASection />
        <IncentiveSection />
      </div>

      <UserSarafChatButton />
    </DashboardLayout>
  )
}
