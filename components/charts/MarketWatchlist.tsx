'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Search, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Eye,
  Plus,
  X
} from 'lucide-react'

interface MarketSymbol {
  symbol: string
  name: string
  tvSymbol: string
  price?: number
  change?: number
  changePercent?: number
  volume?: number
}

interface MarketWatchlistProps {
  symbols: MarketSymbol[]
  onSymbolSelect: (symbol: string) => void
  selectedSymbol: string
}

export function MarketWatchlist({ symbols, onSymbolSelect, selectedSymbol }: MarketWatchlistProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [favorites, setFavorites] = useState<string[]>([])
  const [watchlistSymbols, setWatchlistSymbols] = useState<MarketSymbol[]>(symbols)
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  // Load favorites from localStorage
  useEffect(() => {
    try {
      const savedFavorites = localStorage.getItem('tradingview_favorites')
      if (savedFavorites) {
        setFavorites(JSON.parse(savedFavorites))
      }
    } catch (error) {
      console.warn('Failed to load favorites:', error)
    }
  }, [])

  // Save favorites to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('tradingview_favorites', JSON.stringify(favorites))
    } catch (error) {
      console.warn('Failed to save favorites:', error)
    }
  }, [favorites])

  // Mock price updates (in real app, this would come from WebSocket or API)
  useEffect(() => {
    const interval = setInterval(() => {
      setWatchlistSymbols(prev => prev.map(symbol => ({
        ...symbol,
        price: symbol.price ? symbol.price * (1 + (Math.random() - 0.5) * 0.02) : Math.random() * 1000,
        change: (Math.random() - 0.5) * 20,
        changePercent: (Math.random() - 0.5) * 5,
        volume: Math.random() * 1000000
      })))
    }, 3000)

    return () => clearInterval(interval)
  }, [])

  const filteredSymbols = watchlistSymbols.filter(symbol => {
    const matchesSearch = symbol.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         symbol.symbol.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFavorites = !showFavoritesOnly || favorites.includes(symbol.symbol)
    return matchesSearch && matchesFavorites
  })

  const toggleFavorite = (symbolCode: string) => {
    setFavorites(prev => 
      prev.includes(symbolCode) 
        ? prev.filter(s => s !== symbolCode)
        : [...prev, symbolCode]
    )
  }

  const formatPrice = (price: number | undefined) => {
    if (!price) return '--'
    return price.toLocaleString('en-US', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 4 
    })
  }

  const formatChange = (change: number | undefined) => {
    if (!change) return '--'
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(2)}`
  }

  const formatChangePercent = (changePercent: number | undefined) => {
    if (!changePercent) return '--'
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(2)}%`
  }

  const formatVolume = (volume: number | undefined) => {
    if (!volume) return '--'
    if (volume > 1000000) {
      return `${(volume / 1000000).toFixed(1)}M`
    }
    if (volume > 1000) {
      return `${(volume / 1000).toFixed(1)}K`
    }
    return volume.toFixed(0)
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            لیست نظارت
          </CardTitle>
          <Button
            variant={showFavoritesOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
          >
            <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
          </Button>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="جستجوی نماد..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[500px]">
          <div className="space-y-1 p-3">
            {filteredSymbols.map((symbol) => {
              const isSelected = selectedSymbol === symbol.symbol
              const isFavorite = favorites.includes(symbol.symbol)
              const isPositive = (symbol.changePercent || 0) >= 0

              return (
                <div
                  key={symbol.symbol}
                  className={`p-3 rounded-lg border cursor-pointer transition-all hover:bg-muted/50 ${
                    isSelected ? 'bg-primary/10 border-primary' : 'border-border'
                  }`}
                  onClick={() => onSymbolSelect(symbol.symbol)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleFavorite(symbol.symbol)
                        }}
                      >
                        <Star className={`h-3 w-3 ${isFavorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                      </Button>
                      <div>
                        <div className="font-semibold text-sm">{symbol.symbol}</div>
                        <div className="text-xs text-muted-foreground">{symbol.name}</div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">
                        ${formatPrice(symbol.price)}
                      </div>
                      <div className={`text-xs flex items-center gap-1 ${
                        isPositive ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatChangePercent(symbol.changePercent)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>تغییر: {formatChange(symbol.change)}</span>
                    <span>حجم: {formatVolume(symbol.volume)}</span>
                  </div>

                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-border">
                      <Badge variant="secondary" className="text-xs">
                        انتخاب شده
                      </Badge>
                    </div>
                  )}
                </div>
              )
            })}

            {filteredSymbols.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">نمادی یافت نشد</p>
                {showFavoritesOnly && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => setShowFavoritesOnly(false)}
                  >
                    نمایش همه نمادها
                  </Button>
                )}
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-3 border-t border-border">
          <div className="text-xs text-muted-foreground text-center">
            {filteredSymbols.length} نماد • آخرین بروزرسانی: {new Date().toLocaleTimeString('fa-IR')}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}