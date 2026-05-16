'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowRightLeft, Plus, TrendingUp, TrendingDown, DollarSign, Calendar, Building2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedNumber } from '@/lib/locale'

interface ExchangeStats {
  today: StatsData
  week: StatsData
  month: StatsData
  year: StatsData
  allTime: StatsData
  currencyBreakdown: CurrencyPair[]
  branchBreakdown?: BranchProfit[]
  recentExchanges: Exchange[]
}

interface StatsData {
  count: number
  volume: number
  profit: number
  systemFee: number
  waivedSystemFee: number
  creditsUsed: number
}

interface CurrencyPair {
  pair: string
  count: number
  volume: number
  converted: number
  profit: number
}

interface BranchProfit {
  branchId: string | null
  branchName: string
  branchCity: string
  count: number
  volume: number
  profit: number
  systemFee: number
  waivedSystemFee: number
}

interface Exchange {
  id: string
  referenceCode: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  rate: number
  sarafCommission: number
  systemCommission: number
  creditsDeducted: number
  senderName: string
  createdAt: string
  originBranch: {
    name: string
    city: string
  }
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatMoney(value: number, language: Language) {
  return formatLocalizedNumber(value, language, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
}

export default function ExchangePage() {
  const { language } = useLanguage()
  const [stats, setStats] = useState<ExchangeStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('today')

  const t = {
    title: pick(language, 'تبادله ارز', 'Currency Exchange', 'د اسعارو تبادله'),
    subtitle: pick(language, 'مدیریت تبادلات ارزی', 'Manage currency exchanges', 'د اسعارو تبادلې مدیریت'),
    newExchange: pick(language, 'تبادله جدید', 'New Exchange', 'نوې تبادله'),
    today: pick(language, 'امروز', 'Today', 'نن'),
    week: pick(language, 'هفته', 'Week', 'اونۍ'),
    month: pick(language, 'ماه', 'Month', 'میاشت'),
    year: pick(language, 'سال', 'Year', 'کال'),
    allTime: pick(language, 'کل زمان', 'All Time', 'ټول وخت'),
    transactions: pick(language, 'تراکنش', 'Transactions', 'معاملې'),
    volume: pick(language, 'حجم معاملات', 'Volume', 'حجم'),
    profit: pick(language, 'سود', 'Profit', 'ګټه'),
    systemFee: pick(language, 'کمیسیون سیستم', 'System Fee', 'د سیسټم فیس'),
    waivedSystemFee: pick(language, 'فیس بخشوده‌شده', 'Waived Fee', 'بښل شوی فیس'),
    creditsUsed: pick(language, 'کریدیت مصرفی', 'Credits Used', 'کریډیټ کارول شوی'),
    currencyPairs: pick(language, 'جفت ارزها', 'Currency Pairs', 'د اسعارو جوړې'),
    recentExchanges: pick(language, 'تبادلات اخیر', 'Recent Exchanges', 'وروستۍ تبادلې'),
    branchProfit: pick(language, 'سود تبادله به تفکیک شعب', 'Exchange Profit by Branch', 'د تبادلې ګټه د څانګو له مخې'),
    code: pick(language, 'کد', 'Code', 'کوډ'),
    customer: pick(language, 'مشتری', 'Customer', 'پیرودونکی'),
    from: pick(language, 'از', 'From', 'له'),
    to: pick(language, 'به', 'To', 'ته'),
    amount: pick(language, 'مبلغ', 'Amount', 'اندازه'),
    rate: pick(language, 'نرخ', 'Rate', 'نرخ'),
    commission: pick(language, 'کمیسیون', 'Commission', 'کمیشن'),
    branch: pick(language, 'شعبه', 'Branch', 'څانګه'),
    date: pick(language, 'تاریخ', 'Date', 'نېټه'),
    loading: pick(language, 'در حال بارگذاری...', 'Loading...', 'بارېږي...'),
    noData: pick(language, 'هیچ داده‌ای یافت نشد', 'No data found', 'هېڅ معلومات ونه موندل شول'),
  }

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/portal/exchange/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const getActiveStats = (): StatsData | null => {
    if (!stats) return null
    switch (activeTab) {
      case 'today': return stats.today
      case 'week': return stats.week
      case 'month': return stats.month
      case 'year': return stats.year
      case 'allTime': return stats.allTime
      default: return stats.today
    }
  }

  const activeStats = getActiveStats()

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold mb-2">{t.title}</h1>
              <p className="text-purple-50 text-lg">{t.subtitle}</p>
            </div>
            <Link href="/portal/exchange/new">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-purple-50 dark:text-purple-600">
                <Plus className="h-5 w-5 mr-2" />
                {t.newExchange}
              </Button>
            </Link>
          </div>
        </div>

        <div className="space-y-6 px-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="today">{t.today}</TabsTrigger>
              <TabsTrigger value="week">{t.week}</TabsTrigger>
              <TabsTrigger value="month">{t.month}</TabsTrigger>
              <TabsTrigger value="year">{t.year}</TabsTrigger>
              <TabsTrigger value="allTime">{t.allTime}</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="space-y-6 mt-6">
              {loading ? (
                <div className="text-center py-12">{t.loading}</div>
              ) : activeStats ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <Card className="glass-card border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {t.transactions}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">{activeStats.count}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <ArrowRightLeft className="h-3 w-3 mr-1" />
                          {t.transactions}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {t.volume}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">
                          ${formatMoney(activeStats.volume, language)}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <DollarSign className="h-3 w-3 mr-1" />
                          {t.volume}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">
                          {t.profit}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                          ${formatMoney(activeStats.profit, language)}
                        </div>
                        <div className="flex items-center text-xs text-green-600 dark:text-green-400 mt-1">
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {t.profit}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-0 bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-orange-600 dark:text-orange-400">
                          {t.systemFee}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                          ${formatMoney(activeStats.systemFee, language)}
                        </div>
                        <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          {t.waivedSystemFee}: ${formatMoney(activeStats.waivedSystemFee, language)}
                        </div>
                        <div className="flex items-center text-xs text-orange-600 dark:text-orange-400 mt-1">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          {t.systemFee}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="glass-card border-0">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          {t.creditsUsed}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-3xl font-bold text-foreground">{activeStats.creditsUsed}</div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          {t.creditsUsed}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {stats?.currencyBreakdown && stats.currencyBreakdown.length > 0 && (
                    <Card className="glass-card border-0">
                      <CardHeader>
                        <CardTitle className="text-foreground">{t.currencyPairs}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {stats.currencyBreakdown.map((pair, index) => (
                            <div key={index} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                                  {pair.pair.split('/')[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{pair.pair}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {pair.count} {t.transactions}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-600 dark:text-green-400">
                                  ${formatMoney(pair.profit, language)}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {t.volume}: ${formatMoney(pair.volume, language)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {stats?.branchBreakdown && stats.branchBreakdown.length > 0 && (
                    <Card className="glass-card border-0">
                      <CardHeader>
                        <CardTitle className="text-foreground">{t.branchProfit}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {stats.branchBreakdown.map((branch) => (
                            <div key={branch.branchId || branch.branchName} className="flex items-center justify-between p-4 bg-muted rounded-lg">
                              <div>
                                <div className="font-bold text-foreground">{branch.branchName}</div>
                                <div className="text-sm text-muted-foreground">{branch.branchCity}</div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-green-600 dark:text-green-400">${formatMoney(branch.profit, language)}</div>
                              <div className="text-xs text-muted-foreground">
                                {t.transactions}: {branch.count} | {t.volume}: ${formatMoney(branch.volume, language)}
                              </div>
                              <div className="text-xs text-amber-600 dark:text-amber-400">
                                {t.waivedSystemFee}: ${formatMoney(branch.waivedSystemFee, language)}
                              </div>
                            </div>
                          </div>
                        ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {stats?.recentExchanges && stats.recentExchanges.length > 0 && (
                    <Card className="glass-card border-0">
                      <CardHeader>
                        <CardTitle className="text-foreground">{t.recentExchanges}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {stats.recentExchanges.map((exchange) => (
                            <div key={exchange.id} className="flex items-center justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                              <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold text-sm">
                                  {exchange.fromCurrency}
                                </div>
                                <div>
                                  <div className="font-bold text-foreground">{exchange.referenceCode}</div>
                                  <div className="text-sm text-muted-foreground">{exchange.senderName}</div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Building2 className="h-3 w-3" />
                                    {exchange.originBranch.name} - {exchange.originBranch.city}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold text-foreground">
                                  {formatMoney(exchange.fromAmount, language)} {exchange.fromCurrency} → {formatMoney(exchange.toAmount, language)} {exchange.toCurrency}
                                </div>
                                <div className="text-sm text-green-600 dark:text-green-400">
                                  {t.profit}: ${formatMoney(exchange.sarafCommission, language)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(exchange.createdAt).toLocaleDateString(language === 'en' ? 'en-US' : 'fa-IR')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground">{t.noData}</div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}
