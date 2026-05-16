import { describe, it, expect, vi, beforeEach } from 'vitest'
import { verifyWebhookSignature } from '../lib/webhook-service-enhanced'
import crypto from 'crypto'

describe('Webhook Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('verifyWebhookSignature', () => {
    it('should verify valid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } })
      const secret = 'test-secret'
      const signature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex')

      const result = verifyWebhookSignature(payload, signature, secret)
      expect(result).toBe(true)
    })

    it('should reject invalid signature', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } })
      const secret = 'test-secret'
      const wrongSignature = 'invalid-signature'

      const result = verifyWebhookSignature(payload, wrongSignature, secret)
      expect(result).toBe(false)
    })

    it('should reject signature with wrong secret', () => {
      const payload = JSON.stringify({ event: 'test', data: { id: '123' } })
      const secret = 'test-secret'
      const wrongSecret = 'wrong-secret'
      const signature = crypto
        .createHmac('sha256', wrongSecret)
        .update(payload)
        .digest('hex')

      const result = verifyWebhookSignature(payload, signature, secret)
      expect(result).toBe(false)
    })
  })
})
