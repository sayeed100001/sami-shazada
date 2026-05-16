// Enhanced input sanitization utilities
export function sanitizeInput(input: string | null | undefined): string {
  if (!input || typeof input !== 'string') return ''
  
  // Remove dangerous characters and patterns
  return input
    .replace(/[<>\"'&\r\n\t\x00-\x1f\x7f-\x9f]/g, (match) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
        '\r': '',
        '\n': '',
        '\t': ''
      }
      return entities[match] || ''
    })
    .replace(/javascript:/gi, '')
    .replace(/data:/gi, '')
    .replace(/vbscript:/gi, '')
    .replace(/on\w+=/gi, '') // Remove event handlers
    .replace(/\\x[0-9a-f]{2}/gi, '') // Remove hex escapes
    .trim()
    .slice(0, 1000) // Limit length
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email) && email.length <= 254
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  return {
    valid: errors.length === 0,
    errors
  }
}

export function sanitizeHTML(html: string): string {
  if (!html || typeof html !== 'string') return ''
  // Basic HTML sanitization without external dependency
  return html
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
    .replace(/on\w+="[^"]*"/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/<[^>]*>/g, '')
}

export function sanitizeURL(url: string): string {
  if (!url || typeof url !== 'string') {
    throw new Error('Invalid URL')
  }
  
  try {
    const parsed = new URL(url)
    const allowedProtocols = ['http:', 'https:']
    const allowedDomains = [
      'api.coingecko.com',
      'api.exchangerate-api.com',
      'apilayer.net',
      'pro-api.coinmarketcap.com'
    ]
    
    if (!allowedProtocols.includes(parsed.protocol)) {
      throw new Error('Invalid protocol')
    }
    
    if (!allowedDomains.includes(parsed.hostname)) {
      throw new Error('Domain not allowed')
    }
    
    return parsed.toString()
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Invalid URL')
  }
}

export function validateNumericInput(input: any): number {
  const num = parseFloat(input)
  if (isNaN(num) || !isFinite(num)) return 0
  return Math.max(-1000000000, Math.min(1000000000, num)) // Support up to 1 billion in either direction
}

export function sanitizeLogData(data: any): string {
  if (typeof data === 'string') {
    return data.replace(/[\r\n\t]/g, ' ').slice(0, 500)
  }
  try {
    return JSON.stringify(data).replace(/[\r\n\t]/g, ' ').slice(0, 500)
  } catch {
    return '[Object]'
  }
}

export function maskPhoneForLog(phone: string | null | undefined): string | null {
  if (!phone) return null

  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) {
    return '*'.repeat(Math.max(digits.length, 1))
  }

  return `${digits.slice(0, 2)}${'*'.repeat(Math.max(digits.length - 4, 1))}${digits.slice(-2)}`
}

export function maskEmailForLog(email: string | null | undefined): string | null {
  if (!email) return null

  const trimmed = email.trim().toLowerCase()
  const [localPart, domain] = trimmed.split('@')

  if (!localPart || !domain) {
    return '[redacted-email]'
  }

  const safeLocal =
    localPart.length <= 2
      ? `${localPart.charAt(0)}*`
      : `${localPart.slice(0, 2)}${'*'.repeat(Math.max(localPart.length - 2, 1))}`

  return `${safeLocal}@${domain}`
}
