import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { logger } from '../lib/logger'

describe('Logger', () => {
  let consoleInfoSpy: any
  let consoleWarnSpy: any
  let consoleErrorSpy: any

  beforeEach(() => {
    consoleInfoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('info', () => {
    it('should log info message', () => {
      logger.info('Test message')
      expect(consoleInfoSpy).toHaveBeenCalled()
    })

    it('should log info message with context', () => {
      logger.info('Test message', { userId: '123' })
      expect(consoleInfoSpy).toHaveBeenCalled()
      const logOutput = consoleInfoSpy.mock.calls[0][0]
      expect(logOutput).toContain('Test message')
    })
  })

  describe('warn', () => {
    it('should log warning message', () => {
      logger.warn('Warning message')
      expect(consoleWarnSpy).toHaveBeenCalled()
    })

    it('should log warning with context', () => {
      logger.warn('Warning', { action: 'test' })
      expect(consoleWarnSpy).toHaveBeenCalled()
    })
  })

  describe('error', () => {
    it('should log error message', () => {
      logger.error('Error message')
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    it('should log error with Error object', () => {
      const error = new Error('Test error')
      logger.error('Error occurred', {}, error)
      expect(consoleErrorSpy).toHaveBeenCalled()
      const logOutput = consoleErrorSpy.mock.calls[0][0]
      expect(logOutput).toContain('Test error')
    })
  })

  describe('authLog', () => {
    it('should log auth event', () => {
      logger.authLog('LOGIN', { userId: '123' })
      expect(consoleInfoSpy).toHaveBeenCalled()
      const logOutput = consoleInfoSpy.mock.calls[0][0]
      expect(logOutput).toContain('Auth: LOGIN')
    })
  })

  describe('apiLog', () => {
    it('should log API request', () => {
      logger.apiLog('GET', '/api/users', 200, 150)
      expect(consoleInfoSpy).toHaveBeenCalled()
      const logOutput = consoleInfoSpy.mock.calls[0][0]
      expect(logOutput).toContain('GET')
      expect(logOutput).toContain('/api/users')
      expect(logOutput).toContain('200')
      expect(logOutput).toContain('150ms')
    })
  })

  describe('securityLog', () => {
    it('should log security event', () => {
      logger.securityLog('SUSPICIOUS_ACTIVITY', { ipAddress: '1.2.3.4' })
      expect(consoleWarnSpy).toHaveBeenCalled()
      const logOutput = consoleWarnSpy.mock.calls[0][0]
      expect(logOutput).toContain('Security: SUSPICIOUS_ACTIVITY')
    })
  })
})
