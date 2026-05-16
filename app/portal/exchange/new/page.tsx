'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ArrowRightLeft, Building2, Calculator } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedNumber } from '@/lib/locale'
import { toast } from 'sonner'

interface ExchangeForm {
  customerName: string
  customerPhone: string
  customerEmail: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  rate: number
  notes: string
  branchId: string
}

interface Branch {
  id: string
  name: string
  city: string
  country: string
  isActive: boolean
}

interface FeePreview {
  systemCommission: number
  sarafCommission: number
  totalCommission: number
  customerPays: number
  creditsRequired: number
}

type CurrencyCode = 'USD' | 'EUR' | 'AFN' | 'PKR' | 'IRR' | 'GBP' | 'AED' | 'SAR'

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'AFN', 'PKR', 'IRR', 'GBP', 'AED', 'SAR']

const DEFAULT_FORM: ExchangeForm = {
  customerName: '',
  customerPhone: '+93',
  customerEmail: '',
  fromCurrency: 'USD',
  toCurrency: 'AFN',
  fromAmount: 0,
  rate: 70.5,
  notes: '',
  branchId: '',
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function getCurrencyName(code: CurrencyCode, language: Language) {
  const names: Record<CurrencyCode, [string, string, string]> = {
    USD: ['دالر امریکا', 'US Dollar', 'امريکايي ډالر'],
    EUR: ['یورو', 'Euro', 'یورو'],
    AFN: ['افغانی', 'Afghani', 'افغانۍ'],
    PKR: ['روپیه پاکستان', 'Pakistani Rupee', 'پاکستانۍ روپۍ'],
    IRR: ['ریال ایران', 'Iranian Rial', 'ايراني ريال'],
    GBP: ['پوند انگلیس', 'British Pound', 'برتانوي پونډ'],
    AED: ['درهم امارات', 'UAE Dirham', 'اماراتي درهم'],
    SAR: ['ریال سعودی', 'Saudi Riyal', 'سعودي ريال']
  }
  const [fa, en, ps] = names[code]
  return pick(language, fa, en, ps)
}

function formatMoney(value: number, language: Language) {
  return formatLocalizedNumber(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function NewExchangePage() {
  const router = useRouter()
  const { language, t: tr } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [fetchingFeePreview, setFetchingFeePreview] = useState(false)
  const [form, setForm] = useState<ExchangeForm>(DEFAULT_FORM)
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null)

  const t = {
    back: pick(language, 'بازگشت', 'Back', 'بېرته'),
    title: pick(language, 'تبادله ارز جدید', 'New Currency Exchange', 'نوې اسعارو تبادله'),
    subtitle: pick(language, 'ایجاد تراکنش تبادله ارز', 'Create a new currency exchange transaction', 'د نوې اسعارو تبادلې معامله جوړه کړئ'),
    customerInfo: pick(language, 'اطلاعات مشتری', 'Customer information', 'د پیرودونکي معلومات'),
    customerInfoDesc: pick(language, 'اطلاعات مشتری برای تبادله ارز', 'Customer details for currency exchange', 'د اسعارو تبادلې لپاره د پیرودونکي معلومات'),
    customerName: pick(language, 'نام مشتری', 'Customer name', 'د پیرودونکي نوم'),
    customerPhone: pick(language, 'شماره تلفن', 'Phone number', 'تليفون شمېره'),
    customerEmail: pick(language, 'ایمیل (اختیاری)', 'Email (optional)', 'ایمیل (اختیاري)'),
    branch: pick(language, 'شعبه', 'Branch', 'څانګه'),
    selectBranch: pick(language, 'انتخاب شعبه', 'Select branch', 'څانګه وټاکئ'),
    exchangeDetails: pick(language, 'جزئیات تبادله', 'Exchange details', 'د تبادلې جزييات'),
    exchangeDetailsDesc: pick(language, 'مبلغ، نرخ و محاسبات', 'Amount, rate, and calculations', 'اندازه، نرخ او محاسبې'),
    fromCurrency: pick(language, 'از ارز', 'From currency', 'له اسعارو'),
    toCurrency: pick(language, 'به ارز', 'To currency', 'اسعارو ته'),
    amount: pick(language, 'مبلغ', 'Amount', 'اندازه'),
    exchangeRate: pick(language, 'نرخ تبدیل', 'Exchange rate', 'د تبادلې نرخ'),
    convertedAmount: pick(language, 'مبلغ تبدیل شده', 'Converted amount', 'بدله شوې اندازه'),
    commission: pick(language, 'کمیسیون', 'Commission', 'کمیشن'),
    totalReceived: pick(language, 'مجموع دریافتی', 'Total received', 'ټوله ترلاسه شوې'),
    notes: pick(language, 'یادداشت', 'Notes', 'یادښت'),
    notesPlaceholder: pick(language, 'یادداشت اضافی...', 'Additional notes...', 'اضافي يادښت...'),
    cancel: pick(language, 'لغو', 'Cancel', 'لغوه'),
    creating: pick(language, 'در حال ایجاد...', 'Creating...', 'جوړېږي...'),
    createAction: pick(language, 'ایجاد تبادله', 'Create Exchange', 'تبادله جوړه کړئ'),
    loadingBranches: pick(language, 'در حال بارگذاری شعب...', 'Loading branches...', 'څانګې بارېږي...'),
    noBranches: pick(language, 'هیچ شعبه فعالی یافت نشد', 'No active branches found', 'هېڅ فعاله څانګه ونه موندل شوه'),
    successMessage: (code: string) => pick(language, `تبادله با موفقیت ثبت شد. کد: ${code}`, `Exchange created successfully. Code: ${code}`, `تبادله په برياليتوب جوړه شوه. کوډ: ${code}`),
    selectBranchError: pick(language, 'لطفاً شعبه را انتخاب کنید', 'Please select a branch', 'مهرباني وکړئ څانګه وټاکئ'),
    genericCreateError: pick(language, 'خطا در ایجاد تبادله', 'Failed to create exchange', 'د تبادلې په جوړولو کې ستونزه'),
  }

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/portal/branches')
        if (response.ok) {
          const data = await response.json()
          setBranches(data.branches || [])
        }
      } catch (err) {
        console.error('Failed to fetch branches:', err)
      } finally {
        setLoadingBranches(false)
      }
    }

    void fetchBranches()
  }, [])

  useEffect(() => {
    const fetchRate = async () => {
      if (!form.fromCurrency || !form.toCurrency || form.fromCurrency === form.toCurrency) return

      setFetchingRate(true)
      try {
        const response = await fetch(`/api/portal/rates?from=${form.fromCurrency}&to=${form.toCurrency}`)
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            const activeRate = data.find((r: any) => r.isActive)
            if (activeRate?.sellRate) updateForm('rate', activeRate.sellRate)
          }
        }
      } catch (err) {
        console.error('Failed to fetch rate:', err)
      } finally {
        setFetchingRate(false)
      }
    }

    void fetchRate()
  }, [form.fromCurrency, form.toCurrency])

  const calculateToAmount = () => form.fromAmount * form.rate

  useEffect(() => {
    const fetchFeePreview = async () => {
      if (!form.fromCurrency || !form.fromAmount || form.fromAmount <= 0) {
        setFeePreview(null)
        return
      }

      setFetchingFeePreview(true)
      try {
        const response = await fetch(
          `/api/portal/fees/preview?type=EXCHANGE&amount=${encodeURIComponent(
            String(form.fromAmount)
          )}&currency=${encodeURIComponent(form.fromCurrency)}&toCurrency=${encodeURIComponent(
            form.toCurrency
          )}&rate=${encodeURIComponent(String(form.rate || 0))}`,
          { cache: 'no-store' }
        )

        if (!response.ok) {
          throw new Error('Failed to fetch fee preview')
        }

        const data = await response.json()
        setFeePreview(data)
      } catch (error) {
        console.error('Failed to fetch exchange fee preview:', error)
        setFeePreview(null)
      } finally {
        setFetchingFeePreview(false)
      }
    }

    void fetchFeePreview()
  }, [form.fromAmount, form.fromCurrency, form.toCurrency, form.rate])

  const calculateCommission = () => feePreview?.totalCommission ?? 0
  const calculateTotal = () => feePreview?.customerPays ?? form.fromAmount

  const updateForm = (field: keyof ExchangeForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!form.branchId) {
      setError(t.selectBranchError)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/portal/exchange/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          isGuestTransaction: true
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        if (data?.details === 'EXCHANGE_NOT_INCLUDED_IN_TRIAL') {
          throw new Error(tr('exchange.notIncludedInFreeTrial'))
        }
        throw new Error(data.error || t.genericCreateError)
      }

      setSuccess(t.successMessage(data.transaction.referenceCode))
      toast.success(t.successMessage(data.transaction.referenceCode))
      setForm(DEFAULT_FORM)

      setTimeout(() => {
        router.push('/portal/exchange')
      }, 2000)
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : t.genericCreateError
      setError(errorMsg)
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const activeBranches = branches.filter((b) => b.isActive)

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/portal/exchange">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.back}
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
          <p className="text-purple-50 text-lg">{t.subtitle}</p>
        </div>

        <div className="space-y-6 px-2">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="glass-card hover-lift border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <ArrowRightLeft className="h-5 w-5 text-white" />
                  </div>
                  {t.customerInfo}
                </CardTitle>
                <CardDescription className="text-muted-foreground">{t.customerInfoDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerName" className="text-foreground">{t.customerName} *</Label>
                    <Input
                      id="customerName"
                      value={form.customerName}
                      onChange={(e) => updateForm('customerName', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerPhone" className="text-foreground">{t.customerPhone} *</Label>
                    <Input
                      id="customerPhone"
                      value={form.customerPhone}
                      onChange={(e) => updateForm('customerPhone', e.target.value)}
                      placeholder="+93700123456"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="customerEmail" className="text-foreground">{t.customerEmail}</Label>
                    <Input
                      id="customerEmail"
                      type="email"
                      value={form.customerEmail}
                      onChange={(e) => updateForm('customerEmail', e.target.value)}
                      placeholder="customer@example.com"
                    />
                  </div>

                  <div>
                    <Label htmlFor="branch" className="text-foreground">{t.branch} *</Label>
                    {loadingBranches ? (
                      <div className="text-sm text-muted-foreground">{t.loadingBranches}</div>
                    ) : activeBranches.length === 0 ? (
                      <Alert>
                        <AlertDescription>{t.noBranches}</AlertDescription>
                      </Alert>
                    ) : (
                      <Select value={form.branchId} onValueChange={(value) => updateForm('branchId', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder={t.selectBranch} />
                        </SelectTrigger>
                        <SelectContent>
                          {activeBranches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} - {branch.city}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  {t.exchangeDetails}
                </CardTitle>
                <CardDescription className="text-muted-foreground">{t.exchangeDetailsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fromCurrency" className="text-foreground">{t.fromCurrency}</Label>
                    <Select value={form.fromCurrency} onValueChange={(value) => updateForm('fromCurrency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency} - {getCurrencyName(currency, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="toCurrency" className="text-foreground">{t.toCurrency}</Label>
                    <Select value={form.toCurrency} onValueChange={(value) => updateForm('toCurrency', value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CURRENCIES.map((currency) => (
                          <SelectItem key={currency} value={currency}>
                            {currency} - {getCurrencyName(currency, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="fromAmount" className="text-foreground">{t.amount} *</Label>
                    <Input
                      id="fromAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.fromAmount}
                      onChange={(e) => updateForm('fromAmount', Number.parseFloat(e.target.value) || 0)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="rate" className="text-foreground">{t.exchangeRate} *</Label>
                  <div className="relative">
                    <Input
                      id="rate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.rate}
                      onChange={(e) => updateForm('rate', Number.parseFloat(e.target.value) || 0)}
                      required
                      disabled={fetchingRate}
                    />
                    {fetchingRate && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2">
                        <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <div className="flex justify-between text-foreground">
                    <span>{t.convertedAmount}:</span>
                    <span className="font-mono font-bold">
                      {formatMoney(calculateToAmount(), language)} {form.toCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>{t.commission}:</span>
                    <span className="font-mono">
                      {formatMoney(calculateCommission(), language)} {form.fromCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between font-bold text-lg text-green-600 dark:text-green-400">
                    <span>Customer pays:</span>
                    <span className="font-mono">
                      {formatMoney(calculateTotal(), language)} {form.fromCurrency}
                    </span>
                  </div>
                </div>

                {feePreview ? (
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-purple-200 dark:border-purple-800 bg-purple-50/70 dark:bg-purple-950/30 p-4 text-sm md:grid-cols-3">
                    <div>
                      <div className="text-muted-foreground">System</div>
                      <div className="font-bold text-foreground">
                        {formatMoney(feePreview.systemCommission, language)} {form.fromCurrency}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Saraf</div>
                      <div className="font-bold text-foreground">
                        {formatMoney(feePreview.sarafCommission, language)} {form.fromCurrency}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Credits</div>
                      <div className="font-bold text-foreground">
                        {formatMoney(feePreview.creditsRequired, language)}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="notes" className="text-foreground">{t.notes}</Label>
                  <Textarea
                    id="notes"
                    value={form.notes}
                    onChange={(e) => updateForm('notes', e.target.value)}
                    placeholder={t.notesPlaceholder}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Link href="/portal/exchange">
                <Button type="button" variant="outline">
                  {t.cancel}
                </Button>
              </Link>
              <Button
                type="submit"
                disabled={loading}
                size="lg"
                className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              >
                {loading ? (
                  t.creating
                ) : (
                  <>
                    <ArrowRightLeft className="mr-2 h-4 w-4" />
                    {t.createAction}
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </DashboardLayout>
  )
}
