import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ExternalAPIService } from '@/lib/external-api-service'
import { recordExternalApiCall } from '@/lib/external-api-usage'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // First try to get cached data from database
    let marketData = await prisma.marketData.findMany({
      where: {
        OR: [
          { symbol: 'BTCUSD', type: 'crypto' },
          { symbol: 'USDAFN', type: 'forex' },
          { symbol: 'XAUUSD', type: 'commodity' }
        ]
      },
      orderBy: { lastUpdate: 'desc' }
    })

    // If no data or data is stale (older than 5 minutes), fetch fresh data
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
    const shouldRefresh = marketData.length === 0 || 
      marketData.some(data => data.lastUpdate < fiveMinutesAgo)

    if (shouldRefresh) {
      try {
        // Fetch Bitcoin price from CoinGecko
        const coinGeckoConfig = await ExternalAPIService.getCoinGeckoConfig()
        if (coinGeckoConfig.enabled) {
          const startedAt = Date.now()
          const cryptoResponse = await fetch(
            ExternalAPIService.buildUrl(coinGeckoConfig.baseUrl, '/simple/price', {
              ids: 'bitcoin',
              vs_currencies: 'usd',
              include_24hr_change: true,
            }),
            {
              headers: ExternalAPIService.buildHeaders(coinGeckoConfig.apiKey)
            }
          )

          void recordExternalApiCall({
            key: 'coingecko',
            ok: cryptoResponse.ok,
            status: cryptoResponse.status,
            latencyMs: Date.now() - startedAt,
          }).catch(() => null)
          
          if (cryptoResponse.ok) {
            const cryptoData = await cryptoResponse.json()
            const btcPrice = cryptoData?.bitcoin?.usd
            const btcChange = cryptoData?.bitcoin?.usd_24h_change
            
            if (btcPrice && typeof btcPrice === 'number') {
              await prisma.marketData.upsert({
                where: { symbol_type: { symbol: 'BTCUSD', type: 'crypto' } },
                update: {
                  price: btcPrice,
                  change24h: (btcPrice * (btcChange || 0)) / 100,
                  changePercent24h: btcChange || 0,
                  lastUpdate: new Date()
                },
                create: {
                  symbol: 'BTCUSD',
                  type: 'crypto',
                  name: 'Bitcoin',
                  price: btcPrice,
                  change24h: (btcPrice * (btcChange || 0)) / 100,
                  changePercent24h: btcChange || 0
                }
              })
            }
          }
        }

        // Fetch USD/AFN rate from ExchangeRate-API
        const exchangeRateConfig = await ExternalAPIService.getExchangeRateConfig()
        if (exchangeRateConfig.enabled) {
          const startedAt = Date.now()
          const forexResponse = await fetch(
            ExternalAPIService.buildUrl(exchangeRateConfig.baseUrl, '/latest/USD'),
            {
              headers: ExternalAPIService.buildHeaders(exchangeRateConfig.apiKey)
            }
          )

          void recordExternalApiCall({
            key: 'exchangerate_api',
            ok: forexResponse.ok,
            status: forexResponse.status,
            latencyMs: Date.now() - startedAt,
          }).catch(() => null)
          
          if (forexResponse.ok) {
            const forexData = await forexResponse.json()
            const usdAfnRate = forexData.rates?.AFN

            if (typeof usdAfnRate === 'number' && Number.isFinite(usdAfnRate) && usdAfnRate > 0) {
              await prisma.marketData.upsert({
                where: { symbol_type: { symbol: 'USDAFN', type: 'forex' } },
                update: {
                  price: usdAfnRate,
                  change24h: 0,
                  changePercent24h: 0,
                  lastUpdate: new Date()
                },
                create: {
                  symbol: 'USDAFN',
                  type: 'forex',
                  name: 'USD to AFN',
                  price: usdAfnRate,
                  change24h: 0,
                  changePercent24h: 0
                }
              })
            }
          }
        }

        // Refetch updated data
        marketData = await prisma.marketData.findMany({
          where: {
            OR: [
              { symbol: 'BTCUSD', type: 'crypto' },
              { symbol: 'USDAFN', type: 'forex' },
              { symbol: 'XAUUSD', type: 'commodity' }
            ]
          },
          orderBy: { lastUpdate: 'desc' }
        })
      } catch (error) {
        console.error('Failed to refresh market data:', error)
        // Continue with cached data if refresh fails
      }
    }

    const btc = marketData.find(d => d.symbol === 'BTCUSD' && d.type === 'crypto')
    const usdAfn = marketData.find(d => d.symbol === 'USDAFN' && d.type === 'forex')
    const gold = marketData.find(d => d.symbol === 'XAUUSD' && d.type === 'commodity')

    const enhancedAssets = [
      btc
        ? {
            symbol: 'BTC/USD',
            name: btc.name || 'Bitcoin',
            price: btc.price,
            change24h: btc.change24h,
            changePercent24h: btc.changePercent24h,
            volume24h: btc.volume24h || 0,
            marketCap: btc.marketCap || 0,
            high24h: null,
            low24h: null,
            trend: (btc.changePercent24h || 0) > 0 ? 'up' : 'down',
            type: 'crypto',
            exchange: 'CoinGecko',
            lastUpdate: btc.lastUpdate.toISOString()
          }
        : null,
      usdAfn
        ? {
            symbol: 'USD/AFN',
            name: usdAfn.name || 'USD to AFN',
            price: usdAfn.price,
            change24h: usdAfn.change24h,
            changePercent24h: usdAfn.changePercent24h,
            volume24h: usdAfn.volume24h || 0,
            trend: (usdAfn.changePercent24h || 0) > 0 ? 'up' : (usdAfn.changePercent24h || 0) < 0 ? 'down' : 'neutral',
            type: 'forex',
            exchange: 'ExchangeRate-API',
            lastUpdate: usdAfn.lastUpdate.toISOString()
          }
        : null,
      gold
        ? {
            symbol: 'GOLD',
            name: gold.name || 'Gold',
            price: gold.price,
            change24h: gold.change24h,
            changePercent24h: gold.changePercent24h,
            volume24h: gold.volume24h || 0,
            trend: (gold.changePercent24h || 0) > 0 ? 'up' : (gold.changePercent24h || 0) < 0 ? 'down' : 'neutral',
            type: 'commodity',
            exchange: 'MarketData',
            lastUpdate: gold.lastUpdate.toISOString()
          }
        : null
    ].filter(Boolean)

    if (enhancedAssets.length === 0) {
      return NextResponse.json({ error: 'Market data unavailable' }, { status: 503 })
    }

    return NextResponse.json({
      success: true,
      assets: enhancedAssets,
      count: enhancedAssets.length,
      lastUpdate: new Date().toISOString()
    })
  } catch (error) {
    console.error('Market overview error:', error)
    
    return NextResponse.json({ error: 'Market overview unavailable' }, { status: 500 })
  }
}
