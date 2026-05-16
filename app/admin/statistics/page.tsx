'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useLanguage } from '@/hooks/useLanguage'

type SnapshotMeta = {
  id: string
  label: string | null
  createdAt: string
  createdBy: string | null
}

export default function AdminStatisticsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()

  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([])
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string | null>(null)
  const [snapshotPayload, setSnapshotPayload] = useState<any>(null)
  const [currentStats, setCurrentStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const copy = useMemo(() => {
    return {
      title: language === 'fa' ? 'آمار و تاریخچه سیستم' : language === 'en' ? 'System statistics & history' : 'د سیسټم احصایې او تاریخچه',
      subtitle:
        language === 'fa'
          ? 'مشاهده کامل آمار (قبل از ریست) و جزئیات سود/تراکنش‌ها'
          : language === 'en'
            ? 'View full stats (before reset) and detailed profit/transactions'
            : 'بشپړ احصایې (د ریست مخکې) او د ګټې/لېږدونو جزئیات وګورئ',
      back: language === 'fa' ? 'بازگشت به داشبورد' : language === 'en' ? 'Back to dashboard' : 'ډشبورډ ته بېرته',
      current: language === 'fa' ? 'آمار فعلی (بعد از ریست)' : language === 'en' ? 'Current stats (since reset)' : 'اوسنۍ احصایې (د ریست وروسته)',
      snapshots: language === 'fa' ? 'اسنپ‌شات‌ها (قبل از ریست)' : language === 'en' ? 'Snapshots (before reset)' : 'سناپ‌شاټونه (د ریست مخکې)',
      view: language === 'fa' ? 'مشاهده' : language === 'en' ? 'View' : 'کتل',
      none: language === 'fa' ? 'موردی یافت نشد' : language === 'en' ? 'No items found' : 'هیڅ ونه موندل شول',
      rawJson: language === 'fa' ? 'نمایش JSON' : language === 'en' ? 'Show JSON' : 'JSON وښایه',
    }
  }, [language])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') return

    setLoading(true)
    Promise.all([
      fetch('/api/admin/stats?refresh=1', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/admin/stats/snapshots?take=30', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([stats, snaps]) => {
        setCurrentStats(stats)
        setSnapshots(snaps?.snapshots || [])
      })
      .finally(() => setLoading(false))
  }, [session])

  useEffect(() => {
    if (!selectedSnapshotId) {
      setSnapshotPayload(null)
      return
    }
    fetch(`/api/admin/stats/snapshots/${selectedSnapshotId}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setSnapshotPayload(data?.snapshot?.payload || null))
      .catch(() => setSnapshotPayload(null))
  }, [selectedSnapshotId])

  if (status === 'loading' || loading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          {language === 'fa' ? 'در حال بارگذاری...' : language === 'en' ? 'Loading...' : 'بارېږي...'}
        </div>
      </DashboardLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const StatLine = ({ label, value }: { label: string; value: any }) => (
    <div className="flex items-center justify-between rounded-lg border p-3">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="font-bold">{typeof value === 'number' ? value : String(value ?? '')}</div>
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">{copy.title}</h1>
            <p className="text-sm text-muted-foreground">{copy.subtitle}</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/admin">{copy.back}</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{copy.current}</CardTitle>
              <CardDescription>
                {language === 'fa'
                  ? 'این اعداد از ریست آخر محاسبه می‌شوند و تاریخچه حذف نمی‌شود.'
                  : language === 'en'
                    ? 'These numbers are computed since the last reset; history is not deleted.'
                    : 'دا شمېرې د وروستي ریست وروسته حسابېږي؛ تاریخچه نه ړنګېږي.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <StatLine label="totalUsers" value={currentStats?.totalUsers} />
              <StatLine label="totalSarafs" value={currentStats?.totalSarafs} />
              <StatLine label="pendingSarafs" value={currentStats?.pendingSarafs} />
              <StatLine label="totalTransactions" value={currentStats?.totalTransactions} />
              <StatLine label="pendingTransactions" value={currentStats?.pendingTransactions} />
              <StatLine label="totalVolume" value={currentStats?.totalVolume} />
              <StatLine label="hawalaProfit" value={currentStats?.revenue?.breakdown?.hawalaProfit} />
              <StatLine label="hawalaWaivedRevenue" value={currentStats?.revenue?.breakdown?.hawalaWaivedRevenue} />
              <StatLine label="exchangeProfit" value={currentStats?.revenue?.breakdown?.exchangeProfit} />
              <StatLine label="exchangeWaivedRevenue" value={currentStats?.revenue?.breakdown?.exchangeWaivedRevenue} />
              <StatLine label="waivedRevenueTotal" value={currentStats?.revenue?.breakdown?.totalWaivedRevenue} />
              <StatLine label="freeTrialWaivedRevenue" value={currentStats?.revenue?.breakdown?.freeTrialWaivedRevenue} />
              <StatLine label="freeAccessWaivedRevenue" value={currentStats?.revenue?.breakdown?.freeAccessWaivedRevenue} />
              <StatLine label="promotionRevenue" value={currentStats?.revenue?.breakdown?.promotionRevenue} />
              <StatLine label="advertisementRevenue" value={currentStats?.revenue?.breakdown?.advertisementRevenue} />
              <StatLine label="totalSystemBenefit" value={currentStats?.revenue?.breakdown?.totalSystemBenefit} />
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle>{copy.snapshots}</CardTitle>
              <CardDescription>
                {language === 'fa'
                  ? 'قبل از هر ریست، یک اسنپ‌شات کامل ذخیره می‌شود.'
                  : language === 'en'
                    ? 'Before each reset, a full snapshot is stored.'
                    : 'د هر ریست څخه مخکې بشپړ سناپ‌شاټ خوندي کېږي.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {snapshots.length === 0 ? (
                <div className="text-sm text-muted-foreground">{copy.none}</div>
              ) : (
                <div className="space-y-2">
                  {snapshots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSelectedSnapshotId(s.id)}
                      className={`w-full text-left rounded-lg border p-3 hover:bg-muted transition ${
                        selectedSnapshotId === s.id ? 'border-indigo-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium line-clamp-1">{s.label || s.id}</div>
                        <Badge variant="secondary">{new Date(s.createdAt).toLocaleString()}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">{s.id}</div>
                    </button>
                  ))}
                </div>
              )}

              {selectedSnapshotId ? (
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold">{copy.view}</div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!snapshotPayload) return
                        const text = JSON.stringify(snapshotPayload, null, 2)
                        navigator.clipboard?.writeText(text).catch(() => {})
                      }}
                    >
                      {copy.rawJson}
                    </Button>
                  </div>
                  <pre className="mt-2 max-h-[320px] overflow-auto rounded-lg bg-muted p-3 text-xs">
                    {snapshotPayload ? JSON.stringify(snapshotPayload, null, 2) : '...'}
                  </pre>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
