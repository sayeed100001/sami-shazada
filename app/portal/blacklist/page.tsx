'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/hooks/useLanguage'
import { Building2, Globe2, Plus, RefreshCw, Search, ShieldAlert, ShieldCheck, Trash2 } from 'lucide-react'

type BlacklistEntry = {
  id: string
  type: 'PHONE' | 'EMAIL' | 'NATIONAL_ID'
  value: string
  reason: string
  sarafId?: string | null
  createdAt: string
  saraf?: {
    id: string
    businessName: string
  } | null
}

type BlacklistForm = {
  type: 'PHONE' | 'EMAIL' | 'NATIONAL_ID'
  value: string
  reason: string
}

const createEmptyForm = (): BlacklistForm => ({
  type: 'PHONE',
  value: '',
  reason: '',
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
  return language === 'en' ? 'National ID' : language === 'ps' ? 'تذکره / پېژندپاڼه' : 'تذکره / شناسه'
}

export default function PortalBlacklistPage() {
  const { language } = useLanguage()
  const [entries, setEntries] = useState<BlacklistEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDialog, setShowDialog] = useState(false)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [scopeFilter, setScopeFilter] = useState('ALL')
  const [formData, setFormData] = useState<BlacklistForm>(createEmptyForm())
  const [error, setError] = useState('')

  const pick = useCallback(
    (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa),
    [language]
  )

  const fetchEntries = useCallback(async () => {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (typeFilter !== 'ALL') params.set('type', typeFilter)
      if (scopeFilter !== 'ALL') params.set('scope', scopeFilter)

      const response = await fetch(`/api/portal/blacklist?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            pick('بارگذاری لیست سیاه ناموفق بود', 'Failed to load blacklist', 'د تور لېست لوستل ناکام شول')
        )
      }

      setEntries(data.entries || [])
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : pick('بارگذاری لیست سیاه ناموفق بود', 'Failed to load blacklist', 'د تور لېست لوستل ناکام شول')
      )
    } finally {
      setLoading(false)
    }
  }, [language, pick, scopeFilter, search, typeFilter])

  useEffect(() => {
    const timer = setTimeout(() => {
      void fetchEntries()
    }, 250)

    return () => clearTimeout(timer)
  }, [fetchEntries])

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const response = await fetch('/api/portal/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            pick(
              'ایجاد رکورد لیست سیاه ناموفق بود',
              'Failed to create blacklist entry',
              'د تور لېست د ثبت جوړول ناکام شول'
            )
        )
      }

      setShowDialog(false)
      setFormData(createEmptyForm())
      await fetchEntries()
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : pick(
              'ایجاد رکورد لیست سیاه ناموفق بود',
              'Failed to create blacklist entry',
              'د تور لېست د ثبت جوړول ناکام شول'
            )
      )
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(entry: BlacklistEntry) {
    if (!entry.sarafId) {
      return
    }

    const confirmed = window.confirm(
      pick(
        `رکورد ${entry.value} حذف شود؟`,
        `Delete blacklist entry for ${entry.value}?`,
        `د ${entry.value} تور لېست ثبت ړنګ شي؟`
      )
    )

    if (!confirmed) {
      return
    }

    try {
      const response = await fetch(`/api/portal/blacklist/${entry.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            pick('حذف رکورد ناموفق بود', 'Failed to delete blacklist entry', 'د تور لېست د ثبت ړنګول ناکام شول')
        )
      }

      await fetchEntries()
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : pick('حذف رکورد ناموفق بود', 'Failed to delete blacklist entry', 'د تور لېست د ثبت ړنګول ناکام شول')
      )
    }
  }

  const stats = useMemo(() => {
    const inherited = entries.filter((entry) => !entry.sarafId).length
    const local = entries.length - inherited
    const phones = entries.filter((entry) => entry.type === 'PHONE').length
    const emails = entries.filter((entry) => entry.type === 'EMAIL').length

    return {
      total: entries.length,
      inherited,
      local,
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
                {pick('کنترل لیست سیاه صراف', 'Saraf Blacklist Control', 'د صراف د تور لېست کنټرول')}
              </h1>
              <p className="max-w-3xl text-sm leading-7 text-white/90 md:text-base">
                {pick(
                  'شماره‌ها، ایمیل‌ها و شناسه‌های پرریسک را برای شبکه خودتان مسدود کنید و هم‌زمان رکوردهای سراسری مدیریت را هم ببینید.',
                  'Block risky phones, emails, and IDs for your own network while still inheriting the global admin protection rules.',
                  'د خپلې شبکې لپاره د خطرناکو ټیلیفونونو، برېښنالیکونو او پېژندپاڼو مخه ونیسئ او د مدیریت سراسري قواعد هم وګورئ.'
                )}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
              <div className="text-xs text-white/75">{pick('قواعد محلی', 'Local saraf rules', 'ځايي قواعد')}</div>
              <div className="mt-2 text-lg font-black">{pick('برای شبکه شما', 'For your network', 'ستاسې شبکې ته')}</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
              <div className="text-xs text-white/75">{pick('قواعد سراسری', 'Inherited global rules', 'سراسري قواعد')}</div>
              <div className="mt-2 text-lg font-black">{pick('از مدیریت', 'From admin', 'له مدیریت څخه')}</div>
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
              <p className="text-sm text-muted-foreground">{pick('رکوردهای محلی', 'Local entries', 'ځايي ثبتونه')}</p>
              <p className="mt-2 text-3xl font-black">{stats.local}</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-white/85 shadow-lg shadow-slate-200/70 dark:bg-slate-950/70 dark:shadow-black/20">
            <CardContent className="p-5">
              <p className="text-sm text-muted-foreground">{pick('رکوردهای سراسری', 'Inherited global entries', 'سراسري ثبتونه')}</p>
              <p className="mt-2 text-3xl font-black">{stats.inherited}</p>
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
                    'رکوردهای محلی فقط روی شبکه شما اثر دارند. رکوردهای سراسری توسط مدیریت تعریف می‌شوند و برای حذف آن‌ها باید از پنل مدیریت استفاده شود.',
                    'Local entries affect only your own network. Global records come from admin and stay read-only in the portal.',
                    'ځايي ثبتونه یوازې پر خپله شبکه اغېز لري. سراسري ثبتونه د مدیریت له خوا جوړېږي او په پورټل کې یوازې د لوستلو لپاره دي.'
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
                    <SelectItem value="SARAF">{pick('قواعد محلی', 'Local only', 'یوازې ځايي')}</SelectItem>
                    <SelectItem value="GLOBAL">{pick('قواعد سراسری', 'Global only', 'یوازې سراسري')}</SelectItem>
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
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>{pick('ایجاد رکورد محلی', 'Create local blacklist entry', 'ځايي ثبت جوړول')}</DialogTitle>
                      <DialogDescription>
                        {pick(
                          'این رکورد فقط روی شبکه صرافی شما اثر خواهد داشت.',
                          'This rule applies only to your own saraf network.',
                          'دا قاعده یوازې ستاسې د صراف شبکې لپاره پلې کېږي.'
                        )}
                      </DialogDescription>
                    </DialogHeader>

                    <form className="space-y-4" onSubmit={handleCreate}>
                      <div className="grid grid-cols-1 gap-4">
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

                        <div className="space-y-2">
                          <Label>{pick('دلیل', 'Reason', 'دلیل')}</Label>
                          <Textarea
                            value={formData.reason}
                            onChange={(event) => setFormData((prev) => ({ ...prev, reason: event.target.value }))}
                            placeholder={pick(
                              'دلیل ریسک یا سیگنال تقلب را توضیح دهید',
                              'Explain the risk or fraud signal',
                              'د خطر یا درغلۍ دلیل تشریح کړئ'
                            )}
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
                  {pick('رکورد محلی', 'Local rule', 'ځايي قاعده')}
                </div>
                <p className="mt-2 text-xs leading-6 text-emerald-700/80 dark:text-emerald-100/80">
                  {pick(
                    'فقط روی عملیات و کاربران مرتبط با شبکه شما اثر می‌گذارد.',
                    'Only affects users and operations related to your own network.',
                    'یوازې ستاسې له شبکې سره تړلو کاروونکو او عملیاتو باندې اغېز لري.'
                  )}
                </p>
              </div>
              <div className="rounded-[22px] border border-blue-200/80 bg-blue-50/70 px-4 py-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-700 dark:text-blue-200">
                  <Building2 className="h-4 w-4" />
                  {pick('قواعد قابل اقدام', 'Actionable entries', 'د اقدام وړ ثبتونه')}
                </div>
                <p className="mt-2 text-xs leading-6 text-blue-700/80 dark:text-blue-100/80">
                  {pick(
                    'فقط رکوردهای محلی قابل حذف هستند و رکوردهای سراسری از مدیریت خوانده می‌شوند.',
                    'Only your local entries can be deleted. Global entries stay admin-managed.',
                    'یوازې خپل ځايي ثبتونه ړنګولای شئ. سراسري ثبتونه د مدیریت له خوا اداره کېږي.'
                  )}
                </p>
              </div>
              <div className="rounded-[22px] border border-amber-200/80 bg-amber-50/70 px-4 py-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-700 dark:text-amber-200">
                  <Globe2 className="h-4 w-4" />
                  {pick('قواعد سراسری', 'Global safety net', 'سراسري خوندیتوب')}
                </div>
                <p className="mt-2 text-xs leading-6 text-amber-700/80 dark:text-amber-100/80">
                  {pick(
                    'رکوردهای مدیریت برای جلوگیری از ریسک‌های تکرارشونده به‌صورت ارثی نمایش داده می‌شوند.',
                    'Admin rules are inherited so repeated risk signals stay blocked everywhere.',
                    'د مدیریت قواعد په میراثي ډول ښودل کېږي څو تکراري خطرونه هر ځای بند پاتې شي.'
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
                  const isInherited = !entry.sarafId
                  const scopeLabel = isInherited
                    ? pick('سراسری', 'Global', 'سراسري')
                    : pick('رکورد محلی شما', 'Your local rule', 'ستاسې ځايي قاعده')

                  return (
                    <Card key={entry.id} className="border border-border/60 bg-white/80 dark:bg-slate-950/50">
                      <CardContent className="space-y-4 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="outline">{getTypeLabel(language, entry.type)}</Badge>
                              <Badge variant={isInherited ? 'secondary' : 'default'}>{scopeLabel}</Badge>
                            </div>
                            <p className="text-lg font-black text-slate-900 dark:text-white">{entry.value}</p>
                            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{entry.reason}</p>
                            <p className="text-xs text-muted-foreground">
                              {pick('ایجاد شده در', 'Created', 'جوړ شوی')} {formatDate(entry.createdAt, language)}
                            </p>
                          </div>

                          <Button variant="outline" size="sm" disabled={isInherited} onClick={() => void handleDelete(entry)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            {isInherited ? pick('مدیریت‌محور', 'Admin managed', 'د مدیریت له خوا') : pick('حذف', 'Delete', 'ړنګول')}
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
