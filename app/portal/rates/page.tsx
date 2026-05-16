'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Activity,
  DollarSign,
  Edit,
  History,
  Plus,
  TrendingUp,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/locale'
import { isPortalOwnerRole, isPortalRole } from '@/lib/portal-access'

interface Rate {
  id: string
  fromCurrency: string
  toCurrency: string
  buyRate: number
  sellRate: number
  isActive: boolean
  validUntil?: string
  createdAt: string
  updatedAt: string
}

interface RateHistoryItem {
  id: string
  action: string
  createdAt: string
  userName: string
  details: {
    fromCurrency?: string
    toCurrency?: string
    buyRate?: number
    sellRate?: number
  }
}

interface FeeSettings {
  hawalaFeePercent: string
  exchangeFeePercent: string
}

const CURRENCIES = ['AFN', 'USD', 'EUR', 'GBP', 'PKR', 'IRR', 'INR', 'SAR', 'AED'] as const

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function getCurrencyName(code: (typeof CURRENCIES)[number], language: Language) {
  switch (code) {
    case 'AFN':
      return pick(language, 'افغانی افغانستان', 'Afghan Afghani', 'افغانۍ')
    case 'USD':
      return pick(language, 'دالر امریکا', 'US Dollar', 'امریکايي ډالر')
    case 'EUR':
      return pick(language, 'یورو', 'Euro', 'یورو')
    case 'GBP':
      return pick(language, 'پوند انگلیس', 'British Pound', 'برتانوۍ پونډ')
    case 'PKR':
      return pick(language, 'روپیه پاکستان', 'Pakistani Rupee', 'پاکستانۍ روپۍ')
    case 'IRR':
      return pick(language, 'ریال ایران', 'Iranian Rial', 'ایراني ریال')
    case 'INR':
      return pick(language, 'روپیه هند', 'Indian Rupee', 'هندي روپۍ')
    case 'SAR':
      return pick(language, 'ریال سعودی', 'Saudi Riyal', 'سعودي ریال')
    case 'AED':
      return pick(language, 'درهم امارات', 'UAE Dirham', 'اماراتي درهم')
    default:
      return code
  }
}

function formatRateNumber(value: number, language: Language) {
  return formatLocalizedNumber(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function RateManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { language } = useLanguage()

  const [rates, setRates] = useState<Rate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingRate, setEditingRate] = useState<Rate | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const [rateHistory, setRateHistory] = useState<RateHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [savingFeeSettings, setSavingFeeSettings] = useState(false)
  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    hawalaFeePercent: '',
    exchangeFeePercent: '',
  })
  const [formData, setFormData] = useState({
    fromCurrency: '',
    toCurrency: '',
    buyRate: '',
    sellRate: '',
  })

  const t = {
    pageTitle: pick(language, 'مدیریت نرخ‌ها', 'Rate management', 'د نرخونو اداره'),
    pageSubtitle: pick(
      language,
      'مدیریت نرخ‌های خرید و فروش ارز و تنظیم درصد کارمزد',
      'Manage buy and sell rates plus fee percentages',
      'د پېر او پلور نرخونه او د فیس سلنې اداره کړئ'
    ),
    history: pick(language, 'تاریخچه تغییرات', 'Change history', 'د بدلونونو تاریخچه'),
    newRate: pick(language, 'نرخ جدید', 'New rate', 'نوی نرخ'),
    editRate: pick(language, 'ویرایش نرخ', 'Edit rate', 'د نرخ سمول'),
    addRate: pick(language, 'افزودن نرخ جدید', 'Add new rate', 'نوی نرخ اضافه کړئ'),
    fromCurrency: pick(language, 'از ارز', 'From currency', 'له اسعارو'),
    toCurrency: pick(language, 'به ارز', 'To currency', 'تر اسعارو'),
    chooseCurrency: pick(language, 'انتخاب ارز', 'Select currency', 'اسعار وټاکئ'),
    buyRate: pick(language, 'نرخ خرید', 'Buy rate', 'د پېر نرخ'),
    sellRate: pick(language, 'نرخ فروش', 'Sell rate', 'د پلور نرخ'),
    cancel: pick(language, 'لغو', 'Cancel', 'لغوه'),
    update: pick(language, 'بروزرسانی', 'Update', 'نوی کول'),
    add: pick(language, 'افزودن', 'Add', 'اضافه کول'),
    historyTitle: pick(language, 'تاریخچه تغییرات نرخ‌ها', 'Rate change history', 'د نرخ بدلونونو تاریخچه'),
    loading: pick(language, 'در حال بارگذاری...', 'Loading...', 'بارېږي...'),
    noHistory: pick(language, 'تاریخچه‌ای یافت نشد', 'No history found', 'هیڅ تاریخچه ونه موندل شوه'),
    created: pick(language, 'ایجاد', 'Created', 'جوړ شوی'),
    updated: pick(language, 'بروزرسانی', 'Updated', 'نوی شوی'),
    totalRates: pick(language, 'کل نرخ‌ها', 'Total rates', 'ټول نرخونه'),
    activeRates: pick(language, 'نرخ‌های فعال', 'Active rates', 'فعال نرخونه'),
    inactiveRates: pick(language, 'نرخ‌های غیرفعال', 'Inactive rates', 'غیرفعال نرخونه'),
    yourRates: pick(language, 'نرخ‌های شما', 'Your rates', 'ستاسو نرخونه'),
    noRates: pick(language, 'هنوز نرخی تعریف نکرده‌اید', 'You have not defined any rates yet', 'تاسو لا تر اوسه کوم نرخ نه دی ټاکلی'),
    addFirstRate: pick(language, 'اولین نرخ خود را اضافه کنید', 'Add your first rate', 'خپل لومړی نرخ اضافه کړئ'),
    active: pick(language, 'فعال', 'Active', 'فعال'),
    inactive: pick(language, 'غیرفعال', 'Inactive', 'غیرفعال'),
    lastUpdated: pick(language, 'آخرین بروزرسانی', 'Last updated', 'وروستی نوی کول'),
    saveSuccess: (isEdit: boolean) =>
      pick(
        language,
        isEdit ? 'نرخ بروزرسانی شد' : 'نرخ جدید اضافه شد',
        isEdit ? 'Rate updated successfully' : 'New rate added successfully',
        isEdit ? 'نرخ په بریالیتوب نوي شو' : 'نوی نرخ په بریالیتوب اضافه شو'
      ),
    saveError: pick(language, 'ذخیره نرخ با خطا مواجه شد', 'Failed to save the rate', 'د نرخ په خوندي کولو کې ستونزه راغله'),
    toggleSuccess: (enabled: boolean) =>
      pick(
        language,
        enabled ? 'نرخ فعال شد' : 'نرخ غیرفعال شد',
        enabled ? 'Rate activated' : 'Rate deactivated',
        enabled ? 'نرخ فعال شو' : 'نرخ غیرفعال شو'
      ),
    toggleError: pick(language, 'تغییر وضعیت نرخ با خطا مواجه شد', 'Failed to change rate status', 'د نرخ د حالت په بدلولو کې ستونزه راغله'),
    fetchError: pick(language, 'دریافت نرخ‌ها با خطا مواجه شد', 'Failed to load rates', 'د نرخونو په ترلاسه کولو کې ستونزه راغله'),
    fillFields: pick(language, 'لطفاً تمام فیلدها را پر کنید', 'Please fill in all fields', 'مهرباني وکړئ ټول ډګرونه ډک کړئ'),
    feeSettingsTitle: pick(language, 'تنظیم درصد کارمزد', 'Fee percentage settings', 'د فیس سلنې تنظیمات'),
    feeSettingsDesc: pick(
      language,
      'درصدی که مشتری برای حواله و تبادله می‌پردازد. سهم سیستم از همین مبلغ جدا می‌شود و کریدیت فقط از سهم سیستم کسر می‌گردد.',
      'The customer-facing fee percentage for hawala and exchange. The system share is cut from this amount, and credits are deducted only from the system share.',
      'هغه سلنه چې پیرودونکی یې د حوالې او تبادلې لپاره ورکوي. د سیستم برخه له همدې اندازې جلا کېږي او کریډیټ یوازې د سیستم له برخې کسرېږي.'
    ),
    hawalaFeePercent: pick(language, 'درصد کارمزد حواله', 'Hawala fee percentage', 'د حوالې د فیس سلنه'),
    exchangeFeePercent: pick(language, 'درصد کارمزد تبادله', 'Exchange fee percentage', 'د تبادلې د فیس سلنه'),
    feeHint: pick(language, 'اگر خالی بماند، نرخ پیشنهادی پیش‌فرض سیستم استفاده می‌شود.', 'If left empty, the default suggested system rate is used.', 'که تش پاتې شي، د سیستم وړاندیز شوی ډیفالټ نرخ کارول کېږي.'),
    feeSaveSuccess: pick(language, 'تنظیمات درصد کارمزد ذخیره شد', 'Fee settings saved successfully', 'د فیس سلنې تنظیمات خوندي شول'),
    feeSaveError: pick(language, 'ذخیره تنظیمات درصد کارمزد ناموفق بود', 'Failed to save fee settings', 'د فیس سلنې تنظیمات خوندي نه شول'),
    saveFeeSettings: pick(language, 'ذخیره تنظیمات کارمزد', 'Save fee settings', 'د فیس تنظیمات خوندي کړئ'),
    saving: pick(language, 'در حال ذخیره...', 'Saving...', 'خوندي کېږي...'),
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!isPortalRole(session.user.role)) {
      router.push('/')
    }
  }, [router, session, status])

  const fetchRates = async () => {
    if (!session?.user) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/portal/rates', { cache: 'no-store' })
      if (!response.ok) throw new Error(t.fetchError)
      const data = await response.json()
      setRates(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch rates:', error)
      toast({
        title: pick(language, 'خطا', 'Error', 'تېروتنه'),
        description: t.fetchError,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const fetchFeeSettings = async () => {
    if (!session?.user) return

    try {
      const response = await fetch('/api/portal/fee-settings', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      setFeeSettings({
        hawalaFeePercent:
          typeof data?.hawalaFeePercent === 'number' ? String(data.hawalaFeePercent) : '',
        exchangeFeePercent:
          typeof data?.exchangeFeePercent === 'number' ? String(data.exchangeFeePercent) : '',
      })
    } catch (error) {
      console.error('Failed to fetch fee settings:', error)
    }
  }

  useEffect(() => {
    void fetchRates()
    void fetchFeeSettings()
  }, [session])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!formData.fromCurrency || !formData.toCurrency || !formData.buyRate || !formData.sellRate) {
      toast({
        title: pick(language, 'خطا', 'Error', 'تېروتنه'),
        description: t.fillFields,
        variant: 'destructive',
      })
      return
    }

    try {
      const response = await fetch('/api/portal/rates', {
        method: editingRate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingRate ? { id: editingRate.id, ...formData } : formData),
      })

      if (!response.ok) {
        throw new Error(t.saveError)
      }

      toast({
        title: pick(language, 'موفق', 'Success', 'بریا'),
        description: t.saveSuccess(Boolean(editingRate)),
      })

      setIsDialogOpen(false)
      setEditingRate(null)
      setFormData({ fromCurrency: '', toCurrency: '', buyRate: '', sellRate: '' })
      await fetchRates()
    } catch (error) {
      console.error('Failed to save rate:', error)
      toast({
        title: pick(language, 'خطا', 'Error', 'تېروتنه'),
        description: t.saveError,
        variant: 'destructive',
      })
    }
  }

  const handleToggleActive = async (rate: Rate) => {
    const previousRates = [...rates]
    const nextState = !rate.isActive

    setRates((current) =>
      current.map((item) => (item.id === rate.id ? { ...item, isActive: nextState } : item))
    )

    try {
      const response = await fetch('/api/portal/rates', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: rate.id, isActive: nextState }),
      })

      if (!response.ok) {
        setRates(previousRates)
        throw new Error(t.toggleError)
      }

      toast({
        title: pick(language, 'موفق', 'Success', 'بریا'),
        description: t.toggleSuccess(nextState),
      })
    } catch (error) {
      console.error('Failed to toggle rate:', error)
      setRates(previousRates)
      toast({
        title: pick(language, 'خطا', 'Error', 'تېروتنه'),
        description: t.toggleError,
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (rate: Rate) => {
    setEditingRate(rate)
    setFormData({
      fromCurrency: rate.fromCurrency,
      toCurrency: rate.toCurrency,
      buyRate: rate.buyRate.toString(),
      sellRate: rate.sellRate.toString(),
    })
    setIsDialogOpen(true)
  }

  const fetchRateHistory = async () => {
    setLoadingHistory(true)
    try {
      const response = await fetch('/api/portal/rates/history')
      if (response.ok) {
        const data = await response.json()
        setRateHistory(data.history || [])
      }
    } catch (error) {
      console.error('Failed to fetch rate history:', error)
    } finally {
      setLoadingHistory(false)
    }
  }

  const saveFeeSettings = async () => {
    setSavingFeeSettings(true)
    try {
      const response = await fetch('/api/portal/fee-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hawalaFeePercent: feeSettings.hawalaFeePercent.trim(),
          exchangeFeePercent: feeSettings.exchangeFeePercent.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(t.feeSaveError)
      }

      const data = await response.json()
      setFeeSettings({
        hawalaFeePercent:
          typeof data?.hawalaFeePercent === 'number' ? String(data.hawalaFeePercent) : '',
        exchangeFeePercent:
          typeof data?.exchangeFeePercent === 'number' ? String(data.exchangeFeePercent) : '',
      })

      toast({
        title: pick(language, 'موفق', 'Success', 'بریا'),
        description: t.feeSaveSuccess,
      })
    } catch (error) {
      console.error('Failed to save fee settings:', error)
      toast({
        title: pick(language, 'خطا', 'Error', 'تېروتنه'),
        description: t.feeSaveError,
        variant: 'destructive',
      })
    } finally {
      setSavingFeeSettings(false)
    }
  }

  const getCurrencyDisplay = (code: string) => {
    if (CURRENCIES.includes(code as (typeof CURRENCIES)[number])) {
      return `${code} - ${getCurrencyName(code as (typeof CURRENCIES)[number], language)}`
    }
    return code
  }

  if (status === 'loading' || !session || !isPortalRole(session.user.role)) {
    return null
  }

  const canManageRates = isPortalOwnerRole(session.user.role)
  const activeRates = rates.filter((rate) => rate.isActive)
  const inactiveRates = rates.filter((rate) => !rate.isActive)

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-cyan-500 to-teal-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="mb-2 flex items-center gap-3">
              <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
                <DollarSign className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold md:text-4xl">{t.pageTitle}</h1>
                <p className="text-lg text-blue-50">{t.pageSubtitle}</p>
              </div>
            </div>
          </div>
          <div className="absolute right-0 top-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-teal-400/20 blur-3xl" />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <Activity className="h-6 w-6 text-cyan-600" />
              <div>
                <div className="text-sm text-muted-foreground">{t.totalRates}</div>
                <div className="text-2xl font-black">{rates.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <TrendingUp className="h-6 w-6 text-emerald-600" />
              <div>
                <div className="text-sm text-muted-foreground">{t.activeRates}</div>
                <div className="text-2xl font-black">{activeRates.length}</div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex items-center gap-3 p-5">
              <History className="h-6 w-6 text-amber-600" />
              <div>
                <div className="text-sm text-muted-foreground">{t.inactiveRates}</div>
                <div className="text-2xl font-black">{inactiveRates.length}</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => { setShowHistory(true); void fetchRateHistory() }}>
            <History className="mr-2 h-4 w-4" />
            {t.history}
          </Button>

          {canManageRates ? (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  onClick={() => {
                    setEditingRate(null)
                    setFormData({ fromCurrency: '', toCurrency: '', buyRate: '', sellRate: '' })
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {t.newRate}
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingRate ? t.editRate : t.addRate}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="fromCurrency">{t.fromCurrency}</Label>
                      <Select
                        value={formData.fromCurrency}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, fromCurrency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.chooseCurrency} />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {getCurrencyDisplay(currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="toCurrency">{t.toCurrency}</Label>
                      <Select
                        value={formData.toCurrency}
                        onValueChange={(value) =>
                          setFormData((prev) => ({ ...prev, toCurrency: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={t.chooseCurrency} />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCIES.map((currency) => (
                            <SelectItem key={currency} value={currency}>
                              {getCurrencyDisplay(currency)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="buyRate">{t.buyRate}</Label>
                      <Input
                        id="buyRate"
                        type="number"
                        step="0.01"
                        value={formData.buyRate}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, buyRate: event.target.value }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label htmlFor="sellRate">{t.sellRate}</Label>
                      <Input
                        id="sellRate"
                        type="number"
                        step="0.01"
                        value={formData.sellRate}
                        onChange={(event) =>
                          setFormData((prev) => ({ ...prev, sellRate: event.target.value }))
                        }
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                      {t.cancel}
                    </Button>
                    <Button type="submit">{editingRate ? t.update : t.add}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          ) : null}
        </div>

        {canManageRates ? (
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-teal-600" />
                {t.feeSettingsTitle}
              </CardTitle>
              <CardDescription>{t.feeSettingsDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="hawalaFeePercent">{t.hawalaFeePercent}</Label>
                  <Input
                    id="hawalaFeePercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={feeSettings.hawalaFeePercent}
                    onChange={(event) =>
                      setFeeSettings((current) => ({
                        ...current,
                        hawalaFeePercent: event.target.value,
                      }))
                    }
                    placeholder="1.50"
                  />
                </div>
                <div>
                  <Label htmlFor="exchangeFeePercent">{t.exchangeFeePercent}</Label>
                  <Input
                    id="exchangeFeePercent"
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={feeSettings.exchangeFeePercent}
                    onChange={(event) =>
                      setFeeSettings((current) => ({
                        ...current,
                        exchangeFeePercent: event.target.value,
                      }))
                    }
                    placeholder="1.00"
                  />
                </div>
              </div>

              <p className="text-sm text-muted-foreground">{t.feeHint}</p>

              <div className="flex justify-end">
                <Button onClick={saveFeeSettings} disabled={savingFeeSettings}>
                  {savingFeeSettings ? t.saving : t.saveFeeSettings}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Dialog open={showHistory} onOpenChange={setShowHistory}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{t.historyTitle}</DialogTitle>
            </DialogHeader>
            <div className="max-h-96 overflow-y-auto">
              {loadingHistory ? (
                <div className="py-8 text-center">{t.loading}</div>
              ) : rateHistory.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">{t.noHistory}</div>
              ) : (
                <div className="space-y-3">
                  {rateHistory.map((log) => (
                    <div key={log.id} className="rounded-lg border p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant={log.action === 'RATE_CREATED' ? 'default' : 'secondary'}>
                          {log.action === 'RATE_CREATED' ? t.created : t.updated}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatLocalizedDate(log.createdAt, language, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{log.userName}</p>
                      <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {log.details.fromCurrency && log.details.toCurrency ? (
                          <span>
                            {log.details.fromCurrency} → {log.details.toCurrency}
                          </span>
                        ) : null}
                        {typeof log.details.buyRate === 'number' ? (
                          <span>
                            {t.buyRate}: {formatRateNumber(log.details.buyRate, language)}
                          </span>
                        ) : null}
                        {typeof log.details.sellRate === 'number' ? (
                          <span>
                            {t.sellRate}: {formatRateNumber(log.details.sellRate, language)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>{t.yourRates}</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center">{t.loading}</div>
            ) : rates.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <p>{t.noRates}</p>
                <p className="mt-2 text-sm">{t.addFirstRate}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {rates.map((rate) => (
                  <div
                    key={rate.id}
                    className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg font-bold">
                          {rate.fromCurrency} → {rate.toCurrency}
                        </span>
                        <Badge variant={rate.isActive ? 'default' : 'secondary'}>
                          {rate.isActive ? t.active : t.inactive}
                        </Badge>
                      </div>
                      <div className="grid gap-2 text-sm text-muted-foreground md:grid-cols-2">
                        <span>
                          {t.buyRate}: {formatRateNumber(rate.buyRate, language)}
                        </span>
                        <span>
                          {t.sellRate}: {formatRateNumber(rate.sellRate, language)}
                        </span>
                        <span>
                          {t.lastUpdated}:{' '}
                          {formatLocalizedDate(rate.updatedAt, language, {
                            year: 'numeric',
                            month: 'short',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {canManageRates ? (
                        <>
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`rate-active-${rate.id}`} className="text-sm">
                              {rate.isActive ? t.active : t.inactive}
                            </Label>
                            <Switch
                              id={`rate-active-${rate.id}`}
                              checked={rate.isActive}
                              onCheckedChange={() => void handleToggleActive(rate)}
                            />
                          </div>
                          <Button variant="outline" size="sm" onClick={() => handleEdit(rate)}>
                            <Edit className="mr-2 h-4 w-4" />
                            {t.editRate}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
