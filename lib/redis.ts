import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

// Redis client for caching and rate limiting
let redis: Redis | null = null
let rateLimiters: Map<string, Ratelimit> = new Map()

function getRedisClient(): Redis | null {
  if (redis) return redis

  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) {
    console.warn('Redis not configured. Using in-memory fallback.')
    return null
  }

  try {
    redis = new Redis({
      url,
      token,
    })
    return redis
  } catch (error) {
    console.error('Failed to initialize Redis:', error)
    return null
  }
}

// Rate limiter factory
export function getRateLimiter(config: {
  prefix: string
  maxRequests: number
  windowMs: number
}): Ratelimit | null {
  const key = `${config.prefix}:${config.maxRequests}:${config.windowMs}`
  
  if (rateLimiters.has(key)) {
    return rateLimiters.get(key)!
  }

  const client = getRedisClient()
  if (!client) return null

  const limiter = new Ratelimit({
    redis: client,
    limiter: Ratelimit.slidingWindow(config.maxRequests, `${config.windowMs}ms`),
    prefix: config.prefix,
    analytics: true,
  })

  rateLimiters.set(key, limiter)
  return limiter
}

// Cache functions
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedisClient()
  if (!client) return null

  try {
    const data = await client.get(key)
    return data as T | null
  } catch (error) {
    console.error('Cache get error:', error)
    return null
  }
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds?: number
): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    if (ttlSeconds) {
      await client.setex(key, ttlSeconds, JSON.stringify(value))
    } else {
      await client.set(key, JSON.stringify(value))
    }
    return true
  } catch (error) {
    console.error('Cache set error:', error)
    return false
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    await client.del(key)
    return true
  } catch (error) {
    console.error('Cache delete error:', error)
    return false
  }
}

export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  const client = getRedisClient()
  if (!client) return false

  try {
    const keys = await client.keys(pattern)
    if (keys.length > 0) {
      await client.del(...keys)
    }
    return true
  } catch (error) {
    console.error('Cache delete pattern error:', error)
    return false
  }
}

// Check if Redis is available
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null
}

export { redis }
