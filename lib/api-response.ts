import { NextResponse } from 'next/server'

export type ApiSuccessResponse<T extends Record<string, unknown> = Record<string, unknown>> = {
  success: true
} & T

export type ApiErrorResponse = {
  success: false
  error: string
  code?: string
  details?: unknown
}

export class ApiResponse {
  static ok<T extends Record<string, unknown>>(payload: T, status = 200) {
    return NextResponse.json({ success: true, ...payload } satisfies ApiSuccessResponse<T>, { status })
  }

  static error(message: string, status = 400, code?: string, details?: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: message,
        ...(code ? { code } : null),
        ...(details !== undefined ? { details } : null),
      } satisfies ApiErrorResponse,
      { status }
    )
  }

  static unauthorized(message = 'Unauthorized') {
    return this.error(message, 401, 'UNAUTHORIZED')
  }

  static forbidden(message = 'Forbidden') {
    return this.error(message, 403, 'FORBIDDEN')
  }

  static notFound(message = 'Not found') {
    return this.error(message, 404, 'NOT_FOUND')
  }
}

