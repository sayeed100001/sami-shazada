/**
 * Enterprise-grade Caching System
 * Optimized for 100,000+ concurrent users
 */

interface CacheEntry<T> {
  data: T
  timestamp: number
  hits: number
  size: number
}

class EnterpriseCache {
  private cache: Map<string, CacheEntry<any>>
  private maxSize: number
  private maxMemory: number
  private currentMemory: number
  private stats: {
    hits: number
    misses: number
    evictions: number
    totalRequests: number
  }

  constructor(maxSize = 10000, maxMemoryMB = 100) {
    this.cache = new Map()
    this.maxSize = maxSize
    this.maxMemory = maxMemoryMB * 1024 * 1024 // Convert to bytes
    this.currentMemory = 0
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalRequests: 0
    }

    // Auto cleanup every 5 minutes
    if (typeof setInterval !== 'undefined') {
      setInterval(() => this.cleanup(), 5 * 60 * 1000)
    }
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    this.stats.totalRequests++
    
    const entry = this.cache.get(key)
    
    if (!entry) {
      this.stats.misses++
      return null
    }

    // Check if expired
    const now = Date.now()
    const age = now - entry.timestamp
    const ttl = this.getTTL(key)
    
    if (age > ttl) {
      this.delete(key)
      this.stats.misses++
      return null
    }

    // Update hit count
    entry.hits++
    this.stats.hits++
    
    return entry.data as T
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, customTTL?: number): void {
    const size = this.estimateSize(data)
    
    // Check if we need to evict
    if (this.cache.size >= this.maxSize || this.currentMemory + size > this.maxMemory) {
      this.evict()
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      hits: 0,
      size
    }

    // Remove old entry if exists
    if (this.cache.has(key)) {
      const oldEntry = this.cache.get(key)!
      this.currentMemory -= oldEntry.size
    }

    this.cache.set(key, entry)
    this.currentMemory += size
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const entry = this.cache.get(key)
    if (entry) {
      this.currentMemory -= entry.size
      return this.cache.delete(key)
    }
    return false
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear()
    this.currentMemory = 0
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.stats.totalRequests > 0 
      ? (this.stats.hits / this.stats.totalRequests * 100).toFixed(2)
      : '0.00'

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      size: this.cache.size,
      memoryUsage: `${(this.currentMemory / 1024 / 1024).toFixed(2)} MB`,
      maxMemory: `${(this.maxMemory / 1024 / 1024).toFixed(2)} MB`
    }
  }

  /**
   * Get TTL based on key pattern
   */
  private getTTL(key: string): number {
    if (key.startsWith('market:')) return 30 * 1000 // 30 seconds
    if (key.startsWith('rates:')) return 60 * 1000 // 1 minute
    if (key.startsWith('user:')) return 5 * 60 * 1000 // 5 minutes
    if (key.startsWith('saraf:')) return 10 * 60 * 1000 // 10 minutes
    if (key.startsWith('stats:')) return 2 * 60 * 1000 // 2 minutes
    if (key.startsWith('commission:')) return 60 * 60 * 1000 // 1 hour
    return 15 * 60 * 1000 // Default: 15 minutes
  }

  /**
   * Estimate size of data in bytes
   */
  private estimateSize(data: any): number {
    const str = JSON.stringify(data)
    return str.length * 2 // Rough estimate (UTF-16)
  }

  /**
   * Evict least recently used items
   */
  private evict(): void {
    // Sort by hits (LFU - Least Frequently Used)
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].hits - b[1].hits)

    // Remove bottom 10%
    const toRemove = Math.ceil(entries.length * 0.1)
    
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      const [key, entry] = entries[i]
      this.currentMemory -= entry.size
      this.cache.delete(key)
      this.stats.evictions++
    }
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    const toDelete: string[] = []

    this.cache.forEach((entry, key) => {
      const age = now - entry.timestamp
      const ttl = this.getTTL(key)
      
      if (age > ttl) {
        toDelete.push(key)
      }
    })

    for (const key of toDelete) {
      this.delete(key)
    }

    console.log(`[Cache] Cleaned up ${toDelete.length} expired entries`)
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(dataLoader: () => Promise<Record<string, any>>): Promise<void> {
    try {
      const data = await dataLoader()
      for (const [key, value] of Object.entries(data)) {
        this.set(key, value)
      }
      console.log(`[Cache] Warmed up with ${Object.keys(data).length} entries`)
    } catch (error) {
      console.error('[Cache] Warmup failed:', error)
    }
  }
}

// Singleton instance
const cache = new EnterpriseCache(10000, 100)

/**
 * Cache decorator for functions
 */
export function cached<T>(
  keyPrefix: string,
  ttl?: number
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`
      
      // Try to get from cache
      const cached = cache.get<T>(cacheKey)
      if (cached !== null) {
        return cached
      }

      // Execute original method
      const result = await originalMethod.apply(this, args)
      
      // Store in cache
      cache.set(cacheKey, result, ttl)
      
      return result
    }

    return descriptor
  }
}

/**
 * Memoize function results
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyPrefix: string
): T {
  return ((...args: any[]) => {
    const cacheKey = `${keyPrefix}:${JSON.stringify(args)}`
    
    const cached = cache.get(cacheKey)
    if (cached !== null) {
      return cached
    }

    const result = fn(...args)
    cache.set(cacheKey, result)
    
    return result
  }) as T
}

/**
 * Cache with automatic refresh
 */
export async function cacheWithRefresh<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get<T>(key)
  
  if (cached !== null) {
    // Refresh in background if close to expiry
    const entry = (cache as any).cache.get(key)
    if (entry) {
      const age = Date.now() - entry.timestamp
      const maxAge = (cache as any).getTTL(key)
      
      if (age > maxAge * 0.8) {
        // Refresh in background
        fetcher().then(data => cache.set(key, data, ttl)).catch(console.error)
      }
    }
    
    return cached
  }

  const data = await fetcher()
  cache.set(key, data, ttl)
  
  return data
}

/**
 * Batch cache operations
 */
export async function batchGet<T>(keys: string[]): Promise<Map<string, T>> {
  const results = new Map<string, T>()
  
  for (const key of keys) {
    const value = cache.get<T>(key)
    if (value !== null) {
      results.set(key, value)
    }
  }
  
  return results
}

export async function batchSet<T>(entries: Map<string, T>): Promise<void> {
  entries.forEach((value, key) => cache.set(key, value))
}

/**
 * Cache invalidation patterns
 */
export function invalidatePattern(pattern: string): number {
  let count = 0
  const regex = new RegExp(pattern)
  
  ;(cache as any).cache.forEach((_: unknown, key: string) => {
    if (regex.test(key)) {
      cache.delete(key)
      count++
    }
  })
  
  return count
}

export { cache }
export default cache
