import { describe, expect, it } from 'vitest'
import { validatePasswordStrength, validateUserRegistration } from '@/lib/validation'

describe('validation', () => {
  it('rejects weak passwords', () => {
    const result = validatePasswordStrength('abc')
    expect(result.isValid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)
  })

  it('accepts strong passwords', () => {
    const result = validatePasswordStrength('Abcdef12!')
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('validateUserRegistration requires password', () => {
    const result = validateUserRegistration({
      name: 'Test User',
      email: 'test@example.com',
      password: '',
    })
    expect(result.isValid).toBe(false)
    expect(result.errors).toContain('Password is required')
  })
})

