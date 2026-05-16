import { ExternalAPIService } from './external-api-service'

export interface HistoricalCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export async function fetchRealHistoricalData(symbol: string, timeframe: string, limit = 1000): Promise<HistoricalCandle[]> {
  try {
    const normalizedSymbol = symbol.replace('/', '').toUpperCase()
    const supportedCryptoBases = ['BTC', 'ETH', 'ADA', 'SOL', 'BNB', 'XRP', 'DOGE', 'MATIC', 'DOT', 'LTC', 'LINK']

    // Try Binance API for crypto pairs
    if (supportedCryptoBases.some((base) => normalizedSymbol.startsWith(base)) && normalizedSymbol.endsWith('USD')) {
      const binanceSymbol = normalizedSymbol.replace('USD', 'USDT')
      const interval = getBinanceInterval(timeframe)

      const config = await ExternalAPIService.getBinanceConfig()
      if (config.enabled) {
        const url = ExternalAPIService.buildUrl(config.baseUrl, '/klines', {
          symbol: binanceSymbol,
          interval,
          limit: Math.min(limit, 1000),
        })
        const response = await fetch(url, {
          headers: ExternalAPIService.buildHeaders(config.apiKey),
          next: { revalidate: 300 }
        })

        if (response.ok) {
          const data = await response.json()
          return data.map((candle: any[]) => ({
            time: candle[0],
            open: parseFloat(candle[1]),
            high: parseFloat(candle[2]),
            low: parseFloat(candle[3]),
            close: parseFloat(candle[4]),
            volume: parseFloat(candle[5])
          }))
        }
      }
    }
    
    // Try Yahoo Finance for forex and commodities
    const yahooSymbol = getYahooSymbol(symbol)
    if (yahooSymbol) {
      const period = getYahooPeriod(timeframe)
      const interval = getYahooInterval(timeframe)

      const config = await ExternalAPIService.getYahooFinanceConfig()
      if (config.enabled) {
        const url = ExternalAPIService.buildUrl(config.baseUrl, `/${yahooSymbol}`, {
          period1: period.start,
          period2: period.end,
          interval,
        })
        const response = await fetch(url, {
          headers: ExternalAPIService.buildHeaders(config.apiKey, {
            extra: { 'User-Agent': 'Mozilla/5.0' },
          }),
          next: { revalidate: 300 }
        })

        if (response.ok) {
          const data = await response.json()
          const result = data.chart?.result?.[0]
          
          if (result?.timestamp && result?.indicators?.quote?.[0]) {
            const timestamps = result.timestamp
            const quote = result.indicators.quote[0]
            
            return timestamps.map((time: number, i: number) => ({
              time: time * 1000,
              open: quote.open?.[i] || quote.close?.[i] || 0,
              high: quote.high?.[i] || quote.close?.[i] || 0,
              low: quote.low?.[i] || quote.close?.[i] || 0,
              close: quote.close?.[i] || 0,
              volume: quote.volume?.[i] || 0
            })).filter((candle: HistoricalCandle) => candle.close > 0)
          }
        }
      }
    }
    
  } catch (error) {
    console.error('Real historical data fetch failed:', error)
  }
  
  // No mock fallback in production
  return []
}

function getBinanceInterval(timeframe: string): string {
  const intervals: {[key: string]: string} = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w'
  }
  return intervals[timeframe] || '1h'
}

function getYahooSymbol(symbol: string): string | null {
  const symbolMap: {[key: string]: string} = {
    'EURUSD': 'EURUSD=X',
    'GBPUSD': 'GBPUSD=X',
    'USDJPY': 'USDJPY=X',
    'USDCAD': 'USDCAD=X',
    'AUDUSD': 'AUDUSD=X',
    'XAUUSD': 'GC=F',
    'XAGUSD': 'SI=F',
    'WTIUSD': 'CL=F',
    'BRENTUSD': 'BZ=F'
  }
  return symbolMap[symbol.replace('/', '')] || null
}

function getYahooPeriod(timeframe: string): {start: number, end: number} {
  const now = Math.floor(Date.now() / 1000)
  const periods: {[key: string]: number} = {
    '1m': 86400, '5m': 432000, '15m': 1296000, '30m': 2592000,
    '1h': 7776000, '4h': 31104000, '1d': 31536000, '1w': 157680000
  }
  const period = periods[timeframe] || 7776000
  return { start: now - period, end: now }
}

function getYahooInterval(timeframe: string): string {
  const intervals: {[key: string]: string} = {
    '1m': '1m', '5m': '5m', '15m': '15m', '30m': '30m',
    '1h': '1h', '4h': '1h', '1d': '1d', '1w': '1wk'
  }
  return intervals[timeframe] || '1h'
}
