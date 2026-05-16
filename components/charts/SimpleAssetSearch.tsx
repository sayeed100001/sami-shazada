'use client'

import { useState, useMemo } from 'react'
import { Search, TrendingUp, DollarSign, Zap, BarChart3 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface Asset {
  symbol: string
  name: string
  type: 'crypto' | 'forex' | 'commodity' | 'stock' | 'index'
  category: string
  exchange: string
}

interface SimpleAssetSearchProps {
  onAssetSelect: (asset: Asset) => void
  selectedAsset: string
}

// Comprehensive asset list that works without backend
const ASSETS: Asset[] = [
  // Major Cryptocurrencies
  { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'ADAUSD', name: 'Cardano', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'SOLUSD', name: 'Solana', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'DOTUSD', name: 'Polkadot', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'LINKUSD', name: 'Chainlink', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'UNIUSD', name: 'Uniswap', type: 'crypto', category: 'major', exchange: 'Binance' },
  { symbol: 'AVAXUSD', name: 'Avalanche', type: 'crypto', category: 'major', exchange: 'Binance' },

  // Major Forex Pairs
  { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'forex', category: 'major', exchange: 'Forex' },
  { symbol: 'GBPUSD', name: 'British Pound / US Dollar', type: 'forex', category: 'major', exchange: 'Forex' },
  { symbol: 'USDJPY', name: 'US Dollar / Japanese Yen', type: 'forex', category: 'major', exchange: 'Forex' },
  { symbol: 'USDCHF', name: 'US Dollar / Swiss Franc', type: 'forex', category: 'major', exchange: 'Forex' },
  { symbol: 'AUDUSD', name: 'Australian Dollar / US Dollar', type: 'forex', category: 'major', exchange: 'Forex' },
  { symbol: 'USDCAD', name: 'US Dollar / Canadian Dollar', type: 'forex', category: 'major', exchange: 'Forex' },
  { symbol: 'NZDUSD', name: 'New Zealand Dollar / US Dollar', type: 'forex', category: 'major', exchange: 'Forex' },

  // Afghan Afghani Pairs
  { symbol: 'USDAFN', name: 'US Dollar / Afghan Afghani', type: 'forex', category: 'exotic', exchange: 'Local' },
  { symbol: 'EURAFN', name: 'Euro / Afghan Afghani', type: 'forex', category: 'exotic', exchange: 'Local' },
  { symbol: 'GBPAFN', name: 'British Pound / Afghan Afghani', type: 'forex', category: 'exotic', exchange: 'Local' },

  // Commodities
  { symbol: 'XAUUSD', name: 'Gold', type: 'commodity', category: 'precious_metals', exchange: 'COMEX' },
  { symbol: 'XAGUSD', name: 'Silver', type: 'commodity', category: 'precious_metals', exchange: 'COMEX' },
  { symbol: 'USOIL', name: 'Crude Oil WTI', type: 'commodity', category: 'energy', exchange: 'NYMEX' },
  { symbol: 'UKOIL', name: 'Brent Crude Oil', type: 'commodity', category: 'energy', exchange: 'ICE' },

  // Major Stocks
  { symbol: 'AAPL', name: 'Apple Inc.', type: 'stock', category: 'technology', exchange: 'NASDAQ' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', type: 'stock', category: 'technology', exchange: 'NASDAQ' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', type: 'stock', category: 'technology', exchange: 'NASDAQ' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', type: 'stock', category: 'consumer', exchange: 'NASDAQ' },
  { symbol: 'TSLA', name: 'Tesla Inc.', type: 'stock', category: 'automotive', exchange: 'NASDAQ' },

  // Indices
  { symbol: 'SPX500', name: 'S&P 500', type: 'index', category: 'us_indices', exchange: 'CME' },
  { symbol: 'NAS100', name: 'NASDAQ 100', type: 'index', category: 'us_indices', exchange: 'CME' },
  { symbol: 'DJI30', name: 'Dow Jones Industrial Average', type: 'index', category: 'us_indices', exchange: 'CME' }
]

const TYPE_ICONS = {
  crypto: Zap,
  forex: DollarSign,
  commodity: BarChart3,
  stock: TrendingUp,
  index: BarChart3
}

const TYPE_COLORS = {
  crypto: 'bg-orange-500',
  forex: 'bg-blue-500',
  commodity: 'bg-yellow-500',
  stock: 'bg-green-500',
  index: 'bg-purple-500'
}

export function SimpleAssetSearch({ onAssetSelect, selectedAsset }: SimpleAssetSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')

  const filteredAssets = useMemo(() => {
    let filtered = ASSETS

    if (selectedType !== 'all') {
      filtered = filtered.filter(asset => asset.type === selectedType)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      filtered = filtered.filter(asset =>
        asset.symbol.toLowerCase().includes(search) ||
        asset.name.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [searchTerm, selectedType])

  const assetTypes = [
    { id: 'all', name: 'All Assets', count: ASSETS.length },
    { id: 'crypto', name: 'Crypto', count: ASSETS.filter(a => a.type === 'crypto').length },
    { id: 'forex', name: 'Forex', count: ASSETS.filter(a => a.type === 'forex').length },
    { id: 'commodity', name: 'Commodities', count: ASSETS.filter(a => a.type === 'commodity').length },
    { id: 'stock', name: 'Stocks', count: ASSETS.filter(a => a.type === 'stock').length },
    { id: 'index', name: 'Indices', count: ASSETS.filter(a => a.type === 'index').length }
  ]

  return (
    <div className="space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search assets by symbol or name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Asset Type Filters */}
      <div className="flex flex-wrap gap-2">
        {assetTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
              selectedType === type.id
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-300 border-gray-700'
            }`}
          >
            {type.name} ({type.count})
          </button>
        ))}
      </div>

      {/* Assets List */}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No assets found matching your search.</p>
          </div>
        ) : (
          filteredAssets.map((asset) => {
            const IconComponent = TYPE_ICONS[asset.type]
            const isSelected = asset.symbol === selectedAsset

            return (
              <button
                key={asset.symbol}
                onClick={() => onAssetSelect(asset)}
                className={`w-full text-left p-4 rounded-lg transition-all border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700 text-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${TYPE_COLORS[asset.type]}`}>
                      <IconComponent className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <div className="font-bold text-sm">{asset.symbol}</div>
                      <div className="text-xs opacity-75">{asset.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="text-xs">
                      {asset.exchange}
                    </Badge>
                    <div className="text-xs opacity-75 mt-1 capitalize">
                      {asset.type}
                    </div>
                  </div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {/* Popular Assets Quick Select */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Popular Assets</h3>
        <div className="grid grid-cols-2 gap-2">
          {['BTCUSD', 'ETHUSD', 'EURUSD', 'XAUUSD', 'AAPL', 'SPX500'].map((symbol) => {
            const asset = ASSETS.find(a => a.symbol === symbol)
            if (!asset) return null

            const IconComponent = TYPE_ICONS[asset.type]
            const isSelected = asset.symbol === selectedAsset

            return (
              <button
                key={symbol}
                onClick={() => onAssetSelect(asset)}
                className={`p-3 rounded-lg text-left transition-all border ${
                  isSelected
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-gray-800 hover:bg-gray-700 border-gray-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className={`p-1 rounded ${TYPE_COLORS[asset.type]}`}>
                    <IconComponent className="w-3 h-3 text-white" />
                  </div>
                  <div>
                    <div className="font-bold text-xs">{asset.symbol}</div>
                    <div className="text-xs opacity-75 truncate">{asset.name}</div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}