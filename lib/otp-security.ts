import crypto from 'crypto'
import { normalizePhoneToE164 } from '@/lib/phone'

const OTP_HASH_PREFIX = 'otp:'
const OTP_SECRET =
  process.env.OTP_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  process.env.AUTH_SECRET ||
  process.env.SYSTEM_CONFIG_ENCRYPTION_KEY ||
  'development-otp-secret'

function timingSafeEqual(a: string, b: string) {
  const aBuffer = Buffer.from(a)
  const bBuffer = Buffer.from(b)

  if (aBuffer.length !== bBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(aBuffer, bBuffer)
}

export function normalizeOtpCode(code: string) {
  return String(code || '').replace(/\D/g, '').slice(0, 10)
}

export function normalizeOtpIdentifier(identifier: string, type?: string) {
  const normalized = String(identifier || '').trim()
  if (!normalized) {
    throw new Error('Missing OTP identifier')
  }

  if (type === 'EMAIL' || normalized.includes('@')) {
    return normalized.toLowerCase()
  }

  return normalizePhoneToE164(normalized)
}

export function hashOtpCode({
  identifier,
  purpose,
  code,
}: {
  identifier: string
  purpose: string
  code: string
}) {
  const normalizedCode = normalizeOtpCode(code)
  const normalizedIdentifier = normalizeOtpIdentifier(identifier)
  const normalizedPurpose = String(purpose || '').trim().toUpperCase()

  const hmac = crypto.createHmac('sha256', OTP_SECRET)
  hmac.update(`${normalizedPurpose}:${normalizedIdentifier}:${normalizedCode}`)

  return `${OTP_HASH_PREFIX}${hmac.digest('hex')}`
}

export function isHashedOtpCode(value: string) {
  return value.startsWith(OTP_HASH_PREFIX)
}

export function verifyOtpCode({
  storedCode,
  identifier,
  purpose,
  code,
}: {
  storedCode: string
  identifier: string
  purpose: string
  code: string
}) {
  const normalizedInput = normalizeOtpCode(code)

  if (isHashedOtpCode(storedCode)) {
    const expectedHash = hashOtpCode({ identifier, purpose, code: normalizedInput })
    return timingSafeEqual(storedCode, expectedHash)
  }

  return timingSafeEqual(storedCode, normalizedInput)
}
