'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  ArrowRight,
  ArrowRightLeft,
  Building,
  Check,
  ChevronsUpDown,
  Crown,
  Filter,
  Loader2,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { RealSarafChat } from '@/components/chat/RealSarafChat'
import { SarafFollowButton } from '@/components/social/SarafFollowButton'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/useLanguage'
import { searchCities, type City } from '@/lib/worldCities'
import {
  PublicAdvertisementSlot,
  createEmptyPublicAdvertisementPlacementMap,
  type PublicAdvertisementPlacementMap,
} from '@/components/advertising/public-advertisement-slots'

interface Saraf {
  id: string
  businessName: string
  businessAddress: string
  businessPhone: string
  branches?: {
    id: string
    name: string
    address: string
    city: string
    country: string
    phone: string
  }[]
  rating: number
  totalTransactions: number
  isActive: boolean
  isPremium: boolean
  isFeatured: boolean
  rates: {
    fromCurrency: string
    toCurrency: string
    buyRate: number
    sellRate: number
  }[]
}

type CityOption = { city: string; count: number }
type PopularCity = { id: string; fa: string; ps: string; en: string; aliases?: string[] }

const POPULAR_CITIES: PopularCity[] = [
  { id: 'kabul', fa: 'کابل', ps: 'کابل', en: 'Kabul', aliases: ['کابل', 'Kabul'] },
  { id: 'herat', fa: 'هرات', ps: 'هرات', en: 'Herat', aliases: ['هرات', 'Herat'] },
  { id: 'mazar', fa: 'مزار شریف', ps: 'مزار شریف', en: 'Mazar-i-Sharif', aliases: ['مزار شریف', 'Mazar-i-Sharif', 'Mazar'] },
  { id: 'kandahar', fa: 'قندهار', ps: 'کندهار', en: 'Kandahar', aliases: ['قندهار', 'کندهار', 'Kandahar'] },
  { id: 'jalalabad', fa: 'جلال آباد', ps: 'جلال اباد', en: 'Jalalabad', aliases: ['جلال آباد', 'جلال اباد', 'Jalalabad'] },

  { id: 'dubai', fa: 'دبی', ps: 'دوبۍ', en: 'Dubai', aliases: ['دبی', 'دوبۍ', 'Dubai'] },
  { id: 'istanbul', fa: 'استانبول', ps: 'استانبول', en: 'Istanbul', aliases: ['استانبول', 'Istanbul'] },
  { id: 'tehran', fa: 'تهران', ps: 'تهران', en: 'Tehran', aliases: ['تهران', 'Tehran'] },
  { id: 'islamabad', fa: 'اسلام آباد', ps: 'اسلام اباد', en: 'Islamabad', aliases: ['اسلام آباد', 'اسلام اباد', 'Islamabad'] },
  { id: 'karachi', fa: 'کراچی', ps: 'کراچۍ', en: 'Karachi', aliases: ['کراچی', 'کراچۍ', 'Karachi'] },
  { id: 'delhi', fa: 'دهلی', ps: 'دهلي', en: 'Delhi', aliases: ['دهلی', 'دهلي', 'Delhi'] },

  { id: 'riyadh', fa: 'ریاض', ps: 'ریاض', en: 'Riyadh', aliases: ['ریاض', 'Riyadh'] },
  { id: 'jeddah', fa: 'جده', ps: 'جده', en: 'Jeddah', aliases: ['جده', 'Jeddah'] },
  { id: 'london', fa: 'لندن', ps: 'لندن', en: 'London', aliases: ['لندن', 'London'] },
  { id: 'newyork', fa: 'نیویارک', ps: 'نيویارک', en: 'New York', aliases: ['نیویارک', 'نيویارک', 'New York'] },
]
const numberFormatter = new Intl.NumberFormat('fa-AF')

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)))
}

function formatRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '-'
  }

  return numberFormatter.format(value)
}

function formatCompactStat(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '0'
  }

  if (value >= 1000) {
    return `${numberFormatter.format(Math.round((value / 1000) * 10) / 10)}K`
  }

  return numberFormatter.format(Math.round(value))
}

export default function SarafsPage() {
  const { language, t } = useLanguage()
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const [searchTerm, setSearchTerm] = useState('')
  const [cityFilter, setCityFilter] = useState('all')
  const [cityOpen, setCityOpen] = useState(false)
  const [cityQuery, setCityQuery] = useState('')
  const deferredCityQuery = useDeferredValue(cityQuery)
  const [cityOptions, setCityOptions] = useState<CityOption[]>([])
  const [cityOptionsLoading, setCityOptionsLoading] = useState(false)
  const [sortBy, setSortBy] = useState('rating')
  const [selectedSarafId, setSelectedSarafId] = useState<string | null>(null)
  const [showChat, setShowChat] = useState(false)
  const [sarafs, setSarafs] = useState<Saraf[]>([])
  const [advertisements, setAdvertisements] = useState<PublicAdvertisementPlacementMap>(
    createEmptyPublicAdvertisementPlacementMap()
  )
  const [isLoading, setIsLoading] = useState(true)

  const selectedCityTokens = useMemo(() => {
    if (cityFilter === 'all') return new Set<string>()
    return new Set(
      cityFilter
        .split('|')
        .map((value) => value.trim())
        .filter(Boolean)
    )
  }, [cityFilter])

  function buildPopularCityValue(city: PopularCity) {
    const primary = language === 'en' ? city.en : language === 'ps' ? city.ps : city.fa
    const secondary = language === 'en' ? city.fa : city.en
    const parts = [primary, secondary, ...(city.aliases || [])]
    const unique = Array.from(new Set(parts.map((p) => String(p).trim()).filter(Boolean)))
    return unique.join('|')
  }

  const cityFilterLabel = useMemo(() => {
    if (cityFilter === 'all') return t('sarafs.search.city.all')
    const parts = cityFilter
      .split('|')
      .map((p) => p.trim())
      .filter(Boolean)

    if (parts.length <= 1) return parts[0] || cityFilter

    const latin = parts.find((p) => /^[A-Za-z]/.test(p))
    const nonLatin = parts.find((p) => !/^[A-Za-z]/.test(p))
    if (language === 'en') return latin || parts[0]
    return nonLatin || parts[0]
  }, [cityFilter, language, t])

  function buildAliasedCityValue(raw: string) {
    const value = String(raw || '').trim()
    if (!value) return ''

    const lowered = value.toLowerCase()
    if (lowered === 'kabul' || value === 'کابل') return language === 'en' ? 'Kabul|کابل' : 'کابل|Kabul'
    if (lowered === 'herat' || value === 'هرات') return language === 'en' ? 'Herat|هرات' : 'هرات|Herat'
    if (lowered === 'kandahar' || value === 'قندهار' || value === 'کندهار') return language === 'en' ? 'Kandahar|قندهار|کندهار' : 'قندهار|کندهار|Kandahar'
    if (lowered === 'jalalabad' || value === 'جلال آباد' || value === 'جلال اباد') return language === 'en' ? 'Jalalabad|جلال آباد|جلال اباد' : 'جلال آباد|جلال اباد|Jalalabad'
    if (lowered === 'mazar-i-sharif' || lowered === 'mazar' || value === 'مزار شریف') return language === 'en' ? 'Mazar-i-Sharif|مزار شریف|Mazar' : 'مزار شریف|Mazar-i-Sharif|Mazar'

    return value
  }

  const worldCityResults: City[] = useMemo(() => {
    const q = deferredCityQuery.trim()
    if (!q || q.length < 2) return []
    return searchCities(q, 30) || []
  }, [deferredCityQuery])

  useEffect(() => {
    if (!cityOpen) return

    let active = true
    const controller = new AbortController()
    const timer = setTimeout(async () => {
      try {
        setCityOptionsLoading(true)
        const params = new URLSearchParams()
        const q = deferredCityQuery.trim()
        if (q) params.set('q', q)
        params.set('limit', '60')

        const res = await fetch(`/api/public/sarafs/cities?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        if (!res.ok) return
        const data = await res.json().catch(() => null)
        const next: CityOption[] = Array.isArray(data?.cities)
          ? data.cities
              .map((row: any) => ({
                city: String(row?.city || '').trim(),
                count: Number(row?.count || 0),
              }))
              .filter((row: CityOption) => row.city.length > 0)
          : []

        if (active) {
          setCityOptions(next)
        }
      } catch {
        // ignore
      } finally {
        if (active) setCityOptionsLoading(false)
      }
    }, 250)

    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [cityOpen, deferredCityQuery])

  useEffect(() => {
    let isActive = true
    const controller = new AbortController()
    const timer = setTimeout(() => {
      void (async () => {
        setIsLoading(true)

        try {
          const params = new URLSearchParams({
            search: searchTerm,
            city: cityFilter,
            sort: sortBy,
          })

          const response = await fetch(`/api/sarafs/directory?${params.toString()}`, { signal: controller.signal })
          if (!response.ok) {
            throw new Error('Failed to fetch sarafs')
          }

          const data = await response.json()
          if (isActive) {
            setSarafs(data.sarafs || data)
          }
        } catch (error) {
          if ((error as any)?.name === 'AbortError') return
          console.error('Failed to fetch sarafs:', error)
          if (isActive) {
            setSarafs([])
          }
        } finally {
          if (isActive) {
            setIsLoading(false)
          }
        }
      })()
    }, 250)

    return () => {
      isActive = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [searchTerm, cityFilter, sortBy])

  useEffect(() => {
    let isActive = true

    const fetchAdvertisements = async () => {
      try {
        const response = await fetch('/api/public/advertisements?positions=HERO,FEATURED,SIDEBAR,FOOTER', {
          cache: 'no-store',
        })

        if (!response.ok) {
          throw new Error('Failed to fetch advertisements')
        }

        const data = await response.json()
        if (isActive) {
          setAdvertisements(data?.data?.grouped || createEmptyPublicAdvertisementPlacementMap())
        }
      } catch (error) {
        console.error('Failed to fetch advertisements:', error)
        if (isActive) {
          setAdvertisements(createEmptyPublicAdvertisementPlacementMap())
        }
      }
    }

    void fetchAdvertisements()

    return () => {
      isActive = false
    }
  }, [])

  const getWhatsAppUrl = (phone: string, businessName: string) => {
    const normalizedPhone = phone.replace(/[^0-9]/g, '')
    const message = encodeURIComponent(`سلام، از طریق سرای شهزاده با ${businessName} آشنا شدم و می‌خواهم بیشتر در مورد خدمات شما بدانم.`)
    return `https://wa.me/${normalizedPhone}?text=${message}`
  }

  const renderStars = (rating: number) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }, (_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${
            index < Math.floor(rating) ? 'fill-current text-amber-400' : 'text-slate-300 dark:text-slate-600'
          }`}
        />
      ))}
    </div>
  )

  const activeSarafs = sarafs.filter((saraf) => saraf.isActive).length
  const premiumSarafs = sarafs.filter((saraf) => saraf.isPremium).length
  const averageRating = sarafs.length > 0 ? sarafs.reduce((sum, saraf) => sum + saraf.rating, 0) / sarafs.length : 0
  const visibleRatePairs = sarafs.reduce((sum, saraf) => sum + saraf.rates.length, 0)
  const isRTL = language === 'fa' || language === 'ps'
  const heroTitle = t('sarafs.hero.title')
  const heroSubtitle = t('sarafs.hero.subtitle')

  return (
    <DashboardLayout>
      <div className="space-y-5 pb-16">
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[26px] border border-white/45 bg-[linear-gradient(135deg,#041624_0%,#0b2f35_42%,#0f766e_100%)] px-4 py-5 text-white shadow-[0_36px_96px_-58px_rgba(15,118,110,0.72)] md:px-7 md:py-6"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.18),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.22),transparent_32%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-0 sm:opacity-20" />
          <div className="relative grid gap-5 lg:grid-cols-[1.55fr_0.85fr] lg:items-end">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-semibold backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                {t('sarafs.hero.badge')}
              </div>

              <div className="max-w-3xl space-y-1.5">
                <h1 className="text-xl font-black leading-tight tracking-tight sm:text-2xl md:text-[28px]">
                  {heroTitle}
                  <span className="mt-1 block text-xs font-semibold text-cyan-200 sm:text-sm md:text-[15px]">{heroSubtitle}</span>
                </h1>
                <p className="hidden max-w-2xl text-[13px] leading-6 text-slate-200/90 sm:block sm:text-sm">{t('sarafs.hero.desc')}</p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  asChild
                  className="h-10 rounded-full bg-white px-5 text-sm font-bold text-slate-900 shadow-lg shadow-black/20 hover:bg-slate-100 dark:text-slate-900"
                >
                  <Link href="/user/favorites">
                    {t('sarafs.hero.favorites')}
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  variant="outline"
                  className="h-10 rounded-full border-white/25 bg-white/10 px-5 text-sm font-semibold text-white backdrop-blur-xl hover:bg-white/15"
                  onClick={() => {
                    setSearchTerm('')
                    setCityFilter('all')
                    setSortBy('rating')
                  }}
                >
                  {t('sarafs.hero.reset')}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 text-[11px] sm:hidden">
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur-xl">
                  {t('sarafs.stats.active')} {formatNumber(activeSarafs)}
                </span>
                <span className="rounded-full border border-white/12 bg-white/10 px-3 py-1.5 text-white/90 backdrop-blur-xl">
                  {t('sarafs.stats.livePairs')} {formatNumber(visibleRatePairs)}
                </span>
                <span className="rounded-full border border-white/12 bg-emerald-400/10 px-3 py-1.5 text-emerald-100 backdrop-blur-xl">
                  {t('sarafs.quick.premium')} {formatNumber(premiumSarafs)}
                </span>
              </div>

              <div className="hidden gap-3 sm:grid sm:grid-cols-3">
                <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-xl">
                  <div className="text-[11px] text-slate-200/80">{t('sarafs.stats.active')}</div>
                  <div className="mt-1 text-lg font-black">{formatNumber(activeSarafs)}</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-xl">
                  <div className="text-[11px] text-slate-200/80">{t('sarafs.stats.avgRating')}</div>
                  <div className="mt-1 text-lg font-black">{averageRating.toFixed(1)}</div>
                </div>
                <div className="rounded-[18px] border border-white/10 bg-white/10 px-3 py-2.5 backdrop-blur-xl">
                  <div className="text-[11px] text-slate-200/80">{t('sarafs.stats.livePairs')}</div>
                  <div className="mt-1 text-lg font-black">{formatNumber(visibleRatePairs)}</div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: isRTL ? -26 : 26 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.55, delay: 0.08, ease: 'easeOut' }}
              className="relative hidden overflow-hidden rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-2xl lg:block"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.16),transparent_60%)]" />
              <div className="relative space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                    <ShieldCheck className="h-5 w-5 text-cyan-200" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t('sarafs.quick.title')}</div>
                    <div className="text-xs text-slate-300">{t('sarafs.quick.desc')}</div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {[
                    { label: t('sarafs.quick.inapp.label'), value: t('sarafs.quick.inapp.desc') },
                    { label: t('sarafs.quick.whatsapp.label'), value: t('sarafs.quick.whatsapp.desc') },
                    { label: t('sarafs.quick.phone.label'), value: t('sarafs.quick.phone.desc') },
                  ].map((item) => (
                    <div
                      key={item.label}
                      className="rounded-[20px] border border-white/10 bg-black/10 px-3.5 py-3.5"
                    >
                      <div className="text-sm font-bold text-white">{item.label}</div>
                      <div className="mt-1 text-xs leading-6 text-slate-300">{item.value}</div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-[20px] border border-emerald-300/20 bg-emerald-400/10 px-3.5 py-3.5">
                  <div>
                    <div className="text-xs text-emerald-100">{t('sarafs.quick.premium')}</div>
                    <div className="mt-1 text-2xl font-black text-white">{formatCompactStat(premiumSarafs)}</div>
                  </div>
                  <TrendingUp className="h-8 w-8 text-emerald-200" />
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <PublicAdvertisementSlot placement="HERO" advertisements={advertisements.HERO} />

        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.06, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[26px] border border-slate-200/70 bg-white/85 px-4 py-4 shadow-[0_26px_70px_-52px_rgba(15,23,42,0.38)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.08),transparent_24%)]" />
          <div className="relative space-y-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-teal-700 dark:text-teal-200">
                  <Filter className="h-4 w-4" />
                  {t('sarafs.search.badge')}
                </div>
                <h2 className="mt-2 text-xl font-black text-slate-900 dark:text-white sm:text-2xl">
                  {t('sarafs.search.title')}
                </h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {t('sarafs.search.desc')}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {t('sarafs.search.kpi.total')} {formatNumber(sarafs.length)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {t('sarafs.search.kpi.premium')} {formatNumber(premiumSarafs)}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {t('sarafs.search.kpi.active')} {formatNumber(activeSarafs)}
                </span>
              </div>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr_1fr_auto]">
              <div className="relative">
                <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-300" />
                <Input
                  placeholder={t('sarafs.search.placeholder')}
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="h-12 rounded-2xl border-slate-200 bg-white/80 pr-11 text-sm shadow-sm dark:border-white/20 dark:bg-slate-900/50 dark:text-white"
                />
              </div>

              <Popover
                open={cityOpen}
                onOpenChange={(open) => {
                  setCityOpen(open)
                  if (!open) setCityQuery('')
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={cityOpen}
                    className="h-12 w-full justify-between rounded-2xl border-slate-200 bg-white/80 px-4 text-sm shadow-sm dark:border-white/20 dark:bg-slate-900/50 dark:text-white"
                  >
                    <span className="truncate">
                      {cityFilterLabel}
                    </span>
                    <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <div className="w-full rounded-md bg-popover p-3 text-popover-foreground">
                    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-white/10 dark:bg-slate-950/70">
                      <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <Input
                        value={cityQuery}
                        onChange={(event) => setCityQuery(event.target.value)}
                        placeholder={pick('جستجوی شهر (جهانی)...', 'Search city (worldwide)...', 'د ښار لټون (نړۍوال)...')}
                        className="h-7 border-0 bg-transparent p-0 text-sm shadow-none focus-visible:ring-0 dark:text-white"
                      />
                    </div>

                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="mb-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                          {pick('شهرهای مشهور', 'Popular cities', 'مشهور ښارونه')}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {POPULAR_CITIES.map((city) => {
                            const label = language === 'en' ? city.en : language === 'ps' ? city.ps : city.fa
                            const value = buildPopularCityValue(city)
                            const selected =
                              selectedCityTokens.has(label) || selectedCityTokens.has(city.en) || selectedCityTokens.has(city.fa)
                            return (
                              <button
                                key={city.id}
                                type="button"
                                className={cn(
                                  'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                                  selected
                                    ? 'border-teal-500/60 bg-teal-50 text-teal-800 dark:bg-teal-500/10 dark:text-teal-200'
                                    : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200 dark:hover:bg-white/5'
                                )}
                                onClick={() => {
                                  setCityFilter(value)
                                  setCityOpen(false)
                                  setCityQuery('')
                                }}
                              >
                                {selected ? <Check className="h-3.5 w-3.5" /> : null}
                                <span>{label}</span>
                              </button>
                            )
                          })}
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-white/70 p-2 dark:border-white/10 dark:bg-slate-950/40">
                        <div className="flex items-center justify-between px-2 py-1">
                          <div className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {pick('شهرهای موجود در سیستم', 'Cities with sarafs', 'په سیستم کې ښارونه')}
                          </div>
                          {cityOptionsLoading ? <Loader2 className="h-4 w-4 animate-spin text-slate-400" /> : null}
                        </div>

                        <div className="max-h-64 overflow-auto">
                          <button
                            type="button"
                            className={cn(
                              'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                              cityFilter === 'all'
                                ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100'
                                : 'hover:bg-slate-50 dark:hover:bg-white/5'
                            )}
                            onClick={() => {
                              setCityFilter('all')
                              setCityOpen(false)
                              setCityQuery('')
                            }}
                          >
                            <Check className={cn('h-4 w-4', cityFilter === 'all' ? 'opacity-100' : 'opacity-0')} />
                            <span className="truncate">{t('sarafs.search.city.all')}</span>
                          </button>

                          {cityOptions.length === 0 && !cityOptionsLoading ? (
                            <div className="px-3 py-6 text-center text-xs text-slate-500 dark:text-slate-400">
                              {pick('شهری یافت نشد.', 'No cities found.', 'هیڅ ښار ونه موندل شو.')}
                            </div>
                          ) : null}

                          {cityOptions.map((option) => {
                            const selected = selectedCityTokens.has(option.city)
                            return (
                              <button
                                key={option.city}
                                type="button"
                                className={cn(
                                  'flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm transition',
                                  selected
                                    ? 'bg-teal-50 text-teal-900 dark:bg-teal-500/10 dark:text-teal-100'
                                    : 'hover:bg-slate-50 dark:hover:bg-white/5'
                                )}
                                onClick={() => {
                                  setCityFilter(option.city)
                                  setCityOpen(false)
                                  setCityQuery('')
                                }}
                              >
                                <Check className={cn('h-4 w-4', selected ? 'opacity-100' : 'opacity-0')} />
                                <span className="truncate">{option.city}</span>
                                <span className="ml-auto text-xs text-slate-400 dark:text-slate-500">
                                  {formatNumber(option.count)}
                                </span>
                              </button>
                            )
                          })}
                        </div>

                        {worldCityResults.length > 0 ? (
                          <div className="mt-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
                            <div className="px-2 py-1 text-xs font-bold text-slate-700 dark:text-slate-200">
                              {pick('پیشنهادهای جهانی', 'World suggestions', 'نړیوال وړاندیزونه')}
                            </div>
                            <div className="max-h-56 overflow-auto">
                              {worldCityResults.map((city) => (
                                <button
                                  key={`${city.name}-${city.country}`}
                                  type="button"
                                  className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition hover:bg-slate-50 dark:hover:bg-white/5"
                                  onClick={() => {
                                    const next = buildAliasedCityValue(city.name)
                                    setCityFilter(next || city.name)
                                    setCityOpen(false)
                                    setCityQuery('')
                                  }}
                                >
                                  <span className="truncate font-semibold text-slate-800 dark:text-slate-100">{city.name}</span>
                                  <span className="shrink-0 text-xs text-slate-400 dark:text-slate-500">{city.country}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {cityQuery.trim() ? (
                          <div className="mt-2 border-t border-slate-200/70 pt-2 dark:border-white/10">
                            <button
                              type="button"
                              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-white/5"
                              onClick={() => {
                                const next = buildAliasedCityValue(cityQuery)
                                if (!next) return
                                setCityFilter(next)
                                setCityOpen(false)
                                setCityQuery('')
                              }}
                            >
                              <Search className="h-4 w-4 text-slate-400" />
                              {pick('جستجو برای:', 'Search for:', 'لټون د:')} <span className="truncate">{cityQuery.trim()}</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white/80 text-sm shadow-sm dark:border-white/20 dark:bg-slate-900/50 dark:text-white">
                  <SelectValue placeholder={t('sarafs.search.sort.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">{t('sarafs.search.sort.rating')}</SelectItem>
                  <SelectItem value="transactions">{t('sarafs.search.sort.transactions')}</SelectItem>
                  <SelectItem value="city">{t('sarafs.search.sort.city')}</SelectItem>
                  <SelectItem value="name">{t('sarafs.search.sort.name')}</SelectItem>
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="h-12 rounded-2xl border-slate-200 bg-white/80 px-5 text-sm font-semibold shadow-sm dark:border-white/20 dark:bg-slate-900/50 dark:text-white"
                onClick={() => {
                  setSearchTerm('')
                  setCityFilter('all')
                  setSortBy('rating')
                }}
              >
                {t('common.clear')}
              </Button>
            </div>
          </div>
        </motion.section>

        <PublicAdvertisementSlot placement="FEATURED" advertisements={advertisements.FEATURED} />

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
              >
                <div className="animate-pulse space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                      <div className="space-y-2">
                        <div className="h-4 w-28 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-800" />
                      </div>
                    </div>
                    <div className="h-8 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="h-24 rounded-[22px] bg-slate-100 dark:bg-slate-800" />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
            ))}
          </div>
        ) : sarafs.length === 0 ? (
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 px-6 py-16 text-center shadow-[0_25px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-slate-100 text-slate-400 dark:bg-white/5 dark:text-slate-500">
              <Building className="h-9 w-9" />
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">{t('sarafs.empty.title')}</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              {t('sarafs.empty.desc')}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button
                onClick={() => {
                  setSearchTerm('')
                  setCityFilter('all')
                  setSortBy('rating')
                }}
                className="h-11 rounded-full px-6"
              >
                {t('sarafs.empty.cta')}
              </Button>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {sarafs.map((saraf, index) => {
              const hasCityFilter = cityFilter !== 'all'
              const branches = Array.isArray(saraf.branches) ? saraf.branches : []
              const primaryBranch = hasCityFilter ? branches[0] : null
              const displayAddress = (hasCityFilter ? primaryBranch?.address : undefined) || saraf.businessAddress
              const displayPhone = (hasCityFilter ? primaryBranch?.phone : undefined) || saraf.businessPhone
              const displayCity = (hasCityFilter ? primaryBranch?.city : undefined) || ''

              return (
                <motion.article
                  key={saraf.id}
                  initial={{ opacity: 0, y: 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, delay: (index + 2) * 0.06, ease: 'easeOut' }}
                  className="group relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_25px_80px_-55px_rgba(15,23,42,0.5)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_90px_-55px_rgba(13,148,136,0.5)] dark:border-white/10 dark:bg-slate-950/70"
                >
                  <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(13,148,136,0.16),transparent_72%)] dark:bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.12),transparent_72%)]" />
                  <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-[linear-gradient(135deg,#0f766e,#0891b2)] text-white shadow-lg shadow-cyan-500/25">
                        <Building className="h-6 w-6" />
                      </div>
                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {saraf.isPremium ? (
                            <Badge className="rounded-full border-0 bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 text-[11px] font-bold text-white">
                              <Crown className="mr-1 h-3 w-3" />
                              {language === 'en' ? 'Premium' : language === 'ps' ? 'پریمیوم' : 'پریمیوم'}
                            </Badge>
                          ) : null}
                          {saraf.isFeatured ? (
                            <Badge className="rounded-full border-0 bg-gradient-to-r from-sky-500 to-indigo-600 px-3 py-1 text-[11px] font-bold text-white">
                              <Star className="mr-1 h-3 w-3" />
                              {language === 'en' ? 'Featured' : language === 'ps' ? 'ځانګړی' : 'ویژه'}
                            </Badge>
                          ) : null}
                          <Badge
                            variant={saraf.isActive ? 'default' : 'secondary'}
                            className="rounded-full px-3 py-1 text-[11px]"
                          >
                            {saraf.isActive ? 'فعال' : 'غیرفعال'}
                          </Badge>
                        </div>
                        <h3 className="truncate text-xl font-black text-slate-900 dark:text-white">
                          {saraf.businessName}
                        </h3>
                        <div className="mt-2 flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                          {renderStars(saraf.rating)}
                          <span className="font-bold text-slate-700 dark:text-slate-200">{saraf.rating.toFixed(1)}</span>
                          <span>#{formatNumber(index + 1)}</span>
                        </div>
                        {hasCityFilter && displayCity ? (
                          <div className="mt-2 inline-flex items-center gap-1 rounded-full border border-teal-500/30 bg-teal-50 px-2.5 py-1 text-[10px] font-semibold text-teal-900 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-200">
                            <MapPin className="h-3.5 w-3.5" />
                            <span className="truncate">{displayCity}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <SarafFollowButton
                      sarafId={saraf.id}
                      sarafName={saraf.businessName}
                      showCount={false}
                      callbackUrl="/sarafs"
                      className="h-9 rounded-full px-3 text-[11px] font-semibold"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">امتیاز</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{saraf.rating.toFixed(1)}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">تراکنش</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatCompactStat(saraf.totalTransactions)}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">نرخ زنده</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatNumber(saraf.rates.length)}</div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[26px] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" />
                      <span>{displayAddress}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" dir="ltr">
                      <Phone className="h-4 w-4 shrink-0 text-teal-600 dark:text-teal-300" />
                      <span>{displayPhone}</span>
                    </div>

                    {hasCityFilter && branches.length > 1 ? (
                      <div className="border-t border-slate-200/70 pt-3 text-xs text-slate-600 dark:border-white/10 dark:text-slate-300">
                        <div className="mb-2 font-bold text-slate-700 dark:text-slate-200">
                          {pick('شعبه‌ها در این شهر', 'Branches in this city', 'په دې ښار کې څانګې')}
                        </div>
                        <div className="space-y-2">
                          {branches.slice(0, 3).map((branch) => (
                            <div key={branch.id} className="flex items-start justify-between gap-3 rounded-2xl bg-white/70 px-3 py-2 dark:bg-white/5">
                              <div className="min-w-0">
                                <div className="truncate font-semibold text-slate-800 dark:text-slate-100">{branch.name}</div>
                                <div className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-slate-500 dark:text-slate-400">
                                  {branch.address}
                                </div>
                              </div>
                              <div className="shrink-0 text-[11px] font-semibold text-slate-500 dark:text-slate-400" dir="ltr">
                                {branch.phone}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className="rounded-[26px] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/10">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">نبض نرخ‌های فعال</div>
                      <div className="text-[11px] text-slate-400 dark:text-slate-500">سه جفت اول</div>
                    </div>
                    <div className="space-y-2">
                      {(saraf.rates.length > 0 ? saraf.rates.slice(0, 3) : [
                        { fromCurrency: 'USD', toCurrency: 'AFN', buyRate: 0, sellRate: 0 },
                        { fromCurrency: 'EUR', toCurrency: 'AFN', buyRate: 0, sellRate: 0 },
                        { fromCurrency: 'PKR', toCurrency: 'AFN', buyRate: 0, sellRate: 0 },
                      ]).map((rate) => (
                        <div
                          key={`${rate.fromCurrency}-${rate.toCurrency}`}
                          className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-[20px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="rounded-full bg-slate-900 px-2.5 py-1 text-[10px] font-bold text-white dark:bg-slate-800 dark:text-slate-100">
                            {rate.fromCurrency}/{rate.toCurrency}
                          </div>
                          <div className="flex items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-300">
                            <span>خرید {formatRate(rate.buyRate)}</span>
                            <span>فروش {formatRate(rate.sellRate)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button asChild variant="outline" className="h-11 rounded-2xl">
                      <Link href={`/sarafs/${saraf.id}?openHawala=true`}>
                        <Send className="mr-2 h-4 w-4" />
                        حواله
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="h-11 rounded-2xl">
                      <Link href={`/sarafs/${saraf.id}?openExchange=true`}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />
                        تبادله
                      </Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      onClick={() => {
                        setSelectedSarafId(saraf.id)
                        setShowChat(true)
                      }}
                      className="h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20 hover:from-emerald-600 hover:to-teal-700"
                    >
                      <MessageCircle className="mr-2 h-4 w-4" />
                      چت
                    </Button>
                    <Button asChild variant="outline" className="h-12 rounded-2xl">
                      <a href={getWhatsAppUrl(displayPhone, saraf.businessName)} target="_blank" rel="noopener noreferrer">
                        واتساپ
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="h-12 rounded-2xl">
                      <a href={`tel:${displayPhone}`}>
                        تماس
                      </a>
                    </Button>
                  </div>

                  <Button asChild variant="ghost" className="h-11 w-full rounded-2xl text-sm font-semibold">
                    <Link href={`/sarafs/${saraf.id}`}>
                      مشاهده صفحه کامل صراف
                      <ArrowRight className="mr-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </motion.article>
              )
            })}
          </section>
        )}

        <PublicAdvertisementSlot
          placement="SIDEBAR"
          advertisements={advertisements.SIDEBAR}
          compact
          className="mt-6 xl:hidden"
        />
        <PublicAdvertisementSlot placement="FOOTER" advertisements={advertisements.FOOTER} className="mt-6" />

        {advertisements.SIDEBAR.length > 0 ? (
          <div
            className={cn(
              'fixed top-28 z-30 hidden w-[280px] xl:block 2xl:w-[300px]',
              isRTL ? 'left-6' : 'right-6'
            )}
          >
            <PublicAdvertisementSlot placement="SIDEBAR" advertisements={advertisements.SIDEBAR} />
          </div>
        ) : null}

        {showChat && selectedSarafId ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm">
            <RealSarafChat
              sarafId={selectedSarafId}
              onClose={() => {
                setShowChat(false)
                setSelectedSarafId(null)
              }}
            />
          </div>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
