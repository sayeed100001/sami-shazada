'use client'

import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, DollarSign, Users, Calendar, Download, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'
import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { isPortalRole } from '@/lib/portal-access'
import { useLanguage } from '@/hooks/useLanguage'

interface PeriodSummary {
  totalTransactions: number
  totalVolume: number
  totalFees: number
  totalWaivedSystemRevenue: number
  totalBranchProfit: number
  totalDiscountCost: number
  netSystemRevenue: number
}

interface SarafReportData {
  totalTransactions: number
  completedTransactions: number
  totalVolume: number
  totalFees: number
  totalWaivedSystemRevenue: number
  freeTrialWaivedSystemRevenue: number
  freeAccessWaivedSystemRevenue: number
  totalBranchProfit: number
  totalDiscountCost: number
  netSystemRevenue: number
  averageTransaction: number
  monthlyGrowth: number
  topCurrencies: Array<{
    currency: string
    volume: number
    count: number
  }>
  dailyStats: Array<{
    date: string
    transactions: number
    volume: number
    systemRevenue: number
    waivedSystemRevenue: number
    branchProfit: number
    discountCost: number
  }>
  branchPerformance?: Array<{
    branchId: string
    branchName: string
    city: string
    country: string
    totalTransactions: number
    completedTransactions: number
    incomingTransactions: number
    outgoingTransactions: number
    totalVolume: number
    systemRevenue: number
    waivedSystemRevenue: number
    branchProfit: number
    discountCost: number
  }>
  periodSummaries?: {
    day: PeriodSummary
    week: PeriodSummary
    month: PeriodSummary
    year: PeriodSummary
  }
  accessMode?: 'OWNER' | 'BRANCH'
}

export default function PortalReportsPage() {
  const { data: session, status } = useSession()
  const { language } = useLanguage()
  const [period, setPeriod] = useState('30d')
  const [exporting, setExporting] = useState(false)

  const { data: reportData, isLoading } = useQuery({
    queryKey: ['saraf-reports', period],
    queryFn: async (): Promise<SarafReportData> => {
      const response = await fetch(`/api/portal/reports?period=${period}`)
      if (!response.ok) throw new Error('Failed to fetch reports')
      return response.json()
    },
    enabled: isPortalRole(session?.user?.role),
  })

  const handleExportReport = async () => {
    if (!reportData) return
    
    setExporting(true)
    try {
      // Create CSV content
      const csvRows: Array<Array<string | number>> = []
      csvRows.push(['گزارش مالی صرافی', '', '', ''])
      csvRows.push(['دوره:', period, '', ''])
      csvRows.push(['تاریخ:', new Date().toLocaleDateString('fa-AF'), '', ''])
      csvRows.push([])
      csvRows.push(['خلاصه کلی', '', '', ''])
      csvRows.push(['کل تراکنشها', reportData.totalTransactions, '', ''])
      csvRows.push(['تراکنشهای تکمیل شده', reportData.completedTransactions, '', ''])
      csvRows.push(['حجم کل', reportData.totalVolume, 'AFN', ''])
      csvRows.push(['درآمد خالص سیستم', reportData.netSystemRevenue, 'AFN', ''])
      csvRows.push(['درآمد بخشوده شده در حالت رایگان', reportData.totalWaivedSystemRevenue, 'AFN', ''])
      csvRows.push(['سود شعب', reportData.totalBranchProfit, 'AFN', ''])
      csvRows.push([])
      
      if (reportData.branchPerformance && reportData.branchPerformance.length > 0) {
        csvRows.push(['عملکرد شعب', '', '', ''])
        csvRows.push(['نام شعبه', 'شهر', 'تراکنشها', 'حجم', 'سود شعبه', 'درآمد سیستم', 'زیان رایگان'])
        reportData.branchPerformance.forEach(branch => {
          csvRows.push([
            branch.branchName,
            branch.city,
            branch.totalTransactions.toString(),
            branch.totalVolume.toString(),
            branch.branchProfit.toString(),
            branch.systemRevenue.toString(),
            branch.waivedSystemRevenue.toString()
          ])
        })
        csvRows.push([])
      }
      
      csvRows.push(['عملکرد روزانه', '', '', ''])
      csvRows.push(['تاریخ', 'تراکنشها', 'حجم', 'درآمد سیستم', 'زیان رایگان'])
      reportData.dailyStats.forEach(day => {
        csvRows.push([
          new Date(day.date).toLocaleDateString('fa-AF'),
          day.transactions.toString(),
          day.volume.toString(),
          day.systemRevenue.toString(),
          day.waivedSystemRevenue.toString()
        ])
      })
      
      const csvContent = csvRows.map(row => row.join(',')).join('\n')
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `report-${period}-${Date.now()}.csv`
      link.click()
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setExporting(false)
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {language === 'fa' ? 'در حال بارگذاری...' : language === 'en' ? 'Loading...' : 'بارېږي...'}
          </p>
        </div>
      </DashboardLayout>
    )
  }

  if (!isPortalRole(session?.user?.role)) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">دسترسی غیرمجاز</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Link href="/portal">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    بازگشت
                  </Button>
                </Link>
              </div>
              <h1 className="text-4xl font-bold mb-2">گزارشات مالی</h1>
              <p className="text-green-50 text-lg">آمار و گزارشات عملکرد صرافی و شعب</p>
            </div>
            <div className="flex items-center gap-4">
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger className="w-48 bg-white/20 border-white/30 text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1d">امروز</SelectItem>
                  <SelectItem value="7d">۷ روز گذشته</SelectItem>
                  <SelectItem value="30d">۳۰ روز گذشته</SelectItem>
                  <SelectItem value="90d">۹۰ روز گذشته</SelectItem>
                  <SelectItem value="365d">۳۶۵ روز گذشته</SelectItem>
                </SelectContent>
              </Select>
              <Button className="bg-white/20 hover:bg-white/30 border-white/30" onClick={handleExportReport}>
                <Download className="h-4 w-4 mr-2" />
                دانلود گزارش
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-8 px-2">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="loading-spinner mx-auto" />
              <p className="text-muted-foreground mt-2">در حال تولید گزارش...</p>
            </div>
          ) : reportData ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">کل تراکنش‌ها</p>
                        <p className="text-2xl font-bold">{reportData.totalTransactions}</p>
                        <p className="text-xs text-green-600">+{reportData.monthlyGrowth.toFixed(1)}% نسبت به دوره قبل</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                        <DollarSign className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">حجم کل</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.totalVolume, 'AFN')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-violet-500 flex items-center justify-center shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">درآمد خالص سیستم</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.netSystemRevenue, 'AFN')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shadow-lg">
                        <Calendar className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">سود شعب</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.totalBranchProfit, 'AFN')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg">
                        <TrendingUp className="h-6 w-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">زیان ناشی از حالت رایگان</p>
                        <p className="text-2xl font-bold">{formatCurrency(reportData.totalWaivedSystemRevenue, 'AFN')}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {reportData.periodSummaries && (
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle>خلاصه سود و زیان</CardTitle>
                    <CardDescription>دید روزانه، هفتگی، ماهانه و سالانه</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                      {([
                        ['امروز', reportData.periodSummaries.day],
                        ['هفته', reportData.periodSummaries.week],
                        ['ماه', reportData.periodSummaries.month],
                        ['سال', reportData.periodSummaries.year],
                      ] as Array<[string, PeriodSummary]>).map(([label, summary]) => (
                        <div key={label} className="rounded-xl border p-4 space-y-2">
                          <p className="font-semibold">{label}</p>
                          <p className="text-sm text-muted-foreground">{summary.totalTransactions} تراکنش</p>
                          <p className="text-sm">درآمد سیستم: {formatCurrency(summary.netSystemRevenue, 'AFN')}</p>
                          <p className="text-sm">زیان رایگان: {formatCurrency(summary.totalWaivedSystemRevenue, 'AFN')}</p>
                          <p className="text-sm">سود شعب: {formatCurrency(summary.totalBranchProfit, 'AFN')}</p>
                          <p className="text-sm">تخفیف اعطاشده: {formatCurrency(summary.totalDiscountCost, 'AFN')}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>ارزهای پر تراکنش</CardTitle>
                  <CardDescription>ارزهایی که بیشترین حجم تراکنش را داشته‌اند</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topCurrencies.map((currency, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{currency.currency}</p>
                            <p className="text-sm text-muted-foreground">{currency.count} تراکنش</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(currency.volume, currency.currency)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {reportData.branchPerformance && reportData.branchPerformance.length > 0 && (
                <Card className="glass-card border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      عملکرد شعب
                    </CardTitle>
                    <CardDescription>مقایسه شعب بر اساس حجم و سود</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {reportData.branchPerformance.map((branch) => (
                        <div key={branch.branchId} className="rounded-xl border p-4">
                          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                            <div>
                              <p className="font-semibold">{branch.branchName}</p>
                              <p className="text-sm text-muted-foreground">
                                {branch.city}, {branch.country}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">تراکنش</p>
                                <p className="font-medium">{branch.totalTransactions}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">حجم</p>
                                <p className="font-medium">{formatCurrency(branch.totalVolume, 'AFN')}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">سود شعبه</p>
                                <p className="font-medium">{formatCurrency(branch.branchProfit, 'AFN')}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">درآمد سیستم</p>
                                <p className="font-medium">
                                  {formatCurrency(branch.systemRevenue, 'AFN')}
                                </p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">زیان رایگان</p>
                                <p className="font-medium">{formatCurrency(branch.waivedSystemRevenue, 'AFN')}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Card className="glass-card border-0">
                <CardHeader>
                  <CardTitle>عملکرد روزانه</CardTitle>
                  <CardDescription>آمار تراکنش‌ها، درآمد سیستم و سود شعب</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.dailyStats.slice(0, 7).map((day, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <p className="font-medium">{new Date(day.date).toLocaleDateString('fa-AF')}</p>
                          <p className="text-sm text-muted-foreground">{day.transactions} تراکنش</p>
                        </div>
                        <div className="text-right text-sm">
                          <p className="font-bold">{formatCurrency(day.volume, 'AFN')}</p>
                          <p className="text-muted-foreground">
                            سیستم: {formatCurrency(day.systemRevenue, 'AFN')}
                          </p>
                          <p className="text-muted-foreground">
                            زیان رایگان: {formatCurrency(day.waivedSystemRevenue, 'AFN')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">خطا در بارگذاری گزارشات</p>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
