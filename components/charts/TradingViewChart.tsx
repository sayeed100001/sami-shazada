'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface TradingViewChartProps {
  symbol: string
  interval: string
  chartType: string
  indicators: string[]
  drawings: any[]
  onDrawingsChange: (drawings: any[]) => void
  userId?: string
}

declare global {
  interface Window {
    TradingView: any
  }
}

export function TradingViewChart({
  symbol,
  interval,
  chartType,
  indicators,
  drawings,
  onDrawingsChange,
  userId
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [scriptLoaded, setScriptLoaded] = useState(false)

  // Load TradingView script
  useEffect(() => {
    if (window.TradingView) {
      setScriptLoaded(true)
      return
    }

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => {
      setScriptLoaded(true)
    }
    script.onerror = () => {
      setError('Failed to load TradingView library')
      setIsLoading(false)
    }
    
    document.head.appendChild(script)

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script)
      }
    }
  }, [])

  // Load user drawings
  const loadUserDrawings = useCallback(async () => {
    if (!userId) return []
    
    try {
      const response = await fetch(`/api/charts/drawings?symbol=${symbol}&timeframe=${interval}`)
      if (response.ok) {
        const data = await response.json()
        return data.drawings || []
      }
    } catch (error) {
      console.error('Failed to load drawings:', error)
    }
    return []
  }, [userId, symbol, interval])

  // Save user drawings
  const saveUserDrawings = useCallback(async (newDrawings: any[]) => {
    if (!userId) return
    
    try {
      await fetch('/api/charts/drawings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          timeframe: interval,
          drawings: newDrawings
        })
      })
      onDrawingsChange(newDrawings)
    } catch (error) {
      console.error('Failed to save drawings:', error)
    }
  }, [userId, symbol, interval, onDrawingsChange])

  // Initialize TradingView widget
  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.TradingView) return

    const initializeChart = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Clean up previous widget
        if (widgetRef.current) {
          try {
            if (typeof widgetRef.current.remove === 'function') {
              widgetRef.current.remove()
            }
          } catch (e) {
            console.warn('Error removing previous widget:', e)
          }
          widgetRef.current = null
        }

        // Ensure container exists and is in DOM
        if (!containerRef.current || !containerRef.current.parentNode) {
          console.warn('Container not ready')
          setIsLoading(false)
          return
        }

        // Clear container
        containerRef.current.innerHTML = ''

        // Wait for DOM to be ready
        await new Promise(resolve => setTimeout(resolve, 100))

        // Load user drawings
        const userDrawings = await loadUserDrawings()

        // Create new widget with error handling
        try {
          widgetRef.current = new window.TradingView.widget({
          container_id: containerRef.current.id || 'tradingview_chart',
          autosize: true,
          width: '100%',
          height: '100%',
          symbol: symbol,
          interval: interval,
          timezone: 'Asia/Kabul',
          theme: 'dark',
          style: chartType === 'candlestick' ? '1' : chartType === 'line' ? '2' : '3',
          locale: 'en',
          toolbar_bg: '#1f2937',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: true,
          allow_symbol_change: true,
          details: true,
          hotlist: true,
          calendar: true,
          studies: indicators.map(indicator => {
            switch (indicator) {
              case 'Volume': return 'Volume@tv-basicstudies'
              case 'RSI': return 'Relative Strength Index@tv-basicstudies'
              case 'MACD': return 'MACD@tv-basicstudies'
              case 'SMA': return 'Moving Average@tv-basicstudies'
              case 'EMA': return 'Moving Average Exponential@tv-basicstudies'
              case 'Bollinger': return 'Bollinger Bands@tv-basicstudies'
              default: return indicator
            }
          }),
          drawings_access: {
            type: 'black',
            tools: [
              { name: 'Regression Trend' },
              { name: 'Trend Line' },
              { name: 'Info Line' },
              { name: 'Trend Angle' },
              { name: 'Arrow' },
              { name: 'Price Note' },
              { name: 'Anchored Note' },
              { name: 'Callout' },
              { name: 'Balloon' },
              { name: 'Rectangle' },
              { name: 'Rotated Rectangle' },
              { name: 'Ellipse' },
              { name: 'Triangle' },
              { name: 'Polyline' },
              { name: 'Path' },
              { name: 'Curve' },
              { name: 'Horizontal Line' },
              { name: 'Horizontal Ray' },
              { name: 'Vertical Line' },
              { name: 'Cross Line' },
              { name: 'Fibonacci Retracement' },
              { name: 'Fibonacci Extension' },
              { name: 'Fibonacci Fan' },
              { name: 'Gann Box' },
              { name: 'Gann Square' },
              { name: 'Gann Fan' },
              { name: 'Andrews Pitchfork' }
            ]
          },
          overrides: {
            'paneProperties.background': '#0f172a',
            'paneProperties.vertGridProperties.color': '#374151',
            'paneProperties.horzGridProperties.color': '#374151',
            'symbolWatermarkProperties.transparency': 90,
            'scalesProperties.textColor': '#d1d5db',
            'mainSeriesProperties.candleStyle.upColor': '#22c55e',
            'mainSeriesProperties.candleStyle.downColor': '#ef4444',
            'mainSeriesProperties.candleStyle.drawWick': true,
            'mainSeriesProperties.candleStyle.drawBorder': true,
            'mainSeriesProperties.candleStyle.borderUpColor': '#22c55e',
            'mainSeriesProperties.candleStyle.borderDownColor': '#ef4444',
            'mainSeriesProperties.candleStyle.wickUpColor': '#22c55e',
            'mainSeriesProperties.candleStyle.wickDownColor': '#ef4444'
          },
          onChartReady: () => {
            setIsLoading(false)
            
            // Load saved drawings
            if (userDrawings.length > 0 && widgetRef.current) {
              try {
                widgetRef.current.chart().loadDrawingsFromServer(userDrawings)
              } catch (e) {
                console.warn('Failed to load drawings:', e)
              }
            }

            // Set up drawing change listener
            if (widgetRef.current && userId) {
              widgetRef.current.chart().onDrawingEvent().subscribe(null, (drawingId: string, eventType: string) => {
                if (eventType === 'create' || eventType === 'modify' || eventType === 'remove') {
                  // Debounce saving
                  setTimeout(() => {
                    try {
                      const currentDrawings = widgetRef.current.chart().getAllShapes()
                      saveUserDrawings(currentDrawings)
                    } catch (e) {
                      console.warn('Failed to get drawings:', e)
                    }
                  }, 1000)
                }
              })
            }
          }
        })
        } catch (widgetError) {
          console.error('TradingView widget creation error:', widgetError)
          setError('Failed to create TradingView widget')
          setIsLoading(false)
          return
        }

      } catch (err) {
        console.error('TradingView widget error:', err)
        setError('Failed to initialize chart')
        setIsLoading(false)
      }
    }

    initializeChart()

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch (e) {
          console.warn('Error removing TradingView widget:', e)
        }
        widgetRef.current = null
      }
    }
  }, [scriptLoaded, symbol, interval, chartType, indicators, userId, loadUserDrawings, saveUserDrawings])

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-950 text-white">
        <div className="text-center p-8">
          <div className="text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold mb-2">Chart Loading Error</h3>
          <p className="text-gray-400 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reload Chart
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full bg-gray-950">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-950 bg-opacity-95 flex items-center justify-center z-20">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <h3 className="text-lg font-semibold mb-2">Loading Professional Chart</h3>
            <p className="text-gray-400">Initializing TradingView with your settings...</p>
            <div className="mt-4 text-xs text-gray-500">
              {symbol} • {interval} • {chartType}
            </div>
          </div>
        </div>
      )}
      
      <div
        ref={containerRef}
        id="tradingview_chart"
        className="w-full h-full"
      />
    </div>
  )
}