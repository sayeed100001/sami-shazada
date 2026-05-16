// Comprehensive validation library for the system

// Phone validation (Afghan format)
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+93[0-9]{9}$/
  return phoneRegex.test(phone)
}

// Password strength validation
export function validatePasswordStrength(password: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (password.length > 128) {
    errors.push('Password must be less than 128 characters')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Transaction amount validation
export function validateTransactionAmount(amount: number): { isValid: boolean; error?: string } {
  if (isNaN(amount) || !isFinite(amount)) {
    return { isValid: false, error: 'Invalid amount format' }
  }
  
  if (amount <= 0) {
    return { isValid: false, error: 'Amount must be greater than 0' }
  }
  
  if (amount > 1000000) {
    return { isValid: false, error: 'Amount exceeds maximum limit of 1,000,000 AFN' }
  }
  
  if (amount < 100) {
    return { isValid: false, error: 'Amount below minimum limit of 100 AFN' }
  }
  
  return { isValid: true }
}

// Currency code validation
export function validateCurrencyCode(code: string): boolean {
  const validCurrencies = [
    'AFN', 'USD', 'EUR', 'GBP', 'PKR', 'IRR', 'CAD', 'JPY', 'AUD', 'CHF',
    'CNY', 'SAR', 'AED', 'INR', 'TRY', 'RUB', 'KRW', 'SGD', 'HKD', 'MXN',
    'BRL', 'ZAR', 'THB', 'MYR', 'IDR', 'PHP', 'VND', 'EGP', 'QAR', 'KWD',
    'BHD', 'OMR', 'JOD', 'LBP', 'SYP', 'IQD', 'UZS', 'KZT', 'KGS', 'TJS', 'TMT'
  ]
  return validCurrencies.includes(code.toUpperCase())
}

// Business name validation
export function validateBusinessName(name: string): boolean {
  if (!name || typeof name !== 'string') return false
  return name.length >= 3 && name.length <= 100 && /^[\u0600-\u06FF\s\w.-]+$/.test(name)
}

// Reference code validation
export function validateReferenceCode(code: string): boolean {
  return /^[A-Z0-9]{8,20}$/.test(code)
}

// Address validation
export function validateAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false
  return address.length >= 10 && address.length <= 200
}

// License number validation
export function validateLicenseNumber(license: string): boolean {
  if (!license || typeof license !== 'string') return false
  return /^[A-Z]{3}-\d{3}-\d{4}$/.test(license)
}

// Rate validation
export function validateExchangeRate(rate: number): { isValid: boolean; error?: string } {
  if (isNaN(rate) || !isFinite(rate)) {
    return { isValid: false, error: 'Invalid rate format' }
  }
  
  if (rate <= 0) {
    return { isValid: false, error: 'Rate must be greater than 0' }
  }
  
  if (rate > 1000000) {
    return { isValid: false, error: 'Rate exceeds maximum limit' }
  }
  
  return { isValid: true }
}

// File validation
export function validateFileUpload(file: File): { isValid: boolean; error?: string } {
  const maxSize = 5 * 1024 * 1024 // 5MB
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  
  if (file.size > maxSize) {
    return { isValid: false, error: 'File size exceeds 5MB limit' }
  }
  
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'File type not allowed. Only JPEG, PNG, WebP, and PDF files are accepted' }
  }
  
  return { isValid: true }
}

// Course validation
export function validateCourseData(course: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!course.title || course.title.length < 5) {
    errors.push('Course title must be at least 5 characters long')
  }
  
  if (!course.description || course.description.length < 20) {
    errors.push('Course description must be at least 20 characters long')
  }
  
  if (!['finance', 'crypto', 'trading', 'security'].includes(course.category)) {
    errors.push('Invalid course category')
  }
  
  if (!['beginner', 'intermediate', 'advanced'].includes(course.level)) {
    errors.push('Invalid course level')
  }
  
  if (!course.duration || course.duration < 10) {
    errors.push('Course duration must be at least 10 minutes')
  }
  
  if (course.price && (course.price < 0 || course.price > 1000000)) {
    errors.push('Course price must be between 0 and 1,000,000 AFN')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// User registration validation
export function validateUserRegistration(userData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!userData.name || userData.name.length < 2) {
    errors.push('Name must be at least 2 characters long')
  }
  
  if (!userData.email || !validateEmail(userData.email)) {
    errors.push('Valid email address is required')
  }
  
  if (!userData.password) {
    errors.push('Password is required')
  } else {
    const passwordValidation = validatePasswordStrength(userData.password)
    if (!passwordValidation.isValid) {
      errors.push(...passwordValidation.errors)
    }
  }
  
  if (userData.phone && !validatePhone(userData.phone)) {
    errors.push('Phone number must be in Afghan format (+93XXXXXXXXX)')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Saraf registration validation
export function validateSarafRegistration(sarafData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!sarafData.businessName || !validateBusinessName(sarafData.businessName)) {
    errors.push('Valid business name is required (3-100 characters)')
  }
  
  if (!sarafData.businessAddress || !validateAddress(sarafData.businessAddress)) {
    errors.push('Valid business address is required (10-200 characters)')
  }
  
  if (!sarafData.businessPhone || !validatePhone(sarafData.businessPhone)) {
    errors.push('Valid business phone number is required')
  }
  
  if (sarafData.licenseNumber && !validateLicenseNumber(sarafData.licenseNumber)) {
    errors.push('License number must be in format: ABC-123-2024')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Hawala transaction validation
export function validateHawalaTransaction(transactionData: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!transactionData.senderName || transactionData.senderName.length < 2) {
    errors.push('Sender name is required')
  }
  
  if (!transactionData.senderPhone || !validatePhone(transactionData.senderPhone)) {
    errors.push('Valid sender phone number is required')
  }
  
  if (!transactionData.receiverName || transactionData.receiverName.length < 2) {
    errors.push('Receiver name is required')
  }
  
  if (!transactionData.receiverPhone || !validatePhone(transactionData.receiverPhone)) {
    errors.push('Valid receiver phone number is required')
  }
  
  if (!transactionData.receiverCity || transactionData.receiverCity.length < 2) {
    errors.push('Receiver city is required')
  }
  
  if (!transactionData.fromCurrency || !validateCurrencyCode(transactionData.fromCurrency)) {
    errors.push('Valid source currency is required')
  }
  
  if (!transactionData.toCurrency || !validateCurrencyCode(transactionData.toCurrency)) {
    errors.push('Valid target currency is required')
  }
  
  const amountValidation = validateTransactionAmount(transactionData.fromAmount)
  if (!amountValidation.isValid) {
    errors.push(amountValidation.error || 'Invalid transaction amount')
  }
  
  if (!transactionData.sarafId || typeof transactionData.sarafId !== 'string') {
    errors.push('Valid saraf selection is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

// Helper function for email validation (imported from security.ts)
function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email) && email.length <= 254
}

// Rate limiting validation
export function validateRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const rateLimitKey = `rate_limit_${key}`
  
  // In a real application, this would use Redis or a database
  // For now, using in-memory storage (not suitable for production)
  const globalForRateLimit = globalThis as unknown as {
    __rateLimitStore?: Record<string, { count: number; timestamp: number }>
  }

  const store =
    globalForRateLimit.__rateLimitStore ??
    (globalForRateLimit.__rateLimitStore = {})

  const stored = store[rateLimitKey]
  
  if (!stored || now - stored.timestamp > windowMs) {
    store[rateLimitKey] = { count: 1, timestamp: now }
    return true
  }
  
  if (stored.count >= maxRequests) {
    return false
  }
  
  stored.count++
  return true
}

// API key validation
export function validateAPIKey(key: string): boolean {
  return /^[a-zA-Z0-9]{32,64}$/.test(key)
}

// JSON validation
export function validateJSON(jsonString: string): { isValid: boolean; data?: any; error?: string } {
  try {
    const data = JSON.parse(jsonString)
    return { isValid: true, data }
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON format' 
    }
  }
}
