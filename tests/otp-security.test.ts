import { describe, it, expect } from 'vitest'
import { 
  normalizeOtpCode, 
  normalizeOtpIdentifier, 
  hashOtpCode, 
  isHashedOtpCode, 
  verifyOtpCode 
} from '../lib/otp-security'

describe('OTP Security Module', () => {
  describe('normalizeOtpCode', () => {
    it('should remove non-digit characters', () => {
      expect(normalizeOtpCode('123-456')).toBe('123456')
      expect(normalizeOtpCode('abc123def')).toBe('123')
      expect(normalizeOtpCode('  1 2 3  ')).toBe('123')
    })

    it('should limit to 10 digits', () => {
      expect(normalizeOtpCode('12345678901234')).toBe('1234567890')
    })
  })

  describe('normalizeOtpIdentifier', () => {
    it('should normalize email', () => {
      expect(normalizeOtpIdentifier('Test@Example.COM', 'EMAIL')).toBe('test@example.com')
      expect(normalizeOtpIdentifier('  user@domain.com  ')).toBe('user@domain.com')
    })

    it('should normalize phone', () => {
      const phone = '+93701234567'
      expect(normalizeOtpIdentifier(phone, 'SMS')).toBe(phone)
    })

    it('should throw error for empty identifier', () => {
      expect(() => normalizeOtpIdentifier('')).toThrow('Missing OTP identifier')
      expect(() => normalizeOtpIdentifier('   ')).toThrow('Missing OTP identifier')
    })
  })

  describe('hashOtpCode', () => {
    it('should hash OTP code', () => {
      const hash = hashOtpCode({
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '123456'
      })
      
      expect(hash).toMatch(/^otp:/)
      expect(hash.length).toBeGreaterThan(10)
    })

    it('should produce consistent hashes', () => {
      const params = {
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '123456'
      }
      
      const hash1 = hashOtpCode(params)
      const hash2 = hashOtpCode(params)
      
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different codes', () => {
      const hash1 = hashOtpCode({
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '123456'
      })
      
      const hash2 = hashOtpCode({
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '654321'
      })
      
      expect(hash1).not.toBe(hash2)
    })
  })

  describe('isHashedOtpCode', () => {
    it('should identify hashed codes', () => {
      expect(isHashedOtpCode('otp:abc123')).toBe(true)
      expect(isHashedOtpCode('123456')).toBe(false)
      expect(isHashedOtpCode('')).toBe(false)
    })
  })

  describe('verifyOtpCode', () => {
    it('should verify correct hashed code', () => {
      const params = {
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '123456'
      }
      
      const hash = hashOtpCode(params)
      
      const result = verifyOtpCode({
        storedCode: hash,
        ...params
      })
      
      expect(result).toBe(true)
    })

    it('should reject incorrect code', () => {
      const hash = hashOtpCode({
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '123456'
      })
      
      const result = verifyOtpCode({
        storedCode: hash,
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '654321'
      })
      
      expect(result).toBe(false)
    })

    it('should verify plain text code (backward compatibility)', () => {
      const result = verifyOtpCode({
        storedCode: '123456',
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '123456'
      })
      
      expect(result).toBe(true)
    })

    it('should reject incorrect plain text code', () => {
      const result = verifyOtpCode({
        storedCode: '123456',
        identifier: 'test@example.com',
        purpose: 'SIGNUP',
        code: '654321'
      })
      
      expect(result).toBe(false)
    })
  })
})
