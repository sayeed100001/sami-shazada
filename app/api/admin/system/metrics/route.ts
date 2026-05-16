import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { monitoring, measurePerformance } from '@/lib/monitoring'
import { marketDataCache, CACHE_TTL } from '@/lib/cache'
import { withRateLimit, rateLimitConfigs } from '@/lib/rate-limit-middleware'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

async function getSystemMetrics() {
  return measurePerformance('get_system_metrics', async () => {
    const cached = marketDataCache.get('system_metrics')
    if (cached) return cached

    const metrics = [
      {
        name: 'Response Time',
        value: await getAverageResponseTime(),
        unit: 'ms',
        status: 'good' as const,
        threshold: 1000
      },
      {
        name: 'Memory Usage',
        value: await getMemoryUsage(),
        unit: '%',
        status: 'good' as const,
        threshold: 80
      },
      {
        name: 'Active Users',
        value: await getActiveUsers(),
        unit: '',
        status: 'good' as const,
        threshold: 1000
      },
      {
        name: 'Error Rate',
        value: await getErrorRate(),
        unit: '%',
        status: 'good' as const,
        threshold: 5
      }
    ]

    const updatedMetrics = metrics.map(metric => ({
      ...metric,
      status: metric.value > metric.threshold ? 'critical' as const :
              metric.value > metric.threshold * 0.8 ? 'warning' as const : 'good' as const
    }))

    marketDataCache.set('system_metrics', updatedMetrics, CACHE_TTL.MARKET_DATA)
    return updatedMetrics
  })
}

async function getAverageResponseTime(): Promise<number> {
  const metrics = monitoring.getMetrics('hour')
  const responseTimes = metrics.filter(m => m.name === 'api_response_time')
  if (responseTimes.length === 0) return 0
  return responseTimes.reduce((sum, m) => sum + m.value, 0) / responseTimes.length
}

async function getMemoryUsage(): Promise<number> {
  if (typeof process !== 'undefined' && process.memoryUsage) {
    const usage = process.memoryUsage()
    return (usage.heapUsed / usage.heapTotal) * 100
  }
  return 0
}

async function getActiveUsers(): Promise<number> {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000) // last 15 minutes
  try {
    return await prisma.user.count({
      where: {
        lastLogin: { gte: cutoff }
      }
    })
  } catch {
    return 0
  }
}

async function getErrorRate(): Promise<number> {
  const errors = monitoring.getRecentErrors(100)
  const metrics = monitoring.getMetrics('hour')
  if (metrics.length === 0) return 0
  return (errors.length / metrics.length) * 100
}

async function handler(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    monitoring.recordMetric('api_request', 1, {
      endpoint: '/api/admin/system/metrics',
      method: request.method,
      userId: session.user.id
    })

    const metrics = await getSystemMetrics()
    const systemHealth = monitoring.getSystemHealth()

    return NextResponse.json({
      success: true,
      metrics,
      health: systemHealth,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    monitoring.logError(error as Error, {
      endpoint: '/api/admin/system/metrics',
      severity: 'high'
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export const GET = withRateLimit(handler, rateLimitConfigs.admin)
