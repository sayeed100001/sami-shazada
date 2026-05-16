'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AssetSelector } from './AssetSelector'
import { 
  Search, 
  BarChart3, 
  TrendingUp, 
  Activity, 
  Eye, 
  EyeOff,
  Settings,
  Maximize2,
  RefreshCw,
  Wifi,
  WifiOff,
  Menu
} from 'lucide-react'

interface ChartToolbarProps {
  symbol: string
  interval: string
  chartType: string
  onSymbolChange: (symbol: string) => void
  onIntervalChange: (interval: string) => void
  onChartTypeChange: (type: string) => void
  onSidebarToggle: () => void
  isMobile?: boolean
}

const TIMEFRAMES = [
  { id: '1m', name: '1m', label: '1 Minute' },
  { id: '5m', name: '5m', label: '5 Minutes' },
  { id: '15m', name: '15m', label: '15 Minutes' },
  { id: '30m', name: '30m', label: '30 Minutes' },
  { id: '1H', name: '1H', label: '1 Hour' },
  { id: '4H', name: '4H', label: '4 Hours' },
  { id: '1D', name: '1D', label: '1 Day' },
  { id: '1W', name: '1W', label: '1 Week' }
]

const CHART_TYPES = [
  { id: 'candlestick', name: 'Candlestick', icon: BarChart3 },
  { id: 'line', name: 'Line', icon: TrendingUp },
  { id: 'area', name: 'Area', icon: Activity }
]

export function ChartToolbar({
  symbol,
  interval,
  chartType,
  onSymbolChange,
  onIntervalChange,
  onChartTypeChange,
  onSidebarToggle
}: ChartToolbarProps) {
  const [showAssetSelector, setShowAssetSelector] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected')
  const [isFullscreen, setIsFullscreen] = useState(false)

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  const refreshChart = () => {
    setConnectionStatus('connecting')
    // Simulate refresh
    setTimeout(() => {
      setConnectionStatus('connected')
    }, 1000)
  }

  return (
    <>
      {/* Mobile Layout */}
      <div className="md:hidden">
        <div className="flex flex-col bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          {/* Top Row - Symbol and Controls */}
          <div className="flex items-center justify-between p-2">
            <Button
              variant="outline"
              onClick={() => setShowAssetSelector(true)}
              className="flex-1 max-w-[200px] justify-start mr-2"
              size="sm"
            >
              <Search className="w-3 h-3 mr-1" />
              <div className="text-left">
                <div className="font-semibold text-xs">{symbol}</div>
              </div>
            </Button>
            
            <div className="flex items-center space-x-1">
              <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                connectionStatus === 'connected' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                  : connectionStatus === 'connecting'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}>
                {connectionStatus === 'connected' && <Wifi className="w-2 h-2" />}
                {connectionStatus === 'connecting' && <RefreshCw className="w-2 h-2 animate-spin" />}
                {connectionStatus === 'disconnected' && <WifiOff className="w-2 h-2" />}
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onSidebarToggle}
                className="p-2"
              >
                <Menu className="w-3 h-3" />
              </Button>
            </div>
          </div>
          
          {/* Bottom Row - Timeframes */}
          <div className="flex items-center justify-between p-2 pt-0">
            <div className="flex space-x-1 overflow-x-auto">
              {TIMEFRAMES.slice(0, 6).map((tf) => (
                <Button
                  key={tf.id}
                  variant={interval === tf.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onIntervalChange(tf.id)}
                  className="text-xs px-2 py-1 min-w-[40px] flex-shrink-0"
                >
                  {tf.name}
                </Button>
              ))}
            </div>
            
            <div className="flex space-x-1 ml-2">
              {CHART_TYPES.map((type) => (
                <Button
                  key={type.id}
                  variant={chartType === type.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChartTypeChange(type.id)}
                  className="p-1"
                >
                  <type.icon className="w-3 h-3" />
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex items-center justify-between p-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => setShowAssetSelector(true)}
            className="min-w-[200px] justify-start"
          >
            <Search className="w-4 h-4 mr-2" />
            <div className="text-left">
              <div className="font-semibold text-sm">{symbol}</div>
              <div className="text-xs text-gray-500">Click to change asset</div>
            </div>
          </Button>

          <div className="flex space-x-1">
            {TIMEFRAMES.map((tf) => (
              <Button
                key={tf.id}
                variant={interval === tf.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onIntervalChange(tf.id)}
                className="text-xs"
                title={tf.label}
              >
                {tf.name}
              </Button>
            ))}
          </div>

          <div className="flex space-x-1">
            {CHART_TYPES.map((type) => (
              <Button
                key={type.id}
                variant={chartType === type.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => onChartTypeChange(type.id)}
                className="text-xs"
                title={type.name}
              >
                <type.icon className="w-4 h-4" />
              </Button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <div className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
            connectionStatus === 'connected' 
              ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
              : connectionStatus === 'connecting'
              ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
              : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
          }`}>
            {connectionStatus === 'connected' && <Wifi className="w-3 h-3" />}
            {connectionStatus === 'connecting' && <RefreshCw className="w-3 h-3 animate-spin" />}
            {connectionStatus === 'disconnected' && <WifiOff className="w-3 h-3" />}
            <span className="capitalize">{connectionStatus}</span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshChart}
            disabled={connectionStatus === 'connecting'}
            title="Refresh Chart"
          >
            <RefreshCw className={`w-4 h-4 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleFullscreen}
            title="Toggle Fullscreen"
          >
            <Maximize2 className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onSidebarToggle}
            title="Toggle Sidebar"
          >
            <EyeOff className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {showAssetSelector && (
        <AssetSelector
          currentSymbol={symbol}
          onSymbolSelect={(newSymbol) => {
            onSymbolChange(newSymbol)
            setShowAssetSelector(false)
          }}
          onClose={() => setShowAssetSelector(false)}
        />
      )}
    </>
  )
}