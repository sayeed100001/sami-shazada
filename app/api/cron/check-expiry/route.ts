import { NextRequest, NextResponse } from 'next/server'
import { runExpiryChecks } from '@/lib/subscription-expiry'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret) {
      console.error('CRON_SECRET is not configured')
      return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })
    }

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = await runExpiryChecks()

    return NextResponse.json({
      success: true,
      results
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal error'
      },
      { status: 500 }
    )
  }
}
