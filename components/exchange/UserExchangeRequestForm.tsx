'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { AlertCircle, ArrowRight, ArrowRightLeft, Building2, CheckCircle, MapPin, Phone, Send } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/hooks/useLanguage'
import { toast } from 'sonner'

type Language = 'fa' | 'en' | 'ps'

interface BranchOption {
  id: string
  name: string
  address: string
  city: string
  country: string
  phone: string
}

interface SarafOption {
  id: string
  businessName: string
  businessPhone: string
  branches: BranchOption[]
}

interface SuccessState {
  referenceCode: string
  fromAmount: number
  toAmount: number
  fromCurrency: string
  toCurrency: string
  rate: number
  branchName: string
  branchCity: string
  sarafName: string
}

interface UserExchangeRequestFormProps {
  fixedSarafId?: string
  fixedSarafName?: string
  fixedSarafPhone?: string
  fixedSarafBranches?: BranchOption[]
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export function UserExchangeRequestForm({
  fixedSarafId,
  fixedSarafName,
  fixedSarafPhone,
  fixedSarafBranches = [],
}: UserExchangeRequestFormProps) {
  const { data: session } = useSession()
  const { language } = useLanguage()

  const [sarafs, setSarafs] = useState<SarafOption[]>([])
  const [loadingSarafs, setLoadingSarafs] = useState(!fixedSarafId)
  const [submitting, setSubmitting] = useState(false)
  const [successState, setSuccessState] = useState<SuccessState | null>(null)
  const [selectedSarafId, setSelectedSarafId] = useState(fixedSarafId || '')
  const [formData, setFormData] = useState({
    branchId: '',
    fromAmount: '',
    fromCurrency: 'AFN',
    toCurrency: 'USD',
    contactPhone: '',
    notes: '',
  })

  const t = {
    signInTitle: pick(language as Language, 'برای ثبت درخواست تبادله باید وارد شوید', 'Sign in to request an exchange', 'د تبادلې د غوښتنې لپاره ننوزئ'),
    signInDescription: pick(
      language as Language,
      'برای ثبت درخواست تبادله و پیگیری آن لطفاً ابتدا وارد حساب خود شوید.',
      'Please sign in first to create and track an exchange request.',
      'د تبادلې د غوښتنې د ثبت او تعقیب لپاره مهرباني وکړئ لومړی خپل حساب ته ننوځئ.'
    ),
    signIn: pick(language as Language, 'ورود', 'Sign in', 'ننوتل'),
    signUp: pick(language as Language, 'ثبت نام', 'Sign up', 'نوی حساب'),
    title: pick(language as Language, 'ثبت درخواست تبادله ارز', 'Request Currency Exchange', 'د اسعارو د تبادلې غوښتنه'),
    subtitle: pick(
      language as Language,
      'صراف و شعبه را انتخاب کنید تا درخواست شما در سیستم ثبت شود و صراف آن را نهایی کند.',
      'Choose a saraf and branch so your request is saved and completed by the saraf.',
      'صراف او څانګه وټاکئ څو ستاسو غوښتنه په سیسټم کې ثبت او د صراف لخوا بشپړه شي.'
    ),
    note: pick(
      language as Language,
      'این درخواست ابتدا به صورت انتظار ثبت می‌شود. صراف پس از مراجعه شما و نهایی‌شدن معامله، آن را در سیستم تکمیل می‌کند.',
      'This request is first saved as pending. The saraf completes it after your in-person visit and final confirmation.',
      'دا غوښتنه لومړی د انتظار په حالت کې ثبتېږي. صراف یې ستاسو د حضوري مراجعې او وروستي تایید وروسته بشپړوي.'
    ),
    saraf: pick(language as Language, 'صراف', 'Saraf', 'صراف'),
    branch: pick(language as Language, 'شعبه', 'Branch', 'څانګه'),
    amount: pick(language as Language, 'مبلغ', 'Amount', 'اندازه'),
    fromCurrency: pick(language as Language, 'ارز مبدا', 'From currency', 'د پیل اسعار'),
    toCurrency: pick(language as Language, 'ارز مقصد', 'To currency', 'د مقصد اسعار'),
    contactPhone: pick(language as Language, 'شماره تماس', 'Contact phone', 'د اړیکې شمېره'),
    notes: pick(language as Language, 'یادداشت', 'Notes', 'یادښت'),
    chooseSaraf: pick(language as Language, 'انتخاب صراف', 'Choose a saraf', 'صراف وټاکئ'),
    chooseBranch: pick(language as Language, 'انتخاب شعبه', 'Choose a branch', 'څانګه وټاکئ'),
    noBranches: pick(language as Language, 'این صراف فعلاً شعبه فعال ندارد.', 'This saraf has no active branches right now.', 'دغه صراف اوس فعاله څانګه نه لري.'),
    latestRate: pick(
      language as Language,
      'نرخ نهایی از آخرین نرخ فعال همین صراف در زمان ثبت درخواست محاسبه می‌شود.',
      'The final quote is calculated from this saraf’s latest active rate at request time.',
      'وروستی نرخ د غوښتنې د ثبت پر وخت د همدې صراف له وروستي فعال نرخ څخه محاسبه کېږي.'
    ),
    submit: pick(language as Language, 'ثبت درخواست تبادله', 'Submit exchange request', 'د تبادلې غوښتنه ثبت کړئ'),
    submitting: pick(language as Language, 'در حال ثبت...', 'Submitting...', 'ثبتېږي...'),
    requestCreated: pick(language as Language, 'درخواست تبادله ثبت شد', 'Exchange request created', 'د تبادلې غوښتنه ثبت شوه'),
    nextStepsTitle: pick(language as Language, 'مراحل بعدی', 'Next steps', 'راتلونکې مرحلې'),
    nextSteps: [
      pick(language as Language, 'به شعبه انتخابی مراجعه کنید.', 'Visit the selected branch.', 'ټاکل شوې څانګې ته مراجعه وکړئ.'),
      pick(language as Language, 'کد پیگیری را به صراف نشان دهید.', 'Show the tracking code to the saraf.', 'د تعقیب کوډ صراف ته وښایئ.'),
      pick(language as Language, 'پس از نهایی‌شدن معامله، صراف آن را در سیستم تکمیل می‌کند.', 'After the deal is finalized, the saraf completes it in the system.', 'له وروستي کېدو وروسته صراف یې په سیسټم کې بشپړوي.'),
    ],
    createAnother: pick(language as Language, 'درخواست جدید', 'Create another request', 'بله غوښتنه'),
    track: pick(language as Language, 'مشاهده تراکنش‌ها', 'View transactions', 'معاملې وګورئ'),
    copy: pick(language as Language, 'کپی کد', 'Copy code', 'کوډ کاپي کړئ'),
    selectedSaraf: pick(language as Language, 'صراف انتخاب‌شده', 'Selected saraf', 'ټاکل شوی صراف'),
    selectedBranch: pick(language as Language, 'شعبه انتخاب‌شده', 'Selected branch', 'ټاکل شوې څانګه'),
  }

  const currencies = [
    { code: 'AFN', label: 'AFN' },
    { code: 'USD', label: 'USD' },
    { code: 'EUR', label: 'EUR' },
    { code: 'GBP', label: 'GBP' },
    { code: 'PKR', label: 'PKR' },
    { code: 'IRR', label: 'IRR' },
  ]

  useEffect(() => {
    if (fixedSarafId) {
      setLoadingSarafs(false)
      return
    }

    let cancelled = false
    const fetchSarafs = async () => {
      setLoadingSarafs(true)
      try {
        const response = await fetch('/api/public/sarafs', { cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok || !payload?.success) {
          throw new Error(payload?.error || 'Failed to load sarafs')
        }

        const mapped: SarafOption[] = (payload.data?.sarafs || []).map((saraf: any) => ({
          id: saraf.id,
          businessName: saraf.businessName,
          businessPhone: saraf.businessPhone,
          branches: Array.isArray(saraf.branches) ? saraf.branches : [],
        }))

        if (!cancelled) {
          setSarafs(mapped)
          if (!selectedSarafId && mapped.length > 0) {
            setSelectedSarafId(mapped[0].id)
          }
        }
      } catch (error) {
        console.error('Failed to fetch sarafs for exchange request:', error)
        if (!cancelled) {
          toast.error(pick(language as Language, 'دریافت صراف‌ها با خطا مواجه شد', 'Failed to load sarafs', 'د صرافانو په رااخیستلو کې ستونزه رامنځته شوه'))
        }
      } finally {
        if (!cancelled) {
          setLoadingSarafs(false)
        }
      }
    }

    fetchSarafs()
    return () => {
      cancelled = true
    }
  }, [fixedSarafId, language])

  const selectedSaraf = useMemo<SarafOption | null>(() => {
    if (fixedSarafId) {
      return {
        id: fixedSarafId,
        businessName: fixedSarafName || '',
        businessPhone: fixedSarafPhone || '',
        branches: fixedSarafBranches,
      }
    }

    return sarafs.find((saraf) => saraf.id === selectedSarafId) || null
  }, [fixedSarafBranches, fixedSarafId, fixedSarafName, fixedSarafPhone, sarafs, selectedSarafId])

  const selectedBranch = useMemo(
    () => selectedSaraf?.branches.find((branch) => branch.id === formData.branchId) || null,
    [formData.branchId, selectedSaraf]
  )

  useEffect(() => {
    if (!selectedSaraf) return

    const hasSelectedBranch = selectedSaraf.branches.some((branch) => branch.id === formData.branchId)
    if (!hasSelectedBranch) {
      setFormData((prev) => ({
        ...prev,
        branchId: selectedSaraf.branches[0]?.id || '',
      }))
    }
  }, [formData.branchId, selectedSaraf])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!selectedSaraf) {
      toast.error(pick(language as Language, 'لطفاً یک صراف انتخاب کنید', 'Please choose a saraf', 'مهرباني وکړئ یو صراف وټاکئ'))
      return
    }

    if (!formData.branchId || !formData.fromAmount || !formData.contactPhone) {
      toast.error(pick(language as Language, 'لطفاً تمام فیلدهای ضروری را تکمیل کنید', 'Please fill all required fields', 'مهرباني وکړئ ټول ضروري فیلډونه ډک کړئ'))
      return
    }

    if (Number.parseFloat(formData.fromAmount) <= 0) {
      toast.error(pick(language as Language, 'مبلغ باید بیشتر از صفر باشد', 'Amount must be greater than zero', 'اندازه باید له صفره زیاته وي'))
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch('/api/exchange/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sarafId: selectedSaraf.id,
          branchId: formData.branchId,
          fromAmount: Number.parseFloat(formData.fromAmount),
          fromCurrency: formData.fromCurrency,
          toCurrency: formData.toCurrency,
          contactPhone: formData.contactPhone,
          notes: formData.notes,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to create exchange request')
      }

      const transaction = payload.transaction
      setSuccessState({
        referenceCode: transaction.referenceCode,
        fromAmount: transaction.fromAmount,
        toAmount: transaction.toAmount,
        fromCurrency: transaction.fromCurrency,
        toCurrency: transaction.toCurrency,
        rate: transaction.rate,
        branchName: payload.branch?.name || selectedBranch?.name || '',
        branchCity: payload.branch?.city || selectedBranch?.city || '',
        sarafName: payload.saraf?.businessName || selectedSaraf.businessName,
      })
      setFormData((prev) => ({
        ...prev,
        fromAmount: '',
        notes: '',
      }))
      toast.success(t.requestCreated)
    } catch (error) {
      console.error('Exchange request creation failed:', error)
      toast.error(error instanceof Error ? error.message : pick(language as Language, 'خطا در ثبت درخواست تبادله', 'Failed to create exchange request', 'د تبادلې د غوښتنې په ثبت کې ستونزه'))
    } finally {
      setSubmitting(false)
    }
  }

  if (!session?.user) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-900/40 dark:bg-blue-950/20">
        <CardContent className="pt-6">
          <div className="space-y-4 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-blue-600" />
            <div>
              <h3 className="text-xl font-bold">{t.signInTitle}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{t.signInDescription}</p>
            </div>
            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild>
                <Link href="/auth/signin">
                  {t.signIn}
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/auth/signup">{t.signUp}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (successState) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900/40 dark:bg-green-950/20">
        <CardContent className="pt-6">
          <div className="space-y-5 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/50">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>

            <div>
              <h3 className="text-2xl font-bold">{t.requestCreated}</h3>
              <p className="mt-2 text-muted-foreground">{successState.sarafName}</p>
            </div>

            <div className="rounded-xl border-2 border-green-300 bg-white p-4 dark:border-green-800 dark:bg-gray-900">
              <div className="text-sm text-muted-foreground">{pick(language as Language, 'کد پیگیری', 'Tracking code', 'د تعقیب کوډ')}</div>
              <div className="mt-1 text-3xl font-bold tracking-wide text-green-600">{successState.referenceCode}</div>
            </div>

            <Alert>
              <AlertDescription className="space-y-2 text-left">
                <div>
                  <strong>{t.selectedBranch}:</strong> {successState.branchName} {successState.branchCity ? `- ${successState.branchCity}` : ''}
                </div>
                <div>
                  <strong>{pick(language as Language, 'ثبت‌شده با نرخ', 'Saved with rate', 'په دې نرخ ثبت شو')}:</strong>{' '}
                  {successState.rate.toLocaleString()} ({successState.fromAmount.toLocaleString()} {successState.fromCurrency} →{' '}
                  {successState.toAmount.toLocaleString()} {successState.toCurrency})
                </div>
              </AlertDescription>
            </Alert>

            <Alert>
              <AlertDescription className="text-left">
                <strong>{t.nextStepsTitle}:</strong>
                <ol className="mt-2 list-inside list-decimal space-y-1">
                  {t.nextSteps.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ol>
              </AlertDescription>
            </Alert>

            <div className="flex flex-col justify-center gap-3 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard.writeText(successState.referenceCode)
                  toast.success(pick(language as Language, 'کد کپی شد', 'Code copied', 'کوډ کاپي شو'))
                }}
              >
                {t.copy}
              </Button>
              <Button onClick={() => setSuccessState(null)}>{t.createAnother}</Button>
              <Button asChild variant="outline">
                <Link href="/user/transactions">{t.track}</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowRightLeft className="h-5 w-5" />
          {t.title}
        </CardTitle>
        <CardDescription>{t.subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <AlertDescription>{t.note}</AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!fixedSarafId ? (
            <div className="space-y-2">
              <Label htmlFor="saraf">{t.saraf}</Label>
              <Select value={selectedSarafId} onValueChange={setSelectedSarafId} disabled={loadingSarafs}>
                <SelectTrigger id="saraf">
                  <SelectValue placeholder={loadingSarafs ? pick(language as Language, 'در حال بارگذاری...', 'Loading...', 'بارېږي...') : t.chooseSaraf} />
                </SelectTrigger>
                <SelectContent>
                  {sarafs.map((saraf) => (
                    <SelectItem key={saraf.id} value={saraf.id}>
                      {saraf.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="rounded-xl border bg-muted/30 p-4">
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Building2 className="h-4 w-4" />
                {t.selectedSaraf}
              </div>
              <div className="font-medium">{fixedSarafName}</div>
              {fixedSarafPhone ? (
                <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  {fixedSarafPhone}
                </div>
              ) : null}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="branch">{t.branch}</Label>
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, branchId: value }))}
                disabled={!selectedSaraf || selectedSaraf.branches.length === 0}
              >
                <SelectTrigger id="branch">
                  <SelectValue placeholder={t.chooseBranch} />
                </SelectTrigger>
                <SelectContent>
                  {(selectedSaraf?.branches || []).map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name} - {branch.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedSaraf && selectedSaraf.branches.length === 0 ? (
                <p className="text-sm text-red-600">{t.noBranches}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone">{t.contactPhone}</Label>
              <Input
                id="contactPhone"
                value={formData.contactPhone}
                onChange={(event) => setFormData((prev) => ({ ...prev, contactPhone: event.target.value }))}
                placeholder="+93 700 000 000"
                required
              />
            </div>
          </div>

          {selectedBranch ? (
            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <MapPin className="h-4 w-4" />
                {t.selectedBranch}
              </div>
              <div>{selectedBranch.name}</div>
              <div className="text-muted-foreground">
                {selectedBranch.city}, {selectedBranch.country}
              </div>
              <div className="mt-1 text-muted-foreground">{selectedBranch.address}</div>
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amount">{t.amount}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.fromAmount}
                onChange={(event) => setFormData((prev) => ({ ...prev, fromAmount: event.target.value }))}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromCurrency">{t.fromCurrency}</Label>
              <Select
                value={formData.fromCurrency}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, fromCurrency: value }))}
              >
                <SelectTrigger id="fromCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toCurrency">{t.toCurrency}</Label>
              <Select
                value={formData.toCurrency}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, toCurrency: value }))}
              >
                <SelectTrigger id="toCurrency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {currencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t.notes}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(event) => setFormData((prev) => ({ ...prev, notes: event.target.value }))}
              placeholder={pick(language as Language, 'توضیحات اضافی...', 'Additional notes...', 'اضافي یادښتونه...')}
              rows={3}
            />
          </div>

          <Alert>
            <AlertDescription>{t.latestRate}</AlertDescription>
          </Alert>

          <Button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            disabled={submitting || !selectedSaraf || selectedSaraf.branches.length === 0}
          >
            {submitting ? (
              <>
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-b-transparent" />
                {t.submitting}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                {t.submit}
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
