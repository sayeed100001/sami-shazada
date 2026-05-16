'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowUpRight, ExternalLink, Megaphone, Phone, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import { ADVERTISEMENT_POSITIONS, type AdvertisementPosition } from '@/lib/advertising'
import { cn } from '@/lib/utils'

export interface PublicAdvertisement {
  id: string
  position: AdvertisementPosition
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
  impressions: number
  clicks: number
  startDate: string | null
  endDate: string | null
  saraf: {
    id: string
    businessName: string
    businessPhone: string
  }
}

export type PublicAdvertisementPlacementMap = Record<AdvertisementPosition, PublicAdvertisement[]>

export function createEmptyPublicAdvertisementPlacementMap(): PublicAdvertisementPlacementMap {
  return ADVERTISEMENT_POSITIONS.reduce((accumulator, position) => {
    accumulator[position] = []
    return accumulator
  }, {} as PublicAdvertisementPlacementMap)
}

function normalizeAdvertisementLink(rawUrl: string | null | undefined, sarafId: string) {
  const trimmedUrl = rawUrl?.trim()

  if (!trimmedUrl) {
    return {
      href: `/sarafs/${sarafId}`,
      external: false,
      newTab: false,
    }
  }

  if (trimmedUrl.startsWith('/')) {
    return {
      href: trimmedUrl,
      external: false,
      newTab: false,
    }
  }

  if (/^(https?:\/\/|tel:|mailto:)/i.test(trimmedUrl)) {
    return {
      href: trimmedUrl,
      external: true,
      newTab: /^https?:\/\//i.test(trimmedUrl),
    }
  }

  return {
    href: `https://${trimmedUrl}`,
    external: true,
    newTab: true,
  }
}

function formatAdvertisementWindow(endDate: string | null, locale: string) {
  if (!endDate) {
    return null
  }

  const parsedDate = new Date(endDate)
  if (Number.isNaN(parsedDate.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(parsedDate)
}

function getAdvertisementTheme(layout: 'hero' | 'featured' | 'sidebar' | 'footer') {
  if (layout === 'hero') {
    return {
      accent: 'bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-500',
      wrapper:
        'overflow-hidden rounded-[30px] border border-amber-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.98),rgba(254,243,199,0.94))] shadow-[0_36px_90px_-60px_rgba(217,119,6,0.65)] backdrop-blur-xl dark:border-amber-300/30 dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-amber-950/40 dark:ring-1 dark:ring-amber-300/10 dark:shadow-[0_36px_90px_-50px_rgba(251,191,36,0.28)]',
      outline:
        'border-amber-200/90 bg-white/90 text-slate-900 dark:border-amber-300/25 dark:bg-slate-800 dark:text-white',
      accentGlow:
        'bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.32),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(249,115,22,0.18),transparent_28%)] dark:opacity-40',
      label:
        'text-amber-700 dark:text-amber-200',
    }
  }

  if (layout === 'featured') {
    return {
      accent: 'bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-500',
      wrapper:
        'overflow-hidden rounded-[26px] border border-violet-200/85 bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(248,250,252,0.98),rgba(237,233,254,0.86))] shadow-[0_26px_70px_-55px_rgba(76,29,149,0.38)] ring-1 ring-violet-100/90 backdrop-blur-xl dark:border-violet-300/18 dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-950 dark:to-indigo-950/40 dark:ring-violet-300/10 dark:shadow-[0_26px_70px_-45px_rgba(99,102,241,0.28)]',
      outline:
        'border-violet-200/90 bg-white/90 text-slate-900 dark:border-violet-300/25 dark:bg-slate-800 dark:text-white',
      accentGlow:
        'bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.16),transparent_28%)] dark:opacity-40',
      label:
        'text-violet-700 dark:text-violet-200',
    }
  }

  if (layout === 'sidebar') {
    return {
      accent: 'bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-500',
      wrapper:
        'overflow-hidden rounded-[24px] border border-cyan-200/90 bg-[linear-gradient(160deg,rgba(255,255,255,0.99),rgba(248,250,252,0.99),rgba(224,242,254,0.9))] shadow-[0_26px_70px_-55px_rgba(8,145,178,0.34)] ring-1 ring-cyan-100/90 backdrop-blur-xl dark:border-cyan-300/18 dark:bg-slate-950 dark:bg-gradient-to-br dark:from-slate-950 dark:to-sky-950/40 dark:ring-cyan-300/10 dark:shadow-[0_26px_70px_-45px_rgba(56,189,248,0.24)]',
      outline:
        'border-cyan-200/90 bg-white/92 text-slate-900 dark:border-cyan-300/25 dark:bg-slate-800 dark:text-white',
      accentGlow:
        'bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_28%)] dark:opacity-40',
      label:
        'text-cyan-700 dark:text-cyan-200',
    }
  }

  return {
    accent: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500',
    wrapper:
      'overflow-hidden rounded-[28px] border border-slate-200/90 bg-[linear-gradient(135deg,rgba(255,255,255,0.98),rgba(238,242,255,0.96),rgba(224,231,255,0.94))] shadow-[0_30px_80px_-55px_rgba(79,70,229,0.38)] backdrop-blur-xl dark:border-indigo-300/15 dark:bg-slate-900 dark:bg-gradient-to-br dark:from-slate-900 dark:to-indigo-950/40 dark:ring-1 dark:ring-indigo-300/10 dark:shadow-[0_30px_80px_-45px_rgba(129,140,248,0.25)]',
    outline:
      'border-indigo-200/90 bg-white/92 text-slate-900 dark:border-indigo-300/25 dark:bg-slate-800 dark:text-white',
    accentGlow:
      'bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.2),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(129,140,248,0.16),transparent_28%)] dark:opacity-40',
    label:
      'text-indigo-700 dark:text-indigo-200',
  }
}

function AdvertisementCard({
  advertisement,
  layout,
  track = true,
}: {
  advertisement: PublicAdvertisement
  layout: 'hero' | 'featured' | 'sidebar' | 'footer'
  track?: boolean
}) {
  const pathname = usePathname() ?? ''
  const { language } = useLanguage()
  const ref = useRef<HTMLDivElement | null>(null)
  const [impressionTracked, setImpressionTracked] = useState(false)

  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  const theme = getAdvertisementTheme(layout)

  const link = useMemo(
    () => normalizeAdvertisementLink(advertisement.linkUrl, advertisement.saraf.id),
    [advertisement.linkUrl, advertisement.saraf.id]
  )

  const locale = language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF'
  const activeUntil = formatAdvertisementWindow(advertisement.endDate, locale)

  useEffect(() => {
    const element = ref.current
    if (!track || !element || impressionTracked) {
      return
    }

    const storageKey = `ad-impression:${pathname}:${advertisement.id}`

    if (typeof window !== 'undefined' && window.sessionStorage.getItem(storageKey) === '1') {
      setImpressionTracked(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries.find((entry) => entry.isIntersecting)
        if (!visibleEntry) {
          return
        }

        setImpressionTracked(true)
        observer.disconnect()

        if (typeof window !== 'undefined') {
          window.sessionStorage.setItem(storageKey, '1')
        }

        void fetch('/api/public/advertisements/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            id: advertisement.id,
            event: 'IMPRESSION',
          }),
          keepalive: true,
        })
      },
      {
        threshold: 0.35,
      }
    )

    observer.observe(element)

    return () => observer.disconnect()
  }, [advertisement.id, impressionTracked, pathname, track])

  const handleTrackClick = () => {
    if (!track) {
      return
    }

    void fetch('/api/public/advertisements/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: advertisement.id,
        event: 'CLICK',
      }),
      keepalive: true,
    })
  }

  const sponsorLabel = pick('تبلیغ اسپانسرشده', 'Sponsored advertisement', 'تمویل شوی اعلان')
  const openSponsorLabel = pick('مشاهده تبلیغ', 'Open sponsor', 'اعلان پرانیزئ')
  const callSarafLabel = pick('تماس با صراف', 'Call saraf', 'صراف ته زنګ')
  const liveUntilLabel = activeUntil
    ? pick(`فعال تا ${activeUntil}`, `Live until ${activeUntil}`, `تر ${activeUntil} پورې فعال`)
    : null

  return (
    <div ref={ref} className={theme.wrapper}>
      <div
        className={cn(
          'grid gap-0',
          layout === 'hero'
            ? 'lg:grid-cols-[1.15fr_0.85fr]'
            : layout === 'footer'
              ? 'lg:grid-cols-[1fr_auto]'
              : 'h-full'
        )}
      >
        <div className="relative p-5 md:p-6">
          <div className={cn('absolute inset-0', theme.accentGlow)} />
          <div className={cn('absolute inset-x-0 top-0 h-1.5', theme.accent)} />

          <div className="relative space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full border-0 bg-slate-900 px-3 py-1 text-[11px] font-bold text-white shadow-sm dark:bg-slate-800 dark:text-slate-100">
                <Megaphone className="ml-1 h-3.5 w-3.5" />
                {sponsorLabel}
              </Badge>
              <Badge variant="outline" className={cn('rounded-full px-3 py-1 text-[11px] font-semibold', theme.outline)}>
                {advertisement.saraf.businessName}
              </Badge>
              {liveUntilLabel ? (
                <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                  {liveUntilLabel}
                </span>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3
                className={cn(
                  'font-black tracking-tight text-slate-950 dark:text-white',
                  layout === 'hero' ? 'text-2xl md:text-4xl' : 'text-xl md:text-2xl'
                )}
              >
                {advertisement.title}
              </h3>
              {advertisement.description ? (
                <p
                  className={cn(
                    'leading-7 text-slate-700 dark:text-slate-200',
                    layout === 'sidebar' ? 'text-sm' : 'text-sm md:text-base'
                  )}
                >
                  {advertisement.description}
                </p>
              ) : null}
            </div>

            <div className={cn('flex flex-wrap items-center gap-3', layout === 'sidebar' ? 'pt-1' : 'pt-2')}>
              {link.external ? (
                <Button
                  asChild
                  className="h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  <a
                    href={link.href}
                    target={link.newTab ? '_blank' : undefined}
                    rel={link.newTab ? 'noopener noreferrer' : undefined}
                    onClick={handleTrackClick}
                  >
                    {openSponsorLabel}
                    <ExternalLink className="mr-2 h-4 w-4" />
                  </a>
                </Button>
              ) : (
                <Button
                  asChild
                  className="h-11 rounded-full bg-slate-950 px-5 text-sm font-bold text-white shadow-sm hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  <Link href={link.href} onClick={handleTrackClick}>
                    {openSponsorLabel}
                    <ArrowUpRight className="mr-2 h-4 w-4" />
                  </Link>
                </Button>
              )}

              <Button
                asChild
                variant="outline"
                className="h-11 rounded-full border-slate-200 bg-white/90 px-4 text-sm font-semibold text-slate-800 hover:bg-slate-50 dark:border-white/12 dark:bg-slate-950/65 dark:text-white dark:hover:bg-slate-900"
              >
                <a href={`tel:${advertisement.saraf.businessPhone}`} onClick={handleTrackClick}>
                  <Phone className="mr-2 h-4 w-4" />
                  {callSarafLabel}
                </a>
              </Button>
            </div>
          </div>
        </div>

        {advertisement.imageUrl ? (
          <div
            className={cn(
              'relative overflow-hidden',
              layout === 'sidebar' ? 'h-48' : layout === 'featured' ? 'h-48 md:h-56' : 'h-56 lg:h-full'
            )}
          >
            <img src={advertisement.imageUrl} alt={advertisement.title} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(15,23,42,0.68),transparent_56%)]" />
          </div>
        ) : layout === 'footer' ? (
          <div className="flex min-w-[220px] items-center justify-center px-6 py-6">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#4f46e5,#7c3aed)] text-white shadow-[0_24px_50px_-26px_rgba(79,70,229,0.75)]">
              <Sparkles className="h-7 w-7" />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              'flex items-center justify-center p-5 md:p-6',
              layout === 'sidebar' ? 'min-h-[148px]' : 'min-h-[188px]'
            )}
          >
            <div className="flex h-full w-full items-center justify-center rounded-[24px] border border-slate-200/90 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(240,249,255,0.95),rgba(224,231,255,0.9))] px-5 py-6 text-center shadow-inner shadow-white/70 dark:border-white/14 dark:bg-[linear-gradient(145deg,rgba(15,23,42,0.98),rgba(30,41,59,0.98),rgba(30,64,175,0.62))] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="space-y-3">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#0f172a,#2563eb)] text-white shadow-[0_18px_38px_-24px_rgba(37,99,235,0.85)] dark:bg-[linear-gradient(135deg,#dbeafe,#7dd3fc)] dark:text-slate-950">
                  <Megaphone className="h-6 w-6" />
                </div>
                <div className="text-sm font-black text-slate-950 dark:text-white">
                  {pick('جایگاه تبلیغاتی فعال', 'Active sponsor placement', 'فعاله اعلان ځای')}
                </div>
                <div className="text-xs leading-6 text-slate-700 dark:text-slate-200">
                  {pick(
                    'این آگهی در بازار صرافان با اولویت بالا نمایش داده می‌شود.',
                    'This sponsor placement stays highly visible inside the saraf marketplace.',
                    'دا اعلان د صرافانو په بازار کې په روښانه ډول ښکاره کېږي.'
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function PublicAdvertisementSlot({
  placement,
  advertisements,
  className,
  compact = false,
  track = true,
}: {
  placement: AdvertisementPosition
  advertisements: PublicAdvertisement[]
  className?: string
  compact?: boolean
  track?: boolean
}) {
  const { language } = useLanguage()
  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  if (!advertisements.length) {
    return null
  }

  if (placement === 'HERO') {
    return (
      <section className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
          <Sparkles className="h-4 w-4" />
          {pick('ویترین تبلیغات برتر', 'Top sponsored spotlight', 'د اعلانونو ځانګړې ویترینه')}
        </div>
        <div className="space-y-4">
          {advertisements.map((advertisement) => (
            <AdvertisementCard key={advertisement.id} advertisement={advertisement} layout="hero" track={track} />
          ))}
        </div>
      </section>
    )
  }

  if (placement === 'FEATURED') {
    return (
      <section className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-violet-700 dark:text-violet-200">
          <Megaphone className="h-4 w-4" />
          {pick('پیشنهادهای اسپانسرشده', 'Sponsored featured placements', 'تمویل شوي ځانګړي ځای پرځای کول')}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          {advertisements.map((advertisement) => (
            <AdvertisementCard key={advertisement.id} advertisement={advertisement} layout="featured" track={track} />
          ))}
        </div>
      </section>
    )
  }

  if (placement === 'SIDEBAR') {
    return (
      <section className={cn('space-y-4', className)}>
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <Megaphone className="h-4 w-4" />
          {compact
            ? pick('اسپانسرهای مرور بازار', 'Sponsored while you browse', 'د لټون پر مهال تمویل کوونکي')
            : pick('تبلیغات کناری', 'Sidebar sponsors', 'د غاړې اعلانونه')}
        </div>
        <div className={cn('gap-4', compact ? 'grid sm:grid-cols-2' : 'space-y-4')}>
          {advertisements.map((advertisement) => (
            <AdvertisementCard key={advertisement.id} advertisement={advertisement} layout="sidebar" track={track} />
          ))}
        </div>
      </section>
    )
  }

  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-200">
        <Megaphone className="h-4 w-4" />
        {pick('نوار تبلیغاتی پایین صفحه', 'Footer sponsor band', 'د پاڼې پای تمویل شوی بینر')}
      </div>
      <div className="space-y-4">
        {advertisements.map((advertisement) => (
          <AdvertisementCard key={advertisement.id} advertisement={advertisement} layout="footer" track={track} />
        ))}
      </div>
    </section>
  )
}
