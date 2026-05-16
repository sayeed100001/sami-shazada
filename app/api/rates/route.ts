import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { storePriceSnapshot } from '@/lib/market-history'
import { ExternalAPIService } from '@/lib/external-api-service'
import { recordExternalApiCall } from '@/lib/external-api-usage'

interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdate: string
  source: string
}

export const dynamic = 'force-dynamic'

const SUPPORTED_CURRENCIES = [
  'AFN', 'EUR', 'GBP', 'PKR', 'IRR', 'CAD', 'JPY', 'AUD', 'CHF', 'CNY', 
  'SAR', 'AED', 'INR', 'TRY', 'RUB', 'KRW', 'SGD', 'HKD', 'MXN', 'BRL',
  'ZAR', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'EGP', 'QAR', 'KWD', 'BHD',
  'OMR', 'JOD', 'LBP', 'SYP', 'IQD', 'UZS', 'KZT', 'KGS', 'TJS', 'TMT'
]
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes
const EXTERNAL_API_TIMEOUT_MS = 4000

// In-memory cache
let ratesCache: { data: ExchangeRate[], timestamp: number } | null = null

function buildRatesResponse(rates: ExchangeRate[], cacheStatus: string) {
  return NextResponse.json(rates, {
    headers: {
      'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
      'X-Cache': cacheStatus
    }
  })
}

async function fetchFromExchangeRateAPI(): Promise<ExchangeRate[]> {
  const config = await ExternalAPIService.getExchangeRateConfig()
  
  if (!config.enabled) {
    throw new Error('ExchangeRate-API is disabled')
  }
  
  const url = ExternalAPIService.buildUrl(config.baseUrl, '/latest/USD')

  const startedAt = Date.now()
  const response = await fetch(url, {
    headers: ExternalAPIService.buildHeaders(config.apiKey),
    next: { revalidate: 300 }, // 5 minutes
    signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS)
  })

  void recordExternalApiCall({
    key: 'exchangerate_api',
    ok: response.ok,
    status: response.status,
    latencyMs: Date.now() - startedAt,
  }).catch(() => null)
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  
  const data = await response.json()
  if (!data.rates) throw new Error('Invalid response format')
  
  return Object.entries(data.rates)
    .filter(([currency]) => SUPPORTED_CURRENCIES.includes(currency))
    .map(([currency, rate]) => ({
      from: 'USD',
      to: currency,
      rate: rate as number,
      lastUpdate: new Date().toISOString(),
      source: 'exchangerate-api'
    }))
}

async function fetchFromCurrencyLayer(): Promise<ExchangeRate[]> {
  const config = await ExternalAPIService.getCurrencyLayerConfig()
  
  if (!config.enabled || !config.apiKey) {
    throw new Error('CurrencyLayer not configured')
  }
  
  const startedAt = Date.now()
  const response = await fetch(
    ExternalAPIService.buildUrl(config.baseUrl, '', {
      access_key: config.apiKey,
      currencies: SUPPORTED_CURRENCIES.join(','),
      source: 'USD',
      format: 1,
    }),
    {
      headers: {
        'Accept': 'application/json'
      },
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(EXTERNAL_API_TIMEOUT_MS)
    }
  )

  void recordExternalApiCall({
    key: 'currencylayer',
    ok: response.ok,
    status: response.status,
    latencyMs: Date.now() - startedAt,
  }).catch(() => null)
  
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  
  const data = await response.json()
  if (!data.success || !data.quotes) throw new Error('API request failed')
  
  return Object.entries(data.quotes).map(([pair, rate]) => ({
    from: 'USD',
    to: pair.replace('USD', ''),
    rate: rate as number,
    lastUpdate: new Date().toISOString(),
    source: 'currencylayer'
  }))
}

function generateCrossRates(baseRates: ExchangeRate[]): ExchangeRate[] {
  const crossRates: ExchangeRate[] = []
  const usdRates = baseRates.filter(r => r.from === 'USD')
  
  // Generate cross-currency rates
  usdRates.forEach(rate1 => {
    usdRates.forEach(rate2 => {
      if (rate1.to !== rate2.to && rate1.rate > 0) {
        crossRates.push({
          from: rate1.to,
          to: rate2.to,
          rate: Number((rate2.rate / rate1.rate).toFixed(6)),
          lastUpdate: new Date().toISOString(),
          source: 'calculated'
        })
      }
    })
  })
  
  // Generate reverse rates (to USD)
  usdRates.forEach(rate => {
    if (rate.rate > 0) {
      crossRates.push({
        from: rate.to,
        to: 'USD',
        rate: Number((1 / rate.rate).toFixed(6)),
        lastUpdate: rate.lastUpdate,
        source: rate.source
      })
    }
  })
  
  return crossRates
}

async function getStoredUsdRatesFromDb(): Promise<ExchangeRate[]> {
  const rows = await prisma.marketData.findMany({
    where: {
      type: 'forex',
      symbol: { startsWith: 'USD' }
    },
    orderBy: { lastUpdate: 'desc' },
    take: 200
  })

  return rows
    .map((row) => {
      const to = row.symbol.replace(/^USD/, '')
      if (!to || to.length > 5) return null
      return {
        from: 'USD',
        to,
        rate: row.price,
        lastUpdate: row.lastUpdate.toISOString(),
        source: 'database'
      }
    })
    .filter(Boolean) as ExchangeRate[]
}

async function storeUsdRatesInDb(baseUsdRates: ExchangeRate[]) {
  const directRates = baseUsdRates.filter((r) => r.from === 'USD' && SUPPORTED_CURRENCIES.includes(r.to))
  for (const rate of directRates) {
    await prisma.marketData.upsert({
      where: {
        symbol_type: {
          symbol: `${rate.from}${rate.to}`,
          type: 'forex'
        }
      },
      update: {
        price: rate.rate,
        change24h: 0,
        changePercent24h: 0,
        lastUpdate: new Date(rate.lastUpdate)
      },
      create: {
        symbol: `${rate.from}${rate.to}`,
        type: 'forex',
        name: `${rate.from} to ${rate.to}`,
        price: rate.rate,
        change24h: 0,
        changePercent24h: 0
      }
    })

    await storePriceSnapshot({
      symbol: `${rate.from}${rate.to}`,
      name: `${rate.from} to ${rate.to}`,
      type: 'forex',
      price: rate.rate,
      timestamp: new Date(rate.lastUpdate),
    })
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (ratesCache && Date.now() - ratesCache.timestamp < CACHE_DURATION) {
      return buildRatesResponse(ratesCache.data, 'HIT')
    }

    if (process.env.NODE_ENV !== 'production') {
      const stored = await getStoredUsdRatesFromDb()
      if (stored.length > 0) {
        const rates = [...stored, ...generateCrossRates(stored)]
        ratesCache = {
          data: rates,
          timestamp: Date.now()
        }
        return buildRatesResponse(rates, 'DEV-DB')
      }
    }

    let rates: ExchangeRate[] = []
    let primaryError: unknown = null

    // Try primary API
    try {
      rates = await fetchFromExchangeRateAPI()
    } catch (error) {
      primaryError = error
      console.warn('ExchangeRate-API failed:', error)
    }

    if (rates.length === 0) {
      // Prefer last-known database rates over waiting on a slower backup API.
      const stored = await getStoredUsdRatesFromDb()
      if (stored.length > 0) {
        const crossRates = generateCrossRates(stored)
        rates = [...stored, ...crossRates]
      } else {
        // No stored market data available, so try the backup provider as a last resort.
        try {
          rates = await fetchFromCurrencyLayer()
        } catch (backupError) {
          console.warn('CurrencyLayer API failed:', backupError)
        }

        if (rates.length === 0) {
          console.warn('No exchange-rate provider succeeded and no stored DB rates were available.', primaryError)
          return NextResponse.json({ error: 'Exchange rates unavailable' }, { status: 503 })
        }

        const crossRates = generateCrossRates(rates)
        rates = [...rates, ...crossRates]
        await storeUsdRatesInDb(rates.filter((rate) => rate.from === 'USD'))
      }
    } else {
      const crossRates = generateCrossRates(rates)
      rates = [...rates, ...crossRates]

      // Persist USD base rates for resilience
      await storeUsdRatesInDb(rates.filter((r) => r.from === 'USD'))
    }
    
    // Update cache
    ratesCache = {
      data: rates,
      timestamp: Date.now()
    }

    return buildRatesResponse(rates, 'MISS')
    
  } catch (error) {
    console.error('Rates API error:', error)

    if (ratesCache?.data) {
      return NextResponse.json(ratesCache.data, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'ERROR-CACHE'
        }
      })
    }

    const stored = await getStoredUsdRatesFromDb().catch(() => [])
    if (stored.length > 0) {
      const crossRates = generateCrossRates(stored)
      return NextResponse.json([...stored, ...crossRates], {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'ERROR-DB'
        }
      })
    }

    return NextResponse.json({ error: 'Exchange rates unavailable' }, { status: 503 })
  }
}
