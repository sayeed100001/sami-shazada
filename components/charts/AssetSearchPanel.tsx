'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, TrendingUp, TrendingDown, Star, StarOff } from 'lucide-react'

interface MarketAsset {
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h?: number
  marketCap?: number
  high24h?: number
  low24h?: number
  trend: 'up' | 'down' | 'neutral'
  type: 'crypto' | 'forex' | 'commodity' | 'stock'
  sector?: string
  exchange?: string
  lastUpdate?: string
}

interface AssetSearchPanelProps {
  onAssetSelect: (asset: MarketAsset) => void
  selectedAsset: string
}

const ASSET_CATEGORIES = [
  { id: 'all', name: 'همه', nameEn: 'All' },
  { id: 'crypto', name: 'رمزارز', nameEn: 'Crypto' },
  { id: 'forex', name: 'ارز', nameEn: 'Forex' },
  { id: 'commodity', name: 'کالا', nameEn: 'Commodities' },
  { id: 'stock', name: 'سهام', nameEn: 'Stocks' }
]

const POPULAR_ASSETS: MarketAsset[] = [
  {
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    price: 43250.50,
    change24h: 1250.30,
    changePercent24h: 2.98,
    volume24h: 28500000000,
    marketCap: 847000000000,
    trend: 'up',
    type: 'crypto',
    exchange: 'Binance'
  },
  {
    symbol: 'ETH/USD',
    name: 'Ethereum',
    price: 2650.75,
    change24h: -45.25,
    changePercent24h: -1.68,
    volume24h: 15200000000,
    trend: 'down',
    type: 'crypto',
    exchange: 'Binance'
  },
  {
    symbol: 'USD/AFN',
    name: 'US Dollar to Afghan Afghani',
    price: 70.50,
    change24h: 0.25,
    changePercent24h: 0.35,
    trend: 'up',
    type: 'forex',
    exchange: 'Forex'
  },
  {
    symbol: 'EUR/AFN',
    name: 'Euro to Afghan Afghani',
    price: 76.20,
    change24h: -0.15,
    changePercent24h: -0.20,
    trend: 'down',
    type: 'forex',
    exchange: 'Forex'
  },
  {
    symbol: 'GBP/AFN',
    name: 'British Pound to Afghan Afghani',
    price: 89.75,
    change24h: 0.50,
    changePercent24h: 0.56,
    trend: 'up',
    type: 'forex',
    exchange: 'Forex'
  },
  {
    symbol: 'PKR/AFN',
    name: 'Pakistani Rupee to Afghan Afghani',
    price: 0.25,
    change24h: 0.01,
    changePercent24h: 4.17,
    trend: 'up',
    type: 'forex',
    exchange: 'Forex'
  },
  {
    symbol: 'GOLD',
    name: 'Gold',
    price: 2045.30,
    change24h: 12.80,
    changePercent24h: 0.63,
    trend: 'up',
    type: 'commodity',
    exchange: 'COMEX'
  },
  {
    symbol: 'SILVER',
    name: 'Silver',
    price: 24.55,
    change24h: -0.35,
    changePercent24h: -1.41,
    trend: 'down',
    type: 'commodity',
    exchange: 'COMEX'
  },
  {
    symbol: 'OIL',
    name: 'Crude Oil',
    price: 78.25,
    change24h: 2.15,
    changePercent24h: 2.83,
    trend: 'up',
    type: 'commodity',
    exchange: 'NYMEX'
  },
  {
    symbol: 'ADA/USD',
    name: 'Cardano',
    price: 0.485,
    change24h: 0.025,
    changePercent24h: 5.43,
    trend: 'up',
    type: 'crypto',
    exchange: 'Binance'
  }
]

export function AssetSearchPanel({ onAssetSelect, selectedAsset }: AssetSearchPanelProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [assets, setAssets] = useState<MarketAsset[]>(POPULAR_ASSETS)
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteAssets')
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites))
      } catch (error) {
        console.error('Error loading favorites:', error)
      }
    }
  }, [])

  // Save favorites to localStorage
  const saveFavorites = (newFavorites: string[]) => {
    setFavorites(newFavorites)
    localStorage.setItem('favoriteAssets', JSON.stringify(newFavorites))
  }

  // Toggle favorite
  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol]
    saveFavorites(newFavorites)
  }

  // Fetch assets from API
  const fetchAssets = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/market/overview')
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || POPULAR_ASSETS)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
      // Keep using popular assets as fallback
    } finally {
      setLoading(false)
    }
  }

  // Filter assets based on search and category
  const filteredAssets = useMemo(() => {
    let filtered = assets

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(asset =>
        asset.symbol.toLowerCase().includes(query) ||
        asset.name.toLowerCase().includes(query) ||
        asset.exchange?.toLowerCase().includes(query)
      )
    }

    // Sort by favorites first, then by volume
    return filtered.sort((a, b) => {
      const aIsFavorite = favorites.includes(a.symbol)
      const bIsFavorite = favorites.includes(b.symbol)
      
      if (aIsFavorite && !bIsFavorite) return -1
      if (!aIsFavorite && bIsFavorite) return 1
      
      return (b.volume24h || 0) - (a.volume24h || 0)
    })
  }, [assets, searchQuery, selectedCategory, favorites])

  // Get asset type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'forex': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'commodity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'stock': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Format price
  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('AFN')) {
      return price.toFixed(2)
    }
    if (price < 1) {
      return price.toFixed(4)
    }
    if (price < 100) {
      return price.toFixed(2)
    }
    return price.toLocaleString()
  }

  // Format volume
  const formatVolume = (volume?: number) => {
    if (!volume) return 'N/A'
    if (volume >= 1e9) return `${(volume / 1e9).toFixed(1)}B`
    if (volume >= 1e6) return `${(volume / 1e6).toFixed(1)}M`
    if (volume >= 1e3) return `${(volume / 1e3).toFixed(1)}K`
    return volume.toString()
  }

  useEffect(() => {
    fetchAssets()
  }, [])

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="جستجوی نماد، نام یا بورس..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2">
        {ASSET_CATEGORIES.map((category) => (
          <Button
            key={category.id}
            variant={selectedCategory === category.id ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.id)}
            className="text-xs"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Assets List */}
      <div className="max-h-96 overflow-y-auto space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            هیچ دارایی یافت نشد
          </div>
        ) : (
          filteredAssets.map((asset) => (
            <div
              key={asset.symbol}
              className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                selectedAsset === asset.symbol
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => onAssetSelect(asset)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      toggleFavorite(asset.symbol)
                    }}
                    className="text-gray-400 hover:text-yellow-500 transition-colors"
                  >
                    {favorites.includes(asset.symbol) ? (
                      <Star className="h-4 w-4 fill-current text-yellow-500" />
                    ) : (
                      <StarOff className="h-4 w-4" />
                    )}
                  </button>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{asset.symbol}</span>
                      <Badge className={`text-xs ${getTypeColor(asset.type)}`}>
                        {asset.type.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {asset.name}
                    </div>
                    {asset.exchange && (
                      <div className="text-xs text-muted-foreground">
                        {asset.exchange}
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold">
                    ${formatPrice(asset.price, asset.symbol)}
                  </div>
                  <div className={`flex items-center gap-1 text-xs ${
                    asset.changePercent24h >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {asset.changePercent24h >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {asset.changePercent24h >= 0 ? '+' : ''}
                    {asset.changePercent24h.toFixed(2)}%
                  </div>
                  {asset.volume24h && (
                    <div className="text-xs text-muted-foreground">
                      Vol: {formatVolume(asset.volume24h)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Refresh Button */}
      <div className="flex justify-center">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchAssets}
          disabled={loading}
        >
          {loading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
          ) : null}
          بروزرسانی
        </Button>
      </div>
    </div>
  )
}