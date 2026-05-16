import { NextRequest, NextResponse } from 'next/server'
import { rateLimiter, monitoring } from './monitoring'
import { getRateLimiter, isRedisAvailable } from './redis'
import { prisma } from '@/lib/prisma'

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
  message?: string
  skipSuccessfulRequests?: boolean
  skipFailedRequests?: boolean
}

const defaultConfig: RateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100,
  message: 'Too many requests, please try again later.'
}

// Different rate limits for different endpoints
export const rateLimitConfigs = {
  // Authentication endpoints - stricter limits
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 5,
    message: 'Too many authentication attempts, please try again later.'
  },
  
  // Market data - moderate limits
  market: {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60,
    message: 'Too many market data requests, please slow down.'
  },
  
  // General API - standard limits
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    maxRequests: 100,
    message: 'Too many requests, please try again later.'
  },
  
  // File uploads - very strict
  upload: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 10,
    message: 'Too many upload attempts, please try again later.'
  },
  
  // Admin operations - moderate
  admin: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    maxRequests: 50,
    message: 'Too many admin requests, please slow down.'
  }
}

export function createRateLimitMiddleware(config: RateLimitConfig = defaultConfig) {
  return async (request: NextRequest) => {
    const ip = getClientIP(request)
    const identifier = `${ip}:${request.nextUrl.pathname}`
    const userAgent = request.headers.get('user-agent') || 'unknown'

    async function recordRateLimitEvent(extra?: Record<string, unknown>) {
      try {
        // Keep it lightweight; do not block the response on logging failures.
        await prisma.auditLog.create({
          data: {
            userId: null,
            action: 'RATE_LIMIT_BLOCKED',
            resource: 'SECURITY',
            resourceId: request.nextUrl.pathname,
            details: JSON.stringify({
              endpoint: request.nextUrl.pathname,
              method: request.method,
              maxRequests: config.maxRequests,
              windowMs: config.windowMs,
              ...extra,
            }),
            ipAddress: ip,
            userAgent,
          },
        })
      } catch {
        // ignore
      }
    }
    
    // Try Redis-based rate limiting first
    if (isRedisAvailable()) {
      const limiter = getRateLimiter({
        prefix: 'ratelimit',
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      })

      if (limiter) {
        const { success, limit, remaining, reset } = await limiter.limit(identifier)

        if (!success) {
          monitoring.logError(
            `Rate limit exceeded for IP: ${ip}`,
            {
              endpoint: request.nextUrl.pathname,
              severity: 'medium'
            }
          )

          monitoring.recordMetric('rate_limit_exceeded', 1, {
            endpoint: request.nextUrl.pathname,
            ip
          })

          void recordRateLimitEvent({
            backend: 'redis',
            remaining,
            limit,
            reset,
          })

          return NextResponse.json(
            { error: config.message },
            { 
              status: 429,
              headers: {
                'Retry-After': Math.ceil((reset - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': remaining.toString(),
                'X-RateLimit-Reset': new Date(reset).toISOString()
              }
            }
          )
        }

        return null // Allow request
      }
    }

    // Fallback to in-memory rate limiting
    const key = `rate_limit:${identifier}`
    const isAllowed = await rateLimiter.isAllowedAsync(
      key,
      config.maxRequests,
      config.windowMs
    )

    if (!isAllowed) {
      monitoring.logError(
        `Rate limit exceeded for IP: ${ip}`,
        {
          endpoint: request.nextUrl.pathname,
          severity: 'medium'
        }
      )

      monitoring.recordMetric('rate_limit_exceeded', 1, {
        endpoint: request.nextUrl.pathname,
        ip
      })

      void recordRateLimitEvent({ backend: 'memory' })

      return NextResponse.json(
        { error: config.message },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil(config.windowMs / 1000).toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(Date.now() + config.windowMs).toISOString()
          }
        }
      )
    }

    return null // Allow request to proceed
  }
}

// Get client IP address
function getClientIP(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return request.ip || 'unknown'
}

// Middleware wrapper for API routes
export function withRateLimit(
  handler: (req: NextRequest) => Promise<NextResponse>,
  config?: RateLimitConfig
) {
  return async (request: NextRequest) => {
    const rateLimitResponse = await createRateLimitMiddleware(config)(request)
    
    if (rateLimitResponse) {
      return rateLimitResponse
    }
    
    return handler(request)
  }
}

// Smart rate limiting based on user authentication
export function createSmartRateLimit(
  authenticatedConfig: RateLimitConfig,
  anonymousConfig: RateLimitConfig
) {
  return async (request: NextRequest) => {
    const isAuthenticated = request.headers.get('authorization') || 
                           request.cookies.get('next-auth.session-token')
    
    const config = isAuthenticated ? authenticatedConfig : anonymousConfig
    return createRateLimitMiddleware(config)(request)
  }
}
