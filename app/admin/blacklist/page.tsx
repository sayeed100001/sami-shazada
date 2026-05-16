'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2, Globe2, Plus, RefreshCw, Search, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

type SarafOption = {
  id: string
  businessName: string
}

type BlacklistEntry = {
  id: string
  type: 'PHONE' | 'EMAIL' | 'NATIONAL_ID'
  value: string
  reason: string
  sarafId?: string | null
  createdAt: string
  saraf?: SarafOption | null
}

type BlacklistForm = {
  type: 'PHONE' | 'EMAIL' | 'NATIONAL_ID'
  value: string
  reason: string
  scope: 'GLOBAL' | 'SARAF'
  sarafId: string
}

const createEmptyForm = (): BlacklistForm => ({
  type: 'PHONE',
  value: '',
  reason: '',
  scope: 'GLOBAL',
  sarafId: '',
})

function getLocale(language: string) {
  if (language === 'en') return 'en-US'
  if (language === 'ps') return 'ps-AF'
  return 'fa-AF'
}

function formatDate(value: string, language: string) {
  return new Intl.DateTimeFormat(getLocale(language), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function getTypeLabel(language: string, type: BlacklistEntry['type']) {
  if (type === 'PHONE') {
    return language === 'en' ? 'Phone' : language === 'ps' ? 'ټیلیفون' : 'تلفن'
  }
  if (type === 'EMAIL') {
    return language === 'en' ? 'Email' : language === 'ps' ? 'برېښنالیک' : 'ایمیل'
  }
  return language === 'en' ? 'National ID' : language === 'ps' ? 'تذکره / پېژندپاڼه' : 'کد ملی / تذکره'
}

export default function AdminBlacklistPage() {
  const { language } = useLanguage()
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [sarafs, setSarafs] = useState<SarafOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [scopeFilter, setScopeFilter] = useState('ALL')
  const [formData, setFormData] = useState<BlacklistForm>(createEmptyForm())
  const [error, setError] = useState('')

  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      if (scopeFilter !== 'ALL') params.set('scope', scopeFilter)

      const response = await fetch(`/api/admin/blacklist?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || pick('بارگذاری لیست سیاه ناموفق بود', 'Failed to load blacklist', 'د تور لېست لوستل ناکام شول'))
      }

      setEntries(data.entries || [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : pick('بارگذاری لیست سیاه ناموفق بود', 'Failed to load blacklist', 'د تور لېست لوستل ناکام شول'))
    } finally {
      setLoading(false)
    }
  }, [language, scopeFilter, search, typeFilter])

  const fetchSarafs = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/sarafs?limit=100&status=APPROVED', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) return

      setSarafs(
        (data.sarafs || []).map((saraf: { id: string; businessName: string }) => ({
          id: saraf.id,
          businessName: saraf.businessName,
        }))
      )
    } catch (fetchError) {
      console.error('Failed to load saraf options:', fetchError)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntries()
    }, 250)

    return () => clearTimeout(timer)
  }, [fetchEntries])

  useEffect(() => {
    void fetchSarafs()
  }, [fetchSarafs])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    if (formData.scope === 'SARAF' && !formData.sarafId) {
      setError(pick('لطفاً یک صراف را انتخاب کنید', 'Please select a saraf', 'مهرباني وکړئ یو صراف وټاکئ'))
      setSaving(false)
      return
    }

    try {
      const payload = {
        type: formData.type,
        value: formData.value,
        reason: formData.reason,
        sarafId: formData.scope === 'SARAF' ? formData.sarafId || null : null,
      }

      const response = await fetch('/api/admin/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || pick('ایجاد رکورد لیست سیاه ناموفق بود', 'Failed to create blacklist entry', 'د تور لېست د ثبت جوړول ناکام شول'))
      }

      setShowDialog(false)
      setFormData(createEmptyForm())
      await fetchEntries()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : pick('ایجاد رکورد لیست سیاه ناموفق بود', 'Failed to create blacklist entry', 'د تور لېست د ثبت جوړول ناکام شول'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry: BlacklistEntry) {
    const confirmed = window.confirm(
      pick(
        `آیا رکورد ${entry.value} حذف شود؟`,
        `Delete blacklist entry for ${entry.value}?`,
        `د ${entry.value} تور لېست ثبت ړنګ شي؟`
      )
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/admin/blacklist/${entry.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || pick('حذف رکورد ناموفق بود', 'Failed to delete blacklist entry', 'د تور لېست د ثبت ړنګول ناکام شول'))
      }

      await fetchEntries()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : pick('حذف رکورد ناموفق بود', 'Failed to delete blacklist entry', 'د تور لېست د ثبت ړنګول ناکام شول'))
    }
  }

  const stats = useMemo(() => {
    const global = entries.filter((entry) => !entry.sarafId).length
    const sarafScoped = entries.length - global
    const phones = entries.filter((entry) => entry.type === 'PHONE').length
    const emails = entries.filter((entry) => entry.type === 'EMAIL').length

    return {
      total: entries.length,
      global,
      sarafScoped,
      phones,
      emails,
    }
  }, [entries])

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-6 bg-gradient-to-br from-slate-50 via-rose-50/70 to-orange-50/80 p-4 sm:p-6 dark:from-gray-950 dark:via-rose-950/20 dark:to-orange-950/20">
        <div className="overflow-hidden rounded-[32px] bg-[linear-gradient(135deg,#7f1d1d,#b91c1c,#ea580c)] p-8 text-white shadow-[0_30px_90px_-45px_rgba(127,29,29,0.75)]">
          <div className="mb-4 flex items-start gap-4">
            <div className="rounded-[22px] bg-white/15 p-4 backdrop-blur-xl">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-black md:text-4xl">
                {pick('کنترل لیست سیاه', 'Blacklist Control', 'د تور لېست کنټرول')}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/90 md:text-base">
                {pick(
                  'شماره‌های تلفن، ایمیل‌ها و شناسه‌های پرریسک را در سطح کل سیستم یا فقط برای یک شبکه صرافی مسدود کنید تا پیش از ایجاد خسارت متوقف شوند.',
                  'Block risky phones, emails, and identities globally or for a single saraf network before they create losses.',
                  'له زیان څخه مخکې شکمن ټیلیفونونه، برېښنالیکونه او پېژندپاڼې په ټول سیستم یا یوازې د یوه صراف په شبکه کې بند کړئ.'
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
              <div className="text-xs text-white/75">{pick('حفاظت سراسری', 'Global protection', 'سراسري ساتنه')}</div>
              <div className="mt-2 text-lg font-black">{pick('کل پلتفرم', 'Whole platform', 'ټول پلاتفورم')}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
              <div className="text-xs text-white/75">{pick('کنترل اختصاصی', 'Scoped control', 'ځانګړی کنټرول')}</div>
              <div className="mt-2 text-lg font-black">{pick('برای یک صراف', 'One saraf only', 'یوازې یو صراف')}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
              <div className="text-xs text-white/75">{pick('ثبت قابل پیگیری', 'Auditable records', 'د پلټنې وړ ثبتونه')}</div>
              <div className="mt-2 text-lg font-black">{pick('همراه با لاگ', 'With audit log', 'له لاګ سره')}</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card className="border-0 bg-white/85 shadow-lg shadow-slate-200/70 dark:bg-slate-950/70 dark:shadow-black/20">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{pick('کل رکوردها', 'Total entries', 'ټول ثبتونه')}</p>
              <p className="mt-2 text-3xl font-black">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/85 shadow-lg shadow-slate-200/70 dark:bg-slate-950/70 dark:shadow-black/20">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{pick('رکوردهای سراسری', 'Global entries', 'سراسري ثبتونه')}</p>
              <p className="mt-2 text-3xl font-black">{stats.global}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/85 shadow-lg shadow-slate-200/70 dark:bg-slate-950/70 dark:shadow-black/20">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{pick('رکوردهای صراف‌محور', 'Saraf-scoped', 'د صراف ځانګړي')}</p>
              <p className="mt-2 text-3xl font-black">{stats.sarafScoped}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/85 shadow-lg shadow-slate-200/70 dark:bg-slate-950/70 dark:shadow-black/20">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{pick('شماره‌های مسدود', 'Blocked phones', 'بند شوي ټیلیفونونه')}</p>
              <p className="mt-2 text-3xl font-black">{stats.phones}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/85 shadow-lg shadow-slate-200/70 dark:bg-slate-950/70 dark:shadow-black/20">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{pick('ایمیل‌های مسدود', 'Blocked emails', 'بند شوي برېښنالیکونه')}</p>
              <p className="mt-2 text-3xl font-black">{stats.emails}</p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-0 bg-white/85 shadow-[0_30px_80px_-55px_rgba(15,23,42,0.35)] dark:bg-slate-950/70">
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <CardTitle>{pick('رجیستر پیشگیری از تقلب', 'Fraud prevention registry', 'د درغلۍ مخنیوي ثبت')}</CardTitle>
                <CardDescription>
                  {pick(
                    'رکوردهای سراسری روی کل پلتفرم اثر دارند. رکوردهای صراف‌محور فقط برای همان شبکه صرافی اعمال می‌شوند.',
                    'Global records affect the whole platform. Saraf-scoped records only affect one saraf network.',
                    'سراسري ثبتونه پر ټول پلاتفورم اغېز کوي. د صراف ځانګړي ثبتونه یوازې پر هماغه شبکه اغېز لري.'
                  )}
                </CardDescription>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                <div className="relative">
                  <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder={pick('جست‌وجوی مقدار یا دلیل', 'Search value or reason', 'ارزښت یا دلیل ولټوئ')}
                    className="sm:w-56 pr-10"
                  />
                </div>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{pick('همه نوع‌ها', 'All types', 'ټول ډولونه')}</SelectItem>
                    <SelectItem value="PHONE">{pick('تلفن', 'Phone', 'ټیلیفون')}</SelectItem>
                    <SelectItem value="EMAIL">{pick('ایمیل', 'Email', 'برېښنالیک')}</SelectItem>
                    <SelectItem value="NATIONAL_ID">{pick('تذکره / شناسه', 'National ID', 'تذکره / پېژندپاڼه')}</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={scopeFilter} onValueChange={setScopeFilter}>
                  <SelectTrigger className="sm:w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">{pick('همه دامنه‌ها', 'All scopes', 'ټولې ساحې')}</SelectItem>
                    <SelectItem value="GLOBAL">{pick('سراسری', 'Global', 'سراسري')}</SelectItem>
                    <SelectItem value="SARAF">{pick('فقط صراف', 'Saraf only', 'یوازې صراف')}</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" onClick={() => void fetchEntries()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  {pick('تازه‌سازی', 'Refresh', 'تازه کول')}
                </Button>
                <Dialog open={showDialog} onOpenChange={setShowDialog}>
                  <DialogTrigger asChild>
                    <Button
                      onClick={() => {
                        setFormData(createEmptyForm())
                        setError('')
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {pick('افزودن رکورد', 'Add entry', 'ثبت زیاتول')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{pick('ایجاد رکورد لیست سیاه', 'Create blacklist entry', 'د تور لېست ثبت جوړول')}</DialogTitle>
                      <DialogDescription>
                        {pick(
                          'برای کنترل سراسری از دامنه عمومی استفاده کنید. برای محدودسازی یک شبکه صرافی، دامنه صراف را انتخاب کنید.',
                          'Use global scope for platform-wide control or choose a saraf scope for one exchange network only.',
                          'د ټول پلاتفورم لپاره عمومي ساحه وکاروئ، یا یوازې د یوه صراف د شبکې لپاره ځانګړې ساحه وټاکئ.'
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleCreate}>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{pick('نوع', 'Type', 'ډول')}</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value: 'PHONE' | 'EMAIL' | 'NATIONAL_ID') =>
                              setFormData((prev) => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PHONE">{pick('تلفن', 'Phone', 'ټیلیفون')}</SelectItem>
                              <SelectItem value="EMAIL">{pick('ایمیل', 'Email', 'برېښنالیک')}</SelectItem>
                              <SelectItem value="NATIONAL_ID">{pick('تذکره / شناسه', 'National ID', 'تذکره / پېژندپاڼه')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>{pick('دامنه اعمال', 'Scope', 'د اغېز ساحه')}</Label>
                          <Select
                            value={formData.scope}
                            onValueChange={(value: 'GLOBAL' | 'SARAF') =>
                              setFormData((prev) => ({
                                ...prev,
                                scope: value,
                                sarafId: value === 'GLOBAL' ? '' : prev.sarafId,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="GLOBAL">{pick('سراسری', 'Global', 'سراسري')}</SelectItem>
                              <SelectItem value="SARAF">{pick('ویژه صراف', 'Saraf-specific', 'د صراف ځانګړی')}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label>{pick('مقدار مسدودی', 'Blocked value', 'بند شوی ارزښت')}</Label>
                          <Input
                            value={formData.value}
                            onChange={(event) => setFormData((prev) => ({ ...prev, value: event.target.value }))}
                            placeholder={
                              formData.type === 'PHONE'
                                ? '+93700111222'
                                : formData.type === 'EMAIL'
                                  ? 'name@example.com'
                                  : pick('شماره تذکره یا شناسه', 'ID number', 'د پېژندپاڼې شمېره')
                            }
                            required
                          />
                        </div>

                        {formData.scope === 'SARAF' ? (
                          <div className="space-y-2 md:col-span-2">
                            <Label>{pick('صراف', 'Saraf', 'صراف')}</Label>
                            <Select
                              value={formData.sarafId || 'NONE'}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  sarafId: value === 'NONE' ? '' : value,
                                }))
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="NONE">{pick('یک صراف را انتخاب کنید', 'Select a saraf', 'یو صراف وټاکئ')}</SelectItem>
                                {sarafs.map((saraf) => (
                                  <SelectItem key={saraf.id} value={saraf.id}>
                                    {saraf.businessName}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ) : null}

                        <div className="space-y-2 md:col-span-2">
                          <Label>{pick('دلیل', 'Reason', 'دلیل')}</Label>
                          <Textarea
                            value={formData.reason}
                            onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
                            placeholder={pick('توضیح دهید چرا این مورد باید مسدود شود', 'Explain why this entry is blocked', 'تشریح کړئ چې ولې دا مورد باید بند شي')}
                            required
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                          {pick('لغو', 'Cancel', 'لغوه')}
                        </Button>
                        <Button type="submit" disabled={saving}>
                          {saving ? pick('در حال ذخیره...', 'Saving...', 'خوندي کېږي...') : pick('ایجاد رکورد', 'Create entry', 'ثبت جوړول')}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-[22px] border border-emerald-200/80 bg-emerald-50/70 px-4 py-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4" />
                  {pick('رکورد عمومی', 'Global rule', 'عمومي قاعده')}
                </div>
                <p className="mt-2 text-xs leading-6 text-emerald-700/80 dark:text-emerald-100/80">
                  {pick(
                    'ورود، ثبت‌نام و عملیات همه کاربران را تحت تاثیر قرار می‌دهد.',
                    'Affects signups and actions across the whole platform.',
                    'د ټول پلاتفورم پر ثبت‌نام او کړنو اغېز کوي.'
                  )}
                </p>
              </div>
              <div className="rounded-[22px] border border-blue-200/80 bg-blue-50/70 px-4 py-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-200">
                  <Building2 className="h-4 w-4" />
                  {pick('رکورد صراف‌محور', 'Saraf-scoped rule', 'د صراف ځانګړې قاعده')}
                </div>
                <p className="mt-2 text-xs leading-6 text-blue-700/80 dark:text-blue-100/80">
                  {pick(
                    'فقط روی یک شبکه صرافی اعمال می‌شود و برای بقیه پلتفرم عمومی نیست.',
                    'Only applies to one saraf network and stays isolated from the rest.',
                    'یوازې د یوه صراف پر شبکه پلي کېږي او پر نورو اغېز نه لري.'
                  )}
                </p>
              </div>
              <div className="rounded-[22px] border border-amber-200/80 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                  <Globe2 className="h-4 w-4" />
                  {pick('بازبینی سریع', 'Fast review', 'چټکه بیاکتنه')}
                </div>
                <p className="mt-2 text-xs leading-6 text-amber-700/80 dark:text-amber-100/80">
                  {pick(
                    'با جست‌وجو، فیلتر نوع و دامنه، سریع‌ترین رکورد را برای اقدام پیدا کنید.',
                    'Search and filter by type and scope to find the exact record quickly.',
                    'د لټون او فلټر له لارې سم ثبت ژر پیدا او اداره کړئ.'
                  )}
                </p>
              </div>
            </div>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            {loading ? (
              <div className="py-10 text-center text-muted-foreground">
                {pick('در حال بارگذاری لیست سیاه...', 'Loading blacklist...', 'تور لېست لوډېږي...')}
              </div>
            ) : entries.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {pick('هیچ رکوردی در لیست سیاه پیدا نشد.', 'No blacklist entries found.', 'په تور لېست کې هېڅ ثبت ونه موندل شو.')}
              </div>
            ) : (
              <div className="space-y-4">
                {entries.map((entry) => {
                  const scopeLabel = entry.sarafId
                    ? pick(
                        `صراف: ${entry.saraf?.businessName || 'اختصاصی'}`,
                        `Saraf: ${entry.saraf?.businessName || 'Scoped'}`,
                        `صراف: ${entry.saraf?.businessName || 'ځانګړی'}`
                      )
                    : pick('سراسری', 'Global', 'سراسري')

                  return (
                    <Card key={entry.id} className="border border-border/60 bg-white/80 dark:bg-slate-950/50">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{getTypeLabel(language, entry.type)}</Badge>
                              <Badge variant={entry.sarafId ? 'secondary' : 'default'}>{scopeLabel}</Badge>
                            </div>
                            <p className="text-lg font-black text-slate-900 dark:text-white">{entry.value}</p>
                            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{entry.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {pick('ایجاد شده در', 'Created', 'جوړ شوی')} {formatDate(entry.createdAt, language)}
                            </p>
                          </div>

                          <Button variant="outline" size="sm" onClick={() => void handleDelete(entry)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {pick('حذف', 'Delete', 'ړنګول')}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
