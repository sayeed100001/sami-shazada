import { NextResponse } from 'next/server'

// Custom error types
export class ValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ValidationError'
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuthorizationError'
  }
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DatabaseError'
  }
}

export class ExternalAPIError extends Error {
  constructor(message: string, public service?: string) {
    super(message)
    this.name = 'ExternalAPIError'
  }
}

// Error response helper
export function createErrorResponse(error: Error, status: number = 500) {
  console.error(`[${error.name}]`, error.message)
  
  // Don't expose internal error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? getPublicErrorMessage(error)
    : error.message

  return NextResponse.json(
    { error: { type: error.name, message } },
    { status }
  )
}

// Get user-friendly error messages
function getPublicErrorMessage(error: Error): string {
  switch (error.name) {
    case 'ValidationError':
      return 'Invalid input data provided'
    case 'AuthenticationError':
      return 'Authentication failed'
    case 'AuthorizationError':
      return 'You do not have permission to perform this action'
    case 'DatabaseError':
      return 'An internal database error occurred'
    case 'ExternalAPIError':
      return 'External service temporarily unavailable'
    default:
      return 'An unexpected error occurred'
  }
}

// Global error handler for API routes
export async function handleApiError(error: any) {
  if (error instanceof ValidationError) {
    return createErrorResponse(error, 400)
  }
  if (error instanceof AuthenticationError) {
    return createErrorResponse(error, 401)
  }
  if (error instanceof AuthorizationError) {
    return createErrorResponse(error, 403)
  }
  if (error instanceof DatabaseError) {
    return createErrorResponse(error, 500)
  }
  if (error instanceof ExternalAPIError) {
    return createErrorResponse(error, 503)
  }
  
  // Log unexpected errors
  console.error('Unexpected error:', error)
  return createErrorResponse(new Error('Internal server error'), 500)
}

// Retry mechanism for external API calls
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error: any) {
      lastError = error
      
      if (attempt === maxRetries) break
      
      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt - 1) * (0.5 + Math.random())
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
  
  throw lastError!
}

// Rate limiting helper
export class RateLimiter {
  private timestamps: number[] = []
  
  constructor(
    private readonly maxRequests: number,
    private readonly timeWindow: number // in milliseconds
  ) {}
  
  canMakeRequest(): boolean {
    const now = Date.now()
    this.timestamps = this.timestamps.filter(t => now - t < this.timeWindow)
    
    if (this.timestamps.length >= this.maxRequests) {
      return false
    }
    
    this.timestamps.push(now)
    return true
  }
  
  getTimeToNextRequest(): number {
    if (this.canMakeRequest()) return 0
    
    return this.timeWindow - (Date.now() - this.timestamps[0])
  }
}