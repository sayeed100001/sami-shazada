'use client'
import { useEffect, useRef } from 'react'

interface ProfessionalTradingViewProps {
  symbol?: string
}

export default function ProfessionalTradingView({ symbol = 'BINANCE:BTCUSDT' }: ProfessionalTradingViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    // Clear previous widget
    containerRef.current.innerHTML = ''

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      width: "100%",
      height: "100%",
      symbol: symbol,
      interval: "D",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      hide_top_toolbar: false,
      toolbar_bg: "#1e293b",
      studies: [
        "Volume@tv-basicstudies",
        "MACD@tv-basicstudies",
        "RSI@tv-basicstudies"
      ],
      drawings_access: {
        type: "black",
        tools: [
          { name: "Regression Trend" },
          { name: "Trend Line" },
          { name: "Horizontal Line" },
          { name: "Vertical Line" },
          { name: "Cross Line" },
          { name: "Trend Angle" },
          { name: "Arrow" },
          { name: "Text" },
          { name: "Note" },
          { name: "Anchored Note" },
          { name: "Callout" },
          { name: "Price Label" },
          { name: "Price Range" },
          { name: "Bars Pattern" },
          { name: "Ghost Feed" },
          { name: "Projection" },
          { name: "Rectangle" },
          { name: "Rotated Rectangle" },
          { name: "Ellipse" },
          { name: "Triangle" },
          { name: "Polyline" },
          { name: "Path" },
          { name: "Curve" },
          { name: "Arc" },
          { name: "Fibonacci Retracement" },
          { name: "Fibonacci Extension" },
          { name: "Fibonacci Spiral" },
          { name: "Fibonacci Fan" },
          { name: "Fibonacci Arc" },
          { name: "Fibonacci Channel" },
          { name: "Fibonacci Time Zone" },
          { name: "Pitchfork" },
          { name: "Schiff Pitchfork" },
          { name: "Modified Schiff Pitchfork" },
          { name: "Inside Pitchfork" },
          { name: "Pitchfan" },
          { name: "Gann Box" },
          { name: "Gann Square" },
          { name: "Gann Fan" },
          { name: "Speed Resistance Lines" },
          { name: "Speed Resistance Arc" },
          { name: "Cycle Lines" },
          { name: "Sine Line" },
          { name: "Long Position" },
          { name: "Short Position" },
          { name: "Forecast" },
          { name: "Date Range" },
          { name: "Price Range" },
          { name: "Date and Price Range" },
          { name: "Brush" },
          { name: "Highlighter" }
        ]
      },
      support_host: "https://www.tradingview.com"
    })

    containerRef.current.appendChild(script)
  }, [symbol])

  return (
    <div className="w-full h-full min-h-[600px] md:min-h-[650px] lg:min-h-[700px]">
      <div ref={containerRef} className="tradingview-widget-container w-full h-full">
        <div className="tradingview-widget-container__widget w-full h-full"></div>
      </div>
    </div>
  )
}