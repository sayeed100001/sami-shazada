export type DefaultPhoneCountry = 'AF'

function isValidE164(phone: string) {
  return /^\+[1-9]\d{7,14}$/.test(phone)
}

/**
 * Normalize phone numbers to E.164.
 *
 * This platform is Afghanistan-first, so it accepts common Afghan mobile formats:
 * - 07XXXXXXXX  -> +93 7XXXXXXXX
 * - 7XXXXXXXX   -> +93 7XXXXXXXX
 * - 93 7XXXXXXXX -> +93 7XXXXXXXX
 * - 0093...     -> +93...
 *
 * It also accepts already-normalized E.164 like +1..., +44..., etc.
 */
export function normalizePhoneToE164(
  input: string,
  options: { defaultCountry?: DefaultPhoneCountry } = { defaultCountry: 'AF' }
): string {
  if (!input || typeof input !== 'string') {
    throw new Error('Invalid phone number format')
  }

  const trimmed = input.trim()
  if (!trimmed) throw new Error('Invalid phone number format')

  // Keep only digits and plus
  let clean = trimmed.replace(/[^\d+]/g, '')

  // Convert 00-prefix to +
  if (clean.startsWith('00')) {
    clean = `+${clean.slice(2)}`
  }

  // If E.164 already
  if (clean.startsWith('+')) {
    if (!isValidE164(clean)) throw new Error('Invalid phone number format')
    return clean
  }

  const digits = clean.replace(/[^\d]/g, '')

  // Afghanistan normalization
  if (options.defaultCountry === 'AF') {
    // 93XXXXXXXXX
    if (digits.startsWith('93')) {
      const candidate = `+${digits}`
      if (!isValidE164(candidate)) throw new Error('Invalid phone number format')
      return candidate
    }

    // 07XXXXXXXX
    if (digits.length === 10 && digits.startsWith('07')) {
      const candidate = `+93${digits.slice(1)}`
      if (!isValidE164(candidate)) throw new Error('Invalid phone number format')
      return candidate
    }

    // 7XXXXXXXX
    if (digits.length === 9 && digits.startsWith('7')) {
      const candidate = `+93${digits}`
      if (!isValidE164(candidate)) throw new Error('Invalid phone number format')
      return candidate
    }
  }

  // Fallback: treat as international digits without + (e.g., 14155552671)
  const candidate = `+${digits}`
  if (!isValidE164(candidate)) throw new Error('Invalid phone number format')
  return candidate
}
