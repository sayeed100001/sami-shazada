/**
 * PRODUCTION MONITORING SYSTEM
 * Track performance, errors, and system health
 */
import { Redis } from '@upstash/redis'

interface MetricData {
  name: string
  value: number
  timestamp: Date
  tags?: Record<string, string>
}

interface ErrorData {
  message: string
  stack?: string
  context?: string
  userId?: string
  timestamp: Date
}

class MonitoringService {
  private metrics: MetricData[] = []
  private errors: ErrorData[] = []
  private readonly MAX_STORED = 100

  // Track API response times
  trackApiCall(endpoint: string, duration: number, statusCode: number) {
    this.addMetric({
      name: 'api_response_time',
      value: duration,
      timestamp: new Date(),
      tags: { endpoint, status: statusCode.toString() }
    })

    if (duration > 1000) {
      console.warn(`⚠️  Slow API call: ${endpoint} took ${duration}ms`)
    }
  }

  // Track database query times
  trackQuery(query: string, duration: number) {
    this.addMetric({
      name: 'db_query_time',
      value: duration,
      timestamp: new Date(),
      tags: { query: query.substring(0, 50) }
    })

    if (duration > 500) {
      console.warn(`⚠️  Slow query: ${query.substring(0, 50)} took ${duration}ms`)
    }
  }

  // Track errors
  trackError(error: Error, context?: string, userId?: string) {
    this.errors.push({
      message: error.message,
      stack: error.stack,
      context,
      userId,
      timestamp: new Date()
    })

    // Keep only recent errors
    if (this.errors.length > this.MAX_STORED) {
      this.errors = this.errors.slice(-this.MAX_STORED)
    }

    console.error('🔴 Error tracked:', {
      message: error.message,
      context,
      userId
    })
  }

  // Track user actions
  trackUserAction(action: string, userId: string, metadata?: any) {
    this.addMetric({
      name: 'user_action',
      value: 1,
      timestamp: new Date(),
      tags: { action, userId, ...metadata }
    })
  }

  // Compatibility helpers used across the codebase
  recordMetric(name: string, value: number, tags?: Record<string, string>) {
    this.addMetric({
      name,
      value,
      timestamp: new Date(),
      tags
    })
  }

  logError(errorOrMessage: Error | string, context?: Record<string, unknown>) {
    const error = typeof errorOrMessage === 'string' ? new Error(errorOrMessage) : errorOrMessage
    const serializedContext = context ? JSON.stringify(context) : undefined
    this.trackError(error, serializedContext)
  }

  getMetrics(range: 'hour' | 'day' | 'all' = 'day') {
    const now = Date.now()
    const cutoff =
      range === 'hour' ? now - 60 * 60 * 1000 :
      range === 'day' ? now - 24 * 60 * 60 * 1000 :
      0

    return cutoff === 0
      ? [...this.metrics]
      : this.metrics.filter(m => m.timestamp.getTime() > cutoff)
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit)
  }

  // Get system health
  getSystemHealth() {
    const now = Date.now()
    const last5Min = now - 5 * 60 * 1000

    const recentMetrics = this.metrics.filter(
      m => m.timestamp.getTime() > last5Min
    )

    const recentErrors = this.errors.filter(
      e => e.timestamp.getTime() > last5Min
    )

    const apiCalls = recentMetrics.filter(m => m.name === 'api_response_time')
    const avgResponseTime = apiCalls
      .filter(m => m.name === 'api_response_time')
      .reduce((sum, m) => sum + m.value, 0) / 
      (apiCalls.length || 1)

    let criticalErrors = 0
    let highErrors = 0

    for (const error of recentErrors) {
      try {
        const context = error.context ? JSON.parse(error.context) : null
        const severity = context?.severity
        if (severity === 'high' || severity === 'critical') {
          criticalErrors++
        } else if (severity === 'medium' || severity === 'warning') {
          highErrors++
        } else {
          highErrors++
        }
      } catch {
        highErrors++
      }
    }

    const totalRequests = apiCalls.length
    const totalErrors = recentErrors.length
    const errorRate = totalRequests > 0 ? totalErrors / totalRequests : 0

    const status: 'healthy' | 'warning' | 'critical' =
      criticalErrors > 0 || errorRate > 0.2 || avgResponseTime > 2000
        ? 'critical'
        : totalErrors > 0 || errorRate > 0.05 || avgResponseTime > 1000
          ? 'warning'
          : 'healthy'

    return {
      status,
      metrics: {
        totalRequests,
        totalErrors,
        criticalErrors,
        highErrors,
        avgResponseTime: Math.round(avgResponseTime),
        errorRate
      },
      timestamp: new Date()
    }
  }

  // Get performance report
  getPerformanceReport() {
    const apiCalls = this.metrics.filter(m => m.name === 'api_response_time')
    const queries = this.metrics.filter(m => m.name === 'db_query_time')

    return {
      api: {
        total: apiCalls.length,
        avgTime: apiCalls.reduce((sum, m) => sum + m.value, 0) / (apiCalls.length || 1),
        slowCalls: apiCalls.filter(m => m.value > 1000).length
      },
      database: {
        total: queries.length,
        avgTime: queries.reduce((sum, m) => sum + m.value, 0) / (queries.length || 1),
        slowQueries: queries.filter(m => m.value > 500).length
      },
      errors: {
        total: this.errors.length,
        recent: this.errors.slice(-10)
      }
    }
  }

  private addMetric(metric: MetricData) {
    this.metrics.push(metric)
    
    // Keep only recent metrics
    if (this.metrics.length > this.MAX_STORED) {
      this.metrics = this.metrics.slice(-this.MAX_STORED)
    }
  }

  // Clear old data
  cleanup() {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000 // 24 hours
    this.metrics = this.metrics.filter(m => m.timestamp.getTime() > cutoff)
    this.errors = this.errors.filter(e => e.timestamp.getTime() > cutoff)
  }
}

export const monitoring = new MonitoringService()

// Cleanup old data on each request in serverless environment
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Auto cleanup on heavy usage
  let requestCount = 0
  const originalTrackApiCall = monitoring.trackApiCall.bind(monitoring)
  monitoring.trackApiCall = function(...args) {
    requestCount++
    if (requestCount % 50 === 0) {
      monitoring.cleanup()
    }
    return originalTrackApiCall(...args)
  }
}

// Performance measurement utility
export async function measurePerformance<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now()
  try {
    const result = await fn()
    const duration = Date.now() - start
    monitoring.trackApiCall(name, duration, 200)
    return result
  } catch (error) {
    const duration = Date.now() - start
    monitoring.trackApiCall(name, duration, 500)
    throw error
  }
}

// Rate limiter utility
interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

class RateLimiter {
  private requests: Map<string, number[]> = new Map()
  private lastCleanup = 0
  private redis =
    process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
      ? new Redis({
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        })
      : null

  check(key: string, config: RateLimitConfig): boolean {
    const now = Date.now()
    const windowStart = now - config.windowMs
    
    const userRequests = this.requests.get(key) || []
    const validRequests = userRequests.filter(time => time > windowStart)
    
    if (validRequests.length >= config.maxRequests) {
      if (validRequests.length === 0) {
        this.requests.delete(key)
      } else {
        this.requests.set(key, validRequests)
      }
      return false
    }
    
    validRequests.push(now)
    this.requests.set(key, validRequests)

    // Opportunistic cleanup to prevent unbounded growth
    if (this.requests.size > 5000 && now - this.lastCleanup > 60 * 1000) {
      const cutoff = now - 24 * 60 * 60 * 1000
      for (const [k, times] of this.requests) {
        const last = times[times.length - 1] || 0
        if (last < cutoff) {
          this.requests.delete(k)
        }
      }
      this.lastCleanup = now
    }
    return true
  }

  isAllowed(key: string, maxRequests: number, windowMs: number): boolean {
    return this.check(key, { maxRequests, windowMs })
  }

  async isAllowedAsync(key: string, maxRequests: number, windowMs: number): Promise<boolean> {
    if (!this.redis) {
      return this.isAllowed(key, maxRequests, windowMs)
    }

    const redisKey = `rate_limit:${key}`

    try {
      const requestCount = await this.redis.incr(redisKey)

      if (requestCount === 1) {
        await this.redis.expire(redisKey, Math.ceil(windowMs / 1000))
      }

      return requestCount <= maxRequests
    } catch (error) {
      console.error('Redis-backed rate limiter failed, falling back to memory:', error)
      return this.isAllowed(key, maxRequests, windowMs)
    }
  }

  reset(key: string) {
    this.requests.delete(key)
  }
}

export const rateLimiter = new RateLimiter()
