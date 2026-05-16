'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, Users, DollarSign, Building, Download, RefreshCw, BarChart3 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/hooks/useLanguage'

interface ReportData {
  users?: {
    totalUsers: number
    newUsers: number
    activeUsers: number
    usersByRole: Array<{ role: string; _count: number }>
  }
  sarafs?: {
    totalSarafs: number
    approvedSarafs: number
    pendingSarafs: number
    premiumSarafs: number
  }
  transactions?: {
    totalTransactions: number
    completedTransactions: number
    pendingTransactions: number
    totalVolume: number
  }
  financial?: {
    reportingCurrency?: string
    totalVolume: number
    totalFees: number
    hawalaRevenue: number
    exchangeRevenue: number
    totalBranchProfit: number
    totalDiscountCost: number
    totalWaivedSystemRevenue: number
    freeTrialWaivedSystemRevenue: number
    freeAccessWaivedSystemRevenue: number
    netSystemRevenue: number
    creditRevenue: number
    creditDiscountCost: number
    subscriptionCreditsConsumed: number
    promotionRevenue: number
    advertisementRevenue: number
    totalCollectedRevenue: number
    transactionsByType: Array<{ type: string; _sum: { toAmount: number }; _count: number }>
  }
  topSarafs?: Array<{
    name: string
    transactions: number
    volume: number
  }>
  topUsers?: Array<{
    userId?: string | null
    name: string
    volume: number
    transactions: number
    discountSaved: number
  }>
  requestedReportType?: string
}

const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('fa-AF', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0
  }).format(amount)
}

const getTransactionTypeLabel = (type: string) => {
  const labels = {
    'HAWALA': 'حواله',
    'EXCHANGE': 'تبدیل ارز',
    'CRYPTO': 'رمزارز'
  }
  return labels[type as keyof typeof labels] || type
}

export default function AdminReportsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [reportData, setReportData] = useState<ReportData>({})
  const [reportType, setReportType] = useState('overview')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchReportData()
  }, [session, status, router, reportType])

  const fetchReportData = async () => {
    setIsLoading(true)
    setError('')
    try {
      const response = await fetch(`/api/admin/reports?type=${reportType}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch report data')
      setReportData(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'خطا در بارگذاری گزارش')
    } finally {
      setIsLoading(false)
    }
  }

  const exportReport = async (format: string) => {
    try {
      const response = await fetch(`/api/admin/reports/export?type=${reportType}&format=${format}`)
      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Export failed')
      }
      
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      const extension = format === 'excel' ? 'xls' : format
      a.download = `report-${reportType}-${new Date().toISOString().split('T')[0]}.${extension}`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'خطا در خروجی گزارش')
    }
  }

  if (status === 'loading' || !session) {
    return <div>در حال بارگذاری...</div>
  }

  if (session.user.role !== 'ADMIN') {
    return <div>دسترسی غیرمجاز</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500 via-emerald-500 to-teal-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <BarChart3 className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('admin.reports')}</h1>
            </div>
            <p className="text-green-50 text-lg">{t('admin.reports.heroSubtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-teal-400/20 rounded-full blur-3xl"></div>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
          <Select value={reportType} onValueChange={setReportType}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="overview">کلی</SelectItem>
              <SelectItem value="financial">مالی</SelectItem>
              <SelectItem value="users">کاربران</SelectItem>
              <SelectItem value="sarafs">صرافان</SelectItem>
              <SelectItem value="transactions">تراکنشها</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" onClick={fetchReportData} disabled={isLoading} className="w-full sm:w-auto">
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => exportReport('excel')} variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            Excel
          </Button>
          <Button onClick={() => exportReport('pdf')} variant="outline" className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          
          <Button onClick={() => exportReport('csv')} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            خروجی CSV
          </Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="loading-spinner mx-auto" />
            <p className="text-muted-foreground mt-2">در حال تولید گزارش...</p>
          </div>
        ) : reportData ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">کل کاربران</p>
                      <p className="text-2xl font-bold">{reportData.users?.totalUsers || 0}</p>
                      <p className="text-xs text-green-600">
                        {(reportData.users?.newUsers || 0).toLocaleString('fa-IR')} جدید در ۳۰ روز اخیر
                      </p>
                    </div>
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Users className="h-8 w-8 text-blue-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">صرافان فعال</p>
                      <p className="text-2xl font-bold">{reportData.sarafs?.totalSarafs || 0}</p>
                    </div>
                    <div className="p-3 bg-green-500/10 rounded-xl">
                      <Building className="h-8 w-8 text-green-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">کل تراکنشها</p>
                      <p className="text-2xl font-bold">{reportData.transactions?.totalTransactions || 0}</p>
                    </div>
                    <div className="p-3 bg-purple-500/10 rounded-xl">
                      <TrendingUp className="h-8 w-8 text-purple-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">حجم کل</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(reportData.financial?.totalVolume || 0, 'AFN')}
                      </p>
                    </div>
                    <div className="p-3 bg-orange-500/10 rounded-xl">
                      <DollarSign className="h-8 w-8 text-orange-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Net system revenue (USD)</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(reportData.financial?.netSystemRevenue || 0, 'USD')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Fees minus system-funded discounts</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Free-mode waived revenue (USD)</p>
                  <p className="text-2xl font-bold text-amber-600">
                    {formatCurrency(reportData.financial?.totalWaivedSystemRevenue || 0, 'USD')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Trial: {formatCurrency(reportData.financial?.freeTrialWaivedSystemRevenue || 0, 'USD')}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Free access: {formatCurrency(reportData.financial?.freeAccessWaivedSystemRevenue || 0, 'USD')}
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Branch profit total (USD)</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(reportData.financial?.totalBranchProfit || 0, 'USD')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Profit kept by sarafs and branches</p>
                </CardContent>
              </Card>

              <Card className="glass-card hover-lift">
                <CardContent className="p-6">
                  <p className="text-sm text-muted-foreground">Total collected revenue (USD)</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(reportData.financial?.totalCollectedRevenue || 0, 'USD')}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Transactions, credits, promotions, ads</p>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Revenue by section</CardTitle>
                <CardDescription>Admin-visible system collections split by source in USD equivalent</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: 'Hawala system revenue', value: reportData.financial?.hawalaRevenue || 0 },
                    { label: 'Exchange system revenue', value: reportData.financial?.exchangeRevenue || 0 },
                    { label: 'Advertisement revenue', value: reportData.financial?.advertisementRevenue || 0 },
                    { label: 'Credit sales revenue', value: reportData.financial?.creditRevenue || 0 },
                    { label: 'Promotion revenue', value: reportData.financial?.promotionRevenue || 0 },
                  ].map((item) => (
                    <div key={item.label} className="rounded-lg border p-4">
                      <p className="text-sm text-muted-foreground">{item.label}</p>
                      <p className="mt-2 text-2xl font-bold">{formatCurrency(item.value, 'USD')}</p>
                    </div>
                  ))}
                  <div className="rounded-lg border p-4">
                    <p className="text-sm text-muted-foreground">Subscription credits consumed</p>
                    <p className="mt-2 text-2xl font-bold">
                      {(reportData.financial?.subscriptionCreditsConsumed || 0).toLocaleString('en-US')} credits
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>برترین صرافان</CardTitle>
                <CardDescription>صرافان با بیشترین حجم تراکنش</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(reportData.topSarafs || []).map((saraf, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{saraf.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {saraf.transactions} تراکنش
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(saraf.volume, 'AFN')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>Top transfer users</CardTitle>
                <CardDescription>Users with the highest transfer volume and system-funded savings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(reportData.topUsers || []).map((user, index) => (
                    <div key={`${user.userId || user.name}-${index}`} className="flex items-center justify-between rounded-lg border p-4">
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-sm text-muted-foreground">{user.transactions} transfers</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{formatCurrency(user.volume, 'AFN')}</p>
                        <p className="text-sm text-muted-foreground">
                          Saved {formatCurrency(user.discountSaved, 'AFN')}
                        </p>
                      </div>
                    </div>
                  ))}
                  {(reportData.topUsers || []).length === 0 && (
                    <p className="text-sm text-muted-foreground">No user transfer rankings available yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card">
              <CardHeader>
                <CardTitle>تراکنشها بر اساس نوع</CardTitle>
                <CardDescription>توزیع انواع تراکنشها</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {(reportData.financial?.transactionsByType || []).map((type, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-blue-500 rounded"></div>
                        <span>{getTransactionTypeLabel(type.type)}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">{type._count} تراکنش</span>
                        <span className="font-bold">{Math.round((type._count / (reportData.transactions?.totalTransactions || 1)) * 100)}%</span>
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
    </DashboardLayout>
  )
}
