import { ConfigService } from './config-service'

function parseBoolean(value: string | null, fallback: boolean) {
  if (value === null) return fallback
  return value === 'true'
}

function parseFloatConfig(value: string | null, fallback: number) {
  const parsed = Number.parseFloat(value ?? '')
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseIntConfig(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

function orEmpty(value: string | null) {
  return value || ''
}

function parseCsvList(value: string | null): string[] {
  if (!value) return []
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export class ConfigEnforcer {
  static async isMasterFeaturesEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('features_master_enabled', 'true'), true)
  }

  static async isFeatureEnabled(featureKey: string): Promise<boolean> {
    const masterEnabled = await this.isMasterFeaturesEnabled()
    if (!masterEnabled) return false
    return parseBoolean(await ConfigService.get(featureKey, 'true'), true)
  }

  static async isFreeAccessEnabledForSarafs(): Promise<boolean> {
    const masterEnabled = await this.isMasterFeaturesEnabled()
    if (!masterEnabled) return false
    return parseBoolean(await ConfigService.get('free_access_enabled', 'false'), false)
  }

  static async shouldExcludeAdsInFreeAccess(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('free_access_excludes_ads', 'true'), true)
  }

  static async isRegistrationEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('registration_enabled', 'true'), true)
  }

  static async isMaintenanceMode(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('maintenance_mode', 'false'), false)
  }

  static async isEmailVerificationRequired(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('email_verification_required', 'false'), false)
  }

  static async isSarafApprovalRequired(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('saraf_approval_required', 'true'), true)
  }

  static async isTwoFactorEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('two_factor_enabled', 'false'), false)
  }

  static async areNotificationsEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('notifications_enabled', 'true'), true)
  }

  static async getTransactionLimits() {
    const maxAmount = await ConfigService.get('max_transaction_amount', '100000')
    const minAmount = await ConfigService.get('min_transaction_amount', '10')
    const maxDaily = await ConfigService.get('max_daily_transactions', '10')
    const maxMonthly = await ConfigService.get('max_monthly_volume', '1000000')
    const verificationRequired = await ConfigService.get('verification_required_amount', '10000')

    return {
      maxAmount: parseFloatConfig(maxAmount, 100000),
      minAmount: parseFloatConfig(minAmount, 10),
      maxDaily: parseIntConfig(maxDaily, 10),
      maxMonthly: parseFloatConfig(maxMonthly, 1000000),
      verificationRequired: parseFloatConfig(verificationRequired, 10000),
    }
  }

  static async getDefaultFeePercentage(): Promise<number> {
    return parseFloatConfig(await ConfigService.get('default_fee_percentage', '1'), 1)
  }

  static async getCreditPriceUsd(): Promise<number> {
    const price = parseFloatConfig(await ConfigService.get('credit_price_usd', '1'), 1)
    return Math.max(price, 0.01)
  }

  static async getPasswordRequirements() {
    const minLength = await ConfigService.get('password_min_length', '8')
    const requireUppercase = await ConfigService.get('password_require_uppercase', 'true')
    const requireNumbers = await ConfigService.get('password_require_numbers', 'true')
    const requireSpecial = await ConfigService.get('password_require_special', 'true')

    return {
      minLength: parseIntConfig(minLength, 8),
      requireUppercase: parseBoolean(requireUppercase, true),
      requireNumbers: parseBoolean(requireNumbers, true),
      requireSpecial: parseBoolean(requireSpecial, true),
    }
  }

  static async getLoginSecuritySettings() {
    const maxAttempts = await ConfigService.get('max_login_attempts', '5')
    const lockoutMinutes = await ConfigService.get('login_lockout_minutes', '15')

    return {
      maxAttempts: parseIntConfig(maxAttempts, 5),
      lockoutMinutes: parseIntConfig(lockoutMinutes, 15),
    }
  }

  static async validatePassword(password: string): Promise<{ valid: boolean; errors: string[] }> {
    const requirements = await this.getPasswordRequirements()
    const errors: string[] = []

    if (password.length < requirements.minLength) {
      errors.push(`رمز عبور باید حداقل ${requirements.minLength} کاراکتر باشد`)
    }

    if (requirements.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('رمز عبور باید شامل حروف بزرگ باشد')
    }

    if (requirements.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('رمز عبور باید شامل عدد باشد')
    }

    if (requirements.requireSpecial && !/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      errors.push('رمز عبور باید شامل کاراکتر ویژه باشد')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  static async validateTransactionAmount(amount: number): Promise<{ valid: boolean; error?: string }> {
    const limits = await this.getTransactionLimits()

    if (amount < limits.minAmount) {
      return {
        valid: false,
        error: `حداقل مبلغ تراکنش ${limits.minAmount} است`,
      }
    }

    if (amount > limits.maxAmount) {
      return {
        valid: false,
        error: `حداکثر مبلغ تراکنش ${limits.maxAmount} است`,
      }
    }

    return { valid: true }
  }

  static async getRateLimitSettings() {
    return {
      requestsPerMinute: parseIntConfig(await ConfigService.get('rate_limit_requests', '100'), 100),
    }
  }

  static async getCurrencyUpdateInterval(): Promise<number> {
    return parseIntConfig(await ConfigService.get('currency_update_interval', '300'), 300)
  }

  static async isEmailEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('email_enabled', 'false'), false)
  }

  static async isSmsEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('sms_enabled', 'false'), false)
  }

  static async isWhatsAppEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('whatsapp_enabled', 'false'), false)
  }

  static async isOtpEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('otp_enabled', 'false'), false)
  }

  static async getOtpMethod(): Promise<'sms' | 'email' | 'both'> {
    const value = (await ConfigService.get('otp_method', 'sms')) || 'sms'
    const normalized = value.trim().toLowerCase()
    if (normalized === 'email' || normalized === 'both') {
      return normalized
    }
    return 'sms'
  }

  static async getOtpChannelAvailability(): Promise<{
    otpEnabled: boolean
    method: 'sms' | 'email' | 'both'
    emailEnabled: boolean
    smsEnabled: boolean
    whatsappEnabled: boolean
    availableChannels: Array<'EMAIL' | 'SMS' | 'WHATSAPP'>
    availablePhoneChannels: Array<'SMS' | 'WHATSAPP'>
  }> {
    const [otpEnabled, method, emailEnabled, smsEnabled, whatsappEnabled] = await Promise.all([
      this.isOtpEnabled(),
      this.getOtpMethod(),
      this.isEmailEnabled(),
      this.isSmsEnabled(),
      this.isWhatsAppEnabled(),
    ])

    const availableChannels: Array<'EMAIL' | 'SMS' | 'WHATSAPP'> = []
    const availablePhoneChannels: Array<'SMS' | 'WHATSAPP'> = []

    if (otpEnabled && (method === 'email' || method === 'both') && emailEnabled) {
      availableChannels.push('EMAIL')
    }

    if (otpEnabled && (method === 'sms' || method === 'both')) {
      if (smsEnabled) {
        availableChannels.push('SMS')
        availablePhoneChannels.push('SMS')
      }

      if (whatsappEnabled) {
        availableChannels.push('WHATSAPP')
        availablePhoneChannels.push('WHATSAPP')
      }
    }

    return {
      otpEnabled,
      method,
      emailEnabled,
      smsEnabled,
      whatsappEnabled,
      availableChannels,
      availablePhoneChannels,
    }
  }

  static async getPreferredPhoneOtpChannel(): Promise<'SMS' | 'WHATSAPP' | null> {
    const availability = await this.getOtpChannelAvailability()
    if (availability.availablePhoneChannels.includes('SMS')) return 'SMS'
    if (availability.availablePhoneChannels.includes('WHATSAPP')) return 'WHATSAPP'
    return null
  }

  static async isExchangeEnabledForUser(userId?: string | null): Promise<boolean> {
    const globalEnabled = parseBoolean(await ConfigService.get('exchange_enabled', 'true'), true)
    if (!userId) return globalEnabled

    const [enabledUsersRaw, disabledUsersRaw] = await Promise.all([
      ConfigService.get('exchange_enabled_user_ids', ''),
      ConfigService.get('exchange_disabled_user_ids', ''),
    ])

    const enabledUsers = new Set(parseCsvList(enabledUsersRaw))
    const disabledUsers = new Set(parseCsvList(disabledUsersRaw))

    if (enabledUsers.has(userId)) return true
    if (disabledUsers.has(userId)) return false
    return globalEnabled
  }

  static async isExchangeIncludedInFreeTrial(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('free_trial_includes_exchange', 'true'), true)
  }

  static async getExchangeSystemFeePercent(): Promise<number | null> {
    const raw = await ConfigService.get('exchange_system_fee_percent', '')
    if (!raw) return null
    const parsed = Number.parseFloat(raw)
    if (!Number.isFinite(parsed) || parsed < 0) return null
    return parsed
  }

  static async isExchangeFeeOffForTrialSarafs(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('exchange_fee_off_for_trial_sarafs', 'false'), false)
  }

  static async getExchangeRewardDiscountRate(): Promise<number> {
    const raw = await ConfigService.get('exchange_reward_discount_rate', '0.01')
    const parsed = Number.parseFloat(raw ?? '0.01')
    if (!Number.isFinite(parsed)) return 0.01
    return Math.min(Math.max(parsed, 0), 0.05)
  }

  static async getHawalaRewardConfig(): Promise<{ enabled: boolean; discountRate: number; expiryDays: number }> {
    const [enabledValue, rateValue, expiryDaysValue] = await Promise.all([
      ConfigService.get('hawala_reward_enabled', 'true'),
      ConfigService.get('hawala_reward_discount_rate', '0.01'),
      ConfigService.get('hawala_reward_expiry_days', '14'),
    ])

    const parsedRate = Number.parseFloat(rateValue || '0.01')
    const parsedExpiry = Number.parseInt(expiryDaysValue || '14', 10)

    return {
      enabled: enabledValue !== 'false',
      discountRate: Number.isFinite(parsedRate) ? Math.min(Math.max(parsedRate, 0), 0.05) : 0.01,
      expiryDays: Number.isFinite(parsedExpiry) && parsedExpiry > 0 ? parsedExpiry : 14,
    }
  }

  static async isTelegramEnabled(): Promise<boolean> {
    return parseBoolean(await ConfigService.get('telegram_enabled', 'false'), false)
  }

  static async getContactInfo() {
    const email = await ConfigService.get('contact_email', '')
    const phone = await ConfigService.get('contact_phone', '')
    const supportEmail = await ConfigService.get('support_email', '')
    const address = await ConfigService.get('address', '')

    return {
      email: orEmpty(email),
      phone: orEmpty(phone),
      supportEmail: orEmpty(supportEmail),
      address: orEmpty(address),
    }
  }

  static async getAppearanceSettings() {
    const logoUrl = await ConfigService.get('logo_url', '')
    const faviconUrl = await ConfigService.get('favicon_url', '')
    const primaryColor = await ConfigService.get('primary_color', '#6366f1')
    const secondaryColor = await ConfigService.get('secondary_color', '#8b5cf6')
    const successColor = await ConfigService.get('success_color', '#10b981')
    const themeMode = await ConfigService.get('theme_mode', 'auto')

    return {
      logoUrl: orEmpty(logoUrl),
      faviconUrl: orEmpty(faviconUrl),
      primaryColor: orEmpty(primaryColor) || '#6366f1',
      secondaryColor: orEmpty(secondaryColor) || '#8b5cf6',
      successColor: orEmpty(successColor) || '#10b981',
      themeMode: orEmpty(themeMode) || 'auto',
    }
  }
}
