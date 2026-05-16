import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | undefined | null, currency: string = 'USD'): string {
  // Handle undefined, null, or invalid amounts
  if (amount === undefined || amount === null || isNaN(amount)) {
    amount = 0
  }

  const currencySymbols: { [key: string]: string } = {
    AFN: '؋',
    USD: '$',
    EUR: '€',
    GBP: '£',
    PKR: '₨',
    IRR: '﷼',
    CAD: 'C$',
    JPY: '¥',
    AUD: 'A$',
    CHF: 'CHF',
    CNY: '¥'
  }

  const symbol = currencySymbols[currency] || currency
  
  try {
    const formattedAmount = amount.toLocaleString('en-US', {
      minimumFractionDigits: currency === 'AFN' || currency === 'IRR' ? 0 : 2,
      maximumFractionDigits: currency === 'AFN' || currency === 'IRR' ? 0 : 4
    })

    return `${symbol}${formattedAmount}`
  } catch (error) {
    console.error('Error formatting currency:', error)
    return `${symbol}${amount || 0}`
  }
}

export function formatPercentage(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) {
    return '0.00%'
  }
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}%`
}

export function generateReferenceCode(): string {
  const prefix = 'SH'
  const timestamp = Date.now().toString(36).toUpperCase()
  const bytes = new Uint8Array(4)

  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Secure random generator is not available')
  }

  globalThis.crypto.getRandomValues(bytes)
  const randomHex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()

  return `${prefix}${timestamp}${randomHex}`
}

export function validateAfghanPhone(phone: string): boolean {
  // Afghan phone number format: +93XXXXXXXXX or 07XXXXXXXX
  const afghanPhoneRegex = /^(\+93|0)?[7-9]\d{8}$/
  return afghanPhoneRegex.test(phone.replace(/\s+/g, ''))
}

export function formatAfghanPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('93')) {
    return `+${cleaned}`
  }
  if (cleaned.startsWith('0')) {
    return `+93${cleaned.substring(1)}`
  }
  return `+93${cleaned}`
}

export function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)
  
  const units = [
    { name: 'سال', seconds: 31536000 },
    { name: 'ماه', seconds: 2592000 },
    { name: 'هفته', seconds: 604800 },
    { name: 'روز', seconds: 86400 },
    { name: 'ساعت', seconds: 3600 },
    { name: 'دقیقه', seconds: 60 },
    { name: 'ثانیه', seconds: 1 }
  ]

  for (const unit of units) {
    const count = Math.floor(diffInSeconds / unit.seconds)
    if (count > 0) {
      return `${count} ${unit.name} پیش`
    }
  }

  return 'همین الان'
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength) + '...'
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function sanitizeInput(input: string): string {
  return input.trim().replace(/[<>]/g, '')
}

export function calculateFee(amount: number, feePercentage: number = 0.01): number {
  return Math.max(amount * feePercentage, 10) // Minimum fee of 10 AFN
}

export function isBusinessHours(): boolean {
  const now = new Date()
  const hour = now.getHours()
  const day = now.getDay()
  
  // Saturday to Thursday, 8 AM to 8 PM (Afghanistan business hours)
  return day !== 5 && hour >= 8 && hour < 20 // Friday is weekend
}
