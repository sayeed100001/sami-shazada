import { NextRequest, NextResponse } from 'next/server'
import { getCommunityLeaderboards } from '@/lib/social-features'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = Number.parseInt(searchParams.get('limit') || '10', 10)
    const leaderboards = await getCommunityLeaderboards(limit)
    return NextResponse.json(leaderboards)
  } catch (error) {
    console.error('Community leaderboard error:', error)
    return NextResponse.json({ error: 'Failed to load leaderboard' }, { status: 500 })
  }
}
