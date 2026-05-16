import { NextRequest, NextResponse } from 'next/server'
import { aggregateCandles, getStoredCandles, normalizeMarketSymbol, parsePeriodToDays, storePriceSnapshot } from '@/lib/market-history'
import { fetchRealHistoricalData } from '@/lib/realHistoricalData'
import { prisma } from '@/lib/prisma'
import { ExternalAPIService } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

async function fetchForexTimeSeries(base: string, target: string, days: number) {
  const endDate = new Date()
  const startDate = new Date(endDate)
  startDate.setDate(endDate.getDate() - Math.max(days, 1))

  const start = startDate.toISOString().slice(0, 10)
  const end = endDate.toISOString().slice(0, 10)
  
  try {
    const config = await ExternalAPIService.getExchangeRateHostConfig()
    if (!config.enabled) return []

    const url = ExternalAPIService.buildUrl(config.baseUrl, '/timeframe', {
      start_date: start,
      end_date: end,
      base,
      symbols: target,
    })

    const response = await fetch(url, {
      headers: ExternalAPIService.buildHeaders(config.apiKey),
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return []

    const payload = await response.json()
    const entries = Object.entries(payload?.rates || {})
      .map(([date, values]) => {
        const rate = (values as Record<string, unknown>)?.[target]
        if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
          return null
        }

        return {
          date,
          rate,
        }
      })
      .filter(Boolean) as Array<{ date: string; rate: number }>

    if (entries.length === 0) return []

    await Promise.all(
      entries.map(({ date, rate }) =>
        storePriceSnapshot({
          symbol: normalizeMarketSymbol(`${base}${target}`),
          name: `${base} to ${target}`,
          type: 'forex',
          price: rate,
          timestamp: new Date(`${date}T00:00:00.000Z`),
        })
      )
    )

    return entries.map(({ date, rate }, index) => {
      const previous = index > 0 ? entries[index - 1].rate : rate
      const high = Math.max(rate, previous)
      const low = Math.min(rate, previous)

      return {
        date,
        rate: Number(rate.toFixed(6)),
        open: Number(previous.toFixed(6)),
        high: Number(high.toFixed(6)),
        low: Number(low.toFixed(6)),
        close: Number(rate.toFixed(6)),
        volume: 0,
      }
    })
  } catch {
    return []
  }
}

async function fetchLatestForexRate(base: string, target: string) {
  try {
    const config = await ExternalAPIService.getExchangeRateConfig()
    if (!config.enabled) return null

    const url = ExternalAPIService.buildUrl(config.baseUrl, `/latest/${base}`)

    const response = await fetch(url, {
      headers: ExternalAPIService.buildHeaders(config.apiKey),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) return null

    const payload = await response.json()
    const rate = payload?.rates?.[target]

    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      return null
    }

    return {
      rate,
      timestamp: new Date(),
    }
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const base = (searchParams.get('base') || 'USD').replace(/[<>"'&/\s]/g, '').toUpperCase()
  const to = (searchParams.get('to') || 'AFN').replace(/[<>"'&/\s]/g, '').toUpperCase()
  const period = (searchParams.get('period') || '30d').replace(/[<>"'&]/g, '').toLowerCase()

  const days = parsePeriodToDays(period)
  if (!days) {
    return NextResponse.json(
      { error: 'Invalid period. Use formats like 7d, 30d, 12w, or 6m.' },
      { status: 400 }
    )
  }

  try {
    const symbol = normalizeMarketSymbol(`${base}${to}`)
    const timeframe = days <= 7 ? '1h' : '1d'

    const storedCandles = await getStoredCandles(symbol, days, '1h')
    if (storedCandles.length > 0) {
      const normalized = aggregateCandles(storedCandles, timeframe).map((candle) => ({
        date: new Date(candle.time).toISOString().slice(0, 10),
        rate: Number(candle.close.toFixed(6)),
        open: Number(candle.open.toFixed(6)),
        high: Number(candle.high.toFixed(6)),
        low: Number(candle.low.toFixed(6)),
        close: Number(candle.close.toFixed(6)),
        volume: candle.volume,
      }))

      return NextResponse.json({
        base,
        target: to,
        period,
        source: 'database',
        partial: normalized.length < Math.min(days, 7),
        data: normalized,
      })
    }

    const liveCandles = await fetchRealHistoricalData(symbol, timeframe, Math.min(days, 365))
    if (liveCandles.length > 0) {
      return NextResponse.json({
        base,
        target: to,
        period,
        source: 'live',
        partial: false,
        data: liveCandles.map((candle) => ({
          date: new Date(candle.time).toISOString().slice(0, 10),
          rate: Number(candle.close.toFixed(6)),
          open: Number(candle.open.toFixed(6)),
          high: Number(candle.high.toFixed(6)),
          low: Number(candle.low.toFixed(6)),
          close: Number(candle.close.toFixed(6)),
          volume: candle.volume,
        })),
      })
    }

    const forexSeries = await fetchForexTimeSeries(base, to, days)
    if (forexSeries.length > 0) {
      return NextResponse.json({
        base,
        target: to,
        period,
        source: 'exchangerate.host',
        partial: false,
        data: forexSeries,
      })
    }

    const latestLiveRate = await fetchLatestForexRate(base, to)
    if (latestLiveRate) {
      await storePriceSnapshot({
        symbol,
        name: `${base} to ${to}`,
        type: 'forex',
        price: latestLiveRate.rate,
        timestamp: latestLiveRate.timestamp,
      }).catch(() => undefined)

      const date = latestLiveRate.timestamp.toISOString().slice(0, 10)
      return NextResponse.json({
        base,
        target: to,
        period,
        source: 'latest-live-rate',
        partial: true,
        data: [{
          date,
          rate: Number(latestLiveRate.rate.toFixed(6)),
          open: Number(latestLiveRate.rate.toFixed(6)),
          high: Number(latestLiveRate.rate.toFixed(6)),
          low: Number(latestLiveRate.rate.toFixed(6)),
          close: Number(latestLiveRate.rate.toFixed(6)),
          volume: 0,
        }],
      })
    }

    const latestRate = await prisma.marketData.findUnique({
      where: {
        symbol_type: {
          symbol,
          type: 'forex',
        },
      },
      select: {
        price: true,
        lastUpdate: true,
      },
    })

    if (latestRate?.price && Number.isFinite(latestRate.price) && latestRate.price > 0) {
      await storePriceSnapshot({
        symbol,
        name: `${base} to ${to}`,
        type: 'forex',
        price: latestRate.price,
        timestamp: latestRate.lastUpdate,
      }).catch(() => undefined)

      const date = latestRate.lastUpdate.toISOString().slice(0, 10)
      return NextResponse.json({
        base,
        target: to,
        period,
        source: 'latest-market-data',
        partial: true,
        data: [{
          date,
          rate: Number(latestRate.price.toFixed(6)),
          open: Number(latestRate.price.toFixed(6)),
          high: Number(latestRate.price.toFixed(6)),
          low: Number(latestRate.price.toFixed(6)),
          close: Number(latestRate.price.toFixed(6)),
          volume: 0,
        }],
      })
    }

    return NextResponse.json(
      {
        error: 'Historical rate data is currently unavailable for this currency pair',
        base,
        target: to,
        period,
        data: [],
      },
      { status: 503 }
    )
  } catch (error) {
    console.error('Historical rates error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch historical data' },
      { status: 500 }
    )
  }
}
