'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Ban,
  CheckCircle,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  LayoutTemplate,
  Megaphone,
  RefreshCcw,
  Search,
  Sparkles,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/hooks/useLanguage'
import { ADVERTISEMENT_POSITIONS } from '@/lib/advertising'
import {
  PublicAdvertisementSlot,
  createEmptyPublicAdvertisementPlacementMap,
  type PublicAdvertisement,
} from '@/components/advertising/public-advertisement-slots'

type AdvertisementStatus = 'ALL' | 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'REJECTED'

type Advertisement = {
  id: string
  title: string
  description: string | null
  position: string
  duration: number
  price: number
  status: string
  imageUrl: string | null
  linkUrl: string | null
  impressions: number
  clicks: number
  requestedAt: string
  startDate?: string | null
  endDate?: string | null
  saraf: {
    id: string
    businessName: string
    businessAddress: string
    businessPhone: string
    user: {
      name: string
      email: string
    }
  }
}

type AdvertisementCounts = Record<AdvertisementStatus, number>

type EditState = {
  id: string
  title: string
  description: string
  position: string
  linkUrl: string
}

const emptyCounts: AdvertisementCounts = {
  ALL: 0,
  PENDING: 0,
  ACTIVE: 0,
  EXPIRED: 0,
  REJECTED: 0,
}

const pick = (language: string, fa: string, en: string, ps: string) => {
  if (language === 'en') return en
  if (language === 'ps') return ps
  return fa
}

function getStatusLabel(language: string, status: string) {
  switch (status) {
    case 'PENDING':
      return pick(language, 'در انتظار', 'Pending', 'په انتظار کې')
    case 'ACTIVE':
      return pick(language, 'فعال', 'Active', 'فعال')
    case 'EXPIRED':
      return pick(language, 'منقضی', 'Expired', 'پای ته رسېدلی')
    case 'REJECTED':
      return pick(language, 'رد شده', 'Rejected', 'رد شوی')
    default:
      return status
  }
}

function getPositionLabel(language: string, position: string) {
  switch (position) {
    case 'HERO':
      return pick(language, 'بنر هِرو', 'Hero banner', 'هېرو بینر')
    case 'FEATURED':
      return pick(language, 'کارت ویژه', 'Featured card', 'ځانګړی کارت')
    case 'SIDEBAR':
      return pick(language, 'نوار کناری', 'Sidebar rail', 'د غاړې پټه')
    case 'FOOTER':
      return pick(language, 'بنر پایین صفحه', 'Footer banner', 'د پاڼې پای بینر')
    default:
      return position
  }
}

function getPlacementSurface(language: string, position: string) {
  switch (position) {
    case 'HERO':
      return pick(language, 'بالای /sarafs و /search', 'Top of /sarafs and /search', 'د /sarafs او /search په سر کې')
    case 'FEATURED':
      return pick(language, 'بخش ویژه /sarafs و /search', 'Featured area on /sarafs and /search', 'په /sarafs او /search کې ځانګړې برخه')
    case 'SIDEBAR':
      return pick(language, 'نوار کناری /sarafs و /search', 'Side rail on /sarafs and /search', 'په /sarafs او /search کې د غاړې پټه')
    case 'FOOTER':
      return pick(language, 'پایین /sarafs و /search', 'Footer area on /sarafs and /search', 'په /sarafs او /search کې د پاڼې پای')
    default:
      return '/sarafs'
  }
}

function toPreviewAd(ad: Advertisement): PublicAdvertisement {
  return {
    id: ad.id,
    position: ad.position as PublicAdvertisement['position'],
    title: ad.title,
    description: ad.description,
    imageUrl: ad.imageUrl,
    linkUrl: ad.linkUrl,
    impressions: ad.impressions,
    clicks: ad.clicks,
    startDate: ad.startDate || null,
    endDate: ad.endDate || null,
    saraf: {
      id: ad.saraf.id,
      businessName: ad.saraf.businessName,
      businessPhone: ad.saraf.businessPhone,
    },
  }
}

export default function AdvertisementsPage() {
  const { language } = useLanguage()
  const [ads, setAds] = useState<Advertisement[]>([])
  const [counts, setCounts] = useState<AdvertisementCounts>(emptyCounts)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<AdvertisementStatus>('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [processingKey, setProcessingKey] = useState<string | null>(null)
  const [previewAd, setPreviewAd] = useState<Advertisement | null>(null)
  const [editingAd, setEditingAd] = useState<EditState | null>(null)

  useEffect(() => {
    void fetchAds()
  }, [filter, searchTerm])

  async function fetchAds() {
    try {
      setLoading(true)
      const params = new URLSearchParams({ status: filter })
      if (searchTerm.trim()) {
        params.set('search', searchTerm.trim())
      }

      const response = await fetch(`/api/admin/advertisements?${params}`, { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to load advertisements')
      }

      setAds(data?.advertisements || [])
      setCounts({
        ...emptyCounts,
        ...(data?.counts || {}),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : pick(language, 'خطا در دریافت تبلیغات', 'Failed to load advertisements', 'د اعلانونو په ترلاسه کولو کې تېروتنه')
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  async function runRequest(url: string, body: Record<string, unknown>, key: string, successMessage: string) {
    try {
      setProcessingKey(key)
      const response = await fetch(url, {
        method: 'PATCH' in body || url.includes('/advertisements/') ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Request failed')
      }
      toast.success(successMessage)
      await fetchAds()
    } catch (error) {
      const message = error instanceof Error ? error.message : pick(language, 'خطا در مدیریت تبلیغ', 'Failed to manage advertisement', 'د اعلان د مدیریت تېروتنه')
      toast.error(message)
    } finally {
      setProcessingKey(null)
    }
  }

  async function handleApprove(id: string) {
    try {
      setProcessingKey(`approve:${id}`)
      const response = await fetch('/api/admin/advertisements/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to approve advertisement')
      }
      toast.success(pick(language, 'تبلیغ فعال شد.', 'Advertisement activated.', 'اعلان فعال شو.'))
      await fetchAds()
    } catch (error) {
      const message = error instanceof Error ? error.message : pick(language, 'خطا در تایید تبلیغ', 'Failed to approve advertisement', 'د اعلان د تایید تېروتنه')
      toast.error(message)
    } finally {
      setProcessingKey(null)
    }
  }

  async function handleReject(id: string) {
    try {
      setProcessingKey(`reject:${id}`)
      const response = await fetch('/api/admin/advertisements/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to reject advertisement')
      }
      toast.success(pick(language, 'تبلیغ رد شد.', 'Advertisement rejected.', 'اعلان رد شو.'))
      await fetchAds()
    } catch (error) {
      const message = error instanceof Error ? error.message : pick(language, 'خطا در رد تبلیغ', 'Failed to reject advertisement', 'د اعلان د رد تېروتنه')
      toast.error(message)
    } finally {
      setProcessingKey(null)
    }
  }

  async function handleSaveEdit() {
    if (!editingAd) {
      return
    }

    await runRequest(
      `/api/admin/advertisements/${editingAd.id}`,
      {
        action: 'UPDATE',
        title: editingAd.title,
        description: editingAd.description,
        position: editingAd.position,
        linkUrl: editingAd.linkUrl,
      },
      `UPDATE:${editingAd.id}`,
      pick(language, 'تبلیغ به‌روزرسانی شد.', 'Advertisement updated.', 'اعلان تازه شو.')
    )

    setEditingAd(null)
  }

  const statusCards = useMemo(
    () => [
      { key: 'ALL' as const, label: pick(language, 'کل تبلیغات', 'All ads', 'ټول اعلانونه') },
      { key: 'ACTIVE' as const, label: pick(language, 'فعال', 'Active', 'فعال') },
      { key: 'PENDING' as const, label: pick(language, 'در انتظار', 'Pending', 'په انتظار کې') },
      { key: 'EXPIRED' as const, label: pick(language, 'منقضی', 'Expired', 'پای ته رسېدلي') },
    ],
    [language]
  )

  const previewPlacementMap = useMemo(() => {
    const map = createEmptyPublicAdvertisementPlacementMap()
    if (previewAd) {
      map[previewAd.position as keyof typeof map] = [toPreviewAd(previewAd)]
    }
    return map
  }, [previewAd])

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-[30px] bg-[linear-gradient(135deg,#7c2d12_0%,#be123c_45%,#7c3aed_100%)] p-8 text-white shadow-[0_35px_90px_-50px_rgba(190,24,93,0.7)]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.18),transparent_28%)]" />
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/15 p-3 backdrop-blur-xl">
                <Megaphone className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-black md:text-4xl">
                  {pick(language, 'مدیریت کامل تبلیغات', 'Full advertisement control', 'د اعلانونو بشپړ مدیریت')}
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/85 md:text-base">
                  {pick(language, 'فعال‌سازی، غیرفعال‌سازی، فعال‌سازی دوباره، تغییر جایگاه، و پیش‌نمایش واقعی همه از همین صفحه.', 'Activate, deactivate, reactivate, move, and preview every advertisement from one page.', 'د اعلان فعالول، غیرفعالول، بیا فعالول، د ځای بدلول او ریښتینې مخکتنه ټول له همدې پاڼې څخه.')}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statusCards.map((item) => (
            <Card key={item.key} className="border-white/60 bg-white/85 dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="p-5">
                <div className="text-xs font-semibold text-muted-foreground">{item.label}</div>
                <div className="mt-2 text-3xl font-black">{counts[item.key]}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="border-white/60 bg-white/85 dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={pick(language, 'جستجو در عنوان، صراف، ایمیل یا شماره...', 'Search title, saraf, email or phone...', 'په سرلیک، صراف، برېښنالیک یا شمېره کې لټون...')}
                className="pr-10"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'PENDING', 'ACTIVE', 'EXPIRED', 'REJECTED'] as AdvertisementStatus[]).map((status) => (
                <Button key={status} variant={filter === status ? 'default' : 'outline'} onClick={() => setFilter(status)} className="gap-2">
                  {status === 'ALL' ? <Sparkles className="h-4 w-4" /> : null}
                  {status === 'PENDING' ? <Clock className="h-4 w-4" /> : null}
                  {status === 'ACTIVE' ? <CheckCircle className="h-4 w-4" /> : null}
                  {status === 'EXPIRED' ? <RefreshCcw className="h-4 w-4" /> : null}
                  {status === 'REJECTED' ? <XCircle className="h-4 w-4" /> : null}
                  {status === 'ALL' ? pick(language, 'همه', 'All', 'ټول') : getStatusLabel(language, status)}
                  <Badge variant="secondary">{counts[status]}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="py-10 text-center text-muted-foreground">
            {pick(language, 'در حال بارگذاری تبلیغات...', 'Loading advertisements...', 'اعلانونه بارېږي...')}
          </div>
        ) : ads.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Megaphone className="mx-auto h-10 w-10 text-muted-foreground" />
              <h2 className="mt-4 text-xl font-bold">
                {pick(language, 'تبلیغی با این فیلتر پیدا نشد', 'No advertisements match this filter', 'له دې فلټر سره اعلان ونه موندل شو')}
              </h2>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {ads.map((ad) => (
              <Card key={ad.id} className="overflow-hidden border-white/60 bg-white/90 dark:border-white/10 dark:bg-slate-950/70">
                <CardHeader className="border-b border-slate-200/70 dark:border-white/10">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      <CardTitle className="text-2xl font-black">{ad.title}</CardTitle>
                      <div className="text-sm text-muted-foreground">
                        {ad.saraf.businessName} • {ad.saraf.user.name} • {ad.saraf.user.email}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="secondary">{getPositionLabel(language, ad.position)}</Badge>
                        <Badge variant={ad.status === 'ACTIVE' ? 'default' : ad.status === 'PENDING' ? 'secondary' : ad.status === 'REJECTED' ? 'destructive' : 'outline'}>
                          {getStatusLabel(language, ad.status)}
                        </Badge>
                        <Badge variant="outline">
                          {pick(language, 'محل نمایش', 'Surface', 'د ښودلو ځای')}: {getPlacementSurface(language, ad.position)}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setPreviewAd(ad)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {pick(language, 'پیش‌نمایش زنده', 'Live preview', 'ژوندۍ مخکتنه')}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() =>
                          setEditingAd({
                            id: ad.id,
                            title: ad.title,
                            description: ad.description || '',
                            position: ad.position,
                            linkUrl: ad.linkUrl || '',
                          })
                        }
                      >
                        <Edit3 className="mr-2 h-4 w-4" />
                        {pick(language, 'ویرایش و جایگاه', 'Edit and move', 'سمون او ځای بدلول')}
                      </Button>
                      <Button asChild variant="outline">
                        <Link href="/sarafs" target="_blank">
                          <LayoutTemplate className="mr-2 h-4 w-4" />
                          {pick(language, 'محل واقعی', 'Open placement', 'اصلي ځای')}
                        </Link>
                      </Button>
                      {ad.linkUrl ? (
                        <Button asChild variant="outline">
                          <a href={ad.linkUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            {pick(language, 'لینک هدف', 'Target link', 'هدفي لینک')}
                          </a>
                        </Button>
                      ) : null}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-5 p-6">
                  <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
                    <div className="space-y-4">
                      {ad.imageUrl ? (
                        <div className="relative h-56 overflow-hidden rounded-2xl border">
                          <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                        </div>
                      ) : (
                        <div className="flex h-56 items-center justify-center rounded-2xl border border-dashed text-muted-foreground">
                          {pick(language, 'تصویر تبلیغ موجود نیست', 'No advertisement image', 'د اعلان انځور نشته')}
                        </div>
                      )}

                      <div className="rounded-2xl border p-4">
                        <div className="text-xs text-muted-foreground">{pick(language, 'توضیحات', 'Description', 'تشریح')}</div>
                        <p className="mt-2 text-sm leading-7">
                          {ad.description || pick(language, 'بدون توضیح', 'No description', 'تشریح نشته')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="rounded-2xl border p-4">
                          <div className="text-xs text-muted-foreground">{pick(language, 'هزینه', 'Price', 'بیه')}</div>
                          <div className="mt-2 text-xl font-black">{ad.price} AFN</div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <div className="text-xs text-muted-foreground">{pick(language, 'مدت', 'Duration', 'موده')}</div>
                          <div className="mt-2 text-xl font-black">{ad.duration} {pick(language, 'روز', 'days', 'ورځې')}</div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <div className="text-xs text-muted-foreground">{pick(language, 'درخواست', 'Requested', 'غوښتنه')}</div>
                          <div className="mt-2 text-sm font-bold">{new Date(ad.requestedAt).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US')}</div>
                        </div>
                        <div className="rounded-2xl border p-4">
                          <div className="text-xs text-muted-foreground">{pick(language, 'پایان', 'Ends', 'پای')}</div>
                          <div className="mt-2 text-sm font-bold">
                            {ad.endDate ? new Date(ad.endDate).toLocaleDateString(language === 'fa' ? 'fa-IR' : 'en-US') : pick(language, 'زمان‌بندی نشده', 'Not scheduled', 'لا نه دی مهالویش شوی')}
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4">
                        <div className="text-xs text-muted-foreground">{pick(language, 'آمار', 'Metrics', 'شمېرې')}</div>
                        <div className="mt-4 grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-muted-foreground">{pick(language, 'نمایش', 'Impressions', 'ښودنې')}</div>
                            <div className="mt-1 text-2xl font-black">{ad.impressions}</div>
                          </div>
                          <div>
                            <div className="text-xs text-muted-foreground">{pick(language, 'کلیک', 'Clicks', 'کلیکونه')}</div>
                            <div className="mt-1 text-2xl font-black">{ad.clicks}</div>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-2xl border p-4">
                        <div className="text-xs text-muted-foreground">{pick(language, 'یادداشت', 'Note', 'یادونه')}</div>
                        <p className="mt-2 text-sm leading-7 text-muted-foreground">
                          {pick(language, 'این تبلیغ فقط در صفحه‌های عمومی بازار نمایش داده می‌شود. اگر در تولید نمی‌بینی، باید همان دیپلوی و همان دیتابیس فعال باشد.', 'This advertisement only renders on the public directory pages. If you do not see it in production, the same deployment and the same database must be active.', 'دا اعلان یوازې د عام بازار په پاڼو کې ښکاري. که په تولید کې نه ښکاري، هماغه ډیپلوی او هماغه ډیټابیس باید فعال وي.')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-slate-200/70 pt-4 dark:border-white/10">
                    {ad.status === 'PENDING' ? (
                      <>
                        <Button onClick={() => void handleApprove(ad.id)} disabled={processingKey === `approve:${ad.id}`}>
                          <CheckCircle className="mr-2 h-4 w-4" />
                          {pick(language, 'تایید و فعال‌سازی', 'Approve and activate', 'تایید او فعالول')}
                        </Button>
                        <Button variant="destructive" onClick={() => void handleReject(ad.id)} disabled={processingKey === `reject:${ad.id}`}>
                          <XCircle className="mr-2 h-4 w-4" />
                          {pick(language, 'رد درخواست', 'Reject request', 'غوښتنه ردول')}
                        </Button>
                      </>
                    ) : null}

                    {ad.status === 'ACTIVE' ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          void runRequest(
                            `/api/admin/advertisements/${ad.id}`,
                            { action: 'DEACTIVATE' },
                            `DEACTIVATE:${ad.id}`,
                            pick(language, 'تبلیغ غیرفعال شد.', 'Advertisement deactivated.', 'اعلان غیرفعال شو.')
                          )
                        }
                        disabled={processingKey === `DEACTIVATE:${ad.id}`}
                      >
                        <Ban className="mr-2 h-4 w-4" />
                        {pick(language, 'غیرفعال‌سازی', 'Deactivate', 'غیرفعالول')}
                      </Button>
                    ) : null}

                    {['EXPIRED', 'REJECTED'].includes(ad.status) ? (
                      <Button
                        variant="outline"
                        onClick={() =>
                          void runRequest(
                            `/api/admin/advertisements/${ad.id}`,
                            { action: 'REACTIVATE' },
                            `REACTIVATE:${ad.id}`,
                            pick(language, 'تبلیغ دوباره فعال شد.', 'Advertisement reactivated.', 'اعلان بیا فعال شو.')
                          )
                        }
                        disabled={processingKey === `REACTIVATE:${ad.id}`}
                      >
                        <RefreshCcw className="mr-2 h-4 w-4" />
                        {pick(language, 'فعال‌سازی دوباره', 'Reactivate', 'بیا فعالول')}
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={Boolean(previewAd)} onOpenChange={(open) => !open && setPreviewAd(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{pick(language, 'پیش‌نمایش واقعی تبلیغ', 'Real advertisement preview', 'د اعلان رښتینې مخکتنه')}</DialogTitle>
            <DialogDescription>{previewAd ? getPlacementSurface(language, previewAd.position) : ''}</DialogDescription>
          </DialogHeader>
          {previewAd ? (
            <PublicAdvertisementSlot
              placement={previewAd.position as PublicAdvertisement['position']}
              advertisements={previewPlacementMap[previewAd.position as keyof typeof previewPlacementMap]}
              track={false}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(editingAd)} onOpenChange={(open) => !open && setEditingAd(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{pick(language, 'ویرایش تبلیغ', 'Edit advertisement', 'اعلان سمول')}</DialogTitle>
            <DialogDescription>{pick(language, 'جایگاه، عنوان، توضیح و لینک هدف را تغییر بده.', 'Change placement, title, description, and target link.', 'ځای، سرلیک، تشریح او هدف لینک بدل کړه.')}</DialogDescription>
          </DialogHeader>
          {editingAd ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{pick(language, 'عنوان', 'Title', 'سرلیک')}</Label>
                <Input value={editingAd.title} onChange={(event) => setEditingAd({ ...editingAd, title: event.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>{pick(language, 'جایگاه', 'Placement', 'ځای')}</Label>
                <Select value={editingAd.position} onValueChange={(value) => setEditingAd({ ...editingAd, position: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ADVERTISEMENT_POSITIONS.map((position) => (
                      <SelectItem key={position} value={position}>
                        {getPositionLabel(language, position)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{getPlacementSurface(language, editingAd.position)}</p>
              </div>

              <div className="space-y-2">
                <Label>{pick(language, 'لینک هدف', 'Target link', 'هدفي لینک')}</Label>
                <Input value={editingAd.linkUrl} onChange={(event) => setEditingAd({ ...editingAd, linkUrl: event.target.value })} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label>{pick(language, 'توضیحات', 'Description', 'تشریح')}</Label>
                <Textarea value={editingAd.description} onChange={(event) => setEditingAd({ ...editingAd, description: event.target.value })} />
              </div>
            </div>
          ) : null}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingAd(null)}>
              {pick(language, 'بستن', 'Close', 'بندول')}
            </Button>
            <Button onClick={() => void handleSaveEdit()} disabled={Boolean(editingAd && processingKey === `UPDATE:${editingAd.id}`)}>
              {pick(language, 'ذخیره تغییرات', 'Save changes', 'بدلونونه خوندي کول')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
