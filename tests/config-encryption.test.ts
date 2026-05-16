import { describe, it, expect, beforeEach } from 'vitest'
import { encryptConfig, decryptConfig, isEncrypted, shouldEncrypt } from '../lib/config-encryption'

describe('Config Encryption', () => {
  describe('shouldEncrypt', () => {
    it('should identify sensitive keys', () => {
      expect(shouldEncrypt('smtp_password')).toBe(true)
      expect(shouldEncrypt('api_key')).toBe(true)
      expect(shouldEncrypt('webhook_secret')).toBe(true)
      expect(shouldEncrypt('normal_config')).toBe(false)
    })
  })

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt correctly', () => {
      const original = 'sensitive-password-123'
      const encrypted = encryptConfig(original)
      const decrypted = decryptConfig(encrypted)

      expect(encrypted).not.toBe(original)
      expect(decrypted).toBe(original)
    })

    it('should produce different encrypted values for same input', () => {
      const original = 'test-value'
      const encrypted1 = encryptConfig(original)
      const encrypted2 = encryptConfig(original)

      expect(encrypted1).not.toBe(encrypted2)
      expect(decryptConfig(encrypted1)).toBe(original)
      expect(decryptConfig(encrypted2)).toBe(original)
    })
  })

  describe('isEncrypted', () => {
    it('should detect encrypted values', () => {
      const encrypted = encryptConfig('test')
      expect(isEncrypted(encrypted)).toBe(true)
      expect(isEncrypted('plain-text')).toBe(false)
    })
  })
})
