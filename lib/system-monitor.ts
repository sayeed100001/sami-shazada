/**
 * Enterprise Monitoring & Health Check System
 * Real-time system monitoring for 100K+ users
 */

import { prisma } from './prisma'
import cache from './enterprise-cache'
import queue from './job-queue'
import os from 'os'
import v8 from 'v8'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: number
  uptime: number
  checks: {
    database: CheckResult
    cache: CheckResult
    queue: CheckResult
    memory: CheckResult
    api: CheckResult
  }
  metrics: SystemMetrics
}

interface CheckResult {
  status: 'pass' | 'warn' | 'fail'
  message: string
  responseTime?: number
  details?: any
}

interface SystemMetrics {
  requests: {
    total: number
    perSecond: number
    perMinute: number
    errors: number
    errorRate: string
  }
  database: {
    connections: number
    queries: number
    avgQueryTime: number
  }
  cache: {
    hitRate: string
    size: number
    memoryUsage: string
  }
  queue: {
    pending: number
    processing: number
    completed: number
    failed: number
  }
  memory: {
    used: string
    total: string
    percentage: string
  }
  cpu: {
    usage: string
  }
}

class SystemMonitor {
  private startTime: number
  private requestCount: number
  private errorCount: number
  private requestTimestamps: number[]
  private queryTimes: number[]
  private lastCpuSample?: { idle: number; total: number; timestamp: number }

  constructor() {
    this.startTime = Date.now()
    this.requestCount = 0
    this.errorCount = 0
    this.requestTimestamps = []
    this.queryTimes = []

    // Auto cleanup old data every minute
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000)
    }
  }

  /**
   * Record API request
   */
  recordRequest(): void {
    this.requestCount++
    this.requestTimestamps.push(Date.now())
  }

  /**
   * Record API error
   */
  recordError(): void {
    this.errorCount++
  }

  /**
   * Record database query time
   */
  recordQueryTime(ms: number): void {
    this.queryTimes.push(ms)
    
    // Keep only last 1000 queries
    if (this.queryTimes.length > 1000) {
      this.queryTimes.shift()
    }
  }

  /**
   * Get complete health status
   */
  async getHealthStatus(): Promise<HealthStatus> {
    const checks = await Promise.all([
      this.checkDatabase(),
      this.checkCache(),
      this.checkQueue(),
      this.checkMemory(),
      this.checkAPI()
    ])

    const [database, cacheCheck, queueCheck, memory, api] = checks

    // Determine overall status
    const failedChecks = checks.filter(c => c.status === 'fail').length
    const warnChecks = checks.filter(c => c.status === 'warn').length

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy'
    if (failedChecks > 0) {
      status = 'unhealthy'
    } else if (warnChecks > 0) {
      status = 'degraded'
    }

    return {
      status,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime,
      checks: {
        database,
        cache: cacheCheck,
        queue: queueCheck,
        memory,
        api
      },
      metrics: await this.getMetrics()
    }
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<CheckResult> {
    const start = Date.now()
    
    try {
      await prisma.$queryRaw`SELECT 1`
      const responseTime = Date.now() - start

      if (responseTime > 1000) {
        return {
          status: 'warn',
          message: 'Database responding slowly',
          responseTime
        }
      }

      return {
        status: 'pass',
        message: 'Database is healthy',
        responseTime
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Database connection failed',
        responseTime: Date.now() - start,
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check cache health
   */
  private async checkCache(): Promise<CheckResult> {
    try {
      const stats = cache.getStats()
      const hitRate = parseFloat(stats.hitRate)
      const totalRequests = Number(stats.totalRequests || 0)

      if (totalRequests === 0) {
        return {
          status: 'pass',
          message: 'Cache is healthy',
          details: stats
        }
      }

      if (hitRate < 50) {
        return {
          status: 'warn',
          message: 'Low cache hit rate',
          details: stats
        }
      }

      return {
        status: 'pass',
        message: 'Cache is healthy',
        details: stats
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Cache check failed',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check queue health
   */
  private async checkQueue(): Promise<CheckResult> {
    try {
      const stats = queue.getStats()

      if (stats.pending > 1000) {
        return {
          status: 'warn',
          message: 'High number of pending jobs',
          details: stats
        }
      }

      if (stats.failed > stats.completed * 0.1) {
        return {
          status: 'warn',
          message: 'High job failure rate',
          details: stats
        }
      }

      return {
        status: 'pass',
        message: 'Queue is healthy',
        details: stats
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Queue check failed',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check memory usage
   */
  private async checkMemory(): Promise<CheckResult> {
    try {
      const usage = process.memoryUsage()
      const heapStats = v8.getHeapStatistics()
      const usedMB = usage.heapUsed / 1024 / 1024
      const totalMB = heapStats.heap_size_limit / 1024 / 1024
      const percentage = totalMB > 0 ? (usedMB / totalMB) * 100 : 0

      if (percentage > 90) {
        return {
          status: 'fail',
          message: 'Critical memory usage',
          details: {
            used: `${usedMB.toFixed(2)} MB`,
            total: `${totalMB.toFixed(2)} MB`,
            percentage: `${percentage.toFixed(2)}%`
          }
        }
      }

      if (percentage > 75) {
        return {
          status: 'warn',
          message: 'High memory usage',
          details: {
            used: `${usedMB.toFixed(2)} MB`,
            total: `${totalMB.toFixed(2)} MB`,
            percentage: `${percentage.toFixed(2)}%`
          }
        }
      }

      return {
        status: 'pass',
        message: 'Memory usage is normal',
        details: {
          used: `${usedMB.toFixed(2)} MB`,
          total: `${totalMB.toFixed(2)} MB`,
          percentage: `${percentage.toFixed(2)}%`
        }
      }
    } catch (error) {
      return {
        status: 'fail',
        message: 'Memory check failed',
        details: error instanceof Error ? error.message : String(error)
      }
    }
  }

  /**
   * Check API health
   */
  private async checkAPI(): Promise<CheckResult> {
    const errorRate = this.requestCount > 0 
      ? (this.errorCount / this.requestCount) * 100 
      : 0

    if (errorRate > 10) {
      return {
        status: 'fail',
        message: 'High API error rate',
        details: {
          errorRate: `${errorRate.toFixed(2)}%`,
          totalRequests: this.requestCount,
          errors: this.errorCount
        }
      }
    }

    if (errorRate > 5) {
      return {
        status: 'warn',
        message: 'Elevated API error rate',
        details: {
          errorRate: `${errorRate.toFixed(2)}%`,
          totalRequests: this.requestCount,
          errors: this.errorCount
        }
      }
    }

    return {
      status: 'pass',
      message: 'API is healthy',
      details: {
        errorRate: `${errorRate.toFixed(2)}%`,
        totalRequests: this.requestCount,
        errors: this.errorCount
      }
    }
  }

  /**
   * Get system metrics
   */
  private async getMetrics(): Promise<SystemMetrics> {
    const now = Date.now()
    const oneSecondAgo = now - 1000
    const oneMinuteAgo = now - 60000

    const requestsLastSecond = this.requestTimestamps.filter(t => t > oneSecondAgo).length
    const requestsLastMinute = this.requestTimestamps.filter(t => t > oneMinuteAgo).length

    const errorRate = this.requestCount > 0 
      ? ((this.errorCount / this.requestCount) * 100).toFixed(2)
      : '0.00'

    const avgQueryTime = this.queryTimes.length > 0
      ? this.queryTimes.reduce((a, b) => a + b, 0) / this.queryTimes.length
      : 0

    const cacheStats = cache.getStats()
    const queueStats = queue.getStats()
    const connections = await this.getDatabaseConnectionCount()

    const memUsage = process.memoryUsage()
    const usedMB = memUsage.heapUsed / 1024 / 1024
    const totalMB = memUsage.heapTotal / 1024 / 1024
    const memPercentage = (usedMB / totalMB) * 100

    return {
      requests: {
        total: this.requestCount,
        perSecond: requestsLastSecond,
        perMinute: requestsLastMinute,
        errors: this.errorCount,
        errorRate: `${errorRate}%`
      },
      database: {
        connections,
        queries: this.queryTimes.length,
        avgQueryTime: Math.round(avgQueryTime)
      },
      cache: {
        hitRate: cacheStats.hitRate,
        size: cacheStats.size,
        memoryUsage: cacheStats.memoryUsage
      },
      queue: {
        pending: queueStats.pending,
        processing: queueStats.processing,
        completed: queueStats.completed,
        failed: queueStats.failed
      },
      memory: {
        used: `${usedMB.toFixed(2)} MB`,
        total: `${totalMB.toFixed(2)} MB`,
        percentage: `${memPercentage.toFixed(2)}%`
      },
      cpu: {
        usage: this.getCpuUsage()
      }
    }
  }

  private getCpuUsage(): string {
    const totals = os.cpus().reduce(
      (acc, cpu) => {
        const times = cpu.times
        const total = times.user + times.nice + times.sys + times.irq + times.idle
        acc.idle += times.idle
        acc.total += total
        return acc
      },
      { idle: 0, total: 0 }
    )

    const now = Date.now()
    const last = this.lastCpuSample
    this.lastCpuSample = { ...totals, timestamp: now }

    if (!last) return 'N/A'

    const idleDiff = totals.idle - last.idle
    const totalDiff = totals.total - last.total
    if (totalDiff <= 0) return '0%'

    const usage = 100 - (100 * idleDiff) / totalDiff
    return `${Math.max(0, Math.min(100, usage)).toFixed(2)}%`
  }

  private async getDatabaseConnectionCount(): Promise<number> {
    const databaseUrl = process.env.DATABASE_URL || ''

    const isPostgres = /^postgres(ql)?:\/\//i.test(databaseUrl)
    const isSqlite = /^file:|^sqlite:\/\//i.test(databaseUrl)

    if (isSqlite) return 1
    if (!isPostgres) return 1

    try {
      const rows = await prisma.$queryRaw<Array<{ count: bigint | number }>>`
        SELECT COUNT(*) AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
      `
      const count = rows?.[0]?.count
      if (typeof count === 'bigint') return Number(count)
      if (typeof count === 'number') return count
      return 1
    } catch {
      return 1
    }
  }

  /**
   * Cleanup old data
   */
  private cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000
    this.requestTimestamps = this.requestTimestamps.filter(t => t > oneHourAgo)
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.requestCount = 0
    this.errorCount = 0
    this.requestTimestamps = []
    this.queryTimes = []
  }
}

// Singleton instance
const monitor = new SystemMonitor()

export { monitor, SystemMonitor }
export default monitor
