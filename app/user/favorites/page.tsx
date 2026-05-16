'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowRight,
  ArrowRightLeft,
  ExternalLink,
  Heart,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  Star,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface FavoriteSaraf {
  id: string
  sarafId: string
  saraf: {
    id: string
    businessName: string
    city: string
    province: string
    phone: string
    email: string
    rating: number
    totalRatings: number
    isVerified: boolean
    user: {
      name: string
    }
  }
  createdAt: string
}

const numberFormatter = new Intl.NumberFormat('fa-AF')
const dateFormatter = new Intl.DateTimeFormat('fa-AF', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

function formatNumber(value: number) {
  return numberFormatter.format(Math.max(0, Math.round(value)))
}

function formatSavedDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return 'همین حالا'
  }

  return dateFormatter.format(date)
}

export default function UserFavoritesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [favorites, setFavorites] = useState<FavoriteSaraf[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const getWhatsAppUrl = (phone: string, businessName: string) => {
    const normalizedPhone = phone.replace(/[^0-9]/g, '')
    const message = encodeURIComponent(`سلام، از بخش صرافان مورد علاقه در سرای شهزاده با ${businessName} ارتباط گرفتم و می‌خواهم با شما صحبت کنم.`)
    return `https://wa.me/${normalizedPhone}?text=${message}`
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }

    let isActive = true

    const fetchFavorites = async () => {
      setIsLoading(true)
      try {
        const response = await fetch('/api/user/favorites')
        if (!response.ok) {
          throw new Error('Failed to fetch favorites')
        }

        const data = await response.json()
        if (isActive) {
          setFavorites(data.favorites || [])
        }
      } catch (error) {
        console.error('Failed to fetch favorites:', error)
        if (isActive) {
          setFavorites([])
        }
      } finally {
        if (isActive) {
          setIsLoading(false)
        }
      }
    }

    void fetchFavorites()

    return () => {
      isActive = false
    }
  }, [session, status, router])

  const removeFavorite = async (sarafId: string) => {
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sarafId }),
      })

      if (!response.ok) {
        throw new Error('Delete failed')
      }

      setFavorites((previous) => previous.filter((favorite) => favorite.sarafId !== sarafId))
      toast.success('صراف از شبکه‌ی ذخیره‌شده شما حذف شد')
    } catch (error) {
      toast.error('حذف صراف از علاقه‌مندی‌ها ممکن نشد')
    }
  }

  if (status === 'loading' || !session) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const verifiedCount = favorites.filter((favorite) => favorite.saraf.isVerified).length
  const averageRating = favorites.length > 0
    ? favorites.reduce((sum, favorite) => sum + favorite.saraf.rating, 0) / favorites.length
    : 0

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <motion.section
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
          className="relative overflow-hidden rounded-[36px] border border-white/50 bg-[linear-gradient(135deg,#2a0e32_0%,#6b1237_44%,#be185d_100%)] px-6 py-8 text-white shadow-[0_45px_120px_-55px_rgba(190,24,93,0.75)] md:px-10 md:py-10"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(253,224,71,0.18),transparent_28%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:26px_26px] opacity-20" />
          <div className="relative grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-xl">
                <Heart className="h-4 w-4 text-rose-100" />
                شبکه‌ی ذخیره‌شده شما برای ارتباط سریع و پیگیری پیوسته
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  صرافان مورد علاقه
                  <span className="block text-rose-100">شبکه‌ای که همیشه نزدیک دست تو است</span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-rose-50 md:text-base">
                  اینجا همان صراف‌هایی هستند که می‌خواهی هر بار بدون جست‌وجوی دوباره به آن‌ها برگردی؛ برای چت، واتساپ، تماس، حواله و تبادله.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                  <div className="text-xs text-rose-100">کل ذخیره‌ها</div>
                  <div className="mt-2 text-2xl font-black">{formatNumber(favorites.length)}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                  <div className="text-xs text-rose-100">تاییدشده‌ها</div>
                  <div className="mt-2 text-2xl font-black">{formatNumber(verifiedCount)}</div>
                </div>
                <div className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                  <div className="text-xs text-rose-100">میانگین امتیاز</div>
                  <div className="mt-2 text-2xl font-black">{averageRating.toFixed(1)}</div>
                </div>
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.06, ease: 'easeOut' }}
              className="overflow-hidden rounded-[30px] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl"
            >
              <div className="space-y-4">
                <div>
                  <div className="text-sm font-bold">سه حرکت برای وصل شدن سریع</div>
                  <div className="mt-1 text-xs text-rose-100/90">
                    favorites فقط لیست نیست؛ یک مرکز دسترسی فوری برای تمام مسیرهای ارتباطی است.
                  </div>
                </div>

                {[
                  'چت داخلی برای مذاکره و پیگیری مطمئن',
                  'واتساپ برای پاسخ سریع و هماهنگی موبایلی',
                  'تماس برای شروع فوری یا هماهنگی قبل از معامله',
                ].map((item) => (
                  <div key={item} className="rounded-[22px] border border-white/10 bg-black/10 px-4 py-4 text-sm text-white/95">
                    {item}
                  </div>
                ))}

                <Button
                  asChild
                  className="h-11 w-full rounded-full bg-white px-6 text-sm font-bold text-rose-700 hover:bg-rose-50"
                >
                  <Link href="/sarafs">
                    کشف صرافان بیشتر
                    <ArrowRight className="mr-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </motion.section>

        {isLoading ? (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/60"
              >
                <div className="animate-pulse space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="h-5 w-40 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <div className="h-3 w-24 rounded-full bg-slate-200 dark:bg-slate-800" />
                    </div>
                    <div className="h-10 w-10 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                  </div>
                  <div className="h-24 rounded-[22px] bg-slate-100 dark:bg-slate-800" />
                  <div className="grid grid-cols-3 gap-3">
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                    <div className="h-10 rounded-2xl bg-slate-100 dark:bg-slate-800" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <section className="relative overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 px-6 py-16 text-center shadow-[0_25px_70px_-50px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[28px] bg-rose-50 text-rose-300 dark:bg-white/5 dark:text-slate-500">
              <Heart className="h-9 w-9" />
            </div>
            <h3 className="mt-6 text-2xl font-black text-slate-900 dark:text-white">شبکه‌ی ذخیره‌شده شما هنوز خالی است</h3>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              از صفحه‌ی صرافان، هر صرافی را که می‌خواهی همیشه نزدیک دستت باشد به علاقه‌مندی‌ها اضافه کن تا بعدها با یک کلیک به او وصل شوی.
            </p>
            <div className="mt-6 flex justify-center">
              <Button asChild className="h-11 rounded-full px-6">
                <Link href="/sarafs">
                  رفتن به بازار صرافان
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        ) : (
          <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {favorites.map((favorite, index) => (
              <motion.article
                key={favorite.id}
                initial={{ opacity: 0, y: 22 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: (index + 2) * 0.06, ease: 'easeOut' }}
                className="group relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_25px_80px_-55px_rgba(15,23,42,0.5)] backdrop-blur-2xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_35px_90px_-55px_rgba(190,24,93,0.45)] dark:border-white/10 dark:bg-slate-950/70"
              >
                <div className="absolute inset-x-0 top-0 h-36 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.16),transparent_70%)] dark:bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_70%)]" />
                <div className="relative space-y-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {favorite.saraf.isVerified ? (
                          <Badge className="rounded-full border-0 bg-gradient-to-r from-emerald-500 to-teal-500 px-3 py-1 text-[11px] font-bold text-white">
                            تایید شده
                          </Badge>
                        ) : null}
                        <Badge variant="outline" className="rounded-full px-3 py-1 text-[11px]">
                          ذخیره شده در {formatSavedDate(favorite.createdAt)}
                        </Badge>
                      </div>
                      <h3 className="truncate text-xl font-black text-slate-900 dark:text-white">
                        {favorite.saraf.businessName}
                      </h3>
                      <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{favorite.saraf.user.name}</div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFavorite(favorite.sarafId)}
                      className="h-11 w-11 rounded-2xl text-rose-500 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">امتیاز</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{favorite.saraf.rating.toFixed(1)}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">نظرات</div>
                      <div className="mt-1 text-lg font-black text-slate-900 dark:text-white">{formatNumber(favorite.saraf.totalRatings)}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 px-3 py-3 dark:border-white/10 dark:bg-white/5">
                      <div className="text-[10px] text-slate-500 dark:text-slate-400">وضعیت</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">
                        {favorite.saraf.isVerified ? 'آماده' : 'در انتظار'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3 rounded-[26px] border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                      <MapPin className="h-4 w-4 shrink-0 text-rose-500" />
                      <span>{favorite.saraf.city}، {favorite.saraf.province}</span>
                    </div>

                    {favorite.saraf.phone ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" dir="ltr">
                        <Phone className="h-4 w-4 shrink-0 text-rose-500" />
                        <span>{favorite.saraf.phone}</span>
                      </div>
                    ) : null}

                    {favorite.saraf.email ? (
                      <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                        <Mail className="h-4 w-4 shrink-0 text-rose-500" />
                        <span className="truncate">{favorite.saraf.email}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 rounded-[22px] border border-amber-200/70 bg-amber-50/80 px-4 py-3 text-sm dark:border-amber-400/20 dark:bg-amber-400/10">
                    <Star className="h-4 w-4 fill-current text-amber-500" />
                    <span className="font-bold text-slate-900 dark:text-white">{favorite.saraf.rating.toFixed(1)}</span>
                    <span className="text-slate-500 dark:text-slate-300">از {formatNumber(favorite.saraf.totalRatings)} نظر</span>
                  </div>

                  <div className="grid gap-3">
                    <Button asChild className="h-11 w-full rounded-2xl">
                      <Link href={`/sarafs/${favorite.sarafId}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        مشاهده پروفایل صراف
                      </Link>
                    </Button>

                    <div className="grid grid-cols-3 gap-3">
                      <Button asChild variant="outline" className="h-11 rounded-2xl">
                        <Link href={`/sarafs/${favorite.sarafId}?openHawala=true`}>
                          <Send className="mr-2 h-4 w-4" />
                          حواله
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-11 rounded-2xl">
                        <Link href={`/sarafs/${favorite.sarafId}?openExchange=true`}>
                          <ArrowRightLeft className="mr-2 h-4 w-4" />
                          تبادله
                        </Link>
                      </Button>
                      <Button asChild variant="outline" className="h-11 rounded-2xl">
                        <Link href={`/sarafs/${favorite.sarafId}?openChat=true`}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          چت
                        </Link>
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Button asChild variant="outline" className="h-11 rounded-2xl">
                        <a href={getWhatsAppUrl(favorite.saraf.phone, favorite.saraf.businessName)} target="_blank" rel="noopener noreferrer">
                          واتساپ
                        </a>
                      </Button>
                      <Button asChild variant="outline" className="h-11 rounded-2xl">
                        <a href={`tel:${favorite.saraf.phone}`}>
                          تماس
                        </a>
                      </Button>
                    </div>
                  </div>
                </div>
              </motion.article>
            ))}
          </section>
        )}
      </div>
    </DashboardLayout>
  )
}
