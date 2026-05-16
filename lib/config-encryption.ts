import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const SALT_LENGTH = 64
const TAG_LENGTH = 16
const KEY_LENGTH = 32

function getEncryptionKey(): string {
  const key = process.env.SYSTEM_CONFIG_ENCRYPTION_KEY || 
               process.env.NEXTAUTH_SECRET ||
               process.env.AUTH_SECRET

  if (!key) {
    if (process.env.NODE_ENV === 'test') {
      return 'test-system-config-encryption-key-32'
    }
    throw new Error('Encryption key not configured')
  }

  return key
}

function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, 100000, KEY_LENGTH, 'sha256')
}

export function encryptConfig(value: string): string {
  try {
    const password = getEncryptionKey()
    const salt = crypto.randomBytes(SALT_LENGTH)
    const key = deriveKey(password, salt)
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(value, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const tag = cipher.getAuthTag()
    
    const result = Buffer.concat([
      salt,
      iv,
      tag,
      Buffer.from(encrypted, 'hex')
    ])
    
    return result.toString('base64')
  } catch (error) {
    console.error('Encryption error:', error)
    throw new Error('Failed to encrypt config value')
  }
}

export function decryptConfig(encryptedValue: string): string {
  try {
    const password = getEncryptionKey()
    const buffer = Buffer.from(encryptedValue, 'base64')
    
    const salt = buffer.subarray(0, SALT_LENGTH)
    const iv = buffer.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const tag = buffer.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    const encrypted = buffer.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH)
    
    const key = deriveKey(password, salt)
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('Decryption error:', error)
    throw new Error('Failed to decrypt config value')
  }
}

export function isEncrypted(value: string): boolean {
  try {
    const buffer = Buffer.from(value, 'base64')
    return buffer.length > SALT_LENGTH + IV_LENGTH + TAG_LENGTH
  } catch {
    return false
  }
}

const SENSITIVE_KEYS = [
  'smtp_password',
  'smtp_pass',
  'twilio_auth_token',
  'api_key',
  'secret_key',
  'webhook_secret',
  'database_password',
  'redis_password'
]

export function shouldEncrypt(key: string): boolean {
  const lowerKey = key.toLowerCase()
  return SENSITIVE_KEYS.some(sensitive => lowerKey.includes(sensitive))
}

export function encryptIfNeeded(key: string, value: string): string {
  if (shouldEncrypt(key) && !isEncrypted(value)) {
    return encryptConfig(value)
  }
  return value
}

export function decryptIfNeeded(key: string, value: string): string {
  if (shouldEncrypt(key) && isEncrypted(value)) {
    return decryptConfig(value)
  }
  return value
}
