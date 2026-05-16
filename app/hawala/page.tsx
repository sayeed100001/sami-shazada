'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { ArrowRight, CheckCircle2, Clock3, History, Landmark, Phone, ShieldCheck, Star, Wallet } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SarafCombobox } from '@/components/hawala/SarafCombobox'
import { HawalaRequestForm } from '@/components/hawala/VisitorHawalaForm'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import { cn } from '@/lib/utils'

interface DirectorySaraf {
  id: string
  businessName: string
  businessAddress: string
  businessPhone: string
  rating: number
  totalTransactions: number
  isActive: boolean
  isPremium: boolean
}

interface FavoriteSaraf {
  id: string
  businessName: string
  city: string
  province: string
  phone: string
  rating: number
  isVerified: boolean
}

interface SarafOption {
  id: string
  businessName: string
  phone: string
  city: string
  address: string
  rating: number
  totalTransactions: number
  isPremium: boolean
  isFavorite: boolean
  isVerified: boolean
}

interface HawalaHistoryItem {
  id: string
  referenceCode: string
  status: string
  fromAmount: number | string
  toAmount: number | string
  fromCurrency: string
  toCurrency: string
  receiverName: string
  receiverCity: string
  createdAt: string
  saraf?: {
    businessName: string
  }
}

function toAmount(value: number | string) {
  const normalized = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(normalized) ? normalized : 0
}

function formatNumber(value: number, locale: string, digits = 0) {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(value)
}

function groupTotals(
  items: HawalaHistoryItem[],
  amountKey: 'fromAmount' | 'toAmount',
  currencyKey: 'fromCurrency' | 'toCurrency'
) {
  const totals = new Map<string, number>()

  for (const item of items) {
    const currency = item[currencyKey]
    totals.set(currency, (totals.get(currency) || 0) + toAmount(item[amountKey]))
  }

  return Array.from(totals.entries()).map(([currency, total]) => ({ currency, total }))
}

function getStatusMeta(status: string, language: string) {
  const t = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  switch (status) {
    case 'COMPLETED':
      return {
        label: t('تکمیل‌شده', 'Completed', 'بشپړ شوی'),
        className:
          'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300',
      }
    case 'WITHDRAWN':
      return {
        label: t('تحویل‌شده', 'Withdrawn', 'سپارل شوی'),
        className:
          'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/20 dark:bg-sky-500/10 dark:text-sky-300',
      }
    case 'CANCELLED':
      return {
        label: t('لغوشده', 'Cancelled', 'لغوه شوی'),
        className:
          'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300',
      }
    default:
      return {
        label: t('در انتظار', 'Pending', 'په تمه'),
        className:
          'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300',
      }
  }
}

export default function HawalaPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const [sarafs, setSarafs] = useState<SarafOption[]>([])
  const [sarafsLoading, setSarafsLoading] = useState(true)
  const [selectedSarafId, setSelectedSarafId] = useState('')
  const [history, setHistory] = useState<HawalaHistoryItem[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')
  const [historyVersion, setHistoryVersion] = useState(0)

  const t = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const locale = language === 'en' ? 'en-US' : 'fa-AF'

  useEffect(() => {
    let active = true

    const loadSarafs = async () => {
      setSarafsLoading(true)
      try {
        const requests: Promise<Response>[] = [fetch('/api/sarafs/directory')]
        if (session?.user?.id) requests.push(fetch('/api/user/favorites'))

        const responses = await Promise.all(requests)
        const directoryPayload = responses[0].ok ? await responses[0].json() : { sarafs: [] }
        const favoritePayload =
          responses[1] && responses[1].ok ? await responses[1].json() : { favorites: [] }

        const favoriteMap = new Map<string, FavoriteSaraf>(
          (favoritePayload.favorites || []).map((entry: { saraf: FavoriteSaraf }) => [entry.saraf.id, entry.saraf])
        )

        const options = (directoryPayload.sarafs || [])
          .filter((saraf: DirectorySaraf) => saraf.isActive)
          .map((saraf: DirectorySaraf) => {
            const favorite = favoriteMap.get(saraf.id)
            return {
              id: saraf.id,
              businessName: saraf.businessName,
              phone: favorite?.phone || saraf.businessPhone,
              city: favorite?.city || t('کابل', 'Kabul', 'کابل'),
              address: saraf.businessAddress || favorite?.province || t('افغانستان', 'Afghanistan', 'افغانستان'),
              rating: saraf.rating || favorite?.rating || 0,
              totalTransactions: saraf.totalTransactions || 0,
              isPremium: Boolean(saraf.isPremium),
              isFavorite: Boolean(favorite),
              isVerified: favorite?.isVerified ?? true,
            }
          })
          .sort((left: SarafOption, right: SarafOption) => {
            if (left.isFavorite !== right.isFavorite) return left.isFavorite ? -1 : 1
            return right.rating - left.rating
          })

        if (!active) return
        setSarafs(options)
        setSelectedSarafId((current) =>
          current && options.some((saraf) => saraf.id === current) ? current : options[0]?.id || ''
        )
      } catch (error) {
        console.error('Failed to load hawala sarafs:', error)
        if (!active) return
        setSarafs([])
        setSelectedSarafId('')
      } finally {
        if (active) setSarafsLoading(false)
      }
    }

    void loadSarafs()

    return () => {
      active = false
    }
  }, [language, session?.user?.id])

  useEffect(() => {
    let active = true

    if (!session?.user?.id) {
      setHistory([])
      setHistoryError('')
      setHistoryLoading(false)
      return () => {
        active = false
      }
    }

    const loadHistory = async () => {
      setHistoryLoading(true)
      setHistoryError('')
      try {
        const response = await fetch('/api/hawala/request')
        if (!response.ok) throw new Error('Failed to fetch history')
        const payload = await response.json()
        if (!active) return
        setHistory(payload.requests || [])
      } catch (error) {
        console.error('Failed to load hawala history:', error)
        if (!active) return
        setHistory([])
        setHistoryError(t('تاریخچه حواله فعلاً در دسترس نیست.', 'Hawala history is unavailable right now.', 'د حوالې تاریخچه اوس نشته.'))
      } finally {
        if (active) setHistoryLoading(false)
      }
    }

    void loadHistory()

    return () => {
      active = false
    }
  }, [historyVersion, session?.user?.id, language])

  const selectedSaraf = sarafs.find((saraf) => saraf.id === selectedSarafId) || null
  const sentTotals = groupTotals(history, 'fromAmount', 'fromCurrency')
  const receivedTotals = groupTotals(history, 'toAmount', 'toCurrency')
  const pendingCount = history.filter((item) => item.status === 'PENDING').length
  const completedCount = history.filter((item) => item.status === 'COMPLETED').length

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <section className="rounded-[30px] border border-slate-200/70 bg-white/92 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-950/72">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                <Landmark className="h-4 w-4" />
                {t('حواله کاربر', 'User hawala', 'د کارونکي حواله')}
              </div>
              <h1 className="mt-3 text-3xl font-black text-slate-950 dark:text-white">{t('ثبت حواله ساده', 'Simple hawala request', 'ساده حواله ثبت')}</h1>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t('صراف را از dropdown انتخاب کن، فرم را پر کن، و پایین صفحه وضعیت درخواست‌های قبلی‌ات را ببین.', 'Choose a saraf from the dropdown, fill the form, and see your previous request statuses below.', 'صراف له dropdown څخه وټاکئ، فورم ډک کړئ، او لاندې خپلې پخوانۍ غوښتنې وګورئ.')}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/hawala/track">
                  <Clock3 className="mr-2 h-4 w-4" />
                  {t('پیگیری با کد', 'Track by code', 'په کوډ تعقیب')}
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/user/transactions">
                  <History className="mr-2 h-4 w-4" />
                  {t('همه تراکنش‌ها', 'All transactions', 'ټولې معاملې')}
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
          <div className="rounded-[30px] border border-slate-200/70 bg-white/92 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-950/72">
            <div className="space-y-5">
              <div>
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  {t('انتخاب صراف', 'Saraf selection', 'د صراف ټاکنه')}
                </div>
                <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                  {t('اول صراف را انتخاب کن', 'Choose your saraf first', 'لومړی خپل صراف وټاکئ')}
                </h2>
                <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t('علاقه‌مندی‌ها اول آمده‌اند تا صراف‌های همیشگی‌ات سریع‌تر دیده شوند.', 'Favorites appear first so your usual sarafs are easier to find.', 'خوښې صرافان لومړی راغلي څو خپل همېشني صرافان ژر ومومئ.')}
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('صراف مقصد', 'Destination saraf', 'مقصد صراف')}
                </label>
                <SarafCombobox
                  items={sarafs}
                  value={selectedSarafId}
                  onValueChange={setSelectedSarafId}
                  disabled={sarafsLoading || sarafs.length === 0}
                  placeholder={t('یک صراف را انتخاب کن', 'Choose a saraf', 'یو صراف وټاکئ')}
                  searchPlaceholder={t(
                    'با نام، شهر یا شماره جستجو کن',
                    'Search by name, city, or phone',
                    'د نوم، ښار او یا شمېرې له مخې ولټوئ'
                  )}
                  emptyLabel={t(
                    'صرافی با این جستجو یافت نشد.',
                    'No saraf matches this search.',
                    'له دې لټون مخې صراف ونه موندل شو.'
                  )}
                  favoriteLabel={t('علاقه‌مندی', 'Favorite', 'خوښ')}
                  verifiedLabel={t('تاییدشده', 'Verified', 'تایید شوی')}
                  transactionsLabel={t('معامله', 'tx', 'معامله')}
                  loadingLabel={t('در حال بارگذاری صراف‌ها...', 'Loading sarafs...', 'صرافان را لوډېږي...')}
                />
              </div>

              {selectedSaraf ? (
                <div className="rounded-[26px] border border-emerald-100 bg-emerald-50/70 p-5 dark:border-emerald-500/10 dark:bg-emerald-500/10">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-black text-slate-950 dark:text-white">{selectedSaraf.businessName}</div>
                      <div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{selectedSaraf.city}</div>
                      <div className="mt-3 inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300" dir="ltr">
                        <Phone className="h-4 w-4" />
                        {selectedSaraf.phone}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {selectedSaraf.isFavorite ? (
                        <Badge className="rounded-full bg-rose-500 text-white hover:bg-rose-500">
                          {t('علاقه‌مندی', 'Favorite', 'خوښ')}
                        </Badge>
                      ) : null}
                      {selectedSaraf.isVerified ? (
                        <Badge variant="outline" className="rounded-full border-emerald-200 bg-white/70 dark:border-emerald-500/20 dark:bg-transparent">
                          <ShieldCheck className="mr-1 h-3.5 w-3.5" />
                          {t('تاییدشده', 'Verified', 'تایید شوی')}
                        </Badge>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {t('امتیاز', 'Rating', 'درجه')}
                      </div>
                      <div className="mt-2 inline-flex items-center gap-2 text-lg font-black text-slate-950 dark:text-white">
                        <Star className="h-4 w-4 text-amber-400" />
                        {selectedSaraf.rating.toFixed(1)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 dark:border-white/10 dark:bg-slate-950/40">
                      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        {t('تراکنش‌های ثبت‌شده', 'Recorded transactions', 'ثبت شوې معاملې')}
                      </div>
                      <div className="mt-2 text-lg font-black text-slate-950 dark:text-white">
                        {formatNumber(selectedSaraf.totalTransactions, locale)}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedSaraf.address}</div>
                </div>
              ) : (
                <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-5 py-8 text-sm leading-7 text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {sarafsLoading
                    ? t('در حال بارگذاری صراف‌ها...', 'Loading sarafs...', 'صرافان را لوډېږي...')
                    : t('برای ادامه، یک صراف از لیست انتخاب کن.', 'Choose a saraf from the list to continue.', 'د دوام لپاره له لست څخه یو صراف وټاکئ.')}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[30px] border border-slate-200/70 bg-white/92 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-950/72">
            <div className="mb-5">
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {t('فرم حواله', 'Hawala form', 'د حوالې فورم')}
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {selectedSaraf
                  ? t(`ثبت درخواست برای ${selectedSaraf.businessName}`, `Request for ${selectedSaraf.businessName}`, `${selectedSaraf.businessName} ته غوښتنه`)
                  : t('بعد از انتخاب صراف، فرم اینجا باز می‌شود', 'The form opens here after you choose a saraf', 'فورم دلته د صراف له ټاکلو وروسته خلاصیږي')}
              </h2>
            </div>

            {selectedSaraf ? (
              <HawalaRequestForm
                key={selectedSaraf.id}
                sarafId={selectedSaraf.id}
                sarafName={selectedSaraf.businessName}
                onSuccess={() => setHistoryVersion((current) => current + 1)}
              />
            ) : (
              <div className="rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-14 text-center dark:border-white/10 dark:bg-white/5">
                <div className="text-lg font-bold text-slate-950 dark:text-white">
                  {t('یک صراف را انتخاب کن', 'Choose a saraf first', 'لومړی یو صراف وټاکئ')}
                </div>
                <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                  {t('بعد از انتخاب صراف، فرم واقعی ثبت درخواست همین‌جا باز می‌شود.', 'After you choose a saraf, the real request form opens here.', 'کله چې صراف وټاکئ، اصلي فورم همدلته ښکاري.')}
                </p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[30px] border border-slate-200/70 bg-white/92 p-6 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-slate-950/72">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                {t('سوابق حواله', 'Previous hawalas', 'پخوانۍ حوالې')}
              </div>
              <h2 className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                {t('وضعیت درخواست‌های قبلی‌ات', 'Statuses of your previous requests', 'د خپلو پخوانیو غوښتنو حالتونه')}
              </h2>
              <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t('مجموع‌ها بر اساس ارز گروه‌بندی شده‌اند تا جمع چند ارز مختلف گمراه‌کننده نشود.', 'Totals are grouped by currency so mixed currencies never become misleading.', 'ټولیز شمېرې د اسعارو له مخې بېلې شوي څو ګډه غلطه جمع جوړه نه شي.')}
              </p>
            </div>

            <Button asChild variant="outline" className="rounded-full">
              <Link href="/user/transactions">
                {t('رفتن به همه تراکنش‌ها', 'Open full transactions', 'ټولو معاملو ته لاړ شئ')}
                <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          {session?.user?.id ? (
            <>
              <div className="mt-6 grid gap-4 lg:grid-cols-[0.8fr_0.8fr_1fr_1fr]">
                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {t('کل درخواست‌ها', 'Total requests', 'ټولې غوښتنې')}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    {historyLoading ? '...' : formatNumber(history.length, locale)}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    {t('در انتظار / تکمیل', 'Pending / completed', 'په تمه / بشپړ')}
                  </div>
                  <div className="mt-2 text-2xl font-black text-slate-950 dark:text-white">
                    {historyLoading ? '...' : `${formatNumber(pendingCount, locale)} / ${formatNumber(completedCount, locale)}`}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    <Wallet className="h-3.5 w-3.5" />
                    {t('مجموع ارسالی', 'Total to send', 'ټول لېږل')}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {historyLoading ? (
                      <span className="text-sm text-slate-500 dark:text-slate-400">...</span>
                    ) : sentTotals.length > 0 ? (
                      sentTotals.map((item) => (
                        <span key={`sent-${item.currency}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200">
                          {formatNumber(item.total, locale, 2)} {item.currency}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {t('هنوز ثبت نشده', 'No requests yet', 'لا نشته')}
                      </span>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/90 px-5 py-4 dark:border-white/10 dark:bg-white/5">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('مجموع دریافتی', 'Total to receive', 'ټول ترلاسه کول')}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {historyLoading ? (
                      <span className="text-sm text-slate-500 dark:text-slate-400">...</span>
                    ) : receivedTotals.length > 0 ? (
                      receivedTotals.map((item) => (
                        <span key={`received-${item.currency}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-semibold text-slate-700 dark:border-white/10 dark:bg-slate-950/40 dark:text-slate-200">
                          {formatNumber(item.total, locale, 2)} {item.currency}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-500 dark:text-slate-400">
                        {t('هنوز ثبت نشده', 'No requests yet', 'لا نشته')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 overflow-hidden rounded-[26px] border border-slate-200/80 dark:border-white/10">
                {historyError ? (
                  <div className="px-5 py-6 text-sm text-rose-600 dark:text-rose-300">{historyError}</div>
                ) : historyLoading ? (
                  <div className="divide-y divide-slate-200 dark:divide-white/10">
                    {Array.from({ length: 4 }, (_, index) => (
                      <div key={index} className="grid gap-3 px-5 py-4 md:grid-cols-[1.3fr_1.1fr_1.1fr_0.9fr]">
                        <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                        <div className="h-4 rounded-full bg-slate-200 dark:bg-slate-800" />
                      </div>
                    ))}
                  </div>
                ) : history.length > 0 ? (
                  <div className="divide-y divide-slate-200 dark:divide-white/10">
                    {history.map((item) => {
                      const statusMeta = getStatusMeta(item.status, language)

                      return (
                        <div key={item.id} className="grid gap-4 px-5 py-4 md:grid-cols-[1.3fr_1.1fr_1.1fr_0.9fr]">
                          <div>
                            <div className="font-semibold text-slate-950 dark:text-white">{item.referenceCode}</div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {item.saraf?.businessName || t('صراف نامشخص', 'Unknown saraf', 'نامعلوم صراف')}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {t('گیرنده', 'Receiver', 'اخیستونکی')}
                            </div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {item.receiverName} • {item.receiverCity}
                            </div>
                          </div>

                          <div>
                            <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {t('ارسال / دریافت', 'Send / receive', 'لېږل / ترلاسه کول')}
                            </div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                              {formatNumber(toAmount(item.fromAmount), locale, 2)} {item.fromCurrency}
                              {' → '}
                              {formatNumber(toAmount(item.toAmount), locale, 2)} {item.toCurrency}
                            </div>
                          </div>

                          <div>
                            <Badge variant="outline" className={cn('rounded-full border', statusMeta.className)}>
                              {statusMeta.label}
                            </Badge>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="px-6 py-14 text-center">
                    <div className="text-lg font-bold text-slate-950 dark:text-white">
                      {t('هنوز حواله‌ای ثبت نشده', 'No previous hawalas yet', 'لا کومه پخوانۍ حواله نشته')}
                    </div>
                    <p className="mx-auto mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                      {t('اولین درخواستت را از همین صفحه ثبت کن؛ بعد از ثبت، وضعیت آن همین پایین اضافه می‌شود.', 'Create your first request here and its status will appear below.', 'خپله لومړۍ غوښتنه دلته ثبت کړئ او حالت یې لاندې ښکاري.')}
                    </p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-6 rounded-[26px] border border-dashed border-slate-300 bg-slate-50/80 px-6 py-12 text-center dark:border-white/10 dark:bg-white/5">
              <div className="text-lg font-bold text-slate-950 dark:text-white">
                {t('برای دیدن سوابق، وارد حساب شو', 'Sign in to see your history', 'د تاریخچې لپاره ننوزئ')}
              </div>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                {t('بعد از ورود، مجموع ارسالی و دریافتی حواله‌ها و وضعیت درخواست‌های قبلی‌ات اینجا دیده می‌شود.', 'After sign-in, your totals and previous request statuses appear here.', 'له ننوتلو وروسته به ستاسې ټولیز شمېرې او پخواني حالتونه دلته ښکاري.')}
              </p>
              <Button asChild className="mt-5 rounded-full">
                <Link href="/auth/signin">
                  {t('ورود به حساب', 'Sign in', 'ننوتل')}
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  )
}
