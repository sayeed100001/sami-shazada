'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, DollarSign, Coins, BarChart3 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

interface MarketData {
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  trend: 'up' | 'down' | 'neutral'
}

export function MarketOverview() {
  const { data: marketData, isLoading } = useQuery({
    queryKey: ['market-overview'],
    queryFn: async (): Promise<MarketData[]> => {
      const response = await fetch('/api/market/overview')
      const payload = await response.json()

      if (!response.ok || !Array.isArray(payload?.assets)) {
        throw new Error(payload?.error || 'Market overview unavailable')
      }

      return payload.assets.map((asset: any) => ({
        symbol: asset.symbol,
        name: asset.name,
        price: Number(asset.price) || 0,
        change24h: Number(asset.change24h) || 0,
        changePercent24h: Number(asset.changePercent24h) || 0,
        trend: asset.trend === 'up' || asset.trend === 'down' ? asset.trend : 'neutral'
      }))
    },
    refetchInterval: 5 * 60 * 1000,
  })

  const getIcon = (symbol: string) => {
    if (symbol.includes('USD/AFN')) return DollarSign
    if (symbol.includes('/USD') || symbol.includes('BTC') || symbol.includes('ETH')) return Coins
    return BarChart3
  }

  const getTrendIcon = (trend: string) => {
    return trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : BarChart3
  }

  const getTrendColor = (trend: string) => {
    return trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600'
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>نمای کلی بازار</CardTitle>
          <CardDescription>آخرین قیمت‌های بازار</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-20 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          نمای کلی بازار
        </CardTitle>
        <CardDescription>آخرین قیمت‌های بازار و روند تغییرات (همه قیمت‌ها به دلار)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {marketData?.map((item) => {
            const Icon = getIcon(item.symbol)
            const TrendIcon = getTrendIcon(item.trend)
            
            return (
              <div
                key={item.symbol}
                className="p-4 border rounded-lg hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">{item.name}</span>
                  </div>
                  <Badge variant={item.trend === 'up' ? 'default' : item.trend === 'down' ? 'destructive' : 'secondary'}>
                    {item.symbol}
                  </Badge>
                </div>
                
                <div className="space-y-1">
                  <div className="text-2xl font-bold persian-numbers">
                    ${item.price.toFixed(item.symbol.includes('USD/AFN') ? 2 : 2)}
                  </div>
                  
                  <div className={`flex items-center gap-1 text-sm ${getTrendColor(item.trend)}`}>
                    <TrendIcon className="h-3 w-3" />
                    <span className="persian-numbers">
                      {item.change24h > 0 ? '+' : ''}${item.change24h.toFixed(2)}
                    </span>
                    <span className="text-xs">
                      ({item.changePercent24h > 0 ? '+' : ''}{item.changePercent24h.toFixed(2)}%)
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        
        <div className="mt-4 text-xs text-muted-foreground text-center">
          آخرین بروزرسانی: {new Date().toLocaleTimeString('fa-AF')} | همه قیمت‌ها به دلار آمریکا
        </div>
      </CardContent>
    </Card>
  )
}
