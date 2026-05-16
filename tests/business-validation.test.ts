import { describe, it, expect } from 'vitest'
import {
  validateExchangeRates,
  validateTransactionAmount,
  validateBranchRoute,
  validateCreditAmount,
  validateCommissionRate,
  validateDuplicateCurrency,
  validateDiscountCode
} from '../lib/business-validation'

describe('Business Validation', () => {
  describe('validateExchangeRates', () => {
    it('should accept valid rates', () => {
      const result = validateExchangeRates(100, 105)
      expect(result.isValid).toBe(true)
    })

    it('should reject when buy rate >= sell rate', () => {
      const result = validateExchangeRates(105, 100)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('کمتر از نرخ فروش')
    })

    it('should reject negative rates', () => {
      const result = validateExchangeRates(-10, 100)
      expect(result.isValid).toBe(false)
    })

    it('should reject excessive spread', () => {
      const result = validateExchangeRates(100, 120)
      expect(result.isValid).toBe(false)
      expect(result.error).toContain('بیش از حد مجاز')
    })
  })

  describe('validateTransactionAmount', () => {
    it('should accept valid amounts', () => {
      const result = validateTransactionAmount(1000)
      expect(result.isValid).toBe(true)
    })

    it('should reject amounts below minimum', () => {
      const result = validateTransactionAmount(0.5, 1)
      expect(result.isValid).toBe(false)
    })

    it('should reject amounts above maximum', () => {
      const result = validateTransactionAmount(2000000, 1, 1000000)
      expect(result.isValid).toBe(false)
    })

    it('should reject more than 2 decimal places', () => {
      const result = validateTransactionAmount(100.123)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateBranchRoute', () => {
    it('should accept different branches', () => {
      const result = validateBranchRoute('branch1', 'branch2')
      expect(result.isValid).toBe(true)
    })

    it('should reject same branch', () => {
      const result = validateBranchRoute('branch1', 'branch1')
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateCreditAmount', () => {
    it('should accept valid credit amounts', () => {
      const result = validateCreditAmount(500)
      expect(result.isValid).toBe(true)
    })

    it('should reject non-integer amounts', () => {
      const result = validateCreditAmount(100.5)
      expect(result.isValid).toBe(false)
    })

    it('should reject amounts below minimum', () => {
      const result = validateCreditAmount(50)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateCommissionRate', () => {
    it('should accept valid rates', () => {
      const result = validateCommissionRate(2.5)
      expect(result.isValid).toBe(true)
    })

    it('should reject negative rates', () => {
      const result = validateCommissionRate(-1)
      expect(result.isValid).toBe(false)
    })

    it('should reject rates above 10%', () => {
      const result = validateCommissionRate(15)
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateDuplicateCurrency', () => {
    it('should accept different currencies', () => {
      const result = validateDuplicateCurrency('USD', 'AFN')
      expect(result.isValid).toBe(true)
    })

    it('should reject same currency', () => {
      const result = validateDuplicateCurrency('USD', 'USD')
      expect(result.isValid).toBe(false)
    })
  })

  describe('validateDiscountCode', () => {
    it('should accept valid discount code', () => {
      const validFrom = new Date()
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const result = validateDiscountCode('SAVE20', validFrom, validUntil, 100)
      expect(result.isValid).toBe(true)
    })

    it('should reject short codes', () => {
      const validFrom = new Date()
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const result = validateDiscountCode('AB', validFrom, validUntil)
      expect(result.isValid).toBe(false)
    })

    it('should reject codes with invalid characters', () => {
      const validFrom = new Date()
      const validUntil = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      const result = validateDiscountCode('save-20', validFrom, validUntil)
      expect(result.isValid).toBe(false)
    })
  })
})
