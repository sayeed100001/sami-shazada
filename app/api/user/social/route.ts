import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getUserSocialSummary } from '@/lib/social-features'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const summary = await getUserSocialSummary(session.user.id)
    return NextResponse.json(summary)
  } catch (error) {
    console.error('User social summary error:', error)
    return NextResponse.json({ error: 'Failed to load social summary' }, { status: 500 })
  }
}
