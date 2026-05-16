import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { checkSystemHealth } from '@/lib/system-health'
import { rateLimitConfigs, withRateLimit } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

const HEALTH_CACHE_TTL_MS = 30 * 1000

let cachedHealth:
  | {
      expiresAt: number
      payload: Record<string, any>
    }
  | null = null

async function handler(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = Date.now()
    if (cachedHealth && cachedHealth.expiresAt > now) {
      return NextResponse.json(cachedHealth.payload, {
        headers: { 'Cache-Control': 'private, no-store' }
      })
    }

    const health = await checkSystemHealth()

    const payload = {
      status: 'success',
      timestamp: new Date().toISOString(),
      health
    }

    cachedHealth = {
      expiresAt: now + HEALTH_CACHE_TTL_MS,
      payload
    }

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'private, no-store' }
    })
  } catch (error) {
    console.error('System health check failed:', error)
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Failed to check system health',
      health: {
        database: { connected: false, error: 'Health check failed' },
        apis: { crypto: false, rates: false, commodities: false },
        services: { auth: false, notifications: false, charts: false },
        overall: 'unhealthy'
      }
    }, {
      status: 500,
      headers: { 'Cache-Control': 'private, no-store' }
    })
  }
}

export const GET = withRateLimit(handler, rateLimitConfigs.admin)
