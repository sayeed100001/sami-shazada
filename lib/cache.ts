import { cacheGet, cacheSet, cacheDelete, cacheDeletePattern, isRedisAvailable } from './redis'

interface CacheItem<T> {
  data: T
  timestamp: number
  ttl: number
}

class AdvancedCache {
  private cache = new Map<string, CacheItem<any>>()
  private readonly defaultTTL = 5 * 60 * 1000 // 5 minutes

  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const ttlMs = ttl || this.defaultTTL
    const ttlSeconds = Math.ceil(ttlMs / 1000)

    // Try Redis first
    if (isRedisAvailable()) {
      const success = await cacheSet(key, data, ttlSeconds)
      if (success) return
    }

    // Fallback to in-memory
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMs
    }
    this.cache.set(key, item)
  }

  async get<T>(key: string): Promise<T | null> {
    // Try Redis first
    if (isRedisAvailable()) {
      const data = await cacheGet<T>(key)
      if (data !== null) return data
    }

    // Fallback to in-memory
    const item = this.cache.get(key)
    if (!item) return null

    const now = Date.now()
    if (now - item.timestamp > item.ttl) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  async invalidate(key: string): Promise<void> {
    // Try Redis first
    if (isRedisAvailable()) {
      await cacheDelete(key)
    }

    // Also clear from in-memory
    this.cache.delete(key)
  }

  async invalidatePattern(pattern: string): Promise<void> {
    // Try Redis first
    if (isRedisAvailable()) {
      await cacheDeletePattern(pattern)
    }

    // Also clear from in-memory
    const regex = new RegExp(pattern)
    this.cache.forEach((_, key) => {
      if (regex.test(key)) {
        this.cache.delete(key)
      }
    })
  }

  clear(): void {
    this.cache.clear()
  }

  // Cache with automatic refresh
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    if (cached) return cached

    const data = await fetcher()
    await this.set(key, data, ttl)
    return data
  }

  // Background refresh for critical data
  async backgroundRefresh<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = await this.get<T>(key)
    
    // Return cached data immediately if available
    if (cached) {
      // Refresh in background if close to expiry (only for in-memory)
      const item = this.cache.get(key)
      if (item && Date.now() - item.timestamp > item.ttl * 0.8) {
        fetcher().then(data => this.set(key, data, ttl)).catch(console.error)
      }
      return cached
    }

    // Fetch fresh data if no cache
    const data = await fetcher()
    await this.set(key, data, ttl)
    return data
  }
}

// Cache instances for different data types
export const marketDataCache = new AdvancedCache()
export const rateCache = new AdvancedCache()
export const userCache = new AdvancedCache()
export const transactionCache = new AdvancedCache()

// Cache keys
export const CACHE_KEYS = {
  MARKET_DATA: 'market_data',
  EXCHANGE_RATES: 'exchange_rates',
  SARAF_LIST: 'saraf_list',
  USER_PROFILE: (id: string) => `user_profile_${id}`,
  TRANSACTION_HISTORY: (id: string) => `transaction_history_${id}`,
  HAWALA_RATES: 'hawala_rates',
  CRYPTO_PRICES: 'crypto_prices',
  SYSTEM_STATS: 'system_stats'
}

// Cache TTL configurations (in milliseconds)
export const CACHE_TTL = {
  MARKET_DATA: 30 * 1000, // 30 seconds
  EXCHANGE_RATES: 60 * 1000, // 1 minute
  USER_DATA: 5 * 60 * 1000, // 5 minutes
  STATIC_DATA: 30 * 60 * 1000, // 30 minutes
  LONG_TERM: 24 * 60 * 60 * 1000 // 24 hours
}
