'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Coins, TrendingUp, TrendingDown, Search, Filter, RefreshCw, Calculator } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { formatCurrency, formatPercentage } from '@/lib/utils'
import Link from 'next/link'
import { useTranslation } from '@/hooks/useTranslation'

interface CryptoData {
  symbol: string
  name: string
  price: number
  priceAfn: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCap: number
  trend: 'up' | 'down' | 'neutral'
}

export default function CryptoPage() {
  const { t } = useTranslation()
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('marketCap')
  const [filterTrend, setFilterTrend] = useState('all')
  const [calcAmount, setCalcAmount] = useState<number>(1)
  const [calcFrom, setCalcFrom] = useState('BTC')
  const [calcTo, setCalcTo] = useState('AFN')

  const { data: cryptoData, isLoading, refetch } = useQuery({
    queryKey: ['crypto-full'],
    queryFn: async (): Promise<CryptoData[]> => {
      const response = await fetch('/api/crypto')
      if (!response.ok) throw new Error('Failed to fetch crypto data')
      return response.json()
    },
    refetchInterval: 2 * 60 * 1000, // 2 minutes
  })

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Coins
  }

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  const filteredData = cryptoData?.filter(crypto => {
    const matchesSearch = crypto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         crypto.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesTrend = filterTrend === 'all' || crypto.trend === filterTrend
    return matchesSearch && matchesTrend
  })

  const sortedData = filteredData?.sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return b.price - a.price
      case 'change':
        return b.changePercent24h - a.changePercent24h
      case 'volume':
        return b.volume24h - a.volume24h
      case 'name':
        return a.name.localeCompare(b.name)
      default: // marketCap
        return b.marketCap - a.marketCap
    }
  })

  const calcResult = useMemo(() => {
    if (!cryptoData) return 0
    const source = cryptoData.find(c => c.symbol === calcFrom)
    if (!source) return 0
    
    let result = source.price * calcAmount
    if (calcTo === 'AFN') {
      // Assuming a base rate if priceAfn isn't perfectly proportional, but we have priceAfn
      result = (source.priceAfn / source.price) * (source.price * calcAmount)
    } else if (calcTo === 'EUR') {
      result = (source.price * calcAmount) * 0.92 // Mock conversion
    }
    
    return result
  }, [cryptoData, calcFrom, calcTo, calcAmount])

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-[linear-gradient(135deg,#0f172a_0%,#1e293b_42%,#334155_100%)] text-white rounded-[32px] p-8 mb-8 shadow-2xl border border-white/10">
          <div className="absolute inset-0 bg-grid-white/5 opacity-20"></div>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.15),transparent_50%)]"></div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-right flex-1">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md mb-4 border border-white/10">
                <Coins className="h-8 w-8 text-cyan-400" />
              </div>
              <h1 className="text-4xl md:text-5xl font-black mb-3 tracking-tight">
                {t('crypto.title')}
              </h1>
              <p className="text-lg text-slate-300 max-w-xl">
                {t('crypto.subtitle')}
              </p>
            </div>

            <Card className="w-full max-w-md border-0 bg-white/5 backdrop-blur-2xl shadow-2xl ring-1 ring-white/10">
              <CardHeader className="pb-3 border-b border-white/10">
                <div className="flex items-center gap-2 text-cyan-400">
                  <Calculator className="h-5 w-5" />
                  <CardTitle className="text-lg font-bold text-white">ماشین‌حساب ارز دیجیتال</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="relative">
                      <Input 
                        type="number" 
                        placeholder="مقدار"
                        className="h-12 rounded-xl bg-white/10 border-white/10 text-white placeholder:text-slate-500 focus:ring-cyan-500"
                        value={calcAmount}
                        onChange={(e) => setCalcAmount(Number(e.target.value))}
                      />
                    </div>
                    <Select value={calcFrom} onValueChange={setCalcFrom}>
                      <SelectTrigger className="w-[100px] h-12 bg-white/10 border-white/10 text-white rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {cryptoData?.map(c => (
                          <SelectItem key={c.symbol} value={c.symbol}>{c.symbol}</SelectItem>
                        )) || (
                          <>
                            <SelectItem value="BTC">BTC</SelectItem>
                            <SelectItem value="ETH">ETH</SelectItem>
                            <SelectItem value="USDT">USDT</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-center">
                    <div className="h-px bg-white/10 flex-1"></div>
                    <div className="mx-4 h-8 w-8 rounded-full border border-white/10 bg-white/5 flex items-center justify-center">
                      <RefreshCw className="h-4 w-4 text-slate-400" />
                    </div>
                    <div className="h-px bg-white/10 flex-1"></div>
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="h-12 bg-white/5 border border-white/10 rounded-xl flex items-center px-4 text-cyan-400 font-black text-lg truncate">
                       {calcResult > 0 ? (calcTo === 'AFN' ? formatCurrency(calcResult, 'AFN') : formatCurrency(calcResult, 'USD')) : '—'}
                    </div>
                    <Select value={calcTo} onValueChange={setCalcTo}>
                      <SelectTrigger className="w-[100px] h-12 bg-white/10 border-white/10 text-white rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AFN">AFN</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-bold text-sm shadow-lg shadow-cyan-500/20">
                  محاسبه دقیق نرخ لحظه‌ای
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="space-y-8">
        {/* Filters and Search */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                {t('crypto.filter')}
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                {t('common.refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder={t('crypto.search')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10"
                />
              </div>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger>
                  <SelectValue placeholder={t('crypto.sortBy')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="marketCap">{t('crypto.marketCap')}</SelectItem>
                  <SelectItem value="price">{t('crypto.price')}</SelectItem>
                  <SelectItem value="change">{t('crypto.change')}</SelectItem>
                  <SelectItem value="volume">{t('crypto.volume')}</SelectItem>
                  <SelectItem value="name">{t('crypto.name')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterTrend} onValueChange={setFilterTrend}>
                <SelectTrigger>
                  <SelectValue placeholder={t('crypto.trend')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('crypto.all')}</SelectItem>
                  <SelectItem value="up">{t('crypto.up')}</SelectItem>
                  <SelectItem value="down">{t('crypto.down')}</SelectItem>
                  <SelectItem value="neutral">{t('crypto.neutral')}</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" asChild>
                <Link href="/calculator">
                  <Calculator className="h-4 w-4 mr-2" />
                  {t('nav.calculator')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Crypto Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {isLoading ? (
            Array.from({ length: 8 }, (_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-6 bg-muted rounded mb-4"></div>
                  <div className="h-8 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            sortedData?.map((crypto) => {
              const TrendIcon = getTrendIcon(crypto.trend)
              
              return (
                <Card key={crypto.symbol} className="glass-card border-0 shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {crypto.symbol.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{crypto.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs">
                            {crypto.symbol}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className={`p-2 rounded-full ${
                        crypto.trend === 'up' ? 'bg-green-100 dark:bg-green-900/20' :
                        crypto.trend === 'down' ? 'bg-red-100 dark:bg-red-900/20' :
                        'bg-gray-100 dark:bg-gray-900/20'
                      }`}>
                        <TrendIcon className={`h-4 w-4 ${getTrendColor(crypto.trend)}`} />
                      </div>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Prices */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('crypto.priceUSD')}</span>
                        <span className="font-bold persian-numbers">
                          {formatCurrency(crypto.price, 'USD')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{t('crypto.priceAFN')}</span>
                        <span className="font-bold persian-numbers">
                          {formatCurrency(crypto.priceAfn, 'AFN')}
                        </span>
                      </div>
                    </div>

                    {/* 24h Change */}
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">{t('crypto.change24h')}</span>
                      <div className={`text-right ${getTrendColor(crypto.trend)}`}>
                        <div className="font-medium persian-numbers">
                          {formatPercentage(crypto.changePercent24h)}
                        </div>
                        <div className="text-xs persian-numbers">
                          {crypto.change24h > 0 ? '+' : ''}{formatCurrency(crypto.change24h, 'USD')}
                        </div>
                      </div>
                    </div>

                    {/* Volume and Market Cap */}
                    <div className="pt-3 border-t space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{t('crypto.volume24h')}</span>
                        <span className="text-xs persian-numbers">
                          {formatCurrency(crypto.volume24h, 'USD')}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted-foreground">{t('crypto.marketCap')}</span>
                        <span className="text-xs persian-numbers">
                          {formatCurrency(crypto.marketCap, 'USD')}
                        </span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <Button className="w-full" size="sm" asChild>
                      <Link href={`/calculator?from=${crypto.symbol}&to=AFN`}>
                        {t('crypto.calculatePrice')}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>

        {sortedData && sortedData.length === 0 && !isLoading && (
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="text-center py-12">
              <Coins className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">{t('crypto.notFound')}</h3>
              <p className="text-muted-foreground">
                {t('crypto.notFoundDesc')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Educational Section */}
        <Card className="glass-card border-0 shadow-lg bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20">
          <CardHeader>
            <CardTitle>{t('crypto.education.title')}</CardTitle>
            <CardDescription>
              {t('crypto.education.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <h3 className="font-semibold">{t('crypto.education.bitcoin')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('crypto.education.bitcoinDesc')}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">{t('crypto.education.trading')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('crypto.education.tradingDesc')}
                </p>
              </div>
              
              <div className="space-y-2">
                <h3 className="font-semibold">{t('crypto.education.security')}</h3>
                <p className="text-sm text-muted-foreground">
                  {t('crypto.education.securityDesc')}
                </p>
              </div>
            </div>
            
            <div className="mt-4">
              <Button asChild>
                <Link href="/education">
                  {t('crypto.education.readMore')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
