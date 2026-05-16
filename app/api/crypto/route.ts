import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storePriceSnapshot } from '@/lib/market-history'
import { ExternalAPIService } from '@/lib/external-api-service'
import { recordExternalApiCall } from '@/lib/external-api-usage'

export const dynamic = 'force-dynamic'

const CRYPTO_IDS = [
  'bitcoin', 'ethereum', 'tether', 'binancecoin', 'ripple', 'cardano',
  'solana', 'polkadot', 'dogecoin', 'avalanche-2', 'polygon-pos', 'chainlink',
  'litecoin', 'uniswap', 'stellar', 'monero', 'ethereum-classic', 'bitcoin-cash'
]

async function getUsdAfnRate() {
  try {
    const cached = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: 'USDAFN', type: 'forex' } },
      select: { price: true },
    })

    if (cached?.price && Number.isFinite(cached.price) && cached.price > 0) {
      return cached.price
    }
  } catch {
    // ignore database fallback errors
  }

  try {
    const exchangeRateConfig = await ExternalAPIService.getExchangeRateConfig()
    if (!exchangeRateConfig.enabled) {
      return null
    }

    const startedAt = Date.now()
    const response = await fetch(`${exchangeRateConfig.baseUrl}/latest/USD`, {
      headers: ExternalAPIService.buildHeaders(exchangeRateConfig.apiKey),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })

    void recordExternalApiCall({
      key: 'exchangerate_api',
      ok: response.ok,
      status: response.status,
      latencyMs: Date.now() - startedAt,
    }).catch(() => null)

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    const rate = data?.rates?.AFN

    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      return null
    }

    await prisma.marketData
      .upsert({
        where: { symbol_type: { symbol: 'USDAFN', type: 'forex' } },
        update: {
          price: rate,
          change24h: 0,
          changePercent24h: 0,
          lastUpdate: new Date(),
        },
        create: {
          symbol: 'USDAFN',
          type: 'forex',
          name: 'USD to AFN',
          price: rate,
          change24h: 0,
          changePercent24h: 0,
        },
      })
      .catch(() => null)

    return rate
  } catch {
    return null
  }
}

export async function GET() {
  try {
    const coinGeckoConfig = await ExternalAPIService.getCoinGeckoConfig()
    
    const coinGeckoStartedAt = Date.now()
    const [response, usdAfnRate] = await Promise.allSettled([
      coinGeckoConfig.enabled
        ? fetch(
            `${coinGeckoConfig.baseUrl}/coins/markets?vs_currency=usd&ids=${CRYPTO_IDS.join(',')}&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h`,
            { 
              headers: ExternalAPIService.buildHeaders(coinGeckoConfig.apiKey),
              next: { revalidate: 120 } 
            }
          )
        : Promise.reject(new Error('CoinGecko disabled')),
      getUsdAfnRate(),
    ])

    if (response.status === 'fulfilled') {
      void recordExternalApiCall({
        key: 'coingecko',
        ok: response.value.ok,
        status: response.value.status,
        latencyMs: Date.now() - coinGeckoStartedAt,
      }).catch(() => null)
    } else {
      void recordExternalApiCall({
        key: 'coingecko',
        ok: false,
        status: null,
        latencyMs: Date.now() - coinGeckoStartedAt,
      }).catch(() => null)
    }

    const resolvedUsdAfnRate = usdAfnRate.status === 'fulfilled' ? usdAfnRate.value : null

    if (response.status !== 'fulfilled' || !response.value.ok) {
      const stored = await prisma.marketData.findMany({
        where: { type: 'crypto' },
        orderBy: [
          { marketCap: 'desc' },
          { lastUpdate: 'desc' },
        ],
        take: 50,
      })

      if (stored.length === 0) {
        throw new Error('CoinGecko API failed and no cached crypto data is available')
      }

      return NextResponse.json(
        stored.map((coin) => ({
          symbol: coin.symbol.replace(/USD$/, ''),
          name: coin.name,
          price: coin.price,
          priceAfn: resolvedUsdAfnRate ? coin.price * resolvedUsdAfnRate : null,
          change24h: coin.change24h || 0,
          changePercent24h: coin.changePercent24h || 0,
          volume24h: coin.volume24h || 0,
          marketCap: coin.marketCap || 0,
          trend:
            (coin.changePercent24h || 0) > 0.5 ? 'up' :
            (coin.changePercent24h || 0) < -0.5 ? 'down' : 'neutral',
          lastUpdate: coin.lastUpdate.toISOString(),
          source: 'database',
        }))
      )
    }

    const data = await response.value.json()

    const cryptoData = await Promise.all(
      data.map(async (coin: any) => {
        const symbol = coin.symbol.toUpperCase()
        const price = coin.current_price
        const change24h = coin.price_change_24h || 0
        const changePercent24h = coin.price_change_percentage_24h || 0
        const volume24h = coin.total_volume || 0
        const marketCap = coin.market_cap || 0
        const lastUpdate = new Date().toISOString()

        await prisma.marketData
          .upsert({
            where: { symbol_type: { symbol: `${symbol}USD`, type: 'crypto' } },
            update: {
              name: coin.name,
              price,
              change24h,
              changePercent24h,
              volume24h,
              marketCap,
              lastUpdate: new Date(),
            },
            create: {
              symbol: `${symbol}USD`,
              type: 'crypto',
              name: coin.name,
              price,
              change24h,
              changePercent24h,
              volume24h,
              marketCap,
            },
          })
          .catch(() => null)

        await storePriceSnapshot({
          symbol: `${symbol}USD`,
          name: coin.name,
          type: 'crypto',
          price,
          volume: volume24h,
          timestamp: new Date(lastUpdate),
        }).catch(() => null)

        return {
          symbol,
          name: coin.name,
          price,
          priceAfn: resolvedUsdAfnRate ? price * resolvedUsdAfnRate : null,
          change24h,
          changePercent24h,
          volume24h,
          marketCap,
          trend:
            changePercent24h > 0.5 ? 'up' :
            changePercent24h < -0.5 ? 'down' : 'neutral',
          lastUpdate,
        }
      })
    )

    return NextResponse.json(cryptoData)
  } catch (error) {
    console.error('Crypto API error:', error)
    return NextResponse.json({ error: 'Failed to fetch crypto data' }, { status: 500 })
  }
}
