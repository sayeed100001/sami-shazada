import { NextResponse } from 'next/server'
import { checkDatabaseConnection } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type ServiceStatus = 'up' | 'down'
type HealthStatus = 'healthy' | 'degraded' | 'unhealthy'

interface ServiceHealth {
  status: ServiceStatus
  responseTime?: number
  error?: string
}

interface HealthCheck {
  status: HealthStatus
  timestamp: string
  services: {
    database: ServiceHealth
    auth: ServiceHealth
    api: ServiceHealth & { responseTime: number }
  }
  version: string
  uptime: number
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const startTime = Date.now()
  
  const healthCheck: HealthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      database: { status: 'down' },
      auth: { status: 'up' },
      api: { status: 'up', responseTime: 0 }
    },
    version: '1.0.0',
    uptime: process.uptime()
  }

  try {
    const dbStart = Date.now()
    const isDbHealthy = await checkDatabaseConnection()
    const dbResponseTime = Date.now() - dbStart
    
    if (isDbHealthy) {
      healthCheck.services.database = {
        status: 'up',
        responseTime: dbResponseTime
      }
    } else {
      healthCheck.services.database = {
        status: 'down',
        error: 'Connection failed'
      }
      healthCheck.status = 'degraded'
    }
  } catch (error) {
    healthCheck.services.database = {
      status: 'down',
      error: error instanceof Error ? error.message : 'Unknown error'
    }
    healthCheck.status = 'unhealthy'
  }

  if (!process.env.NEXTAUTH_SECRET) {
    healthCheck.services.auth = {
      status: 'down',
      error: 'Missing NEXTAUTH_SECRET'
    }
    healthCheck.status = 'degraded'
  }

  healthCheck.services.api.responseTime = Date.now() - startTime

  const statusCode = healthCheck.status === 'healthy' ? 200 : 
                    healthCheck.status === 'degraded' ? 200 : 503

  return NextResponse.json(healthCheck, { 
    status: statusCode,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  })
}
