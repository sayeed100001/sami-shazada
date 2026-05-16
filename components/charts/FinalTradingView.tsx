'use client'

import { useEffect, useRef } from 'react'

interface FinalTradingViewProps {
  symbol: string
  interval?: string
  height?: number
}

export function FinalTradingView({ symbol, interval = '60', height = 600 }: FinalTradingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    containerRef.current.innerHTML = `
      <div class="tradingview-widget-container" style="height:${height}px;width:100%">
        <div class="tradingview-widget-container__widget" style="height:calc(${height}px - 32px);width:100%"></div>
        <script type="text/javascript" src="https://s.tradingview.com/external-embedding/embed-widget-advanced-chart.js" async>
        {
          "width": "100%",
          "height": "${height - 32}",
          "symbol": "${symbol}",
          "interval": "${interval}",
          "timezone": "Asia/Kabul",
          "theme": "dark",
          "style": "1",
          "locale": "en",
          "enable_publishing": false,
          "allow_symbol_change": true,
          "calendar": false,
          "support_host": "https://www.tradingview.com"
        }
        </script>
      </div>
    `
  }, [symbol, interval, height])

  return <div ref={containerRef} className="w-full rounded-lg overflow-hidden" />
}