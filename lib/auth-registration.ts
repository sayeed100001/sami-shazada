import { normalizePhoneToE164 } from '@/lib/phone'
import { sanitizeInput, validateEmail } from '@/lib/security'

export function normalizeRegistrationName(value: string, fieldName = 'name') {
  const normalized = sanitizeInput(value).replace(/\s+/g, ' ').trim()

  if (normalized.length < 2 || normalized.length > 120) {
    throw new Error(`Invalid ${fieldName}`)
  }

  return normalized
}

export function normalizeRegistrationEmail(value: string) {
  const normalized = sanitizeInput(value).toLowerCase().trim()

  if (!validateEmail(normalized)) {
    throw new Error('Invalid email')
  }

  return normalized
}

export function normalizeOptionalRegistrationPhone(value?: string | null) {
  if (!value) {
    return null
  }

  const normalized = sanitizeInput(value).trim()
  if (!normalized) {
    return null
  }

  return normalizePhoneToE164(normalized)
}
