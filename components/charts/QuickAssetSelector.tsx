'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, Coins, Globe, Star } from 'lucide-react'

interface QuickAssetSelectorProps {
  selectedSymbol: string
  onSymbolSelect: (symbol: string) => void
}

const quickAssets = [
  { symbol: 'BTCUSD', name: 'بیتکوین', category: 'crypto', popular: true },
  { symbol: 'ETHUSD', name: 'اتریوم', category: 'crypto', popular: true },
  { symbol: 'EURUSD', name: 'یورو/دالر', category: 'forex', popular: true },
  { symbol: 'GBPUSD', name: 'پوند/دالر', category: 'forex', popular: true },
  { symbol: 'USDJPY', name: 'دالر/ین', category: 'forex', popular: true },
  { symbol: 'USDPKR', name: 'دالر/روپیه', category: 'regional', popular: true },
  { symbol: 'USDIRR', name: 'دالر/ریال', category: 'regional', popular: true },
  { symbol: 'XAUUSD', name: 'طلا', category: 'commodity', popular: true },
]

export default function QuickAssetSelector({ selectedSymbol, onSymbolSelect }: QuickAssetSelectorProps) {
  const getIcon = (category: string) => {
    switch (category) {
      case 'crypto':
        return <Coins className="h-3 w-3" />
      case 'commodity':
        return <TrendingUp className="h-3 w-3" />
      case 'currency':
      case 'forex':
      case 'regional':
        return <Globe className="h-3 w-3" />
      default:
        return null
    }
  }

  const getVariant = (symbol: string) => {
    return selectedSymbol === symbol ? 'default' : 'outline'
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
        <Star className="h-4 w-4" />
        دسترسی سریع
      </h3>
      <div className="flex flex-wrap gap-2">
        {quickAssets.map((asset) => (
          <Button
            key={asset.symbol}
            variant={getVariant(asset.symbol)}
            size="sm"
            onClick={() => onSymbolSelect(asset.symbol)}
            className="text-xs h-8"
          >
            <div className="flex items-center gap-1">
              {getIcon(asset.category)}
              <span>{asset.name}</span>
              {asset.popular && <Star className="h-2 w-2 fill-current" />}
            </div>
          </Button>
        ))}
      </div>
    </div>
  )
}