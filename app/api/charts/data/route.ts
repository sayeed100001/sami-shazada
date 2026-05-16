import { NextRequest, NextResponse } from 'next/server'
import { sanitizeInput } from '@/lib/security'
import { fetchRealHistoricalData } from '@/lib/realHistoricalData'

export const dynamic = 'force-dynamic'

const SUPPORTED_SYMBOLS = new Set([
  'BTC/USD', 'BTCUSD',
  'ETH/USD', 'ETHUSD',
  'ADA/USD', 'ADAUSD',
  'EUR/USD', 'EURUSD',
  'GBP/USD', 'GBPUSD',
  'USD/JPY', 'USDJPY',
  'USD/CAD', 'USDCAD',
  'AUD/USD', 'AUDUSD',
  'XAU/USD', 'XAUUSD',
  'XAG/USD', 'XAGUSD',
  'WTI/USD', 'WTIUSD',
  'BRENT/USD', 'BRENTUSD',
])

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = sanitizeInput(searchParams.get('symbol') || 'BTC/USD')
    const interval = sanitizeInput(searchParams.get('interval') || '1h')
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000)

    if (typeof symbol !== 'string') {
      return NextResponse.json({ error: 'Invalid symbol type' }, { status: 400 })
    }

    if (!SUPPORTED_SYMBOLS.has(symbol.toUpperCase())) {
      return NextResponse.json({ error: 'Unsupported symbol' }, { status: 400 })
    }

    const candles = await fetchRealHistoricalData(symbol.toUpperCase(), interval, limit)

    if (candles.length === 0) {
      return NextResponse.json(
        { error: 'Historical chart data unavailable for this symbol' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      success: true,
      symbol,
      interval,
      candles,
      count: candles.length,
      lastUpdate: new Date().toISOString()
    })
  } catch (error) {
    console.error('Charts data API error:', error)
    return NextResponse.json({ error: 'Failed to fetch chart data' }, { status: 503 })
  }
}
