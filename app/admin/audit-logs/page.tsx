'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Download, FileText, Filter, Search } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/hooks/useLanguage'

interface AuditLog {
  id: string
  userId: string
  userName: string
  action: string
  resource: string
  details: string
  ipAddress: string
  userAgent: string
  createdAt: string
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

const DEFAULT_PAGINATION: Pagination = {
  page: 1,
  limit: 50,
  total: 0,
  pages: 0,
}

export default function AuditLogsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterAction, setFilterAction] = useState('all')
  const [pagination, setPagination] = useState<Pagination>(DEFAULT_PAGINATION)

  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const locale = language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-IR'

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (!session || session.user.role !== 'ADMIN') {
      return
    }

    const controller = new AbortController()
    const timer = setTimeout(() => {
      void fetchLogs(controller.signal)
    }, 250)

    return () => {
      controller.abort()
      clearTimeout(timer)
    }
  }, [session, searchTerm, filterAction, pagination.page])

  const fetchLogs = async (signal?: AbortSignal) => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      })

      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      if (filterAction !== 'all') params.set('action', filterAction)

      const response = await fetch(`/api/admin/audit-logs?${params}`, {
        cache: 'no-store',
        signal,
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(
          data?.error ||
            pick(
              'بارگذاری لاگ‌های سیستم ناموفق بود',
              'Failed to fetch audit logs',
              'د سیستم لاګونه لوستل ناکام شول'
            )
        )
      }

      setLogs(data?.logs || [])
      setPagination(data?.pagination || DEFAULT_PAGINATION)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return
      }

      console.error('Failed to fetch logs:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : pick('بارگذاری لاگ‌های سیستم ناموفق بود', 'Failed to fetch audit logs', 'د سیستم لاګونه لوستل ناکام شول')
      )
      setLogs([])
      setPagination(DEFAULT_PAGINATION)
    } finally {
      setIsLoading(false)
    }
  }

  const exportLogs = async () => {
    try {
      const params = new URLSearchParams()
      if (searchTerm.trim()) params.set('search', searchTerm.trim())
      if (filterAction !== 'all') params.set('action', filterAction)

      const response = await fetch(`/api/admin/audit-logs/export?${params}`)
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.error || pick('خروجی گرفتن ناموفق بود', 'Export failed', 'اېکسپورټ ناکام شو'))
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `audit-logs-${new Date().toISOString()}.csv`
      anchor.click()
      window.URL.revokeObjectURL(url)
      toast.success(pick('فایل لاگ‌ها دانلود شد', 'Audit logs downloaded', 'لاګونه ډاونلوډ شول'))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : pick('خروجی گرفتن ناموفق بود', 'Export failed', 'اېکسپورټ ناکام شو')
      )
    }
  }

  const resetFilters = () => {
    setSearchTerm('')
    setFilterAction('all')
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  const getActionBadge = (action: string) => {
    const colors: Record<string, string> = {
      CREATE: 'bg-green-100 text-green-800',
      UPDATE: 'bg-blue-100 text-blue-800',
      DELETE: 'bg-red-100 text-red-800',
      LOGIN: 'bg-purple-100 text-purple-800',
      LOGOUT: 'bg-gray-100 text-gray-800',
      RATE_LIMIT_BLOCKED: 'bg-amber-100 text-amber-900',
      LOGIN_FAILED: 'bg-rose-100 text-rose-900',
    }

    return <Badge className={colors[action] || 'bg-gray-100 text-gray-800'}>{action}</Badge>
  }

  if (status === 'loading' || !session) {
    return (
      <DashboardLayout>
        <div className="flex justify-center py-12">{pick('در حال بارگذاری...', 'Loading...', 'لوډېږي...')}</div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-8 text-white shadow-xl">
          <div className="mb-2 flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <h1 className="text-4xl font-bold">{pick('لاگ‌های سیستم', 'Audit Logs', 'د سیستم لاګونه')}</h1>
          </div>
          <p className="text-slate-50 text-lg">
            {pick(
              'رویدادهای مهم و فعالیت‌های مدیریتی را اینجا بررسی کنید.',
              'Track critical activity across the system.',
              'دلته مهم رويدادونه او د مديريت کړنې وګورئ.'
            )}
          </p>
        </div>

        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex flex-col justify-between gap-4 md:flex-row">
              <div>
                <CardTitle>{pick('فعالیت سیستم', 'System Activity', 'د سیستم فعالیت')}</CardTitle>
                <CardDescription>
                  {pagination.total} {pick('رکورد', 'records', 'ریکارډونه')}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportLogs} variant="outline">
                  <Download className="mr-2 h-4 w-4" />
                  {pick('دانلود CSV', 'Download CSV', 'CSV ډاونلوډ')}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder={pick('جستجو در لاگ‌ها...', 'Search logs...', 'په لاګونو کې لټون...')}
                  value={searchTerm}
                  onChange={(event) => {
                    setSearchTerm(event.target.value)
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                  className="pr-10"
                />
              </div>
              <Select
                value={filterAction}
                onValueChange={(value) => {
                  setFilterAction(value)
                  setPagination((prev) => ({ ...prev, page: 1 }))
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={pick('نوع عملیات', 'Action type', 'د عمل ډول')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{pick('همه عملیات', 'All actions', 'ټول عملونه')}</SelectItem>
                  <SelectItem value="CREATE">{pick('ایجاد', 'Create', 'جوړول')}</SelectItem>
                  <SelectItem value="UPDATE">{pick('ویرایش', 'Update', 'بدلون')}</SelectItem>
                  <SelectItem value="DELETE">{pick('حذف', 'Delete', 'ړنګول')}</SelectItem>
                  <SelectItem value="LOGIN">{pick('ورود', 'Login', 'ننوتل')}</SelectItem>
                  <SelectItem value="LOGOUT">{pick('خروج', 'Logout', 'وتل')}</SelectItem>
                  <SelectItem value="RATE_LIMIT_BLOCKED">{pick('محدودیت درخواست', 'Rate limited', 'د غوښتنو محدودیت')}</SelectItem>
                  <SelectItem value="LOGIN_FAILED">{pick('ورود ناموفق', 'Login failed', 'ننوتل ناکام')}</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={resetFilters}>
                <Filter className="mr-2 h-4 w-4" />
                {pick('پاک کردن فیلترها', 'Clear filters', 'فلټر پاکول')}
              </Button>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="py-8 text-center">{pick('در حال بارگذاری...', 'Loading...', 'لوډېږي...')}</div>
              ) : logs.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  {pick('هیچ لاگی پیدا نشد.', 'No audit logs found.', 'هېڅ لاګ ونه موندل شو.')}
                </div>
              ) : (
                logs.map((log) => (
                  <Card key={log.id} className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-2 flex items-center gap-2">
                            {getActionBadge(log.action)}
                            <span className="font-medium">{log.userName}</span>
                            <span className="text-sm text-muted-foreground">•</span>
                            <span className="text-sm text-muted-foreground">{log.resource}</span>
                          </div>
                          <p className="mb-2 text-sm text-muted-foreground">{log.details}</p>
                          <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                            <span>{pick('IP', 'IP', 'IP')}: {log.ipAddress || pick('نامشخص', 'unknown', 'نامعلوم')}</span>
                            <span>{new Date(log.createdAt).toLocaleString(locale)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4">
              <p className="text-sm text-muted-foreground">
                {pick('صفحه', 'Page', 'پاڼه')} {pagination.page} {pick('از', 'of', 'له')} {Math.max(1, pagination.pages)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                  disabled={pagination.page <= 1 || isLoading}
                >
                  {pick('قبلی', 'Previous', 'مخکینی')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setPagination((prev) => ({
                      ...prev,
                      page: Math.min(Math.max(1, prev.pages), prev.page + 1),
                    }))
                  }
                  disabled={pagination.page >= Math.max(1, pagination.pages) || isLoading}
                >
                  {pick('بعدی', 'Next', 'بل')}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
