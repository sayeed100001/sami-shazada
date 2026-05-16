/**
 * COMPREHENSIVE ERROR HANDLER
 * User-friendly error messages and logging
 */

export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true
  ) {
    super(message)
    Object.setPrototypeOf(this, AppError.prototype)
  }
}

// User-friendly error messages in Persian
export const ERROR_MESSAGES = {
  // Authentication
  UNAUTHORIZED: 'لطفا وارد سیستم شوید',
  FORBIDDEN: 'شما دسترسی به این بخش را ندارید',
  INVALID_CREDENTIALS: 'ایمیل یا رمز عبور اشتباه است',
  
  // Database
  DATABASE_ERROR: 'خطا در ارتباط با پایگاه داده',
  NOT_FOUND: 'اطلاعات مورد نظر یافت نشد',
  DUPLICATE_ENTRY: 'این اطلاعات قبلا ثبت شده است',
  
  // Validation
  VALIDATION_ERROR: 'لطفا اطلاعات را به درستی وارد کنید',
  REQUIRED_FIELD: 'این فیلد الزامی است',
  INVALID_EMAIL: 'ایمیل نامعتبر است',
  INVALID_PHONE: 'شماره تلفن نامعتبر است',
  
  // Business Logic
  INSUFFICIENT_BALANCE: 'موجودی کافی نیست',
  TRANSACTION_FAILED: 'تراکنش ناموفق بود',
  RATE_NOT_FOUND: 'نرخ ارز یافت نشد',
  SARAF_NOT_APPROVED: 'صراف هنوز تایید نشده است',
  
  // File Upload
  FILE_TOO_LARGE: 'حجم فایل بیش از حد مجاز است',
  INVALID_FILE_TYPE: 'نوع فایل مجاز نیست',
  UPLOAD_FAILED: 'آپلود فایل ناموفق بود',
  
  // General
  SERVER_ERROR: 'خطای سرور. لطفا دوباره تلاش کنید',
  NETWORK_ERROR: 'خطا در ارتباط با سرور',
  TIMEOUT: 'زمان درخواست به پایان رسید'
}

export function getErrorMessage(error: any): string {
  // Prisma errors
  if (error.code === 'P2002') {
    return ERROR_MESSAGES.DUPLICATE_ENTRY
  }
  if (error.code === 'P2025') {
    return ERROR_MESSAGES.NOT_FOUND
  }
  
  // Custom app errors
  if (error instanceof AppError) {
    return error.message
  }
  
  // Network errors
  if (error.message?.includes('fetch')) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }
  
  // Default
  return ERROR_MESSAGES.SERVER_ERROR
}

export function logError(error: any, context?: string) {
  const timestamp = new Date().toISOString()
  const errorLog = {
    timestamp,
    context,
    message: error.message,
    stack: error.stack,
    code: error.code
  }
  
  console.error('🔴 ERROR:', JSON.stringify(errorLog, null, 2))
  
  // In production, send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // TODO: Send to monitoring service (e.g., Sentry)
  }
}

export function handleApiError(error: any) {
  logError(error, 'API')
  
  const message = getErrorMessage(error)
  const statusCode = error.statusCode || 500
  
  return {
    error: message,
    statusCode,
    timestamp: new Date().toISOString()
  }
}
