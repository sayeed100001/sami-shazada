'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3, Activity } from 'lucide-react'

interface SimpleTradingViewProps {
  symbol?: string
  onSymbolChange?: (symbol: string) => void
}

const SYMBOL_NAMES: Record<string, string> = {
  'BTCUSD': 'Bitcoin',
  'ETHUSD': 'Ethereum', 
  'EURUSD': 'Euro/Dollar',
  'GBPUSD': 'Pound/Dollar',
  'USDJPY': 'Dollar/Yen',
  'USDPKR': 'Dollar/Rupee',
  'XAUUSD': 'Gold',
  'USOIL': 'Oil'
}

export function SimpleTradingView({ symbol = 'BTCUSD', onSymbolChange }: SimpleTradingViewProps) {
  const symbolName = SYMBOL_NAMES[symbol] || symbol

  return (
    <div className="relative w-full h-full min-h-[600px] bg-gray-900 rounded-lg overflow-hidden border border-gray-700">
      <Card className="h-full bg-gray-900 border-gray-700">
        <CardHeader className="text-white">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            نمودار {symbolName}
          </CardTitle>
        </CardHeader>
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center space-y-4 text-white">
            <Activity className="h-16 w-16 mx-auto text-blue-500" />
            <div>
              <h3 className="text-xl font-semibold mb-2">نمودار معاملاتی</h3>
              <p className="text-gray-400 mb-4">
                نمودار پیشرفته برای {symbolName}
              </p>
              <div className="bg-blue-600 text-white px-4 py-2 rounded-lg inline-block">
                نماد: {symbol}
              </div>
              <p className="text-sm text-gray-500 mt-4">
                نمودارهای تعاملی پیشرفته به زودی فعال خواهند شد
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}