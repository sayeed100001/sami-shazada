'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowLeft, Eye, TrendingUp, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/hooks/useLanguage'

type AdvertisementPackage = {
  position: string
  code: string
  dailyPrice: number
  currency: string
  placementTitle: string
  placementDescription: string
  billingMode: 'OFFLINE'
}

type AdvertisementRecord = {
  id: string
  position: string
  title: string
  description?: string | null
  imageUrl?: string | null
  linkUrl?: string | null
  duration: number
  price: number
  status: string
  impressions: number
  clicks: number
  requestedAt: string
}

const pick = (language: string, fa: string, en: string, ps: string) => {
  if (language === 'en') return en
  if (language === 'ps') return ps
  return fa
}

export default function AdvertisementPage() {
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [packages, setPackages] = useState<AdvertisementPackage[]>([])
  const [advertisements, setAdvertisements] = useState<AdvertisementRecord[]>([])
  const [formData, setFormData] = useState({
    position: 'FEATURED',
    title: '',
    description: '',
    imageUrl: '',
    linkUrl: '',
    duration: 7,
  })

  useEffect(() => {
    void fetchData()
  }, [])

  const selectedPackage = useMemo(
    () => packages.find((item) => item.position === formData.position) || null,
    [packages, formData.position]
  )

  const price = selectedPackage ? selectedPackage.dailyPrice * formData.duration : 0

  async function fetchData() {
    try {
      const res = await fetch('/api/portal/advertisement/request')
      const data = await res.json().catch(() => null)

      if (!res.ok) {
        throw new Error(data?.error || 'Failed to fetch advertisements')
      }

      setPackages(data?.packages || [])
      setAdvertisements(data?.advertisements || [])
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to fetch advertisements'
      toast.error(message)
    }
  }

  async function uploadAdvertisementImage() {
    if (!selectedImageFile) {
      toast.error(
        pick(language, 'ابتدا تصویر را انتخاب کنید.', 'Select an image first.', 'لومړی انځور وټاکئ.')
      )
      return
    }

    const maxKb = 200
    const sizeKb = selectedImageFile.size / 1024
    if (sizeKb > maxKb) {
      toast.error(
        pick(
          language,
          `حجم تصویر باید حداکثر ${maxKb}KB باشد.`,
          `Image must be at most ${maxKb}KB.`,
          `د انځور اندازه بايد تر ${maxKb}KB پورې وي.`
        )
      )
      return
    }

    setUploadingImage(true)
    try {
      const form = new FormData()
      form.append('file', selectedImageFile)

      const res = await fetch('/api/portal/advertisement/upload-image', {
        method: 'POST',
        body: form,
      })

      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.url) {
        throw new Error(data?.error || 'Upload failed')
      }

      setFormData((prev) => ({ ...prev, imageUrl: data.url }))
      toast.success(
        pick(language, 'تصویر تبلیغ آپلود شد.', 'Advertisement image uploaded.', 'د اعلان انځور اپلوډ شو.')
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Upload failed'
      toast.error(message)
    } finally {
      setUploadingImage(false)
    }
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setLoading(true)

    try {
      const res = await fetch('/api/portal/advertisement/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to submit advertisement request')
      }

      toast.success(
        pick(
          language,
          'درخواست تبلیغ ثبت شد. پس از پرداخت آفلاین و تایید ادمین فعال می‌شود.',
          'Advertisement request submitted. It will go live after offline payment confirmation and admin approval.',
          'د اعلان غوښتنه ثبت شوه. له افلاین تاديې او د اډمين له تاييد وروسته به فعاله شي.'
        )
      )

      setFormData({
        position: 'FEATURED',
        title: '',
        description: '',
        imageUrl: '',
        linkUrl: '',
        duration: 7,
      })
      setSelectedImageFile(null)
      await fetchData()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to submit advertisement request'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  function getStatusBadge(status: string) {
    const variantMap: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
      PENDING: 'secondary',
      ACTIVE: 'default',
      EXPIRED: 'outline',
      REJECTED: 'destructive',
    }

    const labelMap: Record<string, string> = {
      PENDING: pick(language, 'در انتظار تایید', 'Pending approval', 'د تاييد په تمه'),
      ACTIVE: pick(language, 'فعال', 'Active', 'فعال'),
      EXPIRED: pick(language, 'منقضی', 'Expired', 'پای ته رسېدلی'),
      REJECTED: pick(language, 'رد شده', 'Rejected', 'رد شوی'),
    }

    return <Badge variant={variantMap[status] || 'outline'}>{labelMap[status] || status}</Badge>
  }

  const pendingCount = advertisements.filter((ad) => ad.status === 'PENDING').length
  const activeCount = advertisements.filter((ad) => ad.status === 'ACTIVE').length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6">
      <div className="bg-gradient-to-r from-red-500 via-pink-500 to-rose-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Link href="/portal">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {pick(language, 'بازگشت', 'Back', 'بېرته')}
                </Button>
              </Link>
            </div>
            <h1 className="text-4xl font-bold mb-2">{pick(language, 'تبلیغات', 'Advertisements', 'اعلانونه')}</h1>
            <p className="text-red-50 text-lg">
              {pick(
                language,
                'پکیج تبلیغاتی را بر اساس محل نمایش انتخاب کنید و درخواست پرداخت آفلاین بفرستید.',
                'Choose the ad package by placement and submit an offline payment request.',
                'د ښودلو د ځای له مخې د اعلان پکیج وټاکئ او د افلاین تاديې غوښتنه واستوئ.'
              )}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="glass-card border-0 min-w-[220px]">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  {pick(language, 'درخواست‌های در انتظار', 'Pending requests', 'په تمه غوښتنې')}
                </p>
                <p className="text-3xl font-bold text-amber-600">{pendingCount}</p>
              </CardContent>
            </Card>
            <Card className="glass-card border-0 min-w-[220px]">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">
                  {pick(language, 'تبلیغات فعال', 'Active advertisements', 'فعال اعلانونه')}
                </p>
                <p className="text-3xl font-bold text-green-600">{activeCount}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>{pick(language, 'پکیج‌های محل نمایش', 'Placement packages', 'د ښودلو د ځای پکیجونه')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {packages.map((pkg) => (
                <div
                  key={pkg.position}
                  className={`rounded-xl border p-4 transition ${
                    formData.position === pkg.position ? 'border-red-500 bg-red-50/60' : 'border-border bg-background/80'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="font-semibold">{pkg.position}</h3>
                    <Badge variant="secondary">{pkg.dailyPrice} {pkg.currency}/day</Badge>
                  </div>
                  <p className="mt-3 text-sm font-medium">{pkg.placementTitle}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{pkg.placementDescription}</p>
                  <p className="mt-3 text-xs text-muted-foreground">
                    {pick(language, 'پرداخت: آفلاین', 'Payment: offline', 'تاديه: افلاین')}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="glass-card hover-lift border-0">
            <CardHeader>
              <CardTitle>{pick(language, 'درخواست تبلیغ جدید', 'New advertisement request', 'د اعلان نوې غوښتنه')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>{pick(language, 'محل نمایش', 'Placement', 'د ښودلو ځای')}</Label>
                  <Select value={formData.position} onValueChange={(value) => setFormData((prev) => ({ ...prev, position: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {packages.map((pkg) => (
                        <SelectItem key={pkg.position} value={pkg.position}>
                          {pkg.placementTitle} - {pkg.dailyPrice} {pkg.currency}/day
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{selectedPackage?.placementDescription}</p>
                </div>

                <div className="space-y-2">
                  <Label>{pick(language, 'عنوان تبلیغ', 'Advertisement title', 'د اعلان سرليک')}</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder={pick(language, 'عنوان جذاب برای تبلیغ', 'A compelling advertisement title', 'د اعلان لپاره ښه سرليک')}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>{pick(language, 'توضیحات', 'Description', 'تشريح')}</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder={pick(language, 'توضیحات کوتاه درباره تبلیغ', 'Short description for the advertisement', 'د اعلان لنډه تشريح')}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>{pick(language, 'تصویر تبلیغ (حداکثر 200KB)', 'Advertisement image (max 200KB)', 'د اعلان انځور (تر 200KB پورې)')}</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setSelectedImageFile(e.target.files?.[0] || null)} />
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" disabled={uploadingImage || !selectedImageFile} onClick={() => void uploadAdvertisementImage()}>
                      {uploadingImage ? pick(language, 'در حال آپلود...', 'Uploading...', 'اپلوډ کېږي...') : pick(language, 'آپلود تصویر', 'Upload image', 'انځور اپلوډ')}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={uploadingImage}
                      onClick={() => {
                        setSelectedImageFile(null)
                        setFormData((prev) => ({ ...prev, imageUrl: '' }))
                      }}
                    >
                      {pick(language, 'حذف', 'Clear', 'پاکول')}
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-muted-foreground">
                  {pick(
                    language,
                    'تصویر تبلیغ در storage امن سیستم ذخیره می‌شود و دیگر نیازی به وارد کردن لینک تصویر نیست.',
                    'Advertisement images are stored in managed storage, so you no longer need to paste an image URL.',
                    'د اعلان انځورونه د سیستم په خوندي storage کې ساتل کېږي؛ نور د انځور لینک ته اړتیا نشته.'
                  )}
                </p>

                <div className="space-y-2">
                  <Label>{pick(language, 'لینک مقصد', 'Target URL', 'د هدف لینک')}</Label>
                  <Input value={formData.linkUrl} onChange={(e) => setFormData((prev) => ({ ...prev, linkUrl: e.target.value }))} placeholder="https://example.com" type="url" />
                </div>

                <div className="space-y-2">
                  <Label>{pick(language, 'مدت زمان (روز)', 'Duration (days)', 'موده (ورځې)')}</Label>
                  <Input
                    type="number"
                    value={formData.duration}
                    onChange={(e) => setFormData((prev) => ({ ...prev, duration: Math.max(1, parseInt(e.target.value || '1', 10) || 1) }))}
                    min={1}
                    max={365}
                  />
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-lg">
                    <span>{pick(language, 'هزینه کل:', 'Total price:', 'ټول قیمت:')}</span>
                    <span className="font-bold text-green-600">{price} AFN</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {pick(
                      language,
                      'این بخش از سیستم کریدیت جدا است. پرداخت به‌صورت آفلاین انجام می‌شود و بعد از تایید ادمین، تبلیغ فعال می‌شود.',
                      'This flow is separate from the credit system. Payment is handled offline, and the advertisement is activated only after admin approval.',
                      'دا بهیر له کریډیټ سیسټم څخه جلا دی. تاديه افلاین کېږي او اعلان يوازې د اډمين له تاييد وروسته فعالېږي.'
                    )}
                  </p>
                </div>

                <Button type="submit" disabled={loading || !formData.title} className="w-full bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700" size="lg">
                  {loading ? pick(language, 'در حال ثبت...', 'Submitting...', 'ثبتېږي...') : pick(language, 'ثبت درخواست', 'Submit request', 'غوښتنه ثبتول')}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                {pick(language, 'پیش‌نمایش', 'Preview', 'مخکتنه')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formData.imageUrl ? (
                <div className="relative w-full h-64 mb-4 rounded-lg overflow-hidden border">
                  <Image src={formData.imageUrl} alt={formData.title || 'Preview'} fill className="object-cover" />
                </div>
              ) : (
                <div className="w-full h-64 mb-4 rounded-lg border-2 border-dashed flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <Upload className="w-12 h-12 mx-auto mb-2" />
                    <p>{pick(language, 'تصویر تبلیغ', 'Advertisement image', 'د اعلان انځور')}</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="text-xl font-bold">{formData.title || pick(language, 'عنوان تبلیغ', 'Advertisement title', 'د اعلان سرليک')}</h3>
                <p className="text-sm text-muted-foreground">
                  {formData.description || pick(language, 'توضیحات تبلیغ در اینجا نمایش داده می‌شود.', 'The advertisement description will appear here.', 'د اعلان تشريح به دلته ښکاره شي.')}
                </p>
                {selectedPackage ? (
                  <Badge variant="secondary">
                    {selectedPackage.placementTitle} • {price} AFN
                  </Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>

        {advertisements.length > 0 ? (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                {pick(language, 'درخواست‌ها و تبلیغات شما', 'Your requests and advertisements', 'ستاسو غوښتنې او اعلانونه')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {advertisements.map((ad) => (
                  <div key={ad.id} className="flex flex-col gap-4 rounded-xl border p-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex gap-4">
                      {ad.imageUrl ? (
                        <div className="relative h-24 w-24 overflow-hidden rounded-lg">
                          <Image src={ad.imageUrl} alt={ad.title} fill className="object-cover" />
                        </div>
                      ) : null}
                      <div className="space-y-1">
                        <h4 className="font-bold">{ad.title}</h4>
                        <p className="text-sm text-muted-foreground">{packages.find((pkg) => pkg.position === ad.position)?.placementTitle || ad.position}</p>
                        <p className="text-xs text-muted-foreground">
                          {ad.duration} {pick(language, 'روز', 'day(s)', 'ورځې')} • {ad.price} AFN
                        </p>
                        {ad.status === 'ACTIVE' ? (
                          <div className="flex gap-4 text-xs text-muted-foreground">
                            <span>{ad.impressions} {pick(language, 'نمایش', 'impressions', 'ښودنې')}</span>
                            <span>{ad.clicks} {pick(language, 'کلیک', 'clicks', 'کليکونه')}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{pick(language, 'پرداخت آفلاین', 'Offline payment', 'افلاین تاديه')}</Badge>
                      {getStatusBadge(ad.status)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  )
}
