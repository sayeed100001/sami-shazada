'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Star, Plus, Trash2, TrendingUp, TrendingDown } from 'lucide-react'

interface Asset {
  symbol: string
  name: string
  type: string
  price?: number
  change24h?: number
}

interface WatchlistPanelProps {
  currentSymbol: string
  onSymbolSelect: (symbol: string) => void
  userId?: string
}

export function WatchlistPanel({ currentSymbol, onSymbolSelect, userId }: WatchlistPanelProps) {
  const [watchlist, setWatchlist] = useState<Asset[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userId) {
      loadWatchlist()
    }
  }, [userId])

  const loadWatchlist = async () => {
    try {
      const response = await fetch('/api/charts/watchlist')
      if (response.ok) {
        const data = await response.json()
        setWatchlist(data.watchlist || [])
      }
    } catch (error) {
      console.error('Failed to load watchlist:', error)
    } finally {
      setLoading(false)
    }
  }

  const addToWatchlist = async (symbol: string) => {
    try {
      const response = await fetch('/api/charts/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      
      if (response.ok) {
        loadWatchlist()
      }
    } catch (error) {
      console.error('Failed to add to watchlist:', error)
    }
  }

  const removeFromWatchlist = async (symbol: string) => {
    try {
      const response = await fetch(`/api/charts/watchlist?symbol=${symbol}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        loadWatchlist()
      }
    } catch (error) {
      console.error('Failed to remove from watchlist:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-2 md:p-4 space-y-3 md:space-y-4 h-full overflow-y-auto">
      <div className="flex items-center justify-between sticky top-0 bg-white dark:bg-gray-800 pb-2 border-b">
        <h3 className="font-semibold text-sm md:text-base">Watchlist</h3>
        <Button 
          size="sm" 
          onClick={() => addToWatchlist(currentSymbol)}
          className="text-xs md:text-sm touch-button-small"
        >
          <Plus className="w-3 h-3 md:w-4 md:h-4 md:mr-1" />
          <span className="hidden md:inline">Add Current</span>
        </Button>
      </div>

      <div className="space-y-1 md:space-y-2">
        {watchlist.length === 0 ? (
          <div className="text-center py-6 md:py-8 text-gray-500">
            <Star className="w-8 h-8 md:w-12 md:h-12 mx-auto mb-2 opacity-50" />
            <p className="text-xs md:text-sm">No assets in watchlist</p>
            <p className="text-xs text-gray-400">Add assets to track them here</p>
          </div>
        ) : (
          watchlist.map((asset) => (
            <div
              key={asset.symbol}
              className={`p-2 md:p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md touch-button ${
                asset.symbol === currentSymbol
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 active:bg-gray-50 dark:active:bg-gray-700'
              }`}
              onClick={() => onSymbolSelect(asset.symbol)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-1 md:space-x-2 mb-1">
                    <span className="font-semibold text-xs md:text-sm truncate">{asset.symbol}</span>
                    <Badge variant="outline" className="text-xs flex-shrink-0">
                      {asset.type.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-500 truncate">{asset.name}</div>
                </div>
                
                <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
                  {asset.price && (
                    <div className="text-right">
                      <div className="font-mono text-xs md:text-sm">
                        ${asset.price.toLocaleString()}
                      </div>
                      {asset.change24h !== undefined && (
                        <div className={`flex items-center text-xs ${
                          asset.change24h >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {asset.change24h >= 0 ? (
                            <TrendingUp className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          ) : (
                            <TrendingDown className="w-2 h-2 md:w-3 md:h-3 mr-0.5 md:mr-1" />
                          )}
                          <span className="text-xs">
                            {asset.change24h >= 0 ? '+' : ''}{asset.change24h.toFixed(2)}%
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeFromWatchlist(asset.symbol)
                    }}
                    className="text-gray-400 hover:text-red-500 p-1 md:p-2 touch-button-small"
                  >
                    <Trash2 className="w-3 h-3 md:w-4 md:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}