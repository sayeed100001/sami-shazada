import { describe, it, expect } from 'vitest'
import { parsePaginationParams, createPaginationResult, parseSortParams } from '../lib/pagination'

describe('Pagination', () => {
  describe('parsePaginationParams', () => {
    it('should parse valid pagination params', () => {
      const params = new URLSearchParams('page=2&limit=20')
      const result = parsePaginationParams(params)

      expect(result.page).toBe(2)
      expect(result.limit).toBe(20)
      expect(result.skip).toBe(20)
      expect(result.take).toBe(20)
    })

    it('should use defaults for missing params', () => {
      const params = new URLSearchParams()
      const result = parsePaginationParams(params)

      expect(result.page).toBe(1)
      expect(result.limit).toBe(10)
      expect(result.skip).toBe(0)
      expect(result.take).toBe(10)
    })

    it('should enforce max limit', () => {
      const params = new URLSearchParams('limit=999')
      const result = parsePaginationParams(params)

      expect(result.limit).toBe(100)
    })

    it('should enforce min limit', () => {
      const params = new URLSearchParams('limit=0')
      const result = parsePaginationParams(params)

      expect(result.limit).toBe(1)
    })

    it('should handle negative page numbers', () => {
      const params = new URLSearchParams('page=-5')
      const result = parsePaginationParams(params)

      expect(result.page).toBe(1)
    })
  })

  describe('createPaginationResult', () => {
    it('should create correct pagination result', () => {
      const result = createPaginationResult(2, 10, 45)

      expect(result.page).toBe(2)
      expect(result.limit).toBe(10)
      expect(result.total).toBe(45)
      expect(result.totalPages).toBe(5)
      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(true)
    })

    it('should handle first page', () => {
      const result = createPaginationResult(1, 10, 45)

      expect(result.hasNext).toBe(true)
      expect(result.hasPrev).toBe(false)
    })

    it('should handle last page', () => {
      const result = createPaginationResult(5, 10, 45)

      expect(result.hasNext).toBe(false)
      expect(result.hasPrev).toBe(true)
    })
  })

  describe('parseSortParams', () => {
    it('should parse valid sort params', () => {
      const params = new URLSearchParams('sortBy=name&sortOrder=asc')
      const result = parseSortParams(params, ['name', 'createdAt'])

      expect(result.sortBy).toBe('name')
      expect(result.sortOrder).toBe('asc')
    })

    it('should reject invalid sort fields', () => {
      const params = new URLSearchParams('sortBy=invalid')
      const result = parseSortParams(params, ['name', 'createdAt'])

      expect(result.sortBy).toBe('createdAt')
    })

    it('should use defaults', () => {
      const params = new URLSearchParams()
      const result = parseSortParams(params, ['name', 'createdAt'])

      expect(result.sortBy).toBe('createdAt')
      expect(result.sortOrder).toBe('desc')
    })
  })
})
