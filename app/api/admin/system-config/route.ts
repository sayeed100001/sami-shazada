import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { deleteManagedImage } from '@/lib/managed-image-storage'
import { assertAllowedManagedOrInternalImageUrl } from '@/lib/image-url-policy'
import { prisma } from '@/lib/prisma'
import { ConfigService } from '@/lib/config-service'
import { ExternalAPIService } from '@/lib/external-api-service'
import {
  decryptConfigValue,
  encryptConfigValue,
  isSensitiveConfigKey,
  maskSensitiveValue,
  normalizeConfigValue,
} from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

const CONFIG_KEY_PATTERN = /^[A-Za-z0-9_.-]{2,100}$/
const SMTP_DEPENDENCY_KEYS = [
  'smtp_host',
  'smtp_port',
  'smtp_user',
  'smtp_password',
  'smtp_from_email',
] as const
const SMS_DEPENDENCY_KEYS = [
  'sms_provider',
  'sms_api_key',
  'sms_api_secret',
  'sms_sender_number',
] as const
const IMAGE_CONFIG_KEYS = new Set(['logo_url', 'favicon_url', 'default_image_url'])

async function validateDependentConfig(key: string, value: string) {
  const emailKeys = new Set<string>(['email_enabled', ...SMTP_DEPENDENCY_KEYS])
  const smsKeys = new Set<string>(['sms_enabled', ...SMS_DEPENDENCY_KEYS])
  const whatsappKeys = new Set<string>(['whatsapp_enabled', 'otp_enabled', 'otp_method'])
  const otpKeys = new Set<string>([
    'email_enabled',
    'sms_enabled',
    'whatsapp_enabled',
    'otp_enabled',
    'otp_method',
    'forgot_password_enabled',
    'email_verification_required',
    'two_factor_enabled',
  ])

  if (key === 'credit_price_usd') {
    const parsed = Number.parseFloat(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new Error('Credit price must be greater than 0')
    }
  }

  if (
    ![
      'email_enabled',
      'sms_enabled',
      'whatsapp_enabled',
      'otp_enabled',
      'otp_method',
      'forgot_password_enabled',
      'email_verification_required',
      'two_factor_enabled',
      'recaptcha_enabled',
      ...SMTP_DEPENDENCY_KEYS,
      ...SMS_DEPENDENCY_KEYS,
      'recaptcha_site_key',
      'recaptcha_secret_key',
    ].includes(key)
  ) {
    return
  }

  const currentConfig = await ConfigService.getMany([
    ...SMTP_DEPENDENCY_KEYS,
    ...SMS_DEPENDENCY_KEYS,
    'email_enabled',
    'sms_enabled',
    'whatsapp_enabled',
    'otp_enabled',
    'otp_method',
    'forgot_password_enabled',
    'email_verification_required',
    'two_factor_enabled',
    'recaptcha_enabled',
    'recaptcha_site_key',
    'recaptcha_secret_key',
  ])

  const effectiveConfig = {
    ...currentConfig,
    [key]: value,
  }

  if (emailKeys.has(key) && effectiveConfig.email_enabled === 'true') {
    const missingKeys = SMTP_DEPENDENCY_KEYS.filter((configKey) => !effectiveConfig[configKey]?.trim())
    if (missingKeys.length > 0) {
      throw new Error(`SMTP configuration incomplete. Missing: ${missingKeys.join(', ')}`)
    }
  }

  if (smsKeys.has(key) && effectiveConfig.sms_enabled === 'true') {
    const provider = effectiveConfig.sms_provider?.trim()
    const missingKeys = ['sms_provider', 'sms_api_key', 'sms_sender_number'].filter(
      (configKey) => !effectiveConfig[configKey]?.trim()
    )

    if (provider && ['twilio', 'nexmo'].includes(provider) && !effectiveConfig.sms_api_secret?.trim()) {
      missingKeys.push('sms_api_secret')
    }

    if (missingKeys.length > 0) {
      throw new Error(`SMS configuration incomplete. Missing: ${Array.from(new Set(missingKeys)).join(', ')}`)
    }
  }

  if (whatsappKeys.has(key) && effectiveConfig.whatsapp_enabled === 'true') {
    const twilioConfig = await ExternalAPIService.getTwilioConfig()
    const missingTwilioFields = [
      !twilioConfig.accountSid?.trim() ? 'twilio account SID' : null,
      !twilioConfig.authToken?.trim() ? 'twilio auth token' : null,
      !twilioConfig.whatsappFrom?.trim() ? 'twilio whatsapp sender' : null,
    ].filter(Boolean)

    if (missingTwilioFields.length > 0) {
      throw new Error(`WhatsApp configuration incomplete. Missing: ${missingTwilioFields.join(', ')}`)
    }
  }

  const otpEnabled = effectiveConfig.otp_enabled === 'true'
  const otpMethod = (effectiveConfig.otp_method || 'sms').trim().toLowerCase()
  const phoneOtpAvailable = effectiveConfig.sms_enabled === 'true' || effectiveConfig.whatsapp_enabled === 'true'
  const emailOtpAvailable = effectiveConfig.email_enabled === 'true'

  if (otpKeys.has(key) && otpEnabled) {
    if (!['sms', 'email', 'both'].includes(otpMethod)) {
      throw new Error('OTP method must be sms, email, or both')
    }

    if (otpMethod === 'email' && !emailOtpAvailable) {
      throw new Error('OTP email delivery requires email to be enabled')
    }

    if (otpMethod === 'sms' && !phoneOtpAvailable) {
      throw new Error('OTP phone delivery requires SMS or WhatsApp to be enabled')
    }

    if (otpMethod === 'both' && (!emailOtpAvailable || !phoneOtpAvailable)) {
      throw new Error('OTP method "both" requires email plus SMS or WhatsApp to be enabled')
    }
  }

  if (otpKeys.has(key) && effectiveConfig.forgot_password_enabled === 'true' && !otpEnabled) {
    throw new Error('Forgot password requires OTP to be enabled')
  }

  if (otpKeys.has(key) && effectiveConfig.email_verification_required === 'true') {
    if (!otpEnabled) {
      throw new Error('Email verification requires OTP to be enabled')
    }

    if (!emailOtpAvailable || (otpMethod !== 'email' && otpMethod !== 'both')) {
      throw new Error('Email verification requires email OTP delivery to be enabled')
    }
  }

  if (key === 'two_factor_enabled' && effectiveConfig.two_factor_enabled === 'true') {
    throw new Error('Two-factor sign-in is not available in this deployment yet. Leave this setting disabled.')
  }

  if (effectiveConfig.recaptcha_enabled === 'true') {
    const missingKeys = ['recaptcha_site_key', 'recaptcha_secret_key'].filter(
      (configKey) => !effectiveConfig[configKey]?.trim()
    )
    if (missingKeys.length > 0) {
      throw new Error(`reCAPTCHA configuration incomplete. Missing: ${missingKeys.join(', ')}`)
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configs = await prisma.systemConfig.findMany({
      orderBy: { key: 'asc' }
    })

    const safeConfigs = configs.map((config) => {
      const isSensitive = isSensitiveConfigKey(config.key)
      const rawValue = decryptConfigValue(config.key, config.value)

      return {
        key: config.key,
        value: isSensitive ? '' : rawValue,
        description: config.description,
        updatedAt: config.updatedAt,
        isSensitive,
        isConfigured: Boolean(rawValue),
        maskedValue: isSensitive ? maskSensitiveValue(rawValue) : null,
      }
    })

    return NextResponse.json(safeConfigs)
  } catch (error) {
    console.error('Error fetching system config:', error)
    return NextResponse.json({ error: 'Failed to fetch config' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { key, value, description } = await request.json()

    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    const normalizedKey = String(key).trim()
    if (!CONFIG_KEY_PATTERN.test(normalizedKey)) {
      return NextResponse.json({ error: 'Invalid config key' }, { status: 400 })
    }

    const normalizedValue = normalizeConfigValue(value)
    const normalizedDescription = description ? normalizeConfigValue(description) : null
    const storedValue = encryptConfigValue(normalizedKey, normalizedValue)
    const redactedValue = isSensitiveConfigKey(normalizedKey) ? '[REDACTED]' : normalizedValue

    if (IMAGE_CONFIG_KEYS.has(normalizedKey)) {
      assertAllowedManagedOrInternalImageUrl(normalizedValue, normalizedKey)
    }

    const existingConfig = await prisma.systemConfig.findUnique({
      where: { key: normalizedKey },
      select: { value: true },
    })
    const previousValue = existingConfig ? decryptConfigValue(normalizedKey, existingConfig.value) : ''

    await validateDependentConfig(normalizedKey, normalizedValue)

    // Upsert config
    const config = await prisma.systemConfig.upsert({
      where: { key: normalizedKey },
      update: { value: storedValue, description: normalizedDescription },
      create: { key: normalizedKey, value: storedValue, description: normalizedDescription }
    })

    // Log the change
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'UPDATE',
        resource: 'SystemConfig',
        resourceId: normalizedKey,
        details: `Updated ${normalizedKey} to ${redactedValue}`,
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    ConfigService.clearCache()

    // Apply config changes immediately
    await applyConfigChanges(normalizedKey, normalizedValue)

    if (IMAGE_CONFIG_KEYS.has(normalizedKey) && previousValue && previousValue !== normalizedValue) {
      await deleteManagedImage(previousValue)
    }

    return NextResponse.json({
      key: config.key,
      value: isSensitiveConfigKey(config.key) ? '' : normalizedValue,
      description: config.description,
      updatedAt: config.updatedAt,
      isSensitive: isSensitiveConfigKey(config.key),
      isConfigured: Boolean(normalizedValue),
      maskedValue: isSensitiveConfigKey(config.key) ? maskSensitiveValue(normalizedValue) : null,
    })
  } catch (error) {
    console.error('Error updating system config:', error)
    if (error instanceof Error) {
      const isValidationError =
        /configuration incomplete/i.test(error.message) ||
        /must be greater than 0/i.test(error.message) ||
        /managed upload storage|internal asset path/i.test(error.message) ||
        /OTP|forgot password|Email verification|Two-factor|WhatsApp/i.test(error.message)
      if (isValidationError) {
        return NextResponse.json({ error: error.message }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Failed to update config' }, { status: 500 })
  }
}

// Apply configuration changes to the system
async function applyConfigChanges(key: string, value: string) {
  void key
  void value
  ConfigService.clearCache()
}
