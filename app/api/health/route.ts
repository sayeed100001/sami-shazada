import { NextResponse } from 'next/server'
import monitor from '@/lib/system-monitor'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const health = await monitor.getHealthStatus()
    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'
    const hasCriticalFailure =
      health.checks.database.status === 'fail' ||
      health.checks.api.status === 'fail'

    const publicStatus =
      hasCriticalFailure
        ? 'unhealthy'
        : health.status === 'healthy'
          ? 'healthy'
          : 'degraded'

    const statusCode = hasCriticalFailure ? 503 : 200

    const publicPayload = {
      status: publicStatus,
      timestamp: new Date(health.timestamp).toISOString(),
      checks: {
        database: {
          status: health.checks.database.status === 'pass' ? 'up' : 'down',
          responseTime: health.checks.database.responseTime
        },
        api: {
          status: health.checks.api.status === 'pass' ? 'up' : 'down',
          responseTime: health.checks.api.responseTime
        }
      },
      version: '1.0.0',
      uptimeSeconds: Math.floor(health.uptime / 1000)
    }

    return NextResponse.json(
      isAdmin
        ? {
            ...publicPayload,
            admin: {
              checks: health.checks,
              metrics: health.metrics
            }
          }
        : publicPayload,
      { status: statusCode }
    )
  } catch (error) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        error: 'Health check failed',
        timestamp: Date.now()
      },
      { status: 503 }
    )
  }
}
