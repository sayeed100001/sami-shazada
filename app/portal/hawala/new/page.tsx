'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Building2, Calculator, Send } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { CitySearchFixed as CitySearch } from '@/components/ui/city-search-fixed'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedNumber } from '@/lib/locale'

interface HawalaForm {
  senderName: string
  senderPhone: string
  senderTazkiraNumber: string
  senderCity: string
  senderCountry: string
  receiverName: string
  receiverPhone: string
  receiverTazkiraNumber: string
  receiverCity: string
  receiverCountry: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  rate: number
  fee: number
  notes: string
  originBranchId: string
  destinationBranchId: string
}

interface Branch {
  id: string
  name: string
  city: string
  country: string
  address: string
  isActive: boolean
}

interface BranchListResponse {
  branches?: Branch[]
  originBranches?: Branch[]
  destinationBranches?: Branch[]
}

interface DestinationSarafSummary {
  id: string
  businessName: string
  businessPhone: string
  primaryCity: string
  primaryCountry: string
}

interface FeePreview {
  systemCommission: number
  sarafCommission: number
  totalCommission: number
  customerPays: number
  creditsRequired: number
}

type CurrencyCode = 'USD' | 'EUR' | 'AFN' | 'PKR' | 'IRR'

interface Country {
  code: string
  name: string
  nameFa: string
  namePs: string
  phoneCode: string
  flag: string
}

const COUNTRIES: Country[] = [
  { code: 'AF', name: 'Afghanistan', nameFa: 'افغانستان', namePs: 'افغانستان', phoneCode: '+93', flag: '🇦🇫' },
  { code: 'PK', name: 'Pakistan', nameFa: 'پاکستان', namePs: 'پاکستان', phoneCode: '+92', flag: '🇵🇰' },
  { code: 'IR', name: 'Iran', nameFa: 'ایران', namePs: 'ایران', phoneCode: '+98', flag: '🇮🇷' },
  { code: 'IN', name: 'India', nameFa: 'هند', namePs: 'هند', phoneCode: '+91', flag: '🇮🇳' },
  { code: 'TR', name: 'Turkey', nameFa: 'ترکیه', namePs: 'ترکیه', phoneCode: '+90', flag: '🇹🇷' },
  { code: 'AE', name: 'UAE', nameFa: 'امارات', namePs: 'امارات', phoneCode: '+971', flag: '🇦🇪' },
  { code: 'SA', name: 'Saudi Arabia', nameFa: 'عربستان', namePs: 'سعودي عربستان', phoneCode: '+966', flag: '🇸🇦' },
  { code: 'US', name: 'United States', nameFa: 'امریکا', namePs: 'امریکا', phoneCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', nameFa: 'انگلستان', namePs: 'انګلستان', phoneCode: '+44', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', nameFa: 'آلمان', namePs: 'المان', phoneCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', nameFa: 'فرانسه', namePs: 'فرانسه', phoneCode: '+33', flag: '🇫🇷' },
  { code: 'CA', name: 'Canada', nameFa: 'کانادا', namePs: 'کاناډا', phoneCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', nameFa: 'استرالیا', namePs: 'استرالیا', phoneCode: '+61', flag: '🇦🇺' },
  { code: 'CN', name: 'China', nameFa: 'چین', namePs: 'چین', phoneCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', nameFa: 'ژاپن', namePs: 'جاپان', phoneCode: '+81', flag: '🇯🇵' },
  { code: 'RU', name: 'Russia', nameFa: 'روسیه', namePs: 'روسیه', phoneCode: '+7', flag: '🇷🇺' },
]

const DEFAULT_FORM: HawalaForm = {
  senderName: '',
  senderPhone: '+93',
  senderTazkiraNumber: '',
  senderCity: 'Kabul',
  senderCountry: 'Afghanistan',
  receiverName: '',
  receiverPhone: '+93',
  receiverTazkiraNumber: '',
  receiverCity: '',
  receiverCountry: 'Afghanistan',
  fromCurrency: 'USD',
  toCurrency: 'AFN',
  fromAmount: 0,
  rate: 70.5,
  fee: 0,
  notes: '',
  originBranchId: '',
  destinationBranchId: '',
}

const CURRENCIES: CurrencyCode[] = ['USD', 'EUR', 'AFN', 'PKR', 'IRR']

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function getCurrencyName(code: CurrencyCode, language: Language) {
  switch (code) {
    case 'USD':
      return pick(language, 'دالر امریکا', 'US Dollar', 'امريکايي ډالر')
    case 'EUR':
      return pick(language, 'یورو', 'Euro', 'یورو')
    case 'AFN':
      return pick(language, 'افغانی', 'Afghani', 'افغانۍ')
    case 'PKR':
      return pick(language, 'روپیه پاکستان', 'Pakistani Rupee', 'پاکستانۍ روپۍ')
    case 'IRR':
      return pick(language, 'ریال ایران', 'Iranian Rial', 'ايراني ريال')
    default:
      return code
  }
}

function formatMoney(value: number, language: Language) {
  return formatLocalizedNumber(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

function getCountryName(country: Country, language: Language) {
  return language === 'en' ? country.name : language === 'ps' ? country.namePs : country.nameFa
}

export default function NewHawalaPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [branches, setBranches] = useState<Branch[]>([])
  const [originBranches, setOriginBranches] = useState<Branch[]>([])
  const [destinationBranches, setDestinationBranches] = useState<Branch[]>([])
  const [loadingBranches, setLoadingBranches] = useState(true)
  const [fetchingRate, setFetchingRate] = useState(false)
  const [fetchingFeePreview, setFetchingFeePreview] = useState(false)
  const [form, setForm] = useState<HawalaForm>(DEFAULT_FORM)
  const [feePreview, setFeePreview] = useState<FeePreview | null>(null)

  const [destinationMode, setDestinationMode] = useState<'BRANCH' | 'PARTNER_SARAF'>('BRANCH')
  const [destinationSarafQuery, setDestinationSarafQuery] = useState('')
  const [destinationSarafResults, setDestinationSarafResults] = useState<DestinationSarafSummary[]>([])
  const [selectedDestinationSaraf, setSelectedDestinationSaraf] = useState<DestinationSarafSummary | null>(null)
  const [destinationSarafBranches, setDestinationSarafBranches] = useState<Branch[]>([])
  const [searchingDestinationSarafs, setSearchingDestinationSarafs] = useState(false)

  const t = {
    back: pick(language, 'بازگشت', 'Back', 'بېرته'),
    title: pick(language, 'حواله جدید', 'New hawala', 'نوې حواله'),
    subtitle: pick(language, 'ایجاد تراکنش حواله جدید', 'Create a new hawala transaction', 'د نوې حوالې معامله جوړه کړئ'),
    senderInfo: pick(language, 'اطلاعات فرستنده', 'Sender information', 'د لېږونکي معلومات'),
    senderInfoDesc: pick(language, 'اطلاعات شخص ارسال کننده حواله', 'Details of the person sending the hawala', 'د حوالې د لېږونکي شخص معلومات'),
    receiverInfo: pick(language, 'اطلاعات گیرنده', 'Receiver information', 'د ترلاسه کوونکي معلومات'),
    receiverInfoDesc: pick(language, 'اطلاعات شخص دریافت کننده حواله', 'Details of the person receiving the hawala', 'د حوالې د ترلاسه کوونکي شخص معلومات'),
    senderName: pick(language, 'نام فرستنده', 'Sender name', 'د لېږونکي نوم'),
    senderPhone: pick(language, 'شماره تلفن فرستنده', 'Sender phone', 'د لېږونکي تليفون'),
    senderTazkira: pick(language, 'شماره تذکره فرستنده', 'Sender Tazkira number', 'د لېږونکي د تذکرې شمېره'),
    senderCity: pick(language, 'شهر فرستنده', 'Sender city', 'د لېږونکي ښار'),
    senderCityPlaceholder: pick(language, 'انتخاب شهر فرستنده', 'Select sender city', 'د لېږونکي ښار وټاکئ'),
    senderCountry: pick(language, 'کشور فرستنده', 'Sender country', 'د لېږونکي هېواد'),
    receiverName: pick(language, 'نام گیرنده', 'Receiver name', 'د ترلاسه کوونکي نوم'),
    receiverCountry: pick(language, 'کشور گیرنده', 'Receiver country', 'د ترلاسه کوونکي هېواد'),
    receiverPhone: pick(language, 'شماره تلفن گیرنده', 'Receiver phone', 'د ترلاسه کوونکي تليفون'),
    receiverTazkira: pick(language, 'شماره تذکره گیرنده', 'Receiver Tazkira number', 'د ترلاسه کوونکي د تذکرې شمېره'),
    receiverCity: pick(language, 'شهر گیرنده', 'Receiver city', 'د ترلاسه کوونکي ښار'),
    receiverCityPlaceholder: pick(language, 'انتخاب شهر گیرنده', 'Select receiver city', 'د ترلاسه کوونکي ښار وټاکئ'),
    branchesTitle: pick(language, 'انتخاب شعبه', 'Branch selection', 'د څانګې ټاکنه'),
    branchesDesc: pick(language, 'شعبه مبدا و مقصد حواله', 'Choose the origin and destination branches', 'د حوالې د مبداء او مقصد څانګې وټاکئ'),
    loadingBranches: pick(language, 'در حال بارگذاری شعب...', 'Loading branches...', 'څانګې بارېږي...'),
    noBranches: pick(language, 'هیچ شعبه فعالی یافت نشد. لطفاً ابتدا شعبه ایجاد کنید.', 'No active branches were found. Create a branch first.', 'هېڅ فعاله څانګه ونه موندل شوه. لومړی یوه څانګه جوړه کړئ.'),
    originBranch: pick(language, 'شعبه مبدا', 'Origin branch', 'د مبداء څانګه'),
    destinationBranch: pick(language, 'شعبه مقصد', 'Destination branch', 'د مقصد څانګه'),
    selectOriginBranch: pick(language, 'انتخاب شعبه مبدا', 'Select origin branch', 'د مبداء څانګه وټاکئ'),
    selectDestinationBranch: pick(language, 'انتخاب شعبه مقصد', 'Select destination branch', 'د مقصد څانګه وټاکئ'),
    destinationModeTitle: pick(language, 'مقصد حواله', 'Hawala destination', 'د حوالې مقصد'),
    destinationModeBranch: pick(language, 'شعب داخلی', 'Internal branches', 'داخلي څانګې'),
    destinationModePartner: pick(language, 'صراف شریک', 'Partner saraf', 'شریک صراف'),
    destinationSarafSearch: pick(language, 'جستجوی صراف مقصد (نام یا شماره)', 'Search destination saraf (name or phone)', 'د مقصد صراف لټون (نوم یا نمبر)'),
    destinationSarafSearchHint: pick(language, 'برای شراکت‌ها صراف مقصد را جستجو کنید', 'Search for a partner saraf for payouts', 'د شراکت لپاره مقصد صراف وپلټئ'),
    chooseDestinationSaraf: pick(language, 'لطفاً صراف مقصد را انتخاب کنید', 'Please select a destination saraf', 'مهرباني وکړئ مقصد صراف وټاکئ'),
    destinationSaraf: pick(language, 'صراف مقصد', 'Destination saraf', 'مقصد صراف'),
    destinationSarafPhone: pick(language, 'شماره صراف', 'Saraf phone', 'د صراف نمبر'),
    searching: pick(language, 'در حال جستجو...', 'Searching...', 'لټون کېږي...'),
    transactionDetails: pick(language, 'جزئیات تراکنش', 'Transaction details', 'د معاملې جزييات'),
    transactionDetailsDesc: pick(language, 'مبلغ، نرخ و محاسبات مالی', 'Amount, rate, and financial calculations', 'اندازه، نرخ او مالي محاسبې'),
    fromCurrency: pick(language, 'ارز مبدا', 'Source currency', 'د مبداء اسعار'),
    toCurrency: pick(language, 'ارز مقصد', 'Destination currency', 'د مقصد اسعار'),
    amount: pick(language, 'مبلغ', 'Amount', 'اندازه'),
    exchangeRate: pick(language, 'نرخ تبدیل', 'Exchange rate', 'د تبادلې نرخ'),
    rateHint: pick(language, 'نرخ به صورت خودکار از سیستم دریافت می‌شود', 'The rate is fetched automatically from the system', 'نرخ په اتومات ډول له سيستم څخه اخيستل کېږي'),
    fee: pick(language, 'کارمزد', 'Fee', 'فیس'),
    convertedAmount: pick(language, 'مبلغ تبدیل شده', 'Converted amount', 'بدله شوې اندازه'),
    finalAmount: pick(language, 'مبلغ نهایی (پس از کسر کارمزد)', 'Final amount (after fee deduction)', 'وروستۍ اندازه (له فیس وروسته)'),
    notes: pick(language, 'یادداشت', 'Notes', 'یادښت'),
    notesPlaceholder: pick(language, 'یادداشت اضافی در مورد این تراکنش...', 'Additional notes about this transaction...', 'د دې معاملې په اړه اضافي يادښت...'),
    cancel: pick(language, 'لغو', 'Cancel', 'لغوه'),
    creating: pick(language, 'در حال ایجاد...', 'Creating...', 'جوړېږي...'),
    createAction: pick(language, 'ایجاد حواله', 'Create hawala', 'حواله جوړه کړئ'),
    chooseOriginError: pick(language, 'لطفاً شعبه مبدا را انتخاب کنید', 'Please select the origin branch', 'مهرباني وکړئ د مبداء څانګه وټاکئ'),
    chooseDestinationError: pick(language, 'لطفاً شعبه مقصد را انتخاب کنید', 'Please select the destination branch', 'مهرباني وکړئ د مقصد څانګه وټاکئ'),
    senderPhoneError: pick(language, 'شماره تلفن فرستنده نامعتبر است', 'Invalid sender phone number', 'د لېږونکي تليفون نامعتبر دی'),
    receiverPhoneError: pick(language, 'شماره تلفن گیرنده نامعتبر است', 'Invalid receiver phone number', 'د ترلاسه کوونکي تليفون نامعتبر دی'),
    defaultCreateError: pick(language, 'خطا در ایجاد حواله', 'Failed to create hawala', 'د حوالې په جوړولو کې ستونزه رامنځته شوه'),
    successWithCode: (code: string) =>
      pick(
        language,
        `حواله با موفقیت ایجاد شد. کد پیگیری: ${code}`,
        `Hawala created successfully. Tracking code: ${code}`,
        `حواله په برياليتوب جوړه شوه. د تعقيب کوډ: ${code}`
      ),
  }

  useEffect(() => {
    const fetchBranches = async () => {
      try {
        const response = await fetch('/api/portal/branches?scope=hawala')
        if (response.ok) {
          const data = (await response.json()) as BranchListResponse
          setBranches(data.branches || [])
          setOriginBranches(data.originBranches || data.branches || [])
          setDestinationBranches(data.destinationBranches || data.branches || [])
        }
      } catch (branchError) {
        console.error('Failed to fetch branches:', branchError)
      } finally {
        setLoadingBranches(false)
      }
    }

    void fetchBranches()
  }, [])

  useEffect(() => {
    if (destinationMode !== 'PARTNER_SARAF') return
    const q = destinationSarafQuery.trim()
    if (q.length < 2) {
      setDestinationSarafResults([])
      return
    }

    const controller = new AbortController()
    setSearchingDestinationSarafs(true)
    fetch(`/api/portal/hawala/destination-sarafs/search?query=${encodeURIComponent(q)}&limit=10`, {
      signal: controller.signal,
      cache: 'no-store',
    })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ sarafs: [] })))
      .then((data) => {
        setDestinationSarafResults(Array.isArray(data?.sarafs) ? data.sarafs : [])
      })
      .catch((err) => {
        if ((err as any)?.name === 'AbortError') return
        console.error('Destination saraf search failed:', err)
      })
      .finally(() => setSearchingDestinationSarafs(false))

    return () => controller.abort()
  }, [destinationSarafQuery, destinationMode])

  useEffect(() => {
    if (destinationMode !== 'PARTNER_SARAF') return
    if (!selectedDestinationSaraf?.id) {
      setDestinationSarafBranches([])
      return
    }

    fetch(`/api/portal/hawala/destination-sarafs/${selectedDestinationSaraf.id}/branches`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : Promise.resolve({ branches: [] })))
      .then((data) => {
        setDestinationSarafBranches(Array.isArray(data?.branches) ? data.branches : [])
      })
      .catch((err) => console.error('Destination saraf branches fetch failed:', err))
  }, [selectedDestinationSaraf, destinationMode])

  useEffect(() => {
    const fetchRate = async () => {
      if (!form.fromCurrency || !form.toCurrency || form.fromCurrency === form.toCurrency) return

      setFetchingRate(true)
      try {
        const response = await fetch(`/api/portal/rates?from=${form.fromCurrency}&to=${form.toCurrency}`)
        if (response.ok) {
          const data = await response.json()
          if (Array.isArray(data) && data.length > 0) {
            const activeRate = data.find((rateItem: { isActive?: boolean; sellRate?: number }) => rateItem.isActive)
            if (activeRate?.sellRate) updateForm('rate', activeRate.sellRate)
          }
        }
      } catch (rateError) {
        console.error('Failed to fetch rate:', rateError)
      } finally {
        setFetchingRate(false)
      }
    }

    void fetchRate()
  }, [form.fromCurrency, form.toCurrency])

  useEffect(() => {
    const fetchFeePreview = async () => {
      if (!form.fromCurrency || !form.fromAmount || form.fromAmount <= 0) {
        setFeePreview(null)
        if (form.fee !== 0) {
          updateForm('fee', 0)
        }
        return
      }

      setFetchingFeePreview(true)
      try {
        const response = await fetch(
          `/api/portal/fees/preview?type=HAWALA&amount=${encodeURIComponent(
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
        updateForm('fee', typeof data?.totalCommission === 'number' ? data.totalCommission : 0)
      } catch (error) {
        console.error('Failed to fetch hawala fee preview:', error)
        setFeePreview(null)
      } finally {
        setFetchingFeePreview(false)
      }
    }

    void fetchFeePreview()
  }, [form.fromAmount, form.fromCurrency, form.toCurrency, form.rate])

  const calculateToAmount = () => form.fromAmount * form.rate
  const calculateTotal = () =>
    feePreview?.customerPays ?? Number((form.fromAmount + form.fee).toFixed(2))

  const updateForm = (field: keyof HawalaForm, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    if (!form.originBranchId) {
      setError(t.chooseOriginError)
      setLoading(false)
      return
    }

    if (!form.destinationBranchId) {
      setError(t.chooseDestinationError)
      setLoading(false)
      return
    }

    if (destinationMode === 'PARTNER_SARAF' && !selectedDestinationSaraf) {
      setError(t.chooseDestinationSaraf)
      setLoading(false)
      return
    }

    // Validate phone numbers (must start with + and have at least 10 digits)
    const phoneRegex = /^\+[0-9]{1,4}[0-9]{7,15}$/
    if (!phoneRegex.test(form.senderPhone)) {
      setError(t.senderPhoneError)
      setLoading(false)
      return
    }

    if (!phoneRegex.test(form.receiverPhone)) {
      setError(t.receiverPhoneError)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/portal/hawala/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || t.defaultCreateError)
      }

      setSuccess(t.successWithCode(data.transaction.referenceCode))
      setForm(DEFAULT_FORM)

      setTimeout(() => {
        router.push('/portal/hawala')
      }, 3000)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t.defaultCreateError)
    } finally {
      setLoading(false)
    }
  }

  const activeBranches = branches.filter((branch) => branch.isActive)
  const activeOriginBranches = (originBranches.length ? originBranches : branches).filter((branch) => branch.isActive)
  const activeDestinationBranches = (destinationBranches.length ? destinationBranches : branches).filter((branch) => branch.isActive)
  const activePartnerDestinationBranches = destinationSarafBranches.filter((branch) => branch.isActive)

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/portal/hawala">
              <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t.back}
              </Button>
            </Link>
          </div>
          <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
          <p className="text-emerald-50 text-lg">{t.subtitle}</p>
        </div>

        <div className="space-y-6 px-2">
          {error ? (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          {success ? (
            <Alert>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="glass-card hover-lift border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                      <Send className="h-5 w-5 text-white" />
                    </div>
                    {t.senderInfo}
                  </CardTitle>
                  <CardDescription>{t.senderInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="senderName">{t.senderName} *</Label>
                    <Input id="senderName" value={form.senderName} onChange={(event) => updateForm('senderName', event.target.value)} required />
                  </div>

                  <div>
                    <Label htmlFor="senderCountry">{t.senderCountry} *</Label>
                    <Select value={form.senderCountry} onValueChange={(value) => {
                      updateForm('senderCountry', value)
                      const country = COUNTRIES.find(c => c.name === value)
                      if (country) {
                        // Always update phone code when country changes
                        updateForm('senderPhone', country.phoneCode)
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.flag} {getCountryName(country, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="senderPhone">{t.senderPhone} *</Label>
                    <Input 
                      id="senderPhone" 
                      value={form.senderPhone} 
                      onChange={(event) => updateForm('senderPhone', event.target.value)} 
                      placeholder="+93700123456" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {COUNTRIES.find(c => c.name === form.senderCountry)?.phoneCode || '+93'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="senderTazkiraNumber">{t.senderTazkira}</Label>
                    <Input
                      id="senderTazkiraNumber"
                      value={form.senderTazkiraNumber}
                      onChange={(event) => updateForm('senderTazkiraNumber', event.target.value)}
                      placeholder={pick(language, 'اختیاری', 'Optional', 'اختیاري')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="senderCity">{t.senderCity}</Label>
                    <CitySearch value={form.senderCity} onValueChange={(value) => updateForm('senderCity', value)} placeholder={t.senderCityPlaceholder} />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                      <ArrowLeft className="h-5 w-5 text-white" />
                    </div>
                    {t.receiverInfo}
                  </CardTitle>
                  <CardDescription>{t.receiverInfoDesc}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="receiverName">{t.receiverName} *</Label>
                    <Input id="receiverName" value={form.receiverName} onChange={(event) => updateForm('receiverName', event.target.value)} required />
                  </div>

                  <div>
                    <Label htmlFor="receiverCountry">{t.receiverCountry} *</Label>
                    <Select value={form.receiverCountry} onValueChange={(value) => {
                      updateForm('receiverCountry', value)
                      const country = COUNTRIES.find(c => c.name === value)
                      if (country) {
                        // Always update phone code when country changes
                        updateForm('receiverPhone', country.phoneCode)
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.name}>
                            {country.flag} {getCountryName(country, language)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="receiverPhone">{t.receiverPhone} *</Label>
                    <Input 
                      id="receiverPhone" 
                      value={form.receiverPhone} 
                      onChange={(event) => updateForm('receiverPhone', event.target.value)} 
                      placeholder="+93700123456" 
                      required 
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {COUNTRIES.find(c => c.name === form.receiverCountry)?.phoneCode || '+93'}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="receiverTazkiraNumber">{t.receiverTazkira}</Label>
                    <Input
                      id="receiverTazkiraNumber"
                      value={form.receiverTazkiraNumber}
                      onChange={(event) => updateForm('receiverTazkiraNumber', event.target.value)}
                      placeholder={pick(language, 'اختیاری', 'Optional', 'اختیاري')}
                    />
                  </div>

                  <div>
                    <Label htmlFor="receiverCity">{t.receiverCity} *</Label>
                    <CitySearch value={form.receiverCity} onValueChange={(value) => updateForm('receiverCity', value)} placeholder={t.receiverCityPlaceholder} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card hover-lift border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                    <Building2 className="h-5 w-5 text-white" />
                  </div>
                  {t.branchesTitle}
                </CardTitle>
                <CardDescription>{t.branchesDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingBranches ? (
                  <div className="text-center py-4">{t.loadingBranches}</div>
                ) : activeBranches.length === 0 ? (
                  <Alert>
                    <AlertDescription>{t.noBranches}</AlertDescription>
                  </Alert>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="originBranch">{t.originBranch} *</Label>
                        <Select value={form.originBranchId} onValueChange={(value) => updateForm('originBranchId', value)}>
                          <SelectTrigger id="originBranch">
                            <SelectValue placeholder={t.selectOriginBranch} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeOriginBranches.map((branch) => (
                              <SelectItem key={branch.id} value={branch.id}>
                                {branch.name} - {branch.city}, {branch.country}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>{t.destinationModeTitle}</Label>
                        <Select
                          value={destinationMode}
                          onValueChange={(value) => {
                            const v = value === 'PARTNER_SARAF' ? 'PARTNER_SARAF' : 'BRANCH'
                            setDestinationMode(v)
                            setSelectedDestinationSaraf(null)
                            setDestinationSarafResults([])
                            setDestinationSarafQuery('')
                            setDestinationSarafBranches([])
                            updateForm('destinationBranchId', '')
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="BRANCH">{t.destinationModeBranch}</SelectItem>
                            <SelectItem value="PARTNER_SARAF">{t.destinationModePartner}</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">{t.destinationSarafSearchHint}</p>
                      </div>
                    </div>

                    {destinationMode === 'BRANCH' ? (
                      <div className="mt-4">
                        <Label htmlFor="destinationBranch">{t.destinationBranch} *</Label>
                        <Select value={form.destinationBranchId} onValueChange={(value) => updateForm('destinationBranchId', value)}>
                          <SelectTrigger id="destinationBranch">
                            <SelectValue placeholder={t.selectDestinationBranch} />
                          </SelectTrigger>
                          <SelectContent>
                            {activeDestinationBranches
                              .filter((branch) => branch.id !== form.originBranchId)
                              .map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.name} - {branch.city}, {branch.country}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ) : (
                      <div className="mt-4 space-y-3">
                        <div>
                          <Label>{t.destinationSarafSearch}</Label>
                          <Input
                            value={destinationSarafQuery}
                            onChange={(e) => setDestinationSarafQuery(e.target.value)}
                            placeholder={pick(language, 'مثال: شاهزاده یا +447...', 'Example: Shahzada or +447...', 'بېلګه: Shahzada يا +447...')}
                          />
                        </div>

                        {searchingDestinationSarafs ? (
                          <div className="text-sm text-muted-foreground">{t.searching}</div>
                        ) : null}

                        {destinationSarafResults.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {destinationSarafResults.map((s) => (
                              <button
                                type="button"
                                key={s.id}
                                onClick={() => {
                                  setSelectedDestinationSaraf(s)
                                  updateForm('destinationBranchId', '')
                                }}
                                className={`text-left border rounded-lg p-3 hover:bg-muted transition ${
                                  selectedDestinationSaraf?.id === s.id ? 'border-indigo-500 bg-indigo-50/50' : 'border-border'
                                }`}
                              >
                                <div className="font-medium">{s.businessName}</div>
                                <div className="text-xs text-muted-foreground">
                                  {t.destinationSarafPhone}: {s.businessPhone}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {s.primaryCity}{s.primaryCountry ? `, ${s.primaryCountry}` : ''}
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {selectedDestinationSaraf ? (
                          <div className="rounded-lg border p-3 space-y-2">
                            <div className="text-sm font-medium">
                              {t.destinationSaraf}: {selectedDestinationSaraf.businessName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {t.destinationSarafPhone}: {selectedDestinationSaraf.businessPhone}
                            </div>
                            <div>
                              <Label htmlFor="partnerDestinationBranch">{t.destinationBranch} *</Label>
                              <Select value={form.destinationBranchId} onValueChange={(value) => updateForm('destinationBranchId', value)}>
                                <SelectTrigger id="partnerDestinationBranch">
                                  <SelectValue placeholder={t.selectDestinationBranch} />
                                </SelectTrigger>
                                <SelectContent>
                                  {activePartnerDestinationBranches
                                    .filter((branch) => branch.id !== form.originBranchId)
                                    .map((branch) => (
                                      <SelectItem key={branch.id} value={branch.id}>
                                        {branch.name} - {branch.city}, {branch.country}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  {t.transactionDetails}
                </CardTitle>
                <CardDescription>{t.transactionDetailsDesc}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="fromCurrency">{t.fromCurrency}</Label>
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
                    <Label htmlFor="toCurrency">{t.toCurrency}</Label>
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
                    <Label htmlFor="fromAmount">
                      {t.amount} ({form.fromCurrency}) *
                    </Label>
                    <Input
                      id="fromAmount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.fromAmount}
                      onChange={(event) => updateForm('fromAmount', Number.parseFloat(event.target.value) || 0)}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="rate">{t.exchangeRate} *</Label>
                    <div className="relative">
                      <Input
                        id="rate"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.rate}
                        onChange={(event) => updateForm('rate', Number.parseFloat(event.target.value) || 0)}
                        required
                        disabled={fetchingRate}
                      />
                      {fetchingRate ? (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{t.rateHint}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="fee">
                      {t.fee} ({form.fromCurrency})
                    </Label>
                    <div className="relative">
                      <Input
                        id="fee"
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.fee}
                        readOnly
                        disabled={fetchingFeePreview}
                      />
                      {fetchingFeePreview ? (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                      ) : null}
                    </div>
                  </div>

                  <div>
                    <Label>{t.convertedAmount}</Label>
                    <div className="p-2 bg-muted rounded-md">
                      {formatMoney(calculateToAmount(), language)} {form.toCurrency}
                    </div>
                  </div>

                  <div>
                    <Label>{t.finalAmount}</Label>
                    <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-lg font-bold text-green-700 text-lg">
                      {formatMoney(calculateTotal(), language)} {form.fromCurrency}
                    </div>
                  </div>
                </div>

                {feePreview ? (
                  <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 text-sm md:grid-cols-3">
                    <div>
                      <div className="text-muted-foreground">System</div>
                      <div className="font-bold">
                        {formatMoney(feePreview.systemCommission, language)} {form.fromCurrency}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Saraf</div>
                      <div className="font-bold">
                        {formatMoney(feePreview.sarafCommission, language)} {form.fromCurrency}
                      </div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Credits</div>
                      <div className="font-bold">{formatMoney(feePreview.creditsRequired, language)}</div>
                    </div>
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="notes">{t.notes}</Label>
                  <Textarea id="notes" value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} placeholder={t.notesPlaceholder} />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end gap-4">
              <Link href="/portal/hawala">
                <Button type="button" variant="outline">
                  {t.cancel}
                </Button>
              </Link>
              <Button type="submit" disabled={loading} size="lg" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700">
                {loading ? (
                  t.creating
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
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
