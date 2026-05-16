import { describe, expect, it } from 'vitest'
import { calculateVipLevel, vipDiscountForLevel } from '@/lib/vip'

describe('vip', () => {
  it('calculates vip level thresholds', () => {
    expect(calculateVipLevel(0)).toBe('NONE')
    expect(calculateVipLevel(9)).toBe('NONE')
    expect(calculateVipLevel(10)).toBe('BRONZE')
    expect(calculateVipLevel(49)).toBe('BRONZE')
    expect(calculateVipLevel(50)).toBe('SILVER')
    expect(calculateVipLevel(99)).toBe('SILVER')
    expect(calculateVipLevel(100)).toBe('GOLD')
    expect(calculateVipLevel(499)).toBe('GOLD')
    expect(calculateVipLevel(500)).toBe('PLATINUM')
  })

  it('returns vip discounts by level', () => {
    expect(vipDiscountForLevel('NONE')).toBe(0)
    expect(vipDiscountForLevel('BRONZE')).toBeCloseTo(0.05)
    expect(vipDiscountForLevel('SILVER')).toBeCloseTo(0.1)
    expect(vipDiscountForLevel('GOLD')).toBeCloseTo(0.15)
    expect(vipDiscountForLevel('PLATINUM')).toBeCloseTo(0.2)
  })
})

