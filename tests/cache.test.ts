import { describe, it, expect, beforeEach } from 'vitest'
import { marketDataCache, rateCache, CACHE_KEYS, CACHE_TTL } from '../lib/cache'

describe('Cache Module', () => {
  beforeEach(async () => {
    marketDataCache.clear()
    rateCache.clear()
  })

  describe('marketDataCache', () => {
    it('should set and get data', async () => {
      const testData = { price: 100, symbol: 'BTC' }
      await marketDataCache.set('test-key', testData, 1000)
      
      const result = await marketDataCache.get('test-key')
      expect(result).toEqual(testData)
    })

    it('should return null for non-existent key', async () => {
      const result = await marketDataCache.get('non-existent')
      expect(result).toBeNull()
    })

    it('should expire data after TTL', async () => {
      const testData = { price: 100 }
      await marketDataCache.set('test-key', testData, 10) // 10ms TTL
      
      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 20))
      
      const result = await marketDataCache.get('test-key')
      expect(result).toBeNull()
    })

    it('should invalidate specific key', async () => {
      await marketDataCache.set('key1', { data: 1 })
      await marketDataCache.set('key2', { data: 2 })
      
      await marketDataCache.invalidate('key1')
      
      expect(await marketDataCache.get('key1')).toBeNull()
      expect(await marketDataCache.get('key2')).not.toBeNull()
    })

    it('should invalidate by pattern', async () => {
      await marketDataCache.set('user:1', { id: 1 })
      await marketDataCache.set('user:2', { id: 2 })
      await marketDataCache.set('post:1', { id: 1 })
      
      await marketDataCache.invalidatePattern('user:.*')
      
      expect(await marketDataCache.get('user:1')).toBeNull()
      expect(await marketDataCache.get('user:2')).toBeNull()
      expect(await marketDataCache.get('post:1')).not.toBeNull()
    })

    it('should getOrFetch data', async () => {
      const fetcher = vi.fn(async () => ({ data: 'fetched' }))
      
      const result1 = await marketDataCache.getOrFetch('test', fetcher)
      const result2 = await marketDataCache.getOrFetch('test', fetcher)
      
      expect(result1).toEqual({ data: 'fetched' })
      expect(result2).toEqual({ data: 'fetched' })
      expect(fetcher).toHaveBeenCalledTimes(1) // Should only fetch once
    })
  })

  describe('CACHE_KEYS', () => {
    it('should have correct key structure', () => {
      expect(CACHE_KEYS.MARKET_DATA).toBe('market_data')
      expect(CACHE_KEYS.USER_PROFILE('123')).toBe('user_profile_123')
    })
  })

  describe('CACHE_TTL', () => {
    it('should have correct TTL values', () => {
      expect(CACHE_TTL.MARKET_DATA).toBe(30 * 1000)
      expect(CACHE_TTL.USER_DATA).toBe(5 * 60 * 1000)
    })
  })
})
