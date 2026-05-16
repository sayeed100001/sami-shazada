'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building2, MapPin, MessageCircle, MoreVertical, Phone, Send, Star, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface FeaturedSaraf {
  id: string
  businessName: string
  rating: number
  totalTransactions: number
  city: string
  phone: string
  isPremium: boolean
  isFeatured: boolean
  promotionType: string | null
  rates?: {
    usdToAfn: number
    eurToAfn: number
    pkrToAfn: number
  }
}

const numberFormatter = new Intl.NumberFormat('fa-AF')

function formatRate(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '—'
  }

  return numberFormatter.format(value)
}

function formatCompactNumber(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return '۰'
  }

  return numberFormatter.format(value)
}

function getPromotionLabel(value: string | null) {
  switch (value) {
    case 'HERO':
      return 'هرو'
    case 'FEATURED':
      return 'برجسته'
    case 'SIDEBAR':
      return 'کناری'
    case 'FOOTER':
      return 'فوتر'
    default:
      return null
  }
}

export function FeaturedSarafs() {
  const [sarafs, setSarafs] = useState<FeaturedSaraf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void fetchFeaturedSarafs()
  }, [])

  const fetchFeaturedSarafs = async () => {
    try {
      const response = await fetch('/api/sarafs/featured')
      if (response.ok) {
        const data = await response.json()
        setSarafs(data.sarafs || [])
      }
    } catch (error) {
      console.error('Error fetching featured sarafs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleWhatsAppContact = (phone: string) => {
    const message = encodeURIComponent('سلام، از طریق سرای شهزاده با شما تماس گرفتم و می‌خواهم درباره نرخ‌ها و خدمات شما بیشتر بدانم.')
    window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
  }

  const summary = useMemo(() => {
    const totalSarafs = sarafs.length
    const averageRating =
      totalSarafs > 0 ? sarafs.reduce((sum, saraf) => sum + saraf.rating, 0) / totalSarafs : 0
    const totalTransactions = sarafs.reduce((sum, saraf) => sum + saraf.totalTransactions, 0)

    return {
      totalSarafs,
      averageRating,
      totalTransactions,
    }
  }, [sarafs])

  if (loading) {
    return (
      <section className="relative overflow-hidden rounded-[32px] border border-white/20 bg-slate-950 px-6 py-8 shadow-[0_30px_90px_-40px_rgba(15,23,42,0.75)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.3),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(20,184,166,0.28),transparent_30%)]" />
        <div className="relative animate-pulse space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-3">
              <div className="h-8 w-40 rounded-full bg-white/15" />
              <div className="h-4 w-56 rounded-full bg-white/10" />
            </div>
            <div className="h-10 w-28 rounded-full bg-white/10" />
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-72 rounded-[28px] border border-white/10 bg-white/10 backdrop-blur-xl"
              />
            ))}
          </div>
        </div>
      </section>
    )
  }

  if (sarafs.length === 0) {
    return null
  }

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-white/40 bg-[linear-gradient(135deg,rgba(255,255,255,0.85),rgba(240,253,250,0.78),rgba(236,253,245,0.72))] shadow-[0_35px_120px_-55px_rgba(13,148,136,0.55)] backdrop-blur-2xl dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.94),rgba(6,78,59,0.42),rgba(15,23,42,0.96))]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.22),transparent_26%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.16),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.14),transparent_28%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_26%),radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_22%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_28%)]" />
      <div className="absolute -left-16 top-8 h-44 w-44 rounded-full bg-emerald-400/20 blur-3xl dark:bg-emerald-400/15" />
      <div className="absolute right-0 top-0 h-56 w-56 rounded-full bg-teal-300/20 blur-3xl dark:bg-cyan-400/10" />

      <div className="relative z-10">
        <div className="border-b border-emerald-200/60 px-4 py-5 dark:border-white/10 md:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/60 bg-white/70 shadow-lg shadow-emerald-500/10 backdrop-blur-xl dark:border-white/10 dark:bg-white/10 dark:shadow-emerald-900/30">
                <Star className="h-7 w-7 fill-amber-400 text-amber-500" />
              </div>
              <div className="space-y-2">
                <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/50 bg-white/60 px-3 py-1 text-[11px] font-semibold text-emerald-700 backdrop-blur-xl dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  شبکه منتخب صرافان
                </div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white md:text-3xl">
                    صرافان ویژه
                  </h2>
                  <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                    صرافان معتبر با حضور برجسته، نرخ‌های زنده، و دسترسی سریع برای شروع تماس، چت و ثبت درخواست.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="grid min-w-[280px] grid-cols-3 gap-2">
                <div className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">ویژه</div>
                  <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {formatCompactNumber(summary.totalSarafs)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">میانگین امتیاز</div>
                  <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {summary.averageRating.toFixed(1)}
                  </div>
                </div>
                <div className="rounded-2xl border border-white/60 bg-white/60 px-3 py-3 text-center shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs text-slate-500 dark:text-slate-400">تراکنش‌ها</div>
                  <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">
                    {formatCompactNumber(summary.totalTransactions)}
                  </div>
                </div>
              </div>

              <Link href="/sarafs">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-11 rounded-full border-white/70 bg-white/70 px-4 text-sm font-semibold text-slate-800 shadow-sm backdrop-blur-xl hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10"
                >
                  همه صرافان
                  <TrendingUp className="mr-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sarafs.map((saraf, index) => (
              <article
                key={saraf.id}
                className="group relative overflow-hidden rounded-[28px] border border-white/70 bg-white/65 p-5 shadow-[0_20px_55px_-35px_rgba(15,23,42,0.45)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:border-emerald-400/60 hover:shadow-[0_35px_90px_-45px_rgba(16,185,129,0.45)] dark:border-white/10 dark:bg-white/5 dark:hover:border-emerald-400/30"
              >
                <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(16,185,129,0.18),transparent_70%)] opacity-80 dark:bg-[radial-gradient(circle_at_top,rgba(45,212,191,0.16),transparent_70%)]" />
                <div className="absolute -right-8 top-6 h-20 w-20 rounded-full bg-emerald-400/10 blur-2xl transition-opacity duration-300 group-hover:opacity-100 dark:bg-cyan-300/10" />

                <div className="relative z-10">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/70 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 shadow-lg shadow-emerald-500/25">
                        <Building2 className="h-6 w-6 text-white" />
                      </div>

                      <div className="min-w-0">
                        <div className="mb-2 flex flex-wrap items-center gap-2">
                          {saraf.isPremium ? (
                            <Badge className="rounded-full border-0 bg-gradient-to-r from-amber-500 to-yellow-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md shadow-amber-500/30">
                              <Star className="ml-1 h-3 w-3 fill-white text-white" />
                              ویژه
                            </Badge>
                          ) : null}
                          {saraf.isFeatured ? (
                            <Badge className="rounded-full border-0 bg-gradient-to-r from-fuchsia-500 to-rose-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-md shadow-rose-500/30">
                              برگزیده
                            </Badge>
                          ) : null}
                          {getPromotionLabel(saraf.promotionType) ? (
                            <Badge
                              variant="outline"
                              className="rounded-full border-emerald-300/60 bg-emerald-50/80 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200"
                            >
                              {getPromotionLabel(saraf.promotionType)}
                            </Badge>
                          ) : null}
                        </div>

                        <h3 className="truncate text-lg font-black text-slate-900 dark:text-white">
                          {saraf.businessName}
                        </h3>

                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 dark:bg-amber-400/10 dark:text-amber-200">
                            <Star className="h-3.5 w-3.5 fill-current" />
                            {saraf.rating.toFixed(1)}
                          </div>
                          <div className="text-slate-500 dark:text-slate-400">
                            {formatCompactNumber(saraf.totalTransactions)} تراکنش
                          </div>
                          <div className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                            <MapPin className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                            {saraf.city}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-full border border-white/70 bg-white/75 px-2 py-1 text-[10px] font-bold text-slate-500 backdrop-blur-xl dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                      #{numberFormatter.format(index + 1)}
                    </div>
                  </div>

                  <div className="mt-5 rounded-[22px] border border-white/70 bg-white/60 p-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/10">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-[11px] font-bold tracking-wide text-slate-500 dark:text-slate-400">
                        نرخ‌های شاخص
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-slate-500">زنده</span>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { code: 'USD', value: saraf.rates?.usdToAfn ?? 0 },
                        { code: 'EUR', value: saraf.rates?.eurToAfn ?? 0 },
                        { code: 'PKR', value: saraf.rates?.pkrToAfn ?? 0 },
                      ].map((rate) => (
                        <div
                          key={rate.code}
                          className="rounded-2xl border border-white/70 bg-white/75 px-2 py-3 text-center shadow-sm dark:border-white/10 dark:bg-white/5"
                        >
                          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                            {rate.code}
                          </div>
                          <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                            {formatRate(rate.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3 rounded-[22px] border border-white/70 bg-white/60 px-3 py-3 backdrop-blur-xl dark:border-white/10 dark:bg-black/10">
                    <div className="min-w-0">
                      <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        تماس مستقیم
                      </div>
                      <div className="truncate text-sm font-bold text-slate-900 dark:text-white" dir="ltr">
                        {saraf.phone}
                      </div>
                    </div>
                    <a
                      href={`tel:${saraf.phone}`}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-emerald-300/50 bg-emerald-50 text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200 dark:hover:bg-emerald-400/15"
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  </div>

                  <div className="mt-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          className="h-11 w-full rounded-2xl border border-white/70 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-sm font-bold text-white shadow-lg shadow-emerald-500/25 transition-all hover:scale-[1.01] hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600"
                        >
                          <MoreVertical className="ml-2 h-4 w-4" />
                          ارتباط با صراف
                        </Button>
                      </DropdownMenuTrigger>

                      <DropdownMenuContent
                        align="end"
                        className="w-64 rounded-2xl border-white/70 bg-white/85 p-2 shadow-2xl backdrop-blur-2xl dark:border-white/10 dark:bg-slate-900/90"
                      >
                        <DropdownMenuItem
                          className="rounded-xl px-3 py-3 focus:bg-emerald-50 dark:focus:bg-emerald-400/10"
                          asChild
                        >
                          <Link href={`/sarafs/${saraf.id}?openChat=true`} className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500">
                              <Send className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white">چت درون‌برنامه‌ای</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                شروع گفت‌وگوی مستقیم با صراف
                              </div>
                            </div>
                          </Link>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="rounded-xl px-3 py-3 focus:bg-emerald-50 dark:focus:bg-emerald-400/10"
                          onClick={() => handleWhatsAppContact(saraf.phone)}
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-green-500">
                              <MessageCircle className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white">واتساپ</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                ارسال پیام مستقیم در واتساپ
                              </div>
                            </div>
                          </div>
                        </DropdownMenuItem>

                        <DropdownMenuItem
                          className="rounded-xl px-3 py-3 focus:bg-emerald-50 dark:focus:bg-emerald-400/10"
                          asChild
                        >
                          <a href={`tel:${saraf.phone}`} className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500">
                              <Phone className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <div className="font-semibold text-slate-900 dark:text-white">تماس تلفنی</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">{saraf.phone}</div>
                            </div>
                          </a>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
