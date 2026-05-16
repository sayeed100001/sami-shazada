export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface MarketAsset {
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h?: number
  trend: 'up' | 'down' | 'neutral'
  type: 'crypto' | 'forex' | 'commodity'
  exchange?: string
}

export async function fetchRealCandleData(symbol: string, timeframe: string): Promise<CandleData[]> {
  try {
    const limit = getTimeframeLimit(timeframe)
    const response = await fetch(
      `/api/charts/data?symbol=${encodeURIComponent(symbol)}&interval=${encodeURIComponent(timeframe)}&limit=${limit}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data?.candles) ? data.candles : []
  } catch (error) {
    console.error('Failed to fetch candle data:', error)
    return []
  }
}

export async function fetchRealMarketAssets(): Promise<MarketAsset[]> {
  const assets: MarketAsset[] = []

  try {
    const [cryptoRes, ratesRes, commodityRes] = await Promise.all([
      fetch('/api/crypto', { cache: 'no-store' }),
      fetch('/api/rates', { cache: 'no-store' }),
      fetch('/api/market/commodities', { cache: 'no-store' }),
    ])

    if (cryptoRes.ok) {
      const cryptoData = await cryptoRes.json()
      if (Array.isArray(cryptoData)) {
        cryptoData.forEach((crypto: any) => {
          assets.push({
            symbol: `${crypto.symbol}/USD`,
            name: crypto.name,
            price: crypto.price,
            change24h: crypto.change24h || 0,
            changePercent24h: crypto.changePercent24h || 0,
            volume24h: crypto.volume24h || 0,
            trend: getTrend(crypto.changePercent24h || 0),
            type: 'crypto',
            exchange: 'Internal Market API',
          })
        })
      }
    }

    if (ratesRes.ok) {
      const ratesData = await ratesRes.json()
      if (Array.isArray(ratesData)) {
        ratesData.forEach((rate: any) => {
          assets.push({
            symbol: `${rate.from}/${rate.to}`,
            name: `${rate.from} به ${rate.to}`,
            price: rate.rate,
            change24h: 0,
            changePercent24h: 0,
            trend: 'neutral',
            type: 'forex',
            exchange: 'Internal Market API',
          })
        })
      }
    }

    if (commodityRes.ok) {
      const commodityData = await commodityRes.json()
      if (Array.isArray(commodityData)) {
        commodityData.forEach((commodity: any) => {
          assets.push({
            symbol: commodity.symbol,
            name: commodity.name,
            price: commodity.price,
            change24h: commodity.change24h || 0,
            changePercent24h: commodity.changePercent24h || 0,
            volume24h: commodity.volume24h || 0,
            trend: getTrend(commodity.changePercent24h || 0),
            type: 'commodity',
            exchange: commodity.exchange || 'Internal Market API',
          })
        })
      }
    }
  } catch (error) {
    console.error('Failed to fetch market assets:', error)
  }

  return assets
}

function getTimeframeLimit(timeframe: string): number {
  const limits: Record<string, number> = {
    '1m': 500,
    '5m': 500,
    '15m': 500,
    '30m': 500,
    '1h': 500,
    '4h': 500,
    '1d': 365,
    '1w': 52,
  }

  return limits[timeframe] || 500
}

function getTrend(changePercent: number): 'up' | 'down' | 'neutral' {
  if (changePercent > 0) return 'up'
  if (changePercent < 0) return 'down'
  return 'neutral'
}
