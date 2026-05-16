'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3 } from 'lucide-react'

interface TradingViewWidgetProps {
  symbol: string
  theme?: 'light' | 'dark'
  height?: number
}

export function TradingViewWidget({ symbol, theme = 'dark', height = 600 }: TradingViewWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          نمودار {symbol}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div 
          className="flex items-center justify-center bg-muted rounded-lg"
          style={{ height: `${height}px` }}
        >
          <div className="text-center space-y-4">
            <TrendingUp className="h-12 w-12 mx-auto text-primary" />
            <div>
              <h3 className="font-semibold">نمودار قیمت</h3>
              <p className="text-sm text-muted-foreground">
                نمودار تعاملی برای {symbol}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                نمودارهای پیشرفته به زودی فعال خواهند شد
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}