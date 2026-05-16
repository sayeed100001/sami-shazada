import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getRateLimiter, cacheGet, cacheSet, cacheDelete, isRedisAvailable } from '../lib/redis'

// Mock environment variables
vi.mock('../lib/redis', async () => {
  const actual = await vi.importActual('../lib/redis')
  return {
    ...actual,
    isRedisAvailable: vi.fn(() => false), // Mock as unavailable for testing
  }
})

describe('Redis Module', () => {
  describe('isRedisAvailable', () => {
    it('should return false when Redis is not configured', () => {
      expect(isRedisAvailable()).toBe(false)
    })
  })

  describe('cacheGet', () => {
    it('should return null when Redis is not available', async () => {
      const result = await cacheGet('test-key')
      expect(result).toBeNull()
    })
  })

  describe('cacheSet', () => {
    it('should return false when Redis is not available', async () => {
      const result = await cacheSet('test-key', { data: 'test' }, 60)
      expect(result).toBe(false)
    })
  })

  describe('cacheDelete', () => {
    it('should return false when Redis is not available', async () => {
      const result = await cacheDelete('test-key')
      expect(result).toBe(false)
    })
  })

  describe('getRateLimiter', () => {
    it('should return null when Redis is not available', () => {
      const limiter = getRateLimiter({
        prefix: 'test',
        maxRequests: 10,
        windowMs: 60000,
      })
      expect(limiter).toBeNull()
    })
  })
})
