import { ExternalAPIService } from './external-api-service'

interface RecaptchaVerifyResponse {
  success: boolean
  score?: number
  action?: string
  challenge_ts?: string
  hostname?: string
  'error-codes'?: string[]
}

interface RecaptchaCheckResult {
  enabled: boolean
  success: boolean
  score?: number
  reason?: string
}

interface RecaptchaPublicConfig {
  enabled: boolean
  siteKey: string
  threshold: number
  scriptUrl: string
}

export async function getPublicRecaptchaConfig(): Promise<RecaptchaPublicConfig> {
  const config = await ExternalAPIService.getRecaptchaConfig()
  const scriptUrl = ExternalAPIService.buildUrl(config.baseUrl, config.scriptPath)

  return {
    enabled: Boolean(config.enabled && config.siteKey && config.secretKey),
    siteKey: config.siteKey,
    threshold: config.minScore,
    scriptUrl,
  }
}

export function getClientIpFromHeaders(headers: Headers): string | undefined {
  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim()
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }

  return undefined
}

export async function verifyRecaptchaToken(params: {
  token: string | null
  action: string
  remoteIp?: string
}): Promise<RecaptchaCheckResult> {
  const config = await ExternalAPIService.getRecaptchaConfig()

  if (!config.enabled || !config.secretKey) {
    return {
      enabled: false,
      success: true,
      reason: 'RECAPTCHA_NOT_CONFIGURED',
    }
  }

  if (!params.token) {
    return {
      enabled: true,
      success: false,
      reason: 'MISSING_TOKEN',
    }
  }

  try {
    const verifyUrl = ExternalAPIService.buildUrl(config.baseUrl, config.verifyPath)
    const formData = new URLSearchParams({
      secret: config.secretKey,
      response: params.token,
    })

    if (params.remoteIp) {
      formData.append('remoteip', params.remoteIp)
    }

    const response = await fetch(verifyUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
      signal: AbortSignal.timeout(5000),
    })

    if (!response.ok) {
      return {
        enabled: true,
        success: false,
        reason: 'RECAPTCHA_API_ERROR',
      }
    }

    const data: RecaptchaVerifyResponse = await response.json()

    if (!data.success) {
      return {
        enabled: true,
        success: false,
        reason: data['error-codes']?.join(',') || 'VERIFICATION_FAILED',
      }
    }

    if (data.score !== undefined && data.score < config.minScore) {
      return {
        enabled: true,
        success: false,
        score: data.score,
        reason: 'LOW_SCORE',
      }
    }

    if (data.action && data.action !== params.action) {
      return {
        enabled: true,
        success: false,
        reason: 'ACTION_MISMATCH',
      }
    }

    return {
      enabled: true,
      success: true,
      score: data.score,
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return {
      enabled: true,
      success: false,
      reason: 'VERIFICATION_ERROR',
    }
  }
}
