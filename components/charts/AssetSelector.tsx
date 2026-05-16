'use client'

import { useState, useEffect, useMemo } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, Star, TrendingUp, DollarSign, Zap, BarChart3, X } from 'lucide-react'

interface Asset {
  symbol: string
  name: string
  type: 'crypto' | 'forex' | 'commodity' | 'stock' | 'index'
  category: string
  exchange: string
  price?: number
  change24h?: number
  volume24h?: number
}

interface AssetSelectorProps {
  currentSymbol: string
  onSymbolSelect: (symbol: string) => void
  onClose: () => void
}

const TYPE_ICONS = {
  crypto: Zap,
  forex: DollarSign,
  commodity: BarChart3,
  stock: TrendingUp,
  index: BarChart3
}

const TYPE_COLORS = {
  crypto: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  forex: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  commodity: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  stock: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  index: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
}

export function AssetSelector({ currentSymbol, onSymbolSelect, onClose }: AssetSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [assets, setAssets] = useState<Asset[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Load assets and favorites
  useEffect(() => {
    loadAssets()
    loadFavorites()
  }, [])

  const loadAssets = async () => {
    try {
      const response = await fetch('/api/charts/assets')
      if (response.ok) {
        const data = await response.json()
        setAssets(data.assets || [])
      }
    } catch (error) {
      console.error('Failed to load assets:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadFavorites = () => {
    try {
      const saved = localStorage.getItem('favoriteAssets')
      if (saved) {
        setFavorites(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Failed to load favorites:', error)
    }
  }

  const toggleFavorite = (symbol: string) => {
    const newFavorites = favorites.includes(symbol)
      ? favorites.filter(f => f !== symbol)
      : [...favorites, symbol]
    
    setFavorites(newFavorites)
    localStorage.setItem('favoriteAssets', JSON.stringify(newFavorites))
  }

  const filteredAssets = useMemo(() => {
    let filtered = assets

    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedType)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(asset =>
        asset.symbol.toLowerCase().includes(search) ||
        asset.name.toLowerCase().includes(search) ||
        asset.exchange.toLowerCase().includes(search)
      )
    }

    // Sort by favorites first, then alphabetically
    return filtered.sort((a, b) => {
      const aIsFavorite = favorites.includes(a.symbol)
      const bIsFavorite = favorites.includes(b.symbol)
      
      if (aIsFavorite && !bIsFavorite) return -1
      if (!aIsFavorite && bIsFavorite) return 1
      
      return a.symbol.localeCompare(b.symbol)
    })
  }, [assets, selectedType, searchTerm, favorites])

  const favoriteAssets = useMemo(() => {
    return assets.filter(asset => favorites.includes(asset.symbol))
  }, [assets, favorites])

  const popularAssets = useMemo(() => {
    return assets.filter(asset => 
      ['BTCUSD', 'ETHUSD', 'EURUSD', 'GBPUSD', 'XAUUSD', 'USOIL', 'SPX500', 'NAS100'].includes(asset.symbol)
    )
  }, [assets])

  const assetTypes = [
    { id: 'all', name: 'All Assets', count: assets.length },
    { id: 'crypto', name: 'Crypto', count: assets.filter(a => a.type === 'crypto').length },
    { id: 'forex', name: 'Forex', count: assets.filter(a => a.type === 'forex').length },
    { id: 'commodity', name: 'Commodities', count: assets.filter(a => a.type === 'commodity').length },
    { id: 'stock', name: 'Stocks', count: assets.filter(a => a.type === 'stock').length },
    { id: 'index', name: 'Indices', count: assets.filter(a => a.type === 'index').length }
  ]

  const AssetItem = ({ asset }: { asset: Asset }) => {
    const IconComponent = TYPE_ICONS[asset.type]
    const isSelected = asset.symbol === currentSymbol
    const isFavorite = favorites.includes(asset.symbol)

    return (
      <div
        className={`p-2 md:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md touch-button active:bg-gray-50 dark:active:bg-gray-700 ${
          isSelected
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
        }`}
        onClick={() => onSymbolSelect(asset.symbol)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
            <button
              onClick={(e) => {
                e.stopPropagation()
                toggleFavorite(asset.symbol)
              }}
              className="text-gray-400 hover:text-yellow-500 transition-colors p-1 touch-button-small"
            >
              <Star className={`w-3 h-3 md:w-4 md:h-4 ${isFavorite ? 'fill-current text-yellow-500' : ''}`} />
            </button>
            
            <div className="p-1.5 md:p-2 rounded-lg bg-gray-100 dark:bg-gray-700 flex-shrink-0">
              <IconComponent className="w-3 h-3 md:w-4 md:h-4" />
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1 md:space-x-2 mb-1">
                <span className="font-semibold text-xs md:text-sm truncate">{asset.symbol}</span>
                <Badge className={`text-xs flex-shrink-0 ${TYPE_COLORS[asset.type]}`}>
                  <span className="hidden md:inline">{asset.type.toUpperCase()}</span>
                  <span className="md:hidden">{asset.type.charAt(0).toUpperCase()}</span>
                </Badge>
              </div>
              <div className="text-xs text-gray-500 truncate">{asset.name}</div>
              <div className="text-xs text-gray-400 truncate hidden md:block">{asset.exchange}</div>
            </div>
          </div>
          
          {asset.price && (
            <div className="text-right flex-shrink-0">
              <div className="font-mono text-xs md:text-sm font-semibold">
                ${asset.price.toLocaleString()}
              </div>
              {asset.change24h !== undefined && (
                <div className={`text-xs ${asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="w-full max-w-4xl h-[90vh] md:max-h-[80vh] overflow-hidden p-0">
        <DialogHeader className="p-4 md:p-6 border-b">
          <DialogTitle className="flex items-center justify-between text-sm md:text-base">
            Select Trading Asset
            <Button variant="ghost" size="sm" onClick={onClose} className="touch-button-small">
              <X className="w-4 h-4" />
            </Button>
          </DialogTitle>
          <DialogDescription className="sr-only">
            Select an asset to view its trading chart.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-full p-4 md:p-6 space-y-3 md:space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm md:text-base"
            />
          </div>

          {/* Asset Type Filters - Mobile Scrollable */}
          <div className="flex gap-2 overflow-x-auto pb-2 scroll-x-auto">
            {assetTypes.map((type) => (
              <Button
                key={type.id}
                variant={selectedType === type.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedType(type.id)}
                className="text-xs whitespace-nowrap flex-shrink-0 touch-button-small"
              >
                <span className="hidden md:inline">{type.name}</span>
                <span className="md:hidden">{type.name.split(' ')[0]}</span>
                <span className="ml-1">({type.count})</span>
              </Button>
            ))}
          </div>

          {/* Asset Lists */}
          <Tabs defaultValue="all" className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-3 mb-3">
              <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
              <TabsTrigger value="favorites" className="text-xs md:text-sm">
                <Star className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
                <span className="hidden md:inline">Favorites</span>
                <span className="ml-1">({favorites.length})</span>
              </TabsTrigger>
              <TabsTrigger value="popular" className="text-xs md:text-sm">Popular</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="flex-1 mt-0">
              <div className="h-full max-h-[50vh] md:max-h-96 overflow-y-auto space-y-1 md:space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 md:h-8 md:w-8 border-b-2 border-blue-500"></div>
                  </div>
                ) : filteredAssets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    No assets found matching your criteria
                  </div>
                ) : (
                  filteredAssets.map((asset) => (
                    <AssetItem key={asset.symbol} asset={asset} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="favorites" className="flex-1 mt-0">
              <div className="h-full max-h-[50vh] md:max-h-96 overflow-y-auto space-y-1 md:space-y-2">
                {favoriteAssets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <Star className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No favorite assets yet</p>
                    <p className="text-xs">Tap the star to add favorites</p>
                  </div>
                ) : (
                  favoriteAssets.map((asset) => (
                    <AssetItem key={asset.symbol} asset={asset} />
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="popular" className="flex-1 mt-0">
              <div className="h-full max-h-[50vh] md:max-h-96 overflow-y-auto space-y-1 md:space-y-2">
                {popularAssets.map((asset) => (
                  <AssetItem key={asset.symbol} asset={asset} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}