import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { ExternalAPIService } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

async function getRateFromDb(from: string, to: string): Promise<number | null> {
  const direct = await prisma.marketData.findUnique({
    where: {
      symbol_type: {
        symbol: `${from}${to}`,
        type: 'forex'
      }
    },
    select: { price: true }
  })

  if (direct?.price) return direct.price

  // Try cross through USD using stored USD base rates
  if (from !== 'USD' && to !== 'USD') {
    const [fromUsd, usdTo] = await Promise.all([
      prisma.marketData.findUnique({
        where: { symbol_type: { symbol: `${from}USD`, type: 'forex' } },
        select: { price: true }
      }),
      prisma.marketData.findUnique({
        where: { symbol_type: { symbol: `USD${to}`, type: 'forex' } },
        select: { price: true }
      })
    ])

    if (fromUsd?.price && usdTo?.price) {
      return fromUsd.price * usdTo.price
    }
  }

  // Invert USD base rate if needed
  if (to === 'USD') {
    const usdToFrom = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: `USD${from}`, type: 'forex' } },
      select: { price: true }
    })
    if (usdToFrom?.price) return 1 / usdToFrom.price
  }

  if (from === 'USD') {
    const usdToTo = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: `USD${to}`, type: 'forex' } },
      select: { price: true }
    })
    if (usdToTo?.price) return usdToTo.price
  }

  return null
}

async function fetchRateFromExternal(from: string, to: string): Promise<number | null> {
  try {
    const config = await ExternalAPIService.getExchangeRateConfig()
    if (!config.enabled) return null
    
    const response = await fetch(`${config.baseUrl}/latest/${encodeURIComponent(from)}`, {
      headers: ExternalAPIService.buildHeaders(config.apiKey),
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000)
    })

    if (!response.ok) return null
    const data = await response.json()
    const rate = data?.rates?.[to]
    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null
    return rate
  } catch (error) {
    console.warn('External rate fetch failed:', error)
    return null
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const from = sanitizeInput(searchParams.get('from') || '').toUpperCase()
  const to = sanitizeInput(searchParams.get('to') || '').toUpperCase()
  const amountStr = sanitizeInput(searchParams.get('amount') || '')
  const amount = validateNumericInput(amountStr)

  if (!from || !to || amount === null || amount <= 0) {
    return NextResponse.json(
      { error: 'Invalid parameters' },
      { status: 400 }
    )
  }

  try {
    // If same currency, return same amount
    if (from === to) {
      return NextResponse.json({
        from,
        to,
        amount: amount,
        result: amount,
        rate: 1
      })
    }

    let rate = await getRateFromDb(from, to)

    if (!rate) {
      rate = await fetchRateFromExternal(from, to)
      if (!rate) {
        return NextResponse.json(
          { error: 'Rate unavailable. Please refresh rates.' },
          { status: 503 }
        )
      }

      // Store direct rate for resilience
      await prisma.marketData.upsert({
        where: { symbol_type: { symbol: `${from}${to}`, type: 'forex' } },
        update: {
          price: rate,
          change24h: 0,
          changePercent24h: 0,
          lastUpdate: new Date()
        },
        create: {
          symbol: `${from}${to}`,
          type: 'forex',
          name: `${from} to ${to}`,
          price: rate,
          change24h: 0,
          changePercent24h: 0
        }
      })
    }

    const result = amount * rate

    return NextResponse.json({
      from,
      to,
      amount: amount,
      result: Math.round(result * 10000) / 10000, // Round to 4 decimal places
      rate: Math.round(rate * 10000) / 10000
    })
    
  } catch (error) {
    console.error('Conversion error:', error)
    return NextResponse.json(
      { error: 'Conversion failed' },
      { status: 500 }
    )
  }
}
