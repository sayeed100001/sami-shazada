'use client'

import { useEffect, useRef, useState } from 'react'

interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  vwap?: number
  trades?: number
}

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

interface RealMarketDataFetcherProps {
  selectedAsset: string
  timeframe: string
  onDataUpdate: (data: CandleData[]) => void
  onAssetsUpdate: (assets: MarketAsset[]) => void
  onConnectionStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => void
  isRealTime: boolean
}

export function RealMarketDataFetcher({
  selectedAsset,
  timeframe,
  onDataUpdate,
  onAssetsUpdate,
  onConnectionStatusChange,
  isRealTime
}: RealMarketDataFetcherProps) {
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting')
  const wsRef = useRef<WebSocket | null>(null)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const retryCount = useRef(0)
  const maxRetries = 5

  // Update connection status
  const updateConnectionStatus = (status: 'connected' | 'disconnected' | 'connecting') => {
    setConnectionStatus(status)
    onConnectionStatusChange(status)
  }

  // Fetch market assets data
  const fetchMarketAssets = async () => {
    try {
      const response = await fetch('/api/market/overview')
      if (response.ok) {
        const data = await response.json()
        onAssetsUpdate(data.assets || [])
      } else {
        onAssetsUpdate([])
        updateConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Error fetching market assets:', error)
      onAssetsUpdate([])
      updateConnectionStatus('disconnected')
    }
  }

  // Fetch historical candle data
  const fetchCandleData = async (symbol: string, interval: string) => {
    try {
      const response = await fetch(`/api/charts/data?symbol=${encodeURIComponent(symbol)}&interval=${interval}&limit=100`)
      if (response.ok) {
        const data = await response.json()
        onDataUpdate(data.candles || [])
        updateConnectionStatus('connected')
      } else {
        onDataUpdate([])
        updateConnectionStatus('disconnected')
      }
    } catch (error) {
      console.error('Error fetching candle data:', error)
      onDataUpdate([])
      updateConnectionStatus('disconnected')
    }
  }

  // Get interval in milliseconds
  const getIntervalMs = (interval: string): number => {
    const intervalMap: { [key: string]: number } = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '1w': 7 * 24 * 60 * 60 * 1000
    }
    return intervalMap[interval] || 60 * 60 * 1000
  }

  // Use polling when real-time mode is enabled.
  const initializeWebSocket = () => {
    if (!isRealTime) return

    try {
      updateConnectionStatus('connecting')
      
      // Simulate connection delay
      setTimeout(() => {
        updateConnectionStatus('connected')
        retryCount.current = 0
        
        // Start real-time updates
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
        }
        
        intervalRef.current = setInterval(() => {
          if (isRealTime) {
            fetchCandleData(selectedAsset, timeframe)
            fetchMarketAssets()
          }
        }, 30000) // Update every 30 seconds
        
      }, 2000)
      
    } catch (error) {
      console.error('WebSocket connection error:', error)
      updateConnectionStatus('disconnected')
      
      // Retry connection
      if (retryCount.current < maxRetries) {
        retryCount.current++
        retryTimeoutRef.current = setTimeout(() => {
          initializeWebSocket()
        }, Math.pow(2, retryCount.current) * 1000) // Exponential backoff
      }
    }
  }

  // Cleanup function
  const cleanup = () => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
  }

  // Initialize data fetching
  useEffect(() => {
    updateConnectionStatus('connecting')
    
    // Initial data fetch
    fetchMarketAssets()
    fetchCandleData(selectedAsset, timeframe)
    
    // Initialize real-time updates if enabled
    if (isRealTime) {
      initializeWebSocket()
    } else {
      updateConnectionStatus('connected')
    }
    
    return cleanup
  }, [selectedAsset, timeframe, isRealTime])

  // Update data when asset or timeframe changes
  useEffect(() => {
    if (connectionStatus === 'connected') {
      fetchCandleData(selectedAsset, timeframe)
    }
  }, [selectedAsset, timeframe])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [])

  // This component doesn't render anything visible
  return null
}
