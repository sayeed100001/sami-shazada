type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal'

interface LogContext {
  userId?: string
  sarafId?: string
  transactionId?: string
  sessionId?: string
  ipAddress?: string
  userAgent?: string
  [key: string]: any
}

interface LogEntry {
  timestamp: string
  level: LogLevel
  message: string
  context?: LogContext
  error?: {
    name: string
    message: string
    stack?: string
  }
}

class Logger {
  private minLevel: LogLevel = 'info'

  constructor() {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel
    if (envLevel && ['debug', 'info', 'warn', 'error', 'fatal'].includes(envLevel)) {
      this.minLevel = envLevel
    }
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal']
    return levels.indexOf(level) >= levels.indexOf(this.minLevel)
  }

  private formatLog(entry: LogEntry): string {
    if (process.env.NODE_ENV === 'production') {
      return JSON.stringify(entry)
    }

    // Pretty format for development
    const parts = [
      `[${entry.timestamp}]`,
      `[${entry.level.toUpperCase()}]`,
      entry.message
    ]

    if (entry.context && Object.keys(entry.context).length > 0) {
      parts.push(JSON.stringify(entry.context, null, 2))
    }

    if (entry.error) {
      parts.push(`Error: ${entry.error.name}: ${entry.error.message}`)
      if (entry.error.stack) {
        parts.push(entry.error.stack)
      }
    }

    return parts.join(' ')
  }

  private log(level: LogLevel, message: string, context?: LogContext, error?: Error) {
    if (!this.shouldLog(level)) return

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context
    }

    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    }

    const formatted = this.formatLog(entry)

    switch (level) {
      case 'debug':
        console.debug(formatted)
        break
      case 'info':
        console.info(formatted)
        break
      case 'warn':
        console.warn(formatted)
        break
      case 'error':
      case 'fatal':
        console.error(formatted)
        break
    }

    // In production, send to external logging service (e.g., Sentry, DataDog)
    if (process.env.NODE_ENV === 'production' && (level === 'error' || level === 'fatal')) {
      this.sendToExternalService(entry)
    }
  }

  private sendToExternalService(entry: LogEntry) {
    // TODO: Integrate with Sentry or other logging service
    // For now, just ensure it's logged
  }

  debug(message: string, context?: LogContext) {
    this.log('debug', message, context)
  }

  info(message: string, context?: LogContext) {
    this.log('info', message, context)
  }

  warn(message: string, context?: LogContext) {
    this.log('warn', message, context)
  }

  error(message: string, context?: LogContext, error?: Error) {
    this.log('error', message, context, error)
  }

  fatal(message: string, context?: LogContext, error?: Error) {
    this.log('fatal', message, context, error)
  }

  // Convenience methods for common scenarios
  authLog(action: string, context: LogContext) {
    this.info(`Auth: ${action}`, { ...context, category: 'auth' })
  }

  apiLog(method: string, path: string, status: number, duration: number, context?: LogContext) {
    this.info(`API: ${method} ${path} ${status} ${duration}ms`, {
      ...context,
      category: 'api',
      method,
      path,
      status,
      duration
    })
  }

  dbLog(operation: string, table: string, duration: number, context?: LogContext) {
    this.debug(`DB: ${operation} ${table} ${duration}ms`, {
      ...context,
      category: 'database',
      operation,
      table,
      duration
    })
  }

  securityLog(event: string, context: LogContext) {
    this.warn(`Security: ${event}`, { ...context, category: 'security' })
  }
}

export const logger = new Logger()
