'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { fetchRealCandleData, CandleData } from '@/lib/marketDataAPI'
import { realTimeUpdater } from '@/lib/realMarketData'

interface RealTimeChartEngineProps {
  symbol: string
  timeframe: string
  onDataUpdate?: (data: CandleData[]) => void
}

export function RealTimeChartEngine({ symbol, timeframe, onDataUpdate }: RealTimeChartEngineProps) {
  const [candleData, setCandleData] = useState<CandleData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await fetchRealCandleData(symbol, timeframe)
      setCandleData(data)
      onDataUpdate?.(data)
      
    } catch (err) {
      console.error('Failed to fetch chart data:', err)
      setError('Failed to load chart data')
    } finally {
      setLoading(false)
    }
  }, [symbol, timeframe, onDataUpdate])

  const updateRealTimePrice = useCallback((newData: any) => {
    setCandleData(prevData => {
      if (prevData.length === 0) return prevData
      
      const lastCandle = prevData[prevData.length - 1]
      const now = Date.now()
      
      // Update the last candle or create a new one
      const updatedData = [...prevData]
      
      if (now - lastCandle.time < getTimeframeMs(timeframe)) {
        // Update existing candle
        updatedData[updatedData.length - 1] = {
          ...lastCandle,
          close: newData.price || newData.rate || lastCandle.close,
          high: Math.max(lastCandle.high, newData.price || newData.rate || lastCandle.high),
          low: Math.min(lastCandle.low, newData.price || newData.rate || lastCandle.low),
          volume: lastCandle.volume + (Math.random() * 1000) // Simulate volume update
        }
      } else {
        // Create new candle
        const newPrice = newData.price || newData.rate || lastCandle.close
        updatedData.push({
          time: now,
          open: lastCandle.close,
          high: newPrice,
          low: newPrice,
          close: newPrice,
          volume: Math.random() * 10000 + 1000
        })
        
        // Keep only last 1000 candles for performance
        if (updatedData.length > 1000) {
          updatedData.shift()
        }
      }
      
      onDataUpdate?.(updatedData)
      return updatedData
    })
  }, [timeframe, onDataUpdate])

  useEffect(() => {
    fetchData()
    
    // Subscribe to real-time updates
    realTimeUpdater.subscribe(symbol, updateRealTimePrice)
    
    // Set up periodic refresh based on timeframe
    const refreshInterval = getRefreshInterval(timeframe)
    intervalRef.current = setInterval(fetchData, refreshInterval)
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      realTimeUpdater.unsubscribe(symbol, updateRealTimePrice)
    }
  }, [symbol, timeframe, fetchData, updateRealTimePrice])

  if (loading && candleData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading chart data...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-500">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative">
      {loading && (
        <div className="absolute top-2 right-2 z-10">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        </div>
      )}
      
      <div className="text-xs text-muted-foreground mb-2">
        Last updated: {new Date().toLocaleTimeString()} | 
        Data points: {candleData.length} | 
        Real-time: {symbol}
      </div>
      
      {/* Chart data is passed to parent component via onDataUpdate */}
      <div className="h-96 bg-gray-50 dark:bg-gray-900 rounded border flex items-center justify-center">
        <p className="text-muted-foreground">Chart rendered by parent component</p>
      </div>
    </div>
  )
}

// Helper functions
function getTimeframeMs(timeframe: string): number {
  const timeframes: { [key: string]: number } = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
    '1w': 604800000
  }
  return timeframes[timeframe] || 3600000
}

function getRefreshInterval(timeframe: string): number {
  // Refresh more frequently for shorter timeframes
  const intervals: { [key: string]: number } = {
    '1m': 10000,   // 10 seconds
    '5m': 30000,   // 30 seconds
    '15m': 60000,  // 1 minute
    '30m': 120000, // 2 minutes
    '1h': 300000,  // 5 minutes
    '4h': 600000,  // 10 minutes
    '1d': 1800000, // 30 minutes
    '1w': 3600000  // 1 hour
  }
  return intervals[timeframe] || 300000
}