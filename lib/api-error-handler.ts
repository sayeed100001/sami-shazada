import { NextResponse } from 'next/server'

export interface ApiError {
  message: string
  code?: string
  status: number
  details?: any
}

export class ApiErrorHandler {
  static handle(error: unknown, context?: string): NextResponse {
    console.error(`API Error${context ? ` in ${context}` : ''}:`, error)

    // Database connection errors
    if (error instanceof Error) {
      if (error.message.includes('ECONNREFUSED') || 
          error.message.includes('database') ||
          error.message.includes('connection')) {
        return NextResponse.json(
          { 
            error: 'Database connection failed',
            message: 'سیستم در حال بروزرسانی است. لطفاً چند لحظه صبر کنید.',
            code: 'DB_CONNECTION_ERROR'
          },
          { status: 503 }
        )
      }

      // Timeout errors
      if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
        return NextResponse.json(
          {
            error: 'Request timeout',
            message: 'درخواست زمان زیادی طول کشید. لطفاً مجدداً تلاش کنید.',
            code: 'TIMEOUT_ERROR'
          },
          { status: 408 }
        )
      }

      // Validation errors
      if (error.message.includes('validation') || error.message.includes('required')) {
        return NextResponse.json(
          {
            error: 'Validation error',
            message: 'اطلاعات ارسالی نامعتبر است.',
            code: 'VALIDATION_ERROR',
            details: error.message
          },
          { status: 400 }
        )
      }

      // Authentication errors
      if (error.message.includes('unauthorized') || error.message.includes('authentication')) {
        return NextResponse.json(
          {
            error: 'Authentication error',
            message: 'لطفاً وارد سیستم شوید.',
            code: 'AUTH_ERROR'
          },
          { status: 401 }
        )
      }

      // Permission errors
      if (error.message.includes('permission') || error.message.includes('forbidden')) {
        return NextResponse.json(
          {
            error: 'Permission error',
            message: 'شما دسترسی لازم برای این عملیات را ندارید.',
            code: 'PERMISSION_ERROR'
          },
          { status: 403 }
        )
      }

      // Rate limit errors
      if (error.message.includes('rate limit') || error.message.includes('too many')) {
        return NextResponse.json(
          {
            error: 'Rate limit exceeded',
            message: 'تعداد درخواست‌های شما از حد مجاز گذشته است. لطفاً کمی صبر کنید.',
            code: 'RATE_LIMIT_ERROR'
          },
          { status: 429 }
        )
      }
    }

    // Generic server error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'خطای داخلی سرور. لطفاً با پشتیبانی تماس بگیرید.',
        code: 'INTERNAL_ERROR'
      },
      { status: 500 }
    )
  }

  static async withErrorHandling<T>(
    operation: () => Promise<T>,
    context?: string
  ): Promise<T | NextResponse> {
    try {
      return await operation()
    } catch (error) {
      return this.handle(error, context)
    }
  }

  static validateRequired(data: Record<string, any>, fields: string[]): void {
    const missing = fields.filter(field => !data[field] || data[field].toString().trim() === '')
    if (missing.length > 0) {
      throw new Error(`Required fields missing: ${missing.join(', ')}`)
    }
  }

  static sanitizeInput(input: string): string {
    if (typeof input !== 'string') return ''
    return input.trim().slice(0, 1000) // Limit length and trim
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
  }

  static createSuccessResponse<T>(data: T, message?: string): NextResponse {
    return NextResponse.json({
      success: true,
      data,
      message: message || 'عملیات با موفقیت انجام شد.'
    })
  }

  static createErrorResponse(message: string, status: number = 400, code?: string): NextResponse {
    return NextResponse.json({
      success: false,
      error: message,
      code
    }, { status })
  }
}

// Middleware for API routes
export function withApiErrorHandler(handler: Function) {
  return async (request: Request, context?: any) => {
    try {
      return await handler(request, context)
    } catch (error) {
      return ApiErrorHandler.handle(error, handler.name)
    }
  }
}

// Database query wrapper with timeout
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 10000,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
  })

  return Promise.race([promise, timeoutPromise])
}

// Retry mechanism for failed operations
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error')
      
      if (attempt === maxRetries) {
        throw lastError
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * attempt))
    }
  }

  throw lastError!
}

export default ApiErrorHandler