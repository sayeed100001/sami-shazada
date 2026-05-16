import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ExternalAPIService } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

interface CoinGeckoAsset {
  id: string
  symbol: string
  name: string
  current_price: number
  price_change_24h: number
  price_change_percentage_24h: number
  total_volume: number
  market_cap: number
}

async function fetchTopCryptoFromCoinGecko(): Promise<CoinGeckoAsset[]> {
  const config = await ExternalAPIService.getCoinGeckoConfig()
  
  if (!config.enabled) {
    throw new Error('CoinGecko API is disabled')
  }
  
  const response = await fetch(
    `${config.baseUrl}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=20&page=1&sparkline=false&price_change_percentage=24h`,
    {
      headers: ExternalAPIService.buildHeaders(config.apiKey),
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8000)
    }
  )

  if (!response.ok) {
    throw new Error(`CoinGecko API error: ${response.status}`)
  }

  return response.json()
}

async function ensureUsdRatesInDb() {
  const needed = ['EUR', 'GBP', 'JPY', 'AFN']
  const existing = await prisma.marketData.findMany({
    where: {
      type: 'forex',
      symbol: { in: needed.map((c) => `USD${c}`) }
    },
    select: { symbol: true, lastUpdate: true }
  })

  const existingSymbols = new Set(existing.map((r) => r.symbol))
  const staleThreshold = new Date(Date.now() - 30 * 60 * 1000)
  const hasStale = existing.some((r) => r.lastUpdate < staleThreshold)

  if (existingSymbols.size === needed.length && !hasStale) return

  const config = await ExternalAPIService.getExchangeRateConfig()
  if (!config.enabled) return

  const res = await fetch(`${config.baseUrl}/latest/USD`, {
    headers: ExternalAPIService.buildHeaders(config.apiKey),
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(8000)
  })

  if (!res.ok) return
  const data = await res.json()
  const rates = data?.rates || {}

  for (const cur of needed) {
    const rate = rates[cur]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) continue

    await prisma.marketData.upsert({
      where: { symbol_type: { symbol: `USD${cur}`, type: 'forex' } },
      update: {
        price: rate,
        change24h: 0,
        changePercent24h: 0,
        lastUpdate: new Date()
      },
      create: {
        symbol: `USD${cur}`,
        type: 'forex',
        name: `USD to ${cur}`,
        price: rate,
        change24h: 0,
        changePercent24h: 0
      }
    })
  }
}

export async function GET() {
  try {
    const assets: any[] = []

    // Crypto (primary: CoinGecko)
    try {
      const coinGeckoData = await fetchTopCryptoFromCoinGecko()

      const cryptoAssets = coinGeckoData.map((coin) => ({
        symbol: coin.symbol.toUpperCase() + 'USD',
        name: coin.name,
        type: 'crypto' as const,
        price: coin.current_price,
        change24h: coin.price_change_24h || 0,
        changePercent24h: coin.price_change_percentage_24h || 0,
        volume24h: coin.total_volume || 0,
        marketCap: coin.market_cap || 0,
        available: true,
        exchange: 'CoinGecko'
      }))

      assets.push(...cryptoAssets)

      // Persist for resilience (best-effort)
      for (const crypto of cryptoAssets) {
        await prisma.marketData
          .upsert({
            where: { symbol_type: { symbol: crypto.symbol, type: 'crypto' } },
            update: {
              name: crypto.name,
              price: crypto.price,
              change24h: crypto.change24h,
              changePercent24h: crypto.changePercent24h,
              volume24h: crypto.volume24h,
              marketCap: crypto.marketCap,
              lastUpdate: new Date()
            },
            create: {
              symbol: crypto.symbol,
              type: 'crypto',
              name: crypto.name,
              price: crypto.price,
              change24h: crypto.change24h,
              changePercent24h: crypto.changePercent24h,
              volume24h: crypto.volume24h,
              marketCap: crypto.marketCap
            }
          })
          .catch(() => null)
      }
    } catch (error) {
      // No fake fallback: rely on DB cache below
      console.warn('Crypto live fetch failed:', error)
      const cachedCrypto = await prisma.marketData.findMany({
        where: { type: 'crypto' },
        orderBy: { lastUpdate: 'desc' },
        take: 20
      })
      assets.push(
        ...cachedCrypto.map((row) => ({
          symbol: row.symbol,
          name: row.name,
          type: 'crypto' as const,
          price: row.price,
          change24h: row.change24h,
          changePercent24h: row.changePercent24h,
          volume24h: row.volume24h || 0,
          marketCap: row.marketCap || 0,
          available: true,
          exchange: 'DB Cache'
        }))
      )
    }

    // Forex (USD base rates from DB, refresh if stale/missing)
    await ensureUsdRatesInDb()

    const usdRates = await prisma.marketData.findMany({
      where: {
        type: 'forex',
        symbol: { in: ['USDEUR', 'USDGBP', 'USDJPY', 'USDAFN'] }
      }
    })

    const bySymbol = new Map(usdRates.map((r) => [r.symbol, r.price]))
    const usdEur = bySymbol.get('USDEUR')
    const usdGbp = bySymbol.get('USDGBP')
    const usdJpy = bySymbol.get('USDJPY')
    const usdAfn = bySymbol.get('USDAFN')

    const forexAssets = [
      usdEur
        ? {
            symbol: 'EURUSD',
            name: 'Euro / US Dollar',
            type: 'forex' as const,
            price: 1 / usdEur,
            change24h: 0,
            changePercent24h: 0,
            available: true,
            exchange: 'ExchangeRate-API'
          }
        : null,
      usdGbp
        ? {
            symbol: 'GBPUSD',
            name: 'British Pound / US Dollar',
            type: 'forex' as const,
            price: 1 / usdGbp,
            change24h: 0,
            changePercent24h: 0,
            available: true,
            exchange: 'ExchangeRate-API'
          }
        : null,
      usdJpy
        ? {
            symbol: 'USDJPY',
            name: 'US Dollar / Japanese Yen',
            type: 'forex' as const,
            price: usdJpy,
            change24h: 0,
            changePercent24h: 0,
            available: true,
            exchange: 'ExchangeRate-API'
          }
        : null,
      usdAfn
        ? {
            symbol: 'USDAFN',
            name: 'US Dollar / Afghan Afghani',
            type: 'forex' as const,
            price: usdAfn,
            change24h: 0,
            changePercent24h: 0,
            available: true,
            exchange: 'ExchangeRate-API'
          }
        : null
    ].filter(Boolean) as any[]

    assets.push(...forexAssets)

    // Commodities (from DB cache populated by /api/market/commodities)
    const commodityRows = await prisma.marketData.findMany({
      where: { type: 'commodity', symbol: { in: ['XAUUSD', 'XAGUSD', 'WTIUSD', 'BRENTUSD'] } },
      orderBy: { lastUpdate: 'desc' },
      take: 10
    })

    assets.push(
      ...commodityRows.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        type: 'commodity' as const,
        price: row.price,
        change24h: row.change24h,
        changePercent24h: row.changePercent24h,
        available: true,
        exchange: 'DB Cache'
      }))
    )

    const byType = assets.reduce(
      (acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1
        return acc
      },
      { crypto: 0, forex: 0, commodity: 0, stock: 0 } as any
    )

    return NextResponse.json({
      assets,
      total: assets.length,
      byType,
      lastUpdated: new Date().toISOString(),
      source: 'Live APIs + DB Cache'
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300'
      }
    })
  } catch (error) {
    console.error('Assets API error:', error)
    return NextResponse.json({ error: 'Failed to fetch assets' }, {
      status: 500,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60'
      }
    })
  }
}
