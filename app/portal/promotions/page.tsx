'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Crown, Star, Sparkles, CreditCard, Building, Phone, ArrowLeft, RefreshCw, Clock } from 'lucide-react'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useLanguage } from '@/hooks/useLanguage'

type PromotionType = string
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'HAWALA'

type PricingTier = {
  duration: number
  amount: number
  baseAmount?: number
  overrideAmount?: number | null
}

type PromotionPackage = {
  type: PromotionType
  name: string
  description: string | null
  features: string[]
  pricing: PricingTier[]
  isActive: boolean
  displayOrder: number
}

type PromotionHistoryItem = {
  id: string
  type: PromotionType
  duration: number
  amount: number
  paymentMethod: PaymentMethod
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  expiresAt?: string | null
}

function isActivePromotion(item: PromotionHistoryItem, now: Date) {
  if (item.status !== 'APPROVED') return false
  if (!item.expiresAt) return true
  const exp = new Date(item.expiresAt)
  return !Number.isNaN(exp.getTime()) && exp.getTime() >= now.getTime()
}

export default function SarafPromotionsPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const tr = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  const [packages, setPackages] = useState<PromotionPackage[]>([])
  const [history, setHistory] = useState<PromotionHistoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const [selectedType, setSelectedType] = useState<PromotionType | null>(null)
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('CASH')

  const fmt = useMemo(() => {
    const locale = language === 'en' ? 'en-US' : 'fa-AF'
    return new Intl.NumberFormat(locale)
  }, [language])

  const selectedPackage = useMemo(() => {
    if (!selectedType) return null
    return packages.find((p) => p.type === selectedType) ?? null
  }, [packages, selectedType])

  const selectedTier = useMemo(() => {
    if (!selectedPackage || selectedDuration === null) return null
    return selectedPackage.pricing.find((p) => p.duration === selectedDuration) ?? null
  }, [selectedDuration, selectedPackage])

  const activeStatus = useMemo(() => {
    const now = new Date()
    const byType: Record<string, PromotionHistoryItem> = {}
    for (const item of history) {
      if (!isActivePromotion(item, now)) continue
      // Pick the most recent active one
      const prev = byType[item.type]
      if (!prev) {
        byType[item.type] = item
        continue
      }
      if (new Date(item.createdAt).getTime() > new Date(prev.createdAt).getTime()) byType[item.type] = item
    }
    return byType
  }, [history])

  const fetchData = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/portal/promotions?lang=${encodeURIComponent(language)}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed')
      }
      setPackages(Array.isArray(data.packages) ? data.packages : [])
      setHistory(Array.isArray(data.history) ? data.history : [])
    } catch (e) {
      console.error(e)
      toast.error(tr('خطا در دریافت پروموشن‌ها', 'Failed to load promotions', 'د پروموشنونو ترلاسه کولو کې تېروتنه'))
      setPackages([])
      setHistory([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language])

  useEffect(() => {
    if (!selectedPackage) return
    const firstTier = selectedPackage.pricing[0]
    setSelectedDuration(firstTier ? firstTier.duration : null)
  }, [selectedPackage])

  const handleSubmitRequest = async () => {
    if (!selectedPackage || selectedDuration === null) {
      toast.error(tr('لطفا ابتدا یک بسته و مدت را انتخاب کنید', 'Please choose a package and duration', 'مهرباني وکړئ بسته او موده وټاکئ'))
      return
    }
    if (!session?.user) {
      toast.error(tr('برای ادامه وارد شوید', 'Please sign in to continue', 'مهرباني وکړئ داخل شئ'))
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/portal/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedPackage.type,
          duration: selectedDuration,
          paymentMethod,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed')
      }
      toast.success(
        tr('درخواست با موفقیت ثبت شد', 'Request submitted successfully', 'غوښتنه په بریالیتوب ثبت شوه')
      )
      setSelectedType(null)
      setSelectedDuration(null)
      setPaymentMethod('CASH')
      await fetchData()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا در ثبت درخواست', 'Failed to submit request', 'د غوښتنې ثبتولو کې تېروتنه'))
    } finally {
      setSubmitting(false)
    }
  }

  const getTypeIcon = (type: PromotionType) => (type === 'PREMIUM' ? Crown : type === 'FEATURED' ? Star : Sparkles)
  const getTypeColor = (type: PromotionType) =>
    type === 'PREMIUM'
      ? 'from-amber-500 via-orange-500 to-rose-500'
      : type === 'FEATURED'
        ? 'from-sky-500 via-indigo-500 to-violet-600'
        : 'from-emerald-500 via-teal-500 to-cyan-600'

  const getTypeLabel = (type: PromotionType) =>
    type === 'PREMIUM'
      ? tr('حساب پریمیوم', 'Premium', 'پریمیوم')
      : tr('نمایش ویژه', 'Featured', 'ځانګړی نمایش')

  const getStatusBadge = (status: PromotionHistoryItem['status']) => {
    if (status === 'PENDING') return <Badge variant="secondary">{tr('در انتظار', 'Pending', 'په تمه')}</Badge>
    if (status === 'APPROVED') return <Badge className="bg-emerald-600 text-white">{tr('تایید شد', 'Approved', 'تایید')}</Badge>
    return <Badge variant="destructive">{tr('رد شد', 'Rejected', 'رد')}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-3 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{tr('پروموشن‌ها', 'Promotions', 'پروموشنونه')}</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {tr(
                'با خرید پروموشن، پروفایل صرافی شما بیشتر دیده می‌شود.',
                'Boost visibility of your saraf profile with promotions.',
                'د پروموشن په اخیستلو سره ستاسو صرافي پروفایل ډېر ښکاري.'
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => void fetchData()} disabled={loading} className="h-10 rounded-full">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button asChild variant="outline" className="h-10 rounded-full">
              <Link href="/portal">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">{tr('بازگشت', 'Back', 'بېرته')}</span>
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              {tr('در حال بارگذاری...', 'Loading...', 'بارېږي...')}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {packages
              .filter((p) => p.isActive)
              .sort((a, b) => a.displayOrder - b.displayOrder)
              .map((pkg) => {
                const Icon = getTypeIcon(pkg.type)
                const active = activeStatus[pkg.type]
                const isSelected = selectedType === pkg.type
                return (
                  <Card
                    key={pkg.type}
                    className={[
                      'border-border/70 bg-background/90 shadow-sm transition',
                      isSelected ? 'ring-2 ring-primary' : 'hover:border-primary/30',
                    ].join(' ')}
                  >
                    <CardHeader className="pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <CardTitle className="flex items-center gap-2">
                            <span className={`grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br ${getTypeColor(pkg.type)} text-white shadow-sm`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span className="truncate">{pkg.name || String(pkg.type || '').toUpperCase()}</span>
                          </CardTitle>
                          {pkg.description ? <CardDescription className="mt-2">{pkg.description}</CardDescription> : null}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          {active ? (
                            <Badge className="bg-emerald-600 text-white">
                              <Clock className="mr-1 h-3 w-3" />
                              {tr('فعال', 'Active', 'فعال')}
                            </Badge>
                          ) : null}
                          <Button
                            size="sm"
                            variant={isSelected ? 'default' : 'outline'}
                            className="rounded-full"
                            onClick={() => setSelectedType(pkg.type)}
                          >
                            {isSelected ? tr('انتخاب شده', 'Selected', 'ټاکل شوی') : tr('انتخاب', 'Select', 'وټاکئ')}
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pkg.features.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">{tr('امکانات', 'Features', 'امکانات')}</div>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {pkg.features.slice(0, 12).map((f, idx) => (
                              <li key={idx} className="flex items-start gap-2">
                                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                <span className="leading-6">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}

                      {pkg.pricing.length > 0 ? (
                        <div className="space-y-2">
                          <div className="text-sm font-semibold">{tr('قیمت‌گذاری', 'Pricing', 'بیه')}</div>
                          <div className="grid gap-2 sm:grid-cols-3">
                            {pkg.pricing.map((tier) => (
                              <div
                                key={tier.duration}
                                className="rounded-2xl border border-border/70 bg-background/80 px-3 py-3 text-sm"
                              >
                                <div className="text-xs text-muted-foreground">{tr('مدت', 'Duration', 'موده')}</div>
                                <div className="mt-1 font-semibold">
                                  {fmt.format(tier.duration)} {tr('روز', 'days', 'ورځې')}
                                </div>
                                <div className="mt-2 text-xs text-muted-foreground">{tr('مبلغ', 'Amount', 'بیه')}</div>
                                <div className="mt-1 font-black">
                                  {fmt.format(tier.amount)} <span className="text-xs font-semibold">AFN</span>
                                </div>
                                {tier.overrideAmount ? (
                                  <div className="mt-1 text-[11px] text-amber-600">
                                    {tr('قیمت اختصاصی اعمال شده', 'Custom price applied', 'ځانګړې بیه پلي شوې')}
                                  </div>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                )
              })}
          </div>
        )}

        {selectedPackage ? (
          <Card className="border-border/70 bg-background/90">
            <CardHeader>
              <CardTitle>{tr('تکمیل سفارش', 'Complete Order', 'سفارش بشپړول')}</CardTitle>
              <CardDescription>
                {tr(
                  'جزئیات سفارش را مشخص کنید و درخواست را ثبت کنید.',
                  'Choose details and submit your request.',
                  'جزئیات وټاکئ او غوښتنه ثبت کړئ.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>{tr('مدت زمان', 'Duration', 'موده')}</Label>
                  <Select
                    value={selectedDuration ? String(selectedDuration) : ''}
                    onValueChange={(v) => setSelectedDuration(Number(v))}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue placeholder={tr('انتخاب', 'Select', 'وټاکئ')} />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedPackage.pricing.map((tier) => (
                        <SelectItem key={tier.duration} value={String(tier.duration)}>
                          {fmt.format(tier.duration)} {tr('روز', 'days', 'ورځې')} - {fmt.format(tier.amount)} AFN
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>{tr('روش پرداخت', 'Payment method', 'د پیسو ورکولو طریقه')}</Label>
                  <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">{tr('پرداخت نقدی', 'Cash', 'نغدي')}</SelectItem>
                      <SelectItem value="BANK_TRANSFER">{tr('انتقال بانکی', 'Bank transfer', 'بانکي لېږد')}</SelectItem>
                      <SelectItem value="HAWALA">{tr('حواله', 'Hawala', 'حواله')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-4">
                <div className="text-sm text-muted-foreground">{tr('جمع کل', 'Total', 'ټول')}</div>
                <div className="text-2xl font-black">
                  {selectedTier ? fmt.format(selectedTier.amount) : '—'} <span className="text-sm font-semibold">AFN</span>
                </div>
              </div>

              <Alert>
                <CreditCard className="h-4 w-4" />
                <AlertDescription className="space-y-3">
                  <div className="text-sm font-semibold">{tr('راهنمای پرداخت', 'Payment guide', 'د پیسو لارښود')}</div>
                  {paymentMethod === 'CASH' ? (
                    <div className="flex items-start gap-2 text-sm">
                      <Building className="mt-0.5 h-4 w-4" />
                      <div className="space-y-1">
                        <div className="font-medium">{tr('پرداخت نقدی', 'Cash payment', 'نغدي پیسې')}</div>
                        <div className="text-muted-foreground">
                          {tr(
                            'برای پرداخت نقدی به دفتر مرکزی مراجعه کنید.',
                            'Visit the main office for cash payment.',
                            'د نغدي پیسو لپاره مرکزي دفتر ته مراجعه وکړئ.'
                          )}
                        </div>
                      </div>
                    </div>
                  ) : paymentMethod === 'BANK_TRANSFER' ? (
                    <div className="flex items-start gap-2 text-sm">
                      <Building className="mt-0.5 h-4 w-4" />
                      <div className="space-y-1">
                        <div className="font-medium">{tr('انتقال بانکی', 'Bank transfer', 'بانکي لېږد')}</div>
                        <div className="text-muted-foreground">
                          {tr(
                            'بعد از انتقال، رسید را برای پشتیبانی ارسال کنید.',
                            'After transfer, send the receipt to support.',
                            'له لېږد وروسته رسید ملاتړ ته ولېږئ.'
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-2 text-sm">
                      <Phone className="mt-0.5 h-4 w-4" />
                      <div className="space-y-1">
                        <div className="font-medium">{tr('حواله', 'Hawala', 'حواله')}</div>
                        <div className="text-muted-foreground">
                          {tr(
                            'برای هماهنگی حواله با پشتیبانی تماس بگیرید.',
                            'Contact support to coordinate hawala payment.',
                            'د حوالې د هماهنګۍ لپاره ملاتړ سره اړیکه ونیسئ.'
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <Button variant="outline" onClick={() => setSelectedType(null)} disabled={submitting}>
                  {tr('انصراف', 'Cancel', 'لغوه')}
                </Button>
                <Button onClick={() => void handleSubmitRequest()} disabled={submitting || !selectedTier}>
                  {submitting ? tr('در حال ارسال...', 'Submitting...', 'لېږل...') : tr('ثبت درخواست', 'Submit request', 'غوښتنه ثبت')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="border-border/70 bg-background/90">
          <CardHeader>
            <CardTitle>{tr('تاریخچه درخواست‌ها', 'Request history', 'د غوښتنو تاریخچه')}</CardTitle>
            <CardDescription>
              {tr(
                'آخرین درخواست‌های پروموشن و وضعیت آن‌ها.',
                'Your recent promotion requests and status.',
                'ستاسو وروستۍ پروموشن غوښتنې او حالت.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">{tr('موردی یافت نشد', 'No items', 'هیڅ نشته')}</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{tr('نوع', 'Type', 'ډول')}</TableHead>
                      <TableHead>{tr('مدت', 'Duration', 'موده')}</TableHead>
                      <TableHead>{tr('مبلغ', 'Amount', 'بیه')}</TableHead>
                      <TableHead>{tr('پرداخت', 'Payment', 'ورکول')}</TableHead>
                      <TableHead>{tr('وضعیت', 'Status', 'حالت')}</TableHead>
                      <TableHead>{tr('تاریخ', 'Date', 'نېټه')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">{row.type === 'PREMIUM' || row.type === 'FEATURED' ? getTypeLabel(row.type) : String(row.type || '').toUpperCase()}</TableCell>
                        <TableCell>
                          {fmt.format(row.duration)} {tr('روز', 'days', 'ورځې')}
                        </TableCell>
                        <TableCell>{fmt.format(row.amount)} AFN</TableCell>
                        <TableCell>
                          {row.paymentMethod === 'CASH'
                            ? tr('نقدی', 'Cash', 'نغدي')
                            : row.paymentMethod === 'BANK_TRANSFER'
                              ? tr('بانکی', 'Bank', 'بانکي')
                              : tr('حواله', 'Hawala', 'حواله')}
                        </TableCell>
                        <TableCell>{getStatusBadge(row.status)}</TableCell>
                        <TableCell>{new Date(row.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fa-IR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
