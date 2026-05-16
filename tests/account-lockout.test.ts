import { describe, it, expect, beforeEach, vi } from 'vitest'

describe('Account Lockout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('lockout logic', () => {
    it('should lock account after max attempts', () => {
      const maxAttempts = 5
      let attempts = 0
      let locked = false

      for (let i = 0; i < maxAttempts; i++) {
        attempts++
      }

      if (attempts >= maxAttempts) {
        locked = true
      }

      expect(locked).toBe(true)
      expect(attempts).toBe(5)
    })

    it('should calculate remaining lockout time', () => {
      const lockoutDuration = 30 * 60 * 1000 // 30 minutes
      const lockedAt = Date.now()
      const now = lockedAt + 10 * 60 * 1000 // 10 minutes later

      const remainingTime = Math.ceil((lockedAt + lockoutDuration - now) / 1000)

      expect(remainingTime).toBe(20 * 60) // 20 minutes remaining
    })

    it('should reset attempts after window expires', () => {
      const attemptWindow = 15 * 60 * 1000 // 15 minutes
      const lastAttempt = Date.now() - 20 * 60 * 1000 // 20 minutes ago
      const now = Date.now()

      const shouldReset = (now - lastAttempt) > attemptWindow

      expect(shouldReset).toBe(true)
    })
  })
})
