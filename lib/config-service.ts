import { prisma } from '@/lib/prisma'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

// Cache for config values
let configCache: Map<string, string> = new Map()
let lastCacheUpdate = 0
const CACHE_TTL = 60000 // 1 minute
let configDbBackoffUntil = 0
let configDbFailureCount = 0
const CONFIG_DB_BACKOFF_BASE_MS = 1000
const CONFIG_DB_BACKOFF_MAX_MS = 10000 // Reduced from 30s to 10s
const CONFIG_DB_MAX_RETRIES = 3 // Add retry limit

function isConfigDbBackoffActive() {
  return Date.now() < configDbBackoffUntil
}

function activateConfigDbBackoff(key: string, error: unknown) {
  configDbFailureCount += 1
  
  // If we've exceeded max retries, use longer backoff
  if (configDbFailureCount >= CONFIG_DB_MAX_RETRIES) {
    configDbBackoffUntil = Date.now() + CONFIG_DB_BACKOFF_MAX_MS
  } else {
    // Exponential backoff for retries
    const delay = Math.min(
      CONFIG_DB_BACKOFF_BASE_MS * Math.pow(2, configDbFailureCount - 1),
      CONFIG_DB_BACKOFF_MAX_MS
    )
    configDbBackoffUntil = Date.now() + delay
  }
  
  console.error(`[Config] Error fetching config ${key} (attempt ${configDbFailureCount}/${CONFIG_DB_MAX_RETRIES}):`, error)
}

function clearConfigDbBackoff() {
  configDbFailureCount = 0
  configDbBackoffUntil = 0
}

export class ConfigService {
  // Get config value with caching and retry logic
  static async get(key: string, defaultValue?: string): Promise<string | null> {
    // Check cache first
    if (Date.now() - lastCacheUpdate < CACHE_TTL && configCache.has(key)) {
      return configCache.get(key) || defaultValue || null
    }

    // If in backoff period, return cached or default
    if (isConfigDbBackoffActive()) {
      if (configCache.has(key)) {
        return configCache.get(key) || defaultValue || null
      }
      return defaultValue || null
    }

    // Retry logic with exponential backoff
    let lastError: unknown = null
    for (let attempt = 1; attempt <= CONFIG_DB_MAX_RETRIES; attempt++) {
      try {
        const config = await prisma.systemConfig.findUnique({
          where: { key }
        })

        if (config) {
          const value = decryptConfigValue(key, config.value)
          configCache.set(key, value)
          clearConfigDbBackoff()
          return value
        }

        // Config not found, return default
        clearConfigDbBackoff()
        return defaultValue || null
      } catch (error) {
        lastError = error
        
        // If not the last attempt, wait before retrying
        if (attempt < CONFIG_DB_MAX_RETRIES) {
          const delay = CONFIG_DB_BACKOFF_BASE_MS * Math.pow(2, attempt - 1)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    // All retries failed
    activateConfigDbBackoff(key, lastError)
    return defaultValue || null
  }

  // Get multiple configs at once
  static async getMany(keys: string[]): Promise<Record<string, string>> {
    if (isConfigDbBackoffActive()) {
      return keys.reduce<Record<string, string>>((accumulator, key) => {
        const cachedValue = configCache.get(key)
        if (cachedValue !== undefined) {
          accumulator[key] = cachedValue
        }
        return accumulator
      }, {})
    }

    try {
      const configs = await prisma.systemConfig.findMany({
        where: { key: { in: keys } }
      })

      const result: Record<string, string> = {}
      configs.forEach(config => {
        const value = decryptConfigValue(config.key, config.value)
        result[config.key] = value
        configCache.set(config.key, value)
      })

      lastCacheUpdate = Date.now()
      clearConfigDbBackoff()
      return result
    } catch (error) {
      activateConfigDbBackoff(keys.join(','), error)
      console.error('Error fetching configs:', error)
      return keys.reduce<Record<string, string>>((accumulator, key) => {
        const cachedValue = configCache.get(key)
        if (cachedValue !== undefined) {
          accumulator[key] = cachedValue
        }
        return accumulator
      }, {})
    }
  }

  // Set config value
  static async set(key: string, value: string, description?: string): Promise<void> {
    try {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: encryptConfigValue(key, value), description },
        create: { key, value: encryptConfigValue(key, value), description }
      })

      configCache.set(key, value)
    } catch (error) {
      console.error(`Error setting config ${key}:`, error)
      throw error
    }
  }

  // Clear cache
  static clearCache(): void {
    configCache.clear()
    lastCacheUpdate = 0
  }

  // Get all configs
  static async getAll(): Promise<Record<string, string>> {
    if (isConfigDbBackoffActive()) {
      return Object.fromEntries(configCache.entries())
    }

    try {
      const configs = await prisma.systemConfig.findMany()
      const result: Record<string, string> = {}
      
      configs.forEach(config => {
        const value = decryptConfigValue(config.key, config.value)
        result[config.key] = value
        configCache.set(config.key, value)
      })

      lastCacheUpdate = Date.now()
      clearConfigDbBackoff()
      return result
    } catch (error) {
      activateConfigDbBackoff('ALL_CONFIGS', error)
      console.error('Error fetching all configs:', error)
      return Object.fromEntries(configCache.entries())
    }
  }

  // Check if feature is enabled
  static async isFeatureEnabled(feature: string): Promise<boolean> {
    const value = await this.get(feature)
    return value === 'true'
  }

  // Get SMTP config
  static async getSmtpConfig() {
    const keys = ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_password', 'smtp_from_email', 'smtp_from_name', 'email_enabled']
    const config = await this.getMany(keys)
    
    return {
      host: config.smtp_host,
      port: parseInt(config.smtp_port || '587'),
      user: config.smtp_user,
      password: config.smtp_password,
      fromEmail: config.smtp_from_email,
      fromName: config.smtp_from_name,
      enabled: config.email_enabled === 'true'
    }
  }

  // Get SMS config
  static async getSmsConfig() {
    const keys = ['sms_provider', 'sms_api_key', 'sms_api_secret', 'sms_sender_number', 'sms_enabled']
    const config = await this.getMany(keys)
    
    return {
      provider: config.sms_provider,
      apiKey: config.sms_api_key,
      apiSecret: config.sms_api_secret,
      senderNumber: config.sms_sender_number,
      enabled: config.sms_enabled === 'true'
    }
  }

  // Get OTP config
  static async getOtpConfig() {
    const keys = ['otp_length', 'otp_expiry_minutes', 'otp_max_attempts', 'otp_method', 'otp_enabled']
    const config = await this.getMany(keys)
    
    return {
      length: parseInt(config.otp_length || '6'),
      expiryMinutes: parseInt(config.otp_expiry_minutes || '5'),
      maxAttempts: parseInt(config.otp_max_attempts || '3'),
      method: config.otp_method || 'sms',
      enabled: config.otp_enabled === 'true'
    }
  }

  // Get reCAPTCHA config
  static async getRecaptchaConfig() {
    const keys = ['recaptcha_site_key', 'recaptcha_secret_key', 'recaptcha_threshold', 'recaptcha_enabled']
    const config = await this.getMany(keys)
    
    return {
      siteKey: config.recaptcha_site_key,
      secretKey: config.recaptcha_secret_key,
      threshold: parseFloat(config.recaptcha_threshold || '0.5'),
      enabled: config.recaptcha_enabled === 'true'
    }
  }

  // Initialize default configs
  static async initializeDefaults(): Promise<void> {
    const defaults = [
      { key: 'terms_enabled', value: 'true', description: 'فعال‌سازی پذیرش شرایط استفاده در ثبت‌نام' },
      { key: 'terms_current_key', value: 'terms_v1', description: 'کلید نسخه فعلی شرایط استفاده' },
      { key: 'terms_text_fa', value: 'با ثبت‌نام و استفاده از این سامانه، مسئولیت صحت اطلاعات و ریسک‌های عملیاتی حواله/تبادله را می‌پذیرید. قبل از انجام تراکنش، جزئیات را بررسی کنید. این سامانه هیچ تضمینی برای سود/نرخ ارائه نمی‌کند و مسئولیت نهایی با طرفین معامله است.', description: 'متن شرایط استفاده (فارسی)' },
      { key: 'terms_text_en', value: 'By signing up and using this platform, you accept responsibility for the accuracy of information you provide and operational risks of hawala/exchange. Verify all details before transactions. No profit/rate guarantee is provided; final responsibility remains with transaction parties.', description: 'Terms of use text (English)' },
      { key: 'terms_text_ps', value: 'د دې پلاتفورم په کارولو سره تاسې د ورکړل شوو معلوماتو د صحت او د حوالې/تبادلې د عملیاتي خطرونو مسؤلیت منئ. د معاملې مخکې ټول جزئیات وګورئ. د ګټې/نرخ هېڅ تضمین نشته؛ وروستی مسؤلیت د معاملې له اړخونو سره دی.', description: 'د کارولو شرطونه (پښتو)' },
      { key: 'site_title', value: 'سرای شهزاده', description: 'عنوان سایت' },
      { key: 'site_description', value: 'پلتفرم صرافی آنلاین', description: 'توضیحات سایت' },
      { key: 'default_language', value: 'fa', description: 'زبان پیشفرض' },
      { key: 'maintenance_mode', value: 'false', description: 'حالت تعمیر' },
      { key: 'registration_enabled', value: 'true', description: 'ثبت نام فعال' },
      { key: 'forgot_password_enabled', value: 'true', description: 'فراموشی رمز عبور فعال' },
      { key: 'features_master_enabled', value: 'true', description: 'سوییچ اصلی فعال/غیرفعال سازی همه ویژگی‌ها' },
      { key: 'feature_hawala_enabled', value: 'true', description: 'فعال/غیرفعال سازی حواله' },
      { key: 'feature_exchange_enabled', value: 'true', description: 'فعال/غیرفعال سازی تبادله ارز' },
      { key: 'feature_rewards_enabled', value: 'true', description: 'فعال/غیرفعال سازی پاداش‌ها' },
      { key: 'feature_promotions_enabled', value: 'true', description: 'فعال/غیرفعال سازی پروموشن‌ها/تخفیف‌ها' },
      { key: 'feature_ads_enabled', value: 'true', description: 'فعال/غیرفعال سازی تبلیغات' },
      { key: 'feature_chat_enabled', value: 'true', description: 'فعال/غیرفعال سازی چت/پشتیبانی' },
      { key: 'free_access_enabled', value: 'false', description: 'دسترسی رایگان برای صراف‌ها (معافیت از کارمزد سیستم برای حواله و تبادله طبق قوانین فعال)' },
      { key: 'admin_stats_baseline_json', value: '', description: 'Baseline JSON for admin “reset stats to zero” display' },
      { key: 'email_enabled', value: 'false', description: 'ایمیل فعال' },
      { key: 'sms_enabled', value: 'false', description: 'SMS فعال' },
      { key: 'otp_enabled', value: 'false', description: 'OTP فعال' },
      { key: 'otp_length', value: '6', description: 'طول کد OTP' },
      { key: 'otp_expiry_minutes', value: '5', description: 'مدت اعتبار OTP' },
      { key: 'recaptcha_enabled', value: 'false', description: 'reCAPTCHA فعال' },
      { key: 'primary_color', value: '#6366f1', description: 'رنگ اصلی' },
      { key: 'secondary_color', value: '#8b5cf6', description: 'رنگ ثانویه' },
      { key: 'max_transaction_amount', value: '100000', description: 'حداکثر مبلغ تراکنش' },
      { key: 'default_fee_percentage', value: '1', description: 'درصد کارمزد پیشفرض' },
      { key: 'credit_price_usd', value: '1', description: 'قیمت هر کریدیت به دالر آمریکا' },
      { key: 'default_hawala_commission_rate', value: '0.8', description: 'درصد کمیسیون پیشفرض حواله (اگر تنظیمات کمیسیون نباشد)' },
      { key: 'default_exchange_commission_rate', value: '0.5', description: 'درصد کمیسیون پیشفرض صرافی (اگر تنظیمات کمیسیون نباشد)' }
      ,{ key: 'free_trial_includes_exchange', value: 'true', description: 'تبادله ارز در دوره آزمایشی فعال باشد' }
      ,{ key: 'exchange_system_fee_percent', value: '', description: 'درصد کارمزد سیستم برای تبادله ارز (اختیاری - اگر خالی باشد از تنظیمات کمیسیون استفاده می‌شود)' }
      ,{ key: 'exchange_fee_off_for_trial_sarafs', value: 'false', description: 'در دوره آزمایشی کارمزد سیستم تبادله صفر شود' }
      ,{ key: 'exchange_reward_enabled', value: 'true', description: 'فعال‌سازی پاداش کاربر ثبت‌شده بعد از تبادله' }
      ,{ key: 'exchange_reward_discount_rate', value: '0.01', description: 'نرخ پاداش تخفیف پس از تبادله برای کاربر ثبت‌شده (حداکثر 0.05)' }
      ,{ key: 'hawala_reward_enabled', value: 'true', description: 'فعال‌سازی پاداش کاربر ثبت‌شده بعد از حواله (پس از تکمیل)' }
      ,{ key: 'hawala_reward_discount_rate', value: '0.01', description: 'نرخ پاداش تخفیف پس از حواله برای کاربر ثبت‌شده (حداکثر 0.05)' }
      ,{ key: 'hawala_reward_expiry_days', value: '14', description: 'تعداد روزهای انقضاء پاداش حواله' }
      ,{ key: 'admin_bulk_enabled', value: 'false', description: 'فعال‌سازی عملیات bulk خطرناک در پنل مدیریت' }
      ,{ key: 'admin_backups_enabled', value: 'false', description: 'فعال‌سازی ابزار بکاپ در پنل مدیریت' }
      ,{ key: 'admin_broadcast_max_recipients', value: '200', description: 'حداکثر گیرندگان پیام همگانی مدیریت' }
      ,{ key: 'external_api_test_allowed_hosts', value: 'api.coingecko.com,api.currencylayer.com,api.twilio.com,api.sendgrid.com,api.mailgun.net,api.stripe.com,api.openrouter.ai', description: 'لیست دامنه‌های مجاز برای تست External APIs (کاما جدا)' }
    ]

    for (const config of defaults) {
      try {
        await prisma.systemConfig.upsert({
          where: { key: config.key },
          update: {},
          create: config
        })
      } catch (error) {
        console.error(`Error initializing config ${config.key}:`, error)
      }
    }
  }
}
