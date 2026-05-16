import { describe, expect, it } from 'vitest'
import { normalizePhoneToE164 } from '@/lib/phone'

describe('phone', () => {
  it('accepts E.164 input', () => {
    expect(normalizePhoneToE164('+93700123456')).toBe('+93700123456')
  })

  it('normalizes Afghan local mobile numbers', () => {
    expect(normalizePhoneToE164('0700123456')).toBe('+93700123456')
    expect(normalizePhoneToE164('700123456')).toBe('+93700123456')
    expect(normalizePhoneToE164('93700123456')).toBe('+93700123456')
    expect(normalizePhoneToE164('0093700123456')).toBe('+93700123456')
  })

  it('rejects invalid phone formats', () => {
    expect(() => normalizePhoneToE164('abc')).toThrow()
    expect(() => normalizePhoneToE164('0700')).toThrow()
  })
})

