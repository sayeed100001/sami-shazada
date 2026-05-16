interface SentryConfig {
  dsn: string | undefined
  environment: string
  enabled: boolean
}

interface ErrorContext {
  userId?: string
  sarafId?: string
  transactionId?: string
  endpoint?: string
  method?: string
  [key: string]: any
}

class SentryService {
  private config: SentryConfig

  constructor() {
    this.config = {
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      enabled: !!process.env.SENTRY_DSN && process.env.NODE_ENV === 'production'
    }
  }

  isEnabled(): boolean {
    return this.config.enabled
  }

  captureException(error: Error, context?: ErrorContext): void {
    if (!this.isEnabled()) {
      console.error('Error:', error, 'Context:', context)
      return
    }

    try {
      // In production, this would use @sentry/nextjs
      // For now, we log structured errors
      const errorData = {
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        },
        context
      }

      console.error('[SENTRY]', JSON.stringify(errorData))

      // TODO: Integrate with actual Sentry SDK
      // Sentry.captureException(error, { contexts: { custom: context } })
    } catch (sentryError) {
      console.error('Failed to capture exception in Sentry:', sentryError)
    }
  }

  captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info', context?: ErrorContext): void {
    if (!this.isEnabled()) {
      console.log(`[${level.toUpperCase()}]`, message, context)
      return
    }

    try {
      const messageData = {
        timestamp: new Date().toISOString(),
        environment: this.config.environment,
        level,
        message,
        context
      }

      console.log('[SENTRY]', JSON.stringify(messageData))

      // TODO: Integrate with actual Sentry SDK
      // Sentry.captureMessage(message, { level, contexts: { custom: context } })
    } catch (sentryError) {
      console.error('Failed to capture message in Sentry:', sentryError)
    }
  }

  setUser(user: { id: string; email?: string; role?: string }): void {
    if (!this.isEnabled()) return

    try {
      // TODO: Integrate with actual Sentry SDK
      // Sentry.setUser(user)
      console.log('[SENTRY] User set:', user.id)
    } catch (error) {
      console.error('Failed to set user in Sentry:', error)
    }
  }

  clearUser(): void {
    if (!this.isEnabled()) return

    try {
      // TODO: Integrate with actual Sentry SDK
      // Sentry.setUser(null)
      console.log('[SENTRY] User cleared')
    } catch (error) {
      console.error('Failed to clear user in Sentry:', error)
    }
  }

  addBreadcrumb(breadcrumb: {
    message: string
    category?: string
    level?: 'info' | 'warning' | 'error'
    data?: Record<string, any>
  }): void {
    if (!this.isEnabled()) return

    try {
      // TODO: Integrate with actual Sentry SDK
      // Sentry.addBreadcrumb(breadcrumb)
      console.log('[SENTRY] Breadcrumb:', breadcrumb)
    } catch (error) {
      console.error('Failed to add breadcrumb in Sentry:', error)
    }
  }
}

export const sentry = new SentryService()

export function withErrorTracking<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  context?: ErrorContext
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args)
    } catch (error) {
      if (error instanceof Error) {
        sentry.captureException(error, context)
      }
      throw error
    }
  }) as T
}
