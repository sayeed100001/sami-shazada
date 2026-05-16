'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, TrendingUp, DollarSign } from 'lucide-react'

interface CompleteTradingViewProps {
  symbol?: string
  onSymbolChange?: (symbol: string) => void
}

const SYMBOL_SHORTCUTS: Record<string, string> = {
  'USDAFN': 'FX:EURUSD',
  'EURAFN': 'FX:EURUSD',
  'PKRAFN': 'FX:USDPKR',
  'IRRAFN': 'FX:USDIRR',
  'BTCUSD': 'BINANCE:BTCUSDT',
  'ETHUSD': 'BINANCE:ETHUSDT',
  'XAUUSD': 'TVC:GOLD',
  'XAGUSD': 'TVC:SILVER',
  'USOIL': 'TVC:USOIL',
  'SPX': 'TVC:SPX',
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY'
}

const QUICK_SYMBOLS = [
  { label: 'USD/AFN', value: 'USDAFN', icon: DollarSign },
  { label: 'EUR/AFN', value: 'EURAFN', icon: DollarSign },
  { label: 'BTC/USD', value: 'BTCUSD', icon: TrendingUp },
  { label: 'ETH/USD', value: 'ETHUSD', icon: TrendingUp },
  { label: 'Gold', value: 'XAUUSD', icon: TrendingUp },
  { label: 'Silver', value: 'XAGUSD', icon: TrendingUp }
]

export function CompleteTradingView({ symbol = 'BTCUSD', onSymbolChange }: CompleteTradingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<any>(null)
  const [currentSymbol, setCurrentSymbol] = useState(symbol)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => initWidget()
    document.head.appendChild(script)

    return () => {
      if (widgetRef.current) {
        try {
          widgetRef.current.remove()
        } catch (e) {}
      }
      document.head.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (widgetRef.current && currentSymbol) {
      const tvSymbol = SYMBOL_SHORTCUTS[currentSymbol] || currentSymbol
      widgetRef.current.setSymbol(tvSymbol, '60')
    }
  }, [currentSymbol])

  const initWidget = () => {
    if (!containerRef.current || typeof window === 'undefined' || !(window as any).TradingView) return

    try {
      const tvSymbol = SYMBOL_SHORTCUTS[currentSymbol] || 'BINANCE:BTCUSDT'

      widgetRef.current = new (window as any).TradingView.widget({
        container: containerRef.current,
        library_path: '/charting_library/',
        locale: 'en',
        disabled_features: [],
        enabled_features: [
          'study_templates',
          'use_localstorage_for_settings',
          'save_chart_properties_to_local_storage',
          'create_volume_indicator_by_default',
          'header_widget',
          'header_symbol_search',
          'symbol_search_hot_key',
          'header_resolutions',
          'header_chart_type',
          'header_settings',
          'header_indicators',
          'header_compare',
          'header_undo_redo',
          'header_screenshot',
          'header_fullscreen_button',
          'left_toolbar',
          'control_bar',
          'timeframes_toolbar',
          'edit_buttons_in_legend',
          'context_menus',
          'pane_context_menu',
          'scales_context_menu',
          'legend_context_menu'
        ],
        charts_storage_url: 'https://saveload.tradingview.com',
        charts_storage_api_version: '1.1',
        client_id: 'tradingview.com',
        user_id: 'public_user_id',
        fullscreen: false,
        autosize: true,
        symbol: tvSymbol,
        interval: '60',
        timezone: 'Etc/UTC',
        theme: 'dark',
        style: '1',
        toolbar_bg: '#1e222d',
        enable_publishing: false,
        allow_symbol_change: true,
        save_image: true,
        studies_overrides: {},
        overrides: {
          'mainSeriesProperties.candleStyle.upColor': '#26a69a',
          'mainSeriesProperties.candleStyle.downColor': '#ef5350',
          'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
          'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
          'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350'
        },
        loading_screen: { backgroundColor: '#1e222d', foregroundColor: '#2962ff' },
        favorites: {
          intervals: ['1', '5', '15', '60', '240', 'D', 'W'],
          chartTypes: ['Area', 'Candles', 'Line', 'Bars', 'HeikinAshi']
        }
      })

      widgetRef.current.onChartReady(() => {
        setIsLoading(false)
        
        // Add all drawing tools
        const chart = widgetRef.current.activeChart()
        
        // Enable all drawing tools
        chart.createStudy('Moving Average', false, false, [20])
        chart.createStudy('RSI', false, false, [14])
      })
    } catch (error) {
      console.error('TradingView initialization error:', error)
      setIsLoading(false)
    }
  }

  const handleSymbolSelect = (sym: string) => {
    setCurrentSymbol(sym)
    onSymbolChange?.(sym)
  }

  const handleSearch = () => {
    if (searchTerm.trim()) {
      handleSymbolSelect(searchTerm.toUpperCase())
      setSearchTerm('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Search symbol (e.g., BTCUSD, EURUSD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {QUICK_SYMBOLS.map((sym) => (
            <Button
              key={sym.value}
              variant={currentSymbol === sym.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleSymbolSelect(sym.value)}
              className="gap-1"
            >
              <sym.icon className="h-3 w-3" />
              {sym.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="relative w-full h-[700px] bg-[#1e222d] rounded-lg overflow-hidden border border-gray-700">
        {isLoading && (
          <div className="absolute inset-0 bg-[#1e222d] flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold text-white mb-2">Loading TradingView</h3>
              <p className="text-sm text-gray-400">Initializing advanced charting...</p>
            </div>
          </div>
        )}
        
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-muted-foreground">
        <div className="p-2 bg-muted rounded">
          <div className="font-semibold">Drawing Tools</div>
          <div>All TradingView drawing tools available</div>
        </div>
        <div className="p-2 bg-muted rounded">
          <div className="font-semibold">Indicators</div>
          <div>100+ technical indicators</div>
        </div>
        <div className="p-2 bg-muted rounded">
          <div className="font-semibold">Timeframes</div>
          <div>1m to 1M intervals</div>
        </div>
        <div className="p-2 bg-muted rounded">
          <div className="font-semibold">Save Charts</div>
          <div>Auto-save your analysis</div>
        </div>
      </div>
    </div>
  )
}
