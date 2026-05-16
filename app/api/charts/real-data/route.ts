import { NextRequest, NextResponse } from 'next/server'
import { ExternalAPIService } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol') || 'BTCUSD'

    const config = await ExternalAPIService.getBinanceConfig()
    if (!config.enabled) {
      return NextResponse.json({ error: 'Binance API is disabled' }, { status: 503 })
    }

    const response = await fetch(
      ExternalAPIService.buildUrl(config.baseUrl, '/ticker/24hr', { symbol }),
      {
        headers: ExternalAPIService.buildHeaders(config.apiKey),
        signal: AbortSignal.timeout(8000),
      }
    )
    
    if (!response.ok) {
      throw new Error('Failed to fetch market data')
    }
    
    const data = await response.json()
    
    return NextResponse.json({
      symbol: data.symbol,
      price: parseFloat(data.lastPrice),
      change24h: parseFloat(data.priceChange),
      changePercent24h: parseFloat(data.priceChangePercent),
      volume24h: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Charts real-data error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 503 }
    )
  }
}
