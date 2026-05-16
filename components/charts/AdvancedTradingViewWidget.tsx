'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, DollarSign, TrendingUp, ExternalLink } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface AdvancedTradingViewWidgetProps {
  symbol?: string
  onSymbolChange?: (symbol: string) => void
}

const SYMBOL_MAP: Record<string, string> = {
  'USDAFN': 'FX_IDC:USDAFN',
  'EURAFN': 'FX_IDC:EURAFN',
  'GBPAFN': 'FX_IDC:GBPAFN',
  'USDPKR': 'FX_IDC:USDPKR',
  'USDIRR': 'OANDA:USDIRR',
  'USDSAR': 'FX:USDSAR',
  'USDAED': 'FX:USDAED',
  'USDIQD': 'FX_IDC:USDIQD',
  'USDTRY': 'FX:USDTRY',
  'USDINR': 'FX:USDINR',
  'USDCNY': 'FX:USDCNY',
  'USDEGP': 'FX:USDEGP',
  'USDJOD': 'FX_IDC:USDJOD',
  'USDKWD': 'FX:USDKWD',
  'USDOMR': 'FX:USDOMR',
  'USDQAR': 'FX:USDQAR',
  'USDBHD': 'FX:USDBHD',
  'BTCUSD': 'BINANCE:BTCUSDT',
  'ETHUSD': 'BINANCE:ETHUSDT',
  'XAUUSD': 'TVC:GOLD',
  'XAGUSD': 'TVC:SILVER',
  'EURUSD': 'FX:EURUSD',
  'GBPUSD': 'FX:GBPUSD',
  'USDJPY': 'FX:USDJPY',
  'AUDUSD': 'FX:AUDUSD',
  'USDCAD': 'FX:USDCAD',
  'USDCHF': 'FX:USDCHF'
}

export function AdvancedTradingViewWidget({ symbol = 'BTCUSD', onSymbolChange }: AdvancedTradingViewWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [currentSymbol, setCurrentSymbol] = useState(symbol)
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const { resolvedTheme } = useTheme()
  const { language } = useLanguage()
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  const quickSymbols = useMemo(
    () => [
      { label: pick('دالر/افغانی', 'USD/AFN', 'ډالر/افغانۍ'), value: 'USDAFN', icon: DollarSign },
      { label: pick('یورو/افغانی', 'EUR/AFN', 'یورو/افغانۍ'), value: 'EURAFN', icon: DollarSign },
      { label: pick('پوند/افغانی', 'GBP/AFN', 'پونډ/افغانۍ'), value: 'GBPAFN', icon: DollarSign },
      { label: pick('دالر/روپیه', 'USD/PKR', 'ډالر/روپۍ'), value: 'USDPKR', icon: DollarSign },
      { label: pick('دالر/ریال ایران', 'USD/IRR', 'ډالر/ایراني ریال'), value: 'USDIRR', icon: DollarSign },
      { label: pick('دالر/ریال سعودی', 'USD/SAR', 'ډالر/سعودي ریال'), value: 'USDSAR', icon: DollarSign },
      { label: pick('دالر/درهم', 'USD/AED', 'ډالر/درهم'), value: 'USDAED', icon: DollarSign },
      { label: pick('دالر/لیر', 'USD/TRY', 'ډالر/لیرا'), value: 'USDTRY', icon: DollarSign },
      { label: pick('دالر/روپیه هند', 'USD/INR', 'ډالر/هندي روپۍ'), value: 'USDINR', icon: DollarSign },
      { label: pick('یورو/دالر', 'EUR/USD', 'یورو/ډالر'), value: 'EURUSD', icon: DollarSign },
      { label: pick('بیت\u200cکوین', 'BTC', 'بټکوین'), value: 'BTCUSD', icon: TrendingUp },
      { label: pick('طلا', 'Gold', 'سره زر'), value: 'XAUUSD', icon: TrendingUp },
    ],
    [language]
  )

  // Keep internal state in sync if parent drives symbol.
  useEffect(() => {
    if (symbol) setCurrentSymbol(symbol)
  }, [symbol])

  useEffect(() => {
    if (!containerRef.current) return

    const tvSymbol = SYMBOL_MAP[currentSymbol] || 'BINANCE:BTCUSDT'
    const tvTheme = resolvedTheme === 'dark' ? 'dark' : 'light'
    const tvLocale = language === 'fa' ? 'fa' : 'en'
    
    setIsLoading(true)
    containerRef.current.innerHTML = ''

    const widgetContainer = document.createElement('div')
    widgetContainer.className = 'tradingview-widget-container'
    widgetContainer.style.height = '100%'
    widgetContainer.style.width = '100%'

    const widgetDiv = document.createElement('div')
    widgetDiv.className = 'tradingview-widget-container__widget'
    widgetDiv.style.height = '100%'
    widgetDiv.style.width = '100%'

    const script = document.createElement('script')
    script.type = 'text/javascript'
    script.src = 'https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js'
    script.async = true
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol: tvSymbol,
      interval: '60',
      timezone: 'Asia/Kabul',
      theme: tvTheme,
      style: '1',
      locale: tvLocale,
      enable_publishing: false,
      allow_symbol_change: true,
      calendar: false,
      hide_side_toolbar: false,
      support_host: 'https://www.tradingview.com',
      studies: [
        'MASimple@tv-basicstudies',
        'RSI@tv-basicstudies'
      ],
      show_popup_button: true,
      popup_width: '1000',
      popup_height: '650'
    })

    widgetContainer.appendChild(widgetDiv)
    widgetContainer.appendChild(script)
    containerRef.current.appendChild(widgetContainer)

    script.onload = () => setTimeout(() => setIsLoading(false), 1500)
    script.onerror = () => setIsLoading(false)

  }, [currentSymbol, resolvedTheme, language])

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
        <div className="flex gap-2 flex-1 min-w-[150px] sm:min-w-[200px] relative">
          <Input
            placeholder={pick('جستجو: USDAFN, EURUSD, BTCUSD, XAUUSD...', 'Search: USDAFN, EURUSD, BTCUSD, XAUUSD...', 'لټون: USDAFN, EURUSD, BTCUSD, XAUUSD...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            list="currency-suggestions"
          />
          <datalist id="currency-suggestions">
            <option value="USDAFN">{pick('USD/AFN - دالر به افغانی', 'USD/AFN - Dollar to Afghani', 'USD/AFN - ډالر په افغانۍ')}</option>
            <option value="EURAFN">{pick('EUR/AFN - یورو به افغانی', 'EUR/AFN - Euro to Afghani', 'EUR/AFN - یورو په افغانۍ')}</option>
            <option value="GBPAFN">{pick('GBP/AFN - پوند به افغانی', 'GBP/AFN - Pound to Afghani', 'GBP/AFN - پونډ په افغانۍ')}</option>
            <option value="USDPKR">{pick('USD/PKR - دالر به روپیه', 'USD/PKR - Dollar to Pakistani Rupee', 'USD/PKR - ډالر په روپۍ')}</option>
            <option value="USDIRR">{pick('USD/IRR - دالر به ریال ایران', 'USD/IRR - Dollar to Iranian Rial', 'USD/IRR - ډالر په ایراني ریال')}</option>
            <option value="USDSAR">{pick('USD/SAR - دالر به ریال سعودی', 'USD/SAR - Dollar to Saudi Riyal', 'USD/SAR - ډالر په سعودي ریال')}</option>
            <option value="USDAED">{pick('USD/AED - دالر به درهم', 'USD/AED - Dollar to UAE Dirham', 'USD/AED - ډالر په درهم')}</option>
            <option value="USDIQD">🇮🇶 USD/IQD - Dollar to Iraqi Dinar</option>
            <option value="USDTRY">{pick('USD/TRY - دالر به لیر', 'USD/TRY - Dollar to Turkish Lira', 'USD/TRY - ډالر په لیرا')}</option>
            <option value="USDINR">{pick('USD/INR - دالر به روپیه هند', 'USD/INR - Dollar to Indian Rupee', 'USD/INR - ډالر په هندي روپۍ')}</option>
            <option value="USDCNY">🇨🇳 USD/CNY - Dollar to Yuan</option>
            <option value="USDEGP">🇪🇬 USD/EGP - Dollar to Egyptian Pound</option>
            <option value="USDJOD">🇯🇴 USD/JOD - Dollar to Jordanian Dinar</option>
            <option value="USDKWD">🇰🇼 USD/KWD - Dollar to Kuwaiti Dinar</option>
            <option value="USDOMR">🇴🇲 USD/OMR - Dollar to Omani Rial</option>
            <option value="USDQAR">🇶🇦 USD/QAR - Dollar to Qatari Riyal</option>
            <option value="USDBHD">🇧🇭 USD/BHD - Dollar to Bahraini Dinar</option>
            <option value="EURUSD">{pick('EUR/USD - یورو به دالر', 'EUR/USD - Euro to Dollar', 'EUR/USD - یورو په ډالر')}</option>
            <option value="GBPUSD">💷 GBP/USD - Pound to Dollar</option>
            <option value="USDJPY">💴 USD/JPY - Dollar to Yen</option>
            <option value="AUDUSD">🇦🇺 AUD/USD - Australian Dollar</option>
            <option value="USDCAD">🇨🇦 USD/CAD - Dollar to Canadian Dollar</option>
            <option value="USDCHF">🇨🇭 USD/CHF - Dollar to Swiss Franc</option>
            <option value="BTCUSD">{pick('BTC - بیت\u200cکوین', 'BTC - Bitcoin', 'BTC - بټکوین')}</option>
            <option value="ETHUSD">Ξ ETH/USD - Ethereum</option>
            <option value="XAUUSD">{pick('XAU/USD - طلا', 'XAU/USD - Gold', 'XAU/USD - سره زر')}</option>
            <option value="XAGUSD">🥈 XAG/USD - Silver</option>
          </datalist>
          <Button onClick={handleSearch} size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
          {quickSymbols.map((sym) => (
            <Button
              key={sym.value}
              variant={currentSymbol === sym.value ? 'default' : 'outline'}
              size="sm"
              className="text-xs sm:text-sm px-2 sm:px-3 gap-1"
              onClick={() => handleSymbolSelect(sym.value)}
            >
              <sym.icon className="h-3 w-3" />
              {sym.label}
            </Button>
          ))}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-xs sm:text-sm px-2 sm:px-3 gap-1"
            onClick={() => {
              const tvSymbol = SYMBOL_MAP[currentSymbol] || 'BINANCE:BTCUSDT'
              window.open(
                `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
                '_blank',
                'noopener,noreferrer'
              )
            }}
            title="Open in TradingView"
          >
            <ExternalLink className="h-3 w-3" />
            TV
          </Button>
        </div>
      </div>

      <div className="relative w-full h-[400px] sm:h-[500px] lg:h-[700px] rounded-lg overflow-hidden bg-white dark:bg-[#131722]">
        {isLoading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-[#131722] flex items-center justify-center z-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-slate-900 dark:text-white">Loading chart...</p>
            </div>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
