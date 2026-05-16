import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { ExternalAPIService } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

const COINGECKO_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  USDT: 'tether',
  BNB: 'binancecoin',
  ADA: 'cardano',
  SOL: 'solana',
  DOGE: 'dogecoin',
  MATIC: 'polygon-pos',
  XRP: 'ripple',
  DOT: 'polkadot',
  AVAX: 'avalanche-2',
  LTC: 'litecoin',
  LINK: 'chainlink'
}

async function getUsdAfnRate(): Promise<number | null> {
  try {
    const cached = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: 'USDAFN', type: 'forex' } },
      select: { price: true }
    })
    if (cached?.price && Number.isFinite(cached.price) && cached.price > 0) return cached.price
  } catch {
    // ignore
  }

  try {
    const config = await ExternalAPIService.getExchangeRateConfig()
    if (!config.enabled) return null
    
    const res = await fetch(`${config.baseUrl}/latest/USD`, {
      headers: ExternalAPIService.buildHeaders(config.apiKey),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000)
    })
    if (!res.ok) return null
    const data = await res.json()
    const rate = data?.rates?.AFN
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null
    return rate
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = sanitizeInput(searchParams.get('symbol') || 'BTC').toUpperCase()
  const period = sanitizeInput(searchParams.get('period') || '30d')

  try {
    // Parse period with validation
    const days = parseInt(period.replace('d', ''))
    
    if (isNaN(days) || days <= 0 || days > 365) {
      return NextResponse.json(
        { error: 'Invalid period. Must be between 1d and 365d' },
        { status: 400 }
      )
    }
    
    const coinId = COINGECKO_IDS[symbol]
    if (!coinId) {
      return NextResponse.json(
        { error: 'Unsupported symbol' },
        { status: 400 }
      )
    }

    const usdAfn = await getUsdAfnRate()
    
    const config = await ExternalAPIService.getCoinGeckoConfig()
    if (!config.enabled) {
      return NextResponse.json(
        { error: 'CoinGecko API is disabled' },
        { status: 503 }
      )
    }

    const res = await fetch(
      `${config.baseUrl}/coins/${encodeURIComponent(coinId)}/market_chart?vs_currency=usd&days=${days}`,
      {
        headers: ExternalAPIService.buildHeaders(config.apiKey),
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000)
      }
    )

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Failed to fetch crypto history' },
        { status: 503 }
      )
    }

    const data = await res.json()
    const prices: [number, number][] = Array.isArray(data?.prices) ? data.prices : []
    const volumes: [number, number][] = Array.isArray(data?.total_volumes) ? data.total_volumes : []
    const caps: [number, number][] = Array.isArray(data?.market_caps) ? data.market_caps : []

    const byDate = new Map<string, { price?: number; volume?: number; marketCap?: number }>()

    for (const [ts, price] of prices) {
      const date = new Date(ts).toISOString().slice(0, 10)
      const existing = byDate.get(date) || {}
      existing.price = price
      byDate.set(date, existing)
    }

    for (const [ts, volume] of volumes) {
      const date = new Date(ts).toISOString().slice(0, 10)
      const existing = byDate.get(date) || {}
      existing.volume = volume
      byDate.set(date, existing)
    }

    for (const [ts, marketCap] of caps) {
      const date = new Date(ts).toISOString().slice(0, 10)
      const existing = byDate.get(date) || {}
      existing.marketCap = marketCap
      byDate.set(date, existing)
    }

    const historicalData = Array.from(byDate.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, row]) => ({
        date,
        price: typeof row.price === 'number' ? Math.round(row.price * 100) / 100 : null,
        priceAfn: usdAfn && typeof row.price === 'number' ? Math.round(row.price * usdAfn * 100) / 100 : null,
        volume: typeof row.volume === 'number' ? Math.round(row.volume) : null,
        marketCap: typeof row.marketCap === 'number' ? Math.round(row.marketCap) : null
      }))

    return NextResponse.json({
      symbol,
      period,
      data: historicalData
    })
  } catch (error) {
    console.error('Crypto history error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch crypto history' },
      { status: 500 }
    )
  }
}
