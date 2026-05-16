import { describe, it, expect } from 'vitest'
import { sanitizeInput, validateNumericInput, sanitizeURL } from '../lib/security'

describe('Security Module', () => {
  describe('sanitizeInput', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeInput('<script>alert("xss")</script>')).not.toContain('<script>')
      expect(sanitizeInput('test"value')).not.toContain('"')
      expect(sanitizeInput("test'value")).not.toContain("'")
    })

    it('should remove javascript: protocol', () => {
      expect(sanitizeInput('javascript:alert(1)')).not.toContain('javascript:')
    })

    it('should remove data: protocol', () => {
      expect(sanitizeInput('data:text/html,<script>alert(1)</script>')).not.toContain('data:')
    })

    it('should handle null and undefined', () => {
      expect(sanitizeInput(null)).toBe('')
      expect(sanitizeInput(undefined)).toBe('')
    })

    it('should preserve safe text', () => {
      const safeText = 'Hello World 123'
      expect(sanitizeInput(safeText)).toBe(safeText)
    })

    it('should handle Persian/Arabic text', () => {
      const persianText = 'سلام دنیا'
      expect(sanitizeInput(persianText)).toBe(persianText)
    })
  })

  describe('validateNumericInput', () => {
    it('should parse valid numbers', () => {
      expect(validateNumericInput(123)).toBe(123)
      expect(validateNumericInput('456')).toBe(456)
      expect(validateNumericInput('123.45')).toBe(123.45)
    })

    it('should handle negative numbers', () => {
      expect(validateNumericInput(-100)).toBe(-100)
      expect(validateNumericInput('-50.5')).toBe(-50.5)
    })

    it('should return 0 for invalid input', () => {
      expect(validateNumericInput('abc')).toBe(0)
      expect(validateNumericInput(null)).toBe(0)
      expect(validateNumericInput(undefined)).toBe(0)
      expect(validateNumericInput(NaN)).toBe(0)
    })

    it('should handle edge cases', () => {
      expect(validateNumericInput(0)).toBe(0)
      expect(validateNumericInput('0')).toBe(0)
      expect(validateNumericInput(Infinity)).toBe(0)
    })
  })

  describe('sanitizeURL', () => {
    it('should allow whitelisted domains', () => {
      const url = 'https://api.coingecko.com/api/v3/coins'
      expect(sanitizeURL(url)).toBe(url)
    })

    it('should reject non-whitelisted domains', () => {
      expect(() => sanitizeURL('https://evil.com/api')).toThrow()
    })

    it('should reject javascript: URLs', () => {
      expect(() => sanitizeURL('javascript:alert(1)')).toThrow()
    })

    it('should reject data: URLs', () => {
      expect(() => sanitizeURL('data:text/html,<script>alert(1)</script>')).toThrow()
    })

    it('should handle invalid URLs', () => {
      expect(() => sanitizeURL('not-a-url')).toThrow()
      expect(() => sanitizeURL('')).toThrow()
    })
  })
})
