'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Coins, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

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

export function CryptoSection() {
  const { data: cryptoData, isLoading, refetch } = useQuery({
    queryKey: ['crypto-data'],
    queryFn: async (): Promise<CryptoData[]> => {
      const response = await fetch('/api/crypto')
      if (!response.ok) throw new Error('Failed to fetch crypto data')
      return response.json()
    },
    refetchInterval: 2 * 60 * 1000,
  })

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Coins
  }

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Coins className="h-5 w-5" />
            <CardTitle>ارزهای دیجیتال</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              بروزرسانی
            </Button>
            <Button size="sm" asChild>
              <Link href="/crypto">مشاهده همه</Link>
            </Button>
          </div>
        </div>
        <CardDescription>قیمت‌های لحظه‌ای ارزهای دیجیتال (به دلار آمریکا)</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {cryptoData?.slice(0, 4).map((crypto) => {
              const TrendIcon = getTrendIcon(crypto.trend)
              
              return (
                <div
                  key={crypto.symbol}
                  className="flex items-center justify-between p-4 border rounded-lg hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 gradient-bg rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">
                        {crypto.symbol.slice(0, 2)}
                      </span>
                    </div>
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{crypto.name}</span>
                        <Badge variant="secondary">{crypto.symbol}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground persian-numbers">
                        {crypto.priceAfn.toFixed(0)} AFN
                      </div>
                    </div>
                  </div>

                  <div className="text-right space-y-1">
                    <div className="font-bold persian-numbers text-lg">
                      ${crypto.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    
                    <div className={`flex items-center justify-end gap-1 text-sm ${getTrendColor(crypto.trend)}`}>
                      <TrendIcon className="h-3 w-3" />
                      <span className="persian-numbers">
                        {crypto.changePercent24h > 0 ? '+' : ''}{crypto.changePercent24h.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="text-center pt-4">
              <Button variant="outline" asChild>
                <Link href="/crypto">
                  مشاهده همه ارزهای دیجیتال
                </Link>
              </Button>
            </div>
          </div>
        )}

        <div className="mt-4 text-xs text-muted-foreground text-center">
          قیمت‌ها از منابع معتبر جهانی دریافت می‌شود | همه قیمت‌ها به دلار آمریکا
        </div>
      </CardContent>
    </Card>
  )
}