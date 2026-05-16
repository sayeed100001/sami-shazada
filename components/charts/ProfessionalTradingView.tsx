'use client'

import { useEffect, useRef } from 'react'
import { useTheme } from 'next-themes'

declare global {
  interface Window {
    TradingView: any
  }
}

export default function ProfessionalTradingView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const { theme } = useTheme()

  useEffect(() => {
    // Check if script already exists
    if (document.querySelector('script[src*="tradingview"]')) {
      initWidget()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = initWidget
    script.onerror = () => console.error('Failed to load TradingView script')
    
    document.head.appendChild(script)
    
    function initWidget() {
      if (containerRef.current && window.TradingView) {
        containerRef.current.innerHTML = ''
        
        try {
          new window.TradingView.widget({
            autosize: true,
            symbol: 'BTCUSD',
            interval: '1H',
            timezone: 'Asia/Kabul',
            theme: theme === 'dark' ? 'dark' : 'light',
            style: '1',
            locale: 'en',
            toolbar_bg: theme === 'dark' ? '#1e293b' : '#f1f3f6',
            enable_publishing: false,
            hide_top_toolbar: false,
            hide_legend: false,
            save_image: true,
            container_id: containerRef.current.id,
            studies: ['Volume@tv-basicstudies'],
            overrides: {
              'paneProperties.background': theme === 'dark' ? '#1e293b' : '#ffffff',
              'paneProperties.vertGridProperties.color': theme === 'dark' ? '#334155' : '#e2e8f0',
              'paneProperties.horzGridProperties.color': theme === 'dark' ? '#334155' : '#e2e8f0'
            }
          })
        } catch (error) {
          console.error('TradingView widget initialization failed:', error)
        }
      }
    }
    
    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script)
      }
    }
  }, [theme])

  return (
    <div className="w-full h-[600px] rounded-lg border bg-white dark:bg-slate-900">
      <div 
        ref={containerRef}
        id={`tradingview-${Date.now()}`}
        className="w-full h-full"
      />
    </div>
  )
}