'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, TrendingDown, RefreshCw, Wifi, WifiOff, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { usePageActivity } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface MarketAsset {
  symbol: string
  name: string
  type: 'crypto' | 'forex' | 'commodity' | 'stock'
  price: number
  change24h: number
  changePercent24h: number
  volume24h?: number
  marketCap?: number
  available: boolean
  exchange?: string
}

export function RealMarketData() {
  const [selectedType, setSelectedType] = useState<'all' | 'crypto' | 'forex' | 'commodity'>('all')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('connected')
  const { isActive } = usePageActivity()

  const { data: assetsData, isLoading, error, refetch } = useQuery({
    queryKey: ['market-assets'],
    queryFn: async () => {
      const response = await fetch('/api/assets')
      if (!response.ok) {
        setConnectionStatus('disconnected')
        throw new Error(`HTTP ${response.status}`)
      }
      setConnectionStatus('connected')
      return response.json()
    },
    refetchInterval: isActive ? POLLING_INTERVALS.marketDataActiveMs : false,
    retry: 3
  })

  const filteredAssets = assetsData?.assets?.filter((asset: MarketAsset) => 
    selectedType === 'all' || asset.type === selectedType
  ) || []

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'forex': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'commodity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'stock': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('AFN')) {
      return `${price.toFixed(2)} AFN`
    }
    if (symbol.includes('USD') || symbol.startsWith('XAU') || symbol.startsWith('XAG')) {
      return `$${price.toLocaleString()}`
    }
    return price.toFixed(4)
  }

  const formatVolume = (volume?: number) => {
    if (!volume) return 'N/A'
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(1)}B`
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `$${(volume / 1e3).toFixed(1)}K`
    return `$${volume.toFixed(0)}`
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              داده‌های زنده بازار
            </CardTitle>
            <CardDescription>
              قیمت‌های لحظه‌ای از منابع معتبر جهانی
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs ${
              connectionStatus === 'connected' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {connectionStatus === 'connected' ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
              {connectionStatus === 'connected' ? 'متصل' : 'قطع شده'}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Type Filters */}
        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            variant={selectedType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('all')}
          >
            همه ({assetsData?.total || 0})
          </Button>
          <Button
            variant={selectedType === 'crypto' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('crypto')}
          >
            رمزارز ({assetsData?.byType?.crypto || 0})
          </Button>
          <Button
            variant={selectedType === 'forex' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('forex')}
          >
            ارز ({assetsData?.byType?.forex || 0})
          </Button>
          <Button
            variant={selectedType === 'commodity' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedType('commodity')}
          >
            کالا ({assetsData?.byType?.commodity || 0})
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
            <p className="text-muted-foreground">در حال بارگذاری داده‌های بازار...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-500">
            <p>خطا در بارگذاری داده‌های بازار</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-2">
              تلاش مجدد
            </Button>
          </div>
        )}

        {/* Assets Grid - Compact View */}
        {!isLoading && !error && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
            {filteredAssets.slice(0, 12).map((asset: MarketAsset) => (
              <div
                key={asset.symbol}
                className="p-3 border rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer"
              >
                <div className="flex items-center justify-between mb-1">
                  <Badge className={getTypeColor(asset.type)}>
                    {asset.type === 'crypto' ? 'رمز' : 
                     asset.type === 'forex' ? 'ارز' : 'کالا'}
                  </Badge>
                  {asset.changePercent24h >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                </div>

                <div className="space-y-1">
                  <div className="font-bold text-sm">
                    {asset.symbol.replace('USD', '').replace('USDT', '')}
                  </div>
                  
                  <div className="font-mono text-sm">
                    {formatPrice(asset.price, asset.symbol)}
                  </div>
                  
                  <div className={`text-xs font-medium ${
                    asset.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {asset.changePercent24h >= 0 ? '+' : ''}{asset.changePercent24h.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        {assetsData && (
          <div className="mt-4 pt-4 border-t text-xs text-muted-foreground text-center">
            آخرین بروزرسانی: {new Date(assetsData.lastUpdated).toLocaleString('fa-IR')}
            <br />
            نمایش {Math.min(filteredAssets.length, 20)} از {filteredAssets.length} دارایی
          </div>
        )}
      </CardContent>
    </Card>
  )
}
