'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, DollarSign, TrendingUp, Settings } from 'lucide-react'

interface FullTradingViewChartProps {
  symbol?: string
  interval?: string
  onSymbolChange?: (symbol: string) => void
}

const SYMBOL_MAP: Record<string, string> = {
  'USDAFN': 'FX:EURUSD',
  'EURAFN': 'FX:EURUSD',
  'PKRAFN': 'FX:USDPKR',
  'IRRAFN': 'FX:USDIRR',
  'BTCUSD': 'BINANCE:BTCUSDT',
  'ETHUSD': 'BINANCE:ETHUSDT',
  'BNBUSD': 'BINANCE:BNBUSDT',
  'XRPUSD': 'BINANCE:XRPUSDT',
  'ADAUSD': 'BINANCE:ADAUSDT',
  'SOLUSD': 'BINANCE:SOLUSDT',
  'DOTUSD': 'BINANCE:DOTUSDT',
  'XAUUSD': 'TVC:GOLD',
  'XAGUSD': 'TVC:SILVER',
  'XPTUSD': 'TVC:PLATINUM',
  'XPDUSD': 'TVC:PALLADIUM',
  'USOIL': 'TVC:USOIL',
  'UKOIL': 'TVC:UKOIL',
  'NATGAS': 'TVC:NATURALGAS',
  'SPX': 'TVC:SPX',
  'DJI': 'TVC:DJI',
  'IXIC': 'TVC:IXIC',
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'USDCHF': 'FX:USDCHF',
  'AUDUSD': 'FX:AUDUSD',
  'USDCAD': 'FX:USDCAD',
  'NZDUSD': 'FX:NZDUSD'
}

const QUICK_SYMBOLS = [
  { label: 'USD/AFN', value: 'USDAFN', category: 'Afghan' },
  { label: 'EUR/AFN', value: 'EURAFN', category: 'Afghan' },
  { label: 'BTC', value: 'BTCUSD', category: 'Crypto' },
  { label: 'ETH', value: 'ETHUSD', category: 'Crypto' },
  { label: 'Gold', value: 'XAUUSD', category: 'Commodities' },
  { label: 'Silver', value: 'XAGUSD', category: 'Commodities' },
  { label: 'Oil', value: 'USOIL', category: 'Commodities' },
  { label: 'EUR/USD', value: 'EURUSD', category: 'Forex' }
]

export function FullTradingViewChart({ 
  symbol = 'BTCUSD', 
  interval = '60',
  onSymbolChange 
}: FullTradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentSymbol, setCurrentSymbol] = useState(symbol)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [widgetId] = useState(() => `tv_chart_${Date.now()}`)

  useEffect(() => {
    if (!containerRef.current) return

    const tvSymbol = SYMBOL_MAP[currentSymbol] || currentSymbol
    
    containerRef.current.innerHTML = ''

    const container = document.createElement('div')
    container.className = 'tradingview-widget-container'
    container.style.height = '100%'
    container.style.width = '100%'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.id = widgetId
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: interval,
      timezone: 'Etc/UTC',
      theme: 'dark',
      style: '1',
      locale: 'en',
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies',
        'MACD@tv-basicstudies'
      ],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650',
      container_id: widgetId,
      drawings_access: {
        type: 'black',
        tools: [
          { name: 'Regression Trend' },
          { name: 'Trend Line' },
          { name: 'Horizontal Line' },
          { name: 'Vertical Line' },
          { name: 'Cross Line' },
          { name: 'Trend Angle' },
          { name: 'Arrow' },
          { name: 'Ray' },
          { name: 'Extended Line' },
          { name: 'Parallel Channel' },
          { name: 'Disjoint Channel' },
          { name: 'Flat Top/Bottom' },
          { name: 'Pitchfork' },
          { name: 'Schiff Pitchfork' },
          { name: 'Modified Schiff Pitchfork' },
          { name: 'Inside Pitchfork' },
          { name: 'Pitchfan' },
          { name: 'Gann Fan' },
          { name: 'Gann Square' },
          { name: 'Fibonacci Retracement' },
          { name: 'Fibonacci Extensions' },
          { name: 'Fibonacci Arcs' },
          { name: 'Fibonacci Fan' },
          { name: 'Fibonacci Time Zones' },
          { name: 'Fibonacci Channel' },
          { name: 'Fibonacci Circles' },
          { name: 'Fibonacci Speed Resistance Arcs' },
          { name: 'Fibonacci Speed Resistance Fan' },
          { name: 'Fibonacci Spiral' },
          { name: 'Fibonacci Timezone' },
          { name: 'Fibonacci Wedge' },
          { name: 'Rectangle' },
          { name: 'Rotated Rectangle' },
          { name: 'Ellipse' },
          { name: 'Triangle' },
          { name: 'Polyline' },
          { name: 'Path' },
          { name: 'Curve' },
          { name: 'Arc' },
          { name: 'Brush' },
          { name: 'Text' },
          { name: 'Anchored Text' },
          { name: 'Note' },
          { name: 'Anchored Note' },
          { name: 'Callout' },
          { name: 'Price Label' },
          { name: 'Price Note' },
          { name: 'Arrow Marker' },
          { name: 'Flag Mark' },
          { name: 'XABCD Pattern' },
          { name: 'Cypher Pattern' },
          { name: 'ABCD Pattern' },
          { name: 'Triangle Pattern' },
          { name: 'Head and Shoulders' },
          { name: 'Elliott Wave' },
          { name: 'Long Position' },
          { name: 'Short Position' }
        ]
      },
      studies_overrides: {
        'volume.volume.color.0': '#ef5350',
        'volume.volume.color.1': '#26a69a'
      },
      overrides: {
        'mainSeriesProperties.candleStyle.upColor': '#26a69a',
        'mainSeriesProperties.candleStyle.downColor': '#ef5350',
        'mainSeriesProperties.candleStyle.borderUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.borderDownColor': '#ef5350',
        'mainSeriesProperties.candleStyle.wickUpColor': '#26a69a',
        'mainSeriesProperties.candleStyle.wickDownColor': '#ef5350',
        'paneProperties.background': '#131722',
        'paneProperties.backgroundType': 'solid'
      },
      disabled_features: [],
      enabled_features: [
        'study_templates',
        'use_localstorage_for_settings',
        'save_chart_properties_to_local_storage',
        'create_volume_indicator_by_default'
      ]
    }

    script.innerHTML = JSON.stringify(config)

    container.appendChild(widgetDiv)
    container.appendChild(script)
    containerRef.current.appendChild(container)

    script.onload = () => {
      setTimeout(() => setIsLoading(false), 2000)
    }

    script.onerror = () => {
      setIsLoading(false)
    }

  }, [currentSymbol, interval, widgetId])

  const handleSymbolSelect = (sym: string) => {
    setCurrentSymbol(sym)
    onSymbolChange?.(sym)
  }

  const handleSearch = () => {
    if (searchTerm.trim()) {
      const upperSymbol = searchTerm.toUpperCase()
      handleSymbolSelect(upperSymbol)
      setSearchTerm('')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-[250px] max-w-md">
          <Input
            placeholder="Search symbol (e.g., BTCUSD, AAPL, EURUSD)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            className="flex-1"
          />
          <Button onClick={handleSearch} size="icon" variant="default">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Settings className="h-4 w-4" />
          <span>Current: {currentSymbol}</span>
        </div>
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
            {sym.category === 'Afghan' && <DollarSign className="h-3 w-3" />}
            {sym.category === 'Crypto' && <TrendingUp className="h-3 w-3" />}
            {sym.label}
          </Button>
        ))}
      </div>

      <div className="relative w-full h-[750px] bg-[#131722] rounded-lg overflow-hidden border border-gray-700 shadow-2xl">
        {isLoading && (
          <div className="absolute inset-0 bg-[#131722] flex items-center justify-center z-20">
            <div className="text-center space-y-4">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto"></div>
              <div>
                <h3 className="text-xl font-semibold text-white mb-2">Loading TradingView</h3>
                <p className="text-sm text-gray-400">Initializing advanced charting tools...</p>
                <p className="text-xs text-gray-500 mt-2">Symbol: {currentSymbol}</p>
              </div>
            </div>
          </div>
        )}
        
        <div ref={containerRef} className="w-full h-full" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <div className="p-3 bg-gradient-to-br from-blue-500/10 to-blue-600/10 rounded-lg border border-blue-500/20">
          <div className="font-semibold text-blue-400 mb-1">📊 Drawing Tools</div>
          <div className="text-muted-foreground">50+ drawing tools available</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-green-500/10 to-green-600/10 rounded-lg border border-green-500/20">
          <div className="font-semibold text-green-400 mb-1">📈 Indicators</div>
          <div className="text-muted-foreground">100+ technical indicators</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-500/10 to-purple-600/10 rounded-lg border border-purple-500/20">
          <div className="font-semibold text-purple-400 mb-1">⏱️ Timeframes</div>
          <div className="text-muted-foreground">1m to 1M intervals</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-orange-500/10 to-orange-600/10 rounded-lg border border-orange-500/20">
          <div className="font-semibold text-orange-400 mb-1">💾 Auto-Save</div>
          <div className="text-muted-foreground">Charts saved automatically</div>
        </div>
        <div className="p-3 bg-gradient-to-br from-pink-500/10 to-pink-600/10 rounded-lg border border-pink-500/20">
          <div className="font-semibold text-pink-400 mb-1">🔍 Compare</div>
          <div className="text-muted-foreground">Compare multiple symbols</div>
        </div>
      </div>
    </div>
  )
}
