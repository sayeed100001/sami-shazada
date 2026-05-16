import crypto from 'crypto'

const ENCRYPTION_PREFIX = 'enc:v1'

const EXACT_SENSITIVE_KEYS = new Set([
  'smtp_password',
  'sms_api_secret',
  'telegram_bot_token',
  'recaptcha_secret_key',
  'twilio_auth_token',
  'twilio_account_sid',
  'openrouter_api_key',
  'external_api_registry',
  'whatsapp_api_key',
  'backup_database_url',
])

function deriveEncryptionKey() {
  const secret =
    process.env.SYSTEM_CONFIG_ENCRYPTION_KEY ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    ''

  if (!secret) {
    return null
  }

  return crypto.createHash('sha256').update(secret).digest()
}

export function isSensitiveConfigKey(key: string) {
  const normalizedKey = key.trim().toLowerCase()

  if (!normalizedKey) {
    return false
  }

  if (normalizedKey.startsWith('session_registry_')) {
    return true
  }

  if (normalizedKey.startsWith('api_key_') || normalizedKey.startsWith('webhook_')) {
    return true
  }

  if (EXACT_SENSITIVE_KEYS.has(normalizedKey)) {
    return true
  }

  return (
    normalizedKey.endsWith('_password') ||
    normalizedKey.endsWith('_secret') ||
    normalizedKey.endsWith('_token') ||
    normalizedKey.endsWith('_api_key') ||
    normalizedKey.includes('private_key')
  )
}

export function isEncryptedConfigValue(value: string) {
  return value.startsWith(`${ENCRYPTION_PREFIX}:`)
}

export function encryptConfigValue(key: string, value: string) {
  if (!isSensitiveConfigKey(key) || !value) {
    return value
  }

  if (isEncryptedConfigValue(value)) {
    return value
  }

  const encryptionKey = deriveEncryptionKey()
  if (!encryptionKey) {
    return value
  }

  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey, iv)
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return `${ENCRYPTION_PREFIX}:${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`
}

export function decryptConfigValue(key: string, value: string) {
  if (!isSensitiveConfigKey(key) || !value || !isEncryptedConfigValue(value)) {
    return value
  }

  const encryptionKey = deriveEncryptionKey()
  if (!encryptionKey) {
    return value
  }

  const parts = value.split(':')
  if (parts.length !== 5) {
    return value
  }

  try {
    const iv = Buffer.from(parts[2], 'base64')
    const authTag = Buffer.from(parts[3], 'base64')
    const encrypted = Buffer.from(parts[4], 'base64')

    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey, iv)
    decipher.setAuthTag(authTag)

    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8')
  } catch {
    return value
  }
}

export function maskSensitiveValue(value: string | null | undefined) {
  if (!value) {
    return null
  }

  if (value.length <= 8) {
    // ASCII-only to avoid mojibake in some environments.
    return '********'
  }

  return `${value.slice(0, 2)}******${value.slice(-2)}`
}

export function normalizeConfigValue(value: unknown) {
  if (value === null || value === undefined) {
    return ''
  }

  return String(value).replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 4000)
}
