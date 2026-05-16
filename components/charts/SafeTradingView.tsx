'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, BarChart3 } from 'lucide-react'

interface SafeTradingViewProps {
  symbol?: string
  height?: number
}

export function SafeTradingView({ symbol = 'USDAFN', height = 400 }: SafeTradingViewProps) {
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
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}