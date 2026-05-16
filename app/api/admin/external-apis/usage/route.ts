import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getAllExternalApiUsage } from '@/lib/external-api-usage'

export const dynamic = 'force-dynamic'

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const usage = await getAllExternalApiUsage()
    return NextResponse.json({ usage })
  } catch (error) {
    console.error('External API usage error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

