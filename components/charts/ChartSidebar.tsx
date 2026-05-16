'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { 
  TrendingUp, 
  BarChart3, 
  Activity, 
  Zap, 
  Target,
  Settings
} from 'lucide-react'

interface ChartSidebarProps {
  indicators: string[]
  onIndicatorToggle: (indicator: string) => void
  symbol: string
}

const AVAILABLE_INDICATORS = [
  {
    id: 'Volume',
    name: 'Volume',
    description: 'Trading volume indicator',
    category: 'Volume',
    icon: BarChart3,
    color: 'blue'
  },
  {
    id: 'RSI',
    name: 'RSI (14)',
    description: 'Relative Strength Index',
    category: 'Momentum',
    icon: TrendingUp,
    color: 'purple'
  },
  {
    id: 'MACD',
    name: 'MACD (12,26,9)',
    description: 'Moving Average Convergence Divergence',
    category: 'Momentum',
    icon: Activity,
    color: 'green'
  },
  {
    id: 'SMA',
    name: 'SMA (20)',
    description: 'Simple Moving Average',
    category: 'Moving Averages',
    icon: TrendingUp,
    color: 'orange'
  },
  {
    id: 'EMA',
    name: 'EMA (20)',
    description: 'Exponential Moving Average',
    category: 'Moving Averages',
    icon: TrendingUp,
    color: 'red'
  },
  {
    id: 'Bollinger',
    name: 'Bollinger Bands',
    description: 'Bollinger Bands (20,2)',
    category: 'Volatility',
    icon: Target,
    color: 'indigo'
  },
  {
    id: 'Stochastic',
    name: 'Stochastic %K',
    description: 'Stochastic Oscillator',
    category: 'Momentum',
    icon: Zap,
    color: 'yellow'
  },
  {
    id: 'ATR',
    name: 'ATR (14)',
    description: 'Average True Range',
    category: 'Volatility',
    icon: Activity,
    color: 'pink'
  }
]

const CATEGORIES = [
  'Volume',
  'Moving Averages', 
  'Momentum',
  'Volatility'
]

export function ChartSidebar({ indicators, onIndicatorToggle, symbol }: ChartSidebarProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const filteredIndicators = selectedCategory === 'all' 
    ? AVAILABLE_INDICATORS
    : AVAILABLE_INDICATORS.filter(ind => ind.category === selectedCategory)

  const getColorClass = (color: string) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      purple: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      green: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      orange: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      red: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      indigo: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      yellow: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      pink: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
    }
    return colors[color as keyof typeof colors] || colors.blue
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Technical Indicators</h3>
        <Badge variant="outline">{indicators.length} Active</Badge>
      </div>

      {/* Category Filter */}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-1">
          <Button
            variant={selectedCategory === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('all')}
            className="text-xs"
          >
            All
          </Button>
          {CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              className="text-xs"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Active Indicators Summary */}
      {indicators.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Active on {symbol}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              {indicators.map((indicator) => {
                const indicatorInfo = AVAILABLE_INDICATORS.find(ind => ind.id === indicator)
                if (!indicatorInfo) return null
                
                return (
                  <div key={indicator} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <indicatorInfo.icon className="w-4 h-4" />
                      <span className="text-sm font-medium">{indicatorInfo.name}</span>
                    </div>
                    <Badge className={`text-xs ${getColorClass(indicatorInfo.color)}`}>
                      ON
                    </Badge>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Available Indicators */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Available Indicators
        </h4>
        
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredIndicators.map((indicator) => {
            const isActive = indicators.includes(indicator.id)
            
            return (
              <div
                key={indicator.id}
                className={`p-3 rounded-lg border transition-all ${
                  isActive 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1">
                    <div className={`p-2 rounded-lg ${
                      isActive ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-100 dark:bg-gray-700'
                    }`}>
                      <indicator.icon className="w-4 h-4" />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-medium text-sm">{indicator.name}</span>
                        <Badge className={`text-xs ${getColorClass(indicator.color)}`}>
                          {indicator.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500">{indicator.description}</p>
                    </div>
                  </div>
                  
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => onIndicatorToggle(indicator.id)}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Quick Actions
        </h4>
        
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Enable common indicators
              const common = ['Volume', 'RSI', 'MACD']
              common.forEach(ind => {
                if (!indicators.includes(ind)) {
                  onIndicatorToggle(ind)
                }
              })
            }}
            className="text-xs"
          >
            Add Common
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Clear all indicators
              indicators.forEach(ind => onIndicatorToggle(ind))
            }}
            className="text-xs"
          >
            Clear All
          </Button>
        </div>
      </div>
    </div>
  )
}