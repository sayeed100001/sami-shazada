import { NextRequest, NextResponse } from 'next/server'
import { calculateCommission, type CommissionType } from '@/lib/commission'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const type = (searchParams.get('type') || 'HAWALA') as CommissionType
    const amount = parseFloat(searchParams.get('amount') || '0')
    const currency = (searchParams.get('currency') || 'USD').toUpperCase()
    const quotedToCurrency = searchParams.get('toCurrency')?.toUpperCase() || null
    const quotedRate = parseFloat(searchParams.get('rate') || '')

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Invalid amount' },
        { status: 400 }
      )
    }

    if (!['HAWALA', 'EXCHANGE'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    const result = await calculateCommission({
      type,
      amount,
      currency,
      quotedRate: Number.isFinite(quotedRate) && quotedRate > 0 ? quotedRate : null,
      quotedToCurrency,
    })

    if (!result) {
      return NextResponse.json({ error: 'No commission setting found' }, { status: 404 })
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Commission calculation error:', error)
    if (error instanceof Error && error.message === 'FX_RATE_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'FX rate unavailable. Please try again later.' },
        { status: 503 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to calculate commission' },
      { status: 500 }
    )
  }
}
