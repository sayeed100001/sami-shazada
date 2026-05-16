'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ShieldAlert, RefreshCw, AlertTriangle, UploadCloud, UserX, Gauge } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/hooks/useLanguage'

type SecurityPayload = {
  metrics: {
    failedLogins: number
    rateLimitBlocks: number
    suspiciousActivity: number
    recentUploads: number
    adminActions: number
  }
  topRateLimitedIps: Array<{ ip: string | null; count: number }>
  alerts: Array<{
    timestamp: string
    action: string
    details: string | null
    userId: string | null
  }>
  recommendations: string[]
}

function MetricCard(props: {
  title: string
  value: number
  icon: React.ReactNode
  tone?: 'neutral' | 'warning' | 'danger'
  subtitle?: string
}) {
  const toneClass =
    props.tone === 'danger'
      ? 'border-rose-200/60 bg-rose-50/50 dark:border-rose-900/40 dark:bg-rose-950/30'
      : props.tone === 'warning'
        ? 'border-amber-200/60 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-950/30'
        : 'border-border/70 bg-background/70'

  return (
    <Card className={`glass-card border ${toneClass}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground">{props.title}</span>
          {props.icon}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black">{props.value}</div>
        {props.subtitle ? <div className="mt-1 text-xs text-muted-foreground">{props.subtitle}</div> : null}
      </CardContent>
    </Card>
  )
}

export default function AdminSecurityPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const pick = useMemo(
    () => (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa),
    [language]
  )
  const locale = language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-IR'

  const [payload, setPayload] = useState<SecurityPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [router, session, status])

  const fetchSecurity = async () => {
    try {
      setRefreshing(true)
      const res = await fetch('/api/security', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to fetch security data')
      setPayload(data as SecurityPayload)
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : pick('بارگذاری داده‌های امنیتی ناموفق بود', 'Failed to load security data', 'د امنيتي معلوماتو لوستل ناکام شول')
      )
      setPayload(null)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    if (!session || session.user.role !== 'ADMIN') return
    void fetchSecurity()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.role])

  const failedLogins = payload?.metrics.failedLogins ?? 0
  const rateLimitBlocks = payload?.metrics.rateLimitBlocks ?? 0
  const recentUploads = payload?.metrics.recentUploads ?? 0
  const suspiciousCount = payload?.metrics.suspiciousActivity ?? 0

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="rounded-2xl bg-gradient-to-r from-slate-800 via-slate-900 to-indigo-900 p-6 text-white shadow-xl">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 flex items-center gap-3">
                <ShieldAlert className="h-7 w-7" />
                <h1 className="truncate text-2xl font-black">
                  {pick('داشبورد امنیت', 'Security Dashboard', 'د امنيت ډشبورډ')}
                </h1>
              </div>
              <p className="text-sm text-white/85">
                {pick(
                  'نمای کلی از تلاش‌های مشکوک، محدودیت درخواست و رخدادهای حساس (۲۴ ساعت اخیر).',
                  'A 24h snapshot of suspicious activity, rate limits, and sensitive events.',
                  'د ۲۴ ساعتونو د مشکوکو هڅو، محدودیتونو او مهمو پېښو لنډیز.'
                )}
              </p>
            </div>
            <Button variant="secondary" className="shrink-0" disabled={refreshing} onClick={() => void fetchSecurity()}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {pick('به‌روزرسانی', 'Refresh', 'تازه کول')}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title={pick('ورود ناموفق', 'Failed logins', 'ناکامې ننوتنې')}
              value={failedLogins}
              tone={failedLogins > 10 ? 'danger' : failedLogins > 3 ? 'warning' : 'neutral'}
              subtitle={pick('۲۴ ساعت اخیر', 'Last 24 hours', 'وروستۍ ۲۴ ساعته')}
              icon={<UserX className="h-4 w-4 text-rose-500" />}
            />
            <MetricCard
              title={pick('محدودیت درخواست', 'Rate-limit blocks', 'د غوښتنو محدودیت')}
              value={rateLimitBlocks}
              tone={rateLimitBlocks > 50 ? 'danger' : rateLimitBlocks > 10 ? 'warning' : 'neutral'}
              subtitle={pick('۲۴ ساعت اخیر', 'Last 24 hours', 'وروستۍ ۲۴ ساعته')}
              icon={<Gauge className="h-4 w-4 text-amber-500" />}
            />
            <MetricCard
              title={pick('آپلودهای اخیر', 'Recent uploads', 'وروستي اپلوډونه')}
              value={recentUploads}
              tone={recentUploads > 50 ? 'warning' : 'neutral'}
              subtitle={pick('۲۴ ساعت اخیر', 'Last 24 hours', 'وروستۍ ۲۴ ساعته')}
              icon={<UploadCloud className="h-4 w-4 text-sky-500" />}
            />
            <MetricCard
              title={pick('هشدارهای مشکوک', 'Suspicious alerts', 'مشکوکې خبرتیاوې')}
              value={suspiciousCount}
              tone={suspiciousCount > 10 ? 'warning' : 'neutral'}
              subtitle={pick('بر اساس Audit Log', 'Based on Audit Log', 'د Audit Log له مخې')}
              icon={<AlertTriangle className="h-4 w-4 text-amber-500" />}
            />
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{pick('IPهای پرتکرار', 'Top IPs', 'لوړې IPګانې')}</CardTitle>
              <CardDescription>
                {pick(
                  'IPهایی که بیشترین محدودیت درخواست را داشته‌اند (۲۴ ساعت).',
                  'IPs with the most rate-limit blocks (24h).',
                  'هغه IPګانې چې ډېر محدود شوي (۲۴ ساعته).'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(payload?.topRateLimitedIps || []).length ? (
                  payload!.topRateLimitedIps.map((row) => (
                    <div key={`${row.ip}-${row.count}`} className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm">
                      <span className="font-mono">{row.ip || 'unknown'}</span>
                      <Badge variant={row.count > 25 ? 'destructive' : 'secondary'}>{row.count}</Badge>
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                    {pick('موردی ثبت نشده است.', 'No data yet.', 'لا معلومات نشته.')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{pick('هشدارهای اخیر', 'Recent alerts', 'وروستۍ خبرتیاوې')}</CardTitle>
              <CardDescription>
                {pick(
                  'آخرین رویدادهای مشکوک ثبت‌شده در Audit Log.',
                  'Latest suspicious events from the audit log.',
                  'له Audit Log څخه وروستۍ مشکوکې پېښې.'
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {(payload?.alerts || []).length ? (
                  payload!.alerts.map((alert) => (
                    <div key={`${alert.timestamp}-${alert.action}`} className="rounded-xl border border-border/70 bg-background/70 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Badge variant="outline">{alert.action}</Badge>
                        <div className="text-xs text-muted-foreground">{new Date(alert.timestamp).toLocaleString(locale)}</div>
                      </div>
                      {alert.details ? <div className="mt-2 whitespace-pre-wrap break-words text-xs text-muted-foreground">{alert.details}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                    {pick('هشداری ثبت نشده است.', 'No alerts.', 'هېڅ خبرتیا نشته.')}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>{pick('یادداشت مهم', 'Important note', 'مهم يادښت')}</CardTitle>
            <CardDescription>
              {pick(
                'در وب، گرفتن MAC آدرس کاربران ممکن نیست. برای پیگیری، از IP/UA و لاگ‌های سیستم استفاده کنید.',
                'On the web you cannot capture user MAC addresses. Use IP/UA + audit logs for investigation.',
                'په وېب کې د کاروونکي MAC ادرس نه شي ترلاسه کېدای. د پلټنې لپاره IP/UA او لاګونه وکاروئ.'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <ul className="list-disc space-y-1 pl-5">
              <li>{pick('برای بلاک کردن IPها، از Admin → System → Security → IP blocklist استفاده کنید.', 'To block IPs, use Admin → System → Security → IP blocklist.', 'د IP بندولو لپاره Admin → System → Security → IP blocklist وکاروئ.')}</li>
              <li>{pick('برای بررسی دقیق‌تر، به Audit Logs مراجعه کنید.', 'For deeper review, open Audit Logs.', 'د ژورې کتنې لپاره Audit Logs وګورئ.')}</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

