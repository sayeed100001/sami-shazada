'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ExchangeRates } from '@/components/dashboard/exchange-rates'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TrendingUp, TrendingDown, RefreshCw, Calculator, ArrowRightLeft, DollarSign, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useLanguage } from '@/hooks/useLanguage'

interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdate: string
  source: string
}

const currencies = [
  { code: 'USD', name: 'دلار آمریکا', flag: '🇺🇸' },
  { code: 'EUR', name: 'یورو', flag: '🇪🇺' },
  { code: 'GBP', name: 'پوند انگلیس', flag: '🇬🇧' },
  { code: 'AFN', name: 'افغانی افغانستان', flag: '🇦🇫' },
  { code: 'PKR', name: 'روپیه پاکستان', flag: '🇵🇰' },
  { code: 'IRR', name: 'ریال ایران', flag: '🇮🇷' }
]

export default function RatesPage() {
  const { t } = useLanguage()
  const [amount, setAmount] = useState('1000')
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('AFN')
  const [convertedAmount, setConvertedAmount] = useState<number | null>(null)
  const [converting, setConverting] = useState(false)

  const { data: rates, isLoading, refetch } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async (): Promise<ExchangeRate[]> => {
      const response = await fetch('/api/rates')
      if (!response.ok) throw new Error('Failed to fetch rates')
      return response.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  const handleConvert = async () => {
    if (!amount || isNaN(Number(amount))) return
    
    setConverting(true)
    try {
      const response = await fetch(`/api/rates/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`)
      if (!response.ok) throw new Error('Failed to convert')
      const data = await response.json()
      setConvertedAmount(data.result)
    } catch (error) {
      console.error('Conversion error:', error)
    } finally {
      setConverting(false)
    }
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setConvertedAmount(null)
  }

  const getMainRates = () => {
    if (!rates) return []
    return [
      rates.find(r => r.from === 'USD' && r.to === 'AFN'),
      rates.find(r => r.from === 'EUR' && r.to === 'AFN'),
      rates.find(r => r.from === 'PKR' && r.to === 'AFN')
    ].filter(Boolean) as ExchangeRate[]
  }

  const getTrendIcon = (rate: number) => {
    // Simple trend logic based on rate value
    return rate > 1 ? TrendingUp : TrendingDown
  }

  const getTrendColor = (rate: number) => {
    return rate > 1 ? 'text-green-600' : 'text-red-600'
  }

  useEffect(() => {
    if (!amount || !fromCurrency || !toCurrency || isNaN(Number(amount))) {
      setConvertedAmount(null)
      return
    }

    const timeoutId = window.setTimeout(() => {
      void handleConvert()
    }, 500)

    return () => window.clearTimeout(timeoutId)
  }, [amount, fromCurrency, toCurrency])

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-semibold">بروزرسانی لحظهای</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black mb-3">{t('rates')}</h1>
                <p className="text-lg text-white/90">
                  نرخهای لحظهای ارزهای مختلف و تبدیل ارز
                </p>
              </div>
              <Button 
                onClick={() => refetch()} 
                disabled={isLoading}
                className="bg-white text-emerald-600 hover:bg-white/90 font-bold shadow-lg"
                size="lg"
              >
                <RefreshCw className={`ml-2 h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
            </div>
          </div>
          <div className="absolute -bottom-10 -right-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -top-10 -left-10 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl" />
        </div>

        {/* Currency Converter */}
        <Card className="glass-card border-0 shadow-2xl overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 to-transparent dark:from-emerald-950/20" />
          <CardHeader className="relative z-10">
            <CardTitle className="flex items-center gap-2 text-2xl">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900 rounded-xl">
                <Calculator className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              تبدیل ارز
            </CardTitle>
            <CardDescription className="text-base">
              تبدیل سریع بین ارزهای مختلف با نرخهای واقعی
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <Label htmlFor="amount" className="text-base font-semibold">مقدار</Label>
                <Input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1000"
                  className="mt-2 h-12 text-lg"
                />
              </div>
              <div>
                <Label htmlFor="fromCurrency" className="text-base font-semibold">از ارز</Label>
                <div className="flex gap-2 mt-2">
                  <Select value={fromCurrency} onValueChange={setFromCurrency}>
                    <SelectTrigger className="h-12">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map(currency => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.flag} {currency.name} ({currency.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={swapCurrencies}
                    className="h-12 w-12 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                  >
                    <ArrowRightLeft className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div>
                <Label htmlFor="toCurrency" className="text-base font-semibold">به ارز</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="mt-2 h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.flag} {currency.name} ({currency.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/50 dark:to-teal-950/50 rounded-2xl border-2 border-emerald-200 dark:border-emerald-800">
              {converting ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto"></div>
                  <div className="text-sm text-muted-foreground mt-3">در حال محاسبه...</div>
                </div>
              ) : convertedAmount !== null ? (
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
                    {convertedAmount.toLocaleString()} {toCurrency}
                  </div>
                  <div className="text-base text-muted-foreground">
                    {amount} {fromCurrency} = {convertedAmount.toLocaleString()} {toCurrency}
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-4">
                  مقدار را وارد کنید
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Market Trends */}
        <div>
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-emerald-600" />
            نرخهای اصلی بازار
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {getMainRates().map((rate) => {
              const TrendIcon = getTrendIcon(rate.rate)
              const trendColor = getTrendColor(rate.rate)
              
              return (
                <Card key={`${rate.from}-${rate.to}`} className="glass-card border-0 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/30 to-transparent dark:from-emerald-950/20" />
                  <CardHeader className="relative z-10 flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-bold">{rate.from}/{rate.to}</CardTitle>
                    <div className={`p-2 rounded-full ${trendColor === 'text-green-600' ? 'bg-green-100 dark:bg-green-900' : 'bg-red-100 dark:bg-red-900'}`}>
                      <TrendIcon className={`h-5 w-5 ${trendColor}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="relative z-10">
                    <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mb-2">
                      {rate.rate.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      آخرین بروزرسانی: {new Date(rate.lastUpdate).toLocaleTimeString('fa-IR')}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>

        {/* Exchange Rates Table */}
        <ExchangeRates />
      </div>
    </DashboardLayout>
  )
}
