'use client'

import { useState, useEffect, useMemo } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Search, TrendingUp, TrendingDown, Star, StarOff, Filter, RefreshCw } from 'lucide-react'

interface Asset {
  id: string
  symbol: string
  name: string
  type: 'crypto' | 'forex' | 'commodity' | 'stock' | 'index'
  category?: string
  exchange?: string
  baseAsset?: string
  quoteAsset?: string
  price?: number
  change24h?: number
  changePercent24h?: number
  volume24h?: number
  isActive: boolean
}

interface AssetsResponseItem {
  symbol: string
  name: string
  type: 'crypto' | 'forex' | 'commodity' | 'stock' | 'index'
  category?: string
  exchange?: string
  price?: number
  change24h?: number
  changePercent24h?: number
  volume24h?: number
}

interface EnhancedAssetSearchProps {
  onAssetSelect: (asset: Asset) => void
  selectedAsset: string
}

const ASSET_CATEGORIES = {
  crypto: [
    { id: 'major', name: 'عمده', nameEn: 'Major' },
    { id: 'altcoin', name: 'آلت‌کوین', nameEn: 'Altcoins' },
    { id: 'defi', name: 'دیفای', nameEn: 'DeFi' },
    { id: 'nft', name: 'ان‌اف‌تی', nameEn: 'NFT' }
  ],
  forex: [
    { id: 'major', name: 'عمده', nameEn: 'Major' },
    { id: 'minor', name: 'فرعی', nameEn: 'Minor' },
    { id: 'exotic', name: 'نادر', nameEn: 'Exotic' },
    { id: 'regional', name: 'منطقه‌ای', nameEn: 'Regional' }
  ],
  commodity: [
    { id: 'precious_metals', name: 'فلزات گرانبها', nameEn: 'Precious Metals' },
    { id: 'energy', name: 'انرژی', nameEn: 'Energy' },
    { id: 'agriculture', name: 'کشاورزی', nameEn: 'Agriculture' },
    { id: 'industrial', name: 'صنعتی', nameEn: 'Industrial' }
  ],
  stock: [
    { id: 'technology', name: 'فناوری', nameEn: 'Technology' },
    { id: 'finance', name: 'مالی', nameEn: 'Finance' },
    { id: 'healthcare', name: 'بهداشت', nameEn: 'Healthcare' },
    { id: 'consumer', name: 'مصرف‌کننده', nameEn: 'Consumer' }
  ],
  index: [
    { id: 'us_indices', name: 'شاخص‌های آمریکا', nameEn: 'US Indices' },
    { id: 'eu_indices', name: 'شاخص‌های اروپا', nameEn: 'EU Indices' },
    { id: 'asia_indices', name: 'شاخص‌های آسیا', nameEn: 'Asia Indices' }
  ]
}

const ASSET_TYPES = [
  { id: 'all', name: 'همه', nameEn: 'All', icon: '🌐' },
  { id: 'crypto', name: 'رمزارز', nameEn: 'Crypto', icon: '₿' },
  { id: 'forex', name: 'ارز', nameEn: 'Forex', icon: '💱' },
  { id: 'commodity', name: 'کالا', nameEn: 'Commodities', icon: '🥇' },
  { id: 'stock', name: 'سهام', nameEn: 'Stocks', icon: '📈' },
  { id: 'index', name: 'شاخص', nameEn: 'Indices', icon: '📊' }
]

export function EnhancedAssetSearch({ onAssetSelect, selectedAsset }: EnhancedAssetSearchProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [assets, setAssets] = useState<Asset[]>([])
  const [favorites, setFavorites] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

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
      const response = await fetch('/api/charts/assets')
      if (response.ok) {
        const data = await response.json()
        const normalizedAssets = ((data.assets || []) as AssetsResponseItem[]).map((asset) => ({
          id: asset.symbol,
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          category: asset.category,
          exchange: asset.exchange,
          price: asset.price,
          change24h: asset.change24h ?? asset.changePercent24h,
          changePercent24h: asset.changePercent24h ?? asset.change24h,
          volume24h: asset.volume24h,
          isActive: true
        }))

        setAssets(normalizedAssets)
      }
    } catch (error) {
      console.error('Error fetching assets:', error)
    } finally {
      setLoading(false)
    }
  }

  // Initialize assets
  const initializeAssets = async () => {
    await fetchAssets()
  }

  // Filter assets based on search and category
  const filteredAssets = useMemo(() => {
    let filtered = assets

    if (selectedType !== 'all') {
      filtered = filtered.filter((asset) => asset.type === selectedType)
    }

    if (selectedCategory) {
      filtered = filtered.filter((asset) => asset.category === selectedCategory)
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

    // Sort by favorites first, then by symbol
    return filtered.sort((a, b) => {
      const aIsFavorite = favorites.includes(a.symbol)
      const bIsFavorite = favorites.includes(b.symbol)
      
      if (aIsFavorite && !bIsFavorite) return -1
      if (!aIsFavorite && bIsFavorite) return 1
      
      return a.symbol.localeCompare(b.symbol)
    })
  }, [assets, searchQuery, favorites])

  // Get favorite assets
  const favoriteAssets = useMemo(() => {
    return assets.filter(asset => favorites.includes(asset.symbol))
  }, [assets, favorites])

  // Get asset type badge color
  const getTypeColor = (type: string) => {
    switch (type) {
      case 'crypto': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      case 'forex': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'commodity': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'stock': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'index': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // Format price
  const formatPrice = (price?: number, symbol?: string) => {
    if (!price) return 'N/A'
    if (symbol?.includes('AFN')) {
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

  // Handle type change
  const handleTypeChange = (type: string) => {
    setSelectedType(type)
    setSelectedCategory('')
  }

  // Handle category change
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
  }

  // Handle search
  const handleSearch = (query: string) => {
    setSearchQuery(query)
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
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="text-xs"
        >
          <Filter className="h-4 w-4 mr-2" />
          فیلترها
        </Button>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchAssets()}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={initializeAssets}
            disabled={loading}
          >
            راه‌اندازی
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
          {/* Asset Types */}
          <div>
            <label className="text-sm font-medium mb-2 block">نوع دارایی:</label>
            <div className="flex flex-wrap gap-2">
              {ASSET_TYPES.map((type) => (
                <Button
                  key={type.id}
                  variant={selectedType === type.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleTypeChange(type.id)}
                  className="text-xs"
                >
                  <span className="mr-1">{type.icon}</span>
                  {type.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Categories */}
          {selectedType !== 'all' && ASSET_CATEGORIES[selectedType as keyof typeof ASSET_CATEGORIES] && (
            <div>
              <label className="text-sm font-medium mb-2 block">دسته‌بندی:</label>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedCategory === '' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleCategoryChange('')}
                  className="text-xs"
                >
                  همه
                </Button>
                {ASSET_CATEGORIES[selectedType as keyof typeof ASSET_CATEGORIES].map((category) => (
                  <Button
                    key={category.id}
                    variant={selectedCategory === category.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleCategoryChange(category.id)}
                    className="text-xs"
                  >
                    {category.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="all">همه دارایی‌ها</TabsTrigger>
          <TabsTrigger value="favorites">علاقه‌مندی‌ها</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-2">
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
                <AssetItem
                  key={asset.symbol}
                  asset={asset}
                  isSelected={selectedAsset === asset.symbol}
                  isFavorite={favorites.includes(asset.symbol)}
                  onSelect={() => onAssetSelect(asset)}
                  onToggleFavorite={() => toggleFavorite(asset.symbol)}
                  getTypeColor={getTypeColor}
                  formatPrice={formatPrice}
                />
              ))
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="favorites" className="space-y-2">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {favoriteAssets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                هیچ دارایی مورد علاقه‌ای اضافه نشده
              </div>
            ) : (
              favoriteAssets.map((asset) => (
                <AssetItem
                  key={asset.symbol}
                  asset={asset}
                  isSelected={selectedAsset === asset.symbol}
                  isFavorite={true}
                  onSelect={() => onAssetSelect(asset)}
                  onToggleFavorite={() => toggleFavorite(asset.symbol)}
                  getTypeColor={getTypeColor}
                  formatPrice={formatPrice}
                />
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Asset Item Component
function AssetItem({
  asset,
  isSelected,
  isFavorite,
  onSelect,
  onToggleFavorite,
  getTypeColor,
  formatPrice
}: {
  asset: Asset
  isSelected: boolean
  isFavorite: boolean
  onSelect: () => void
  onToggleFavorite: () => void
  getTypeColor: (type: string) => string
  formatPrice: (price?: number, symbol?: string) => string
}) {
  return (
    <div
      className={`p-3 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
          : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleFavorite()
            }}
            className="text-gray-400 hover:text-yellow-500 transition-colors"
          >
            {isFavorite ? (
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
              {asset.category && (
                <Badge variant="outline" className="text-xs">
                  {asset.category}
                </Badge>
              )}
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
          {asset.price && (
            <>
              <div className="font-mono text-sm font-semibold">
                ${formatPrice(asset.price, asset.symbol)}
              </div>
              {asset.changePercent24h !== undefined && (
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
