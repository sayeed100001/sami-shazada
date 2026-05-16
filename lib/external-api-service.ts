import { ConfigService } from './config-service'
import { normalizeConfigValue } from './system-config-security'

const REGISTRY_CONFIG_KEY = 'external_api_registry'

export type ExternalApiCategory =
  | 'exchange'
  | 'crypto'
  | 'commodity'
  | 'sms'
  | 'email'
  | 'payment'
  | 'ai'
  | 'content'
  | 'security'
  | 'other'

export type ExternalApiStatus = 'active' | 'error' | 'unconfigured' | 'disabled'
export type ExternalApiAuthType = 'none' | 'x-api-key' | 'bearer' | 'basic' | 'query' | 'path'
export type ExternalApiFieldType = 'text' | 'password' | 'url' | 'textarea'

export interface ExternalApiFieldSchema {
  key: string
  label: string
  type: ExternalApiFieldType
  placeholder?: string
  helperText?: string
  secret?: boolean
  required?: boolean
}

export interface ExternalApiRecord {
  key: string
  name: string
  description: string
  category: ExternalApiCategory
  baseUrl: string
  enabled: boolean
  authType: ExternalApiAuthType
  supportsApiKeys: boolean
  requiresCredentials: boolean
  testEndpoint?: string
  usage: string[]
  source: 'system' | 'custom'
  apiKeys: string[]
  fieldSchema: ExternalApiFieldSchema[]
  fields: Record<string, string>
  status: ExternalApiStatus
  lastChecked: string | null
}

interface ExternalApiRegistryPayload {
  version: 3
  apis: ExternalApiRecord[]
  deletedDefaultKeys: string[]
}

type LegacyConfigImport = {
  baseUrlKey?: string
  enabledKey?: string
  apiKeyKey?: string
  fieldKeys?: Record<string, string[]>
}

type DefaultApiInput = Omit<ExternalApiRecord, 'source' | 'status' | 'lastChecked'>

type DefaultRssSource = {
  key: string
  name: string
  description: string
  baseUrl: string
  enabled: boolean
  newsCategory: string
}

function createDefaultApi(input: DefaultApiInput, status?: ExternalApiStatus): ExternalApiRecord {
  return {
    ...input,
    source: 'system',
    status: status ?? (input.enabled ? 'unconfigured' : 'disabled'),
    lastChecked: null,
  }
}

const RSS_FIELD_SCHEMA: ExternalApiFieldSchema[] = [
  {
    key: 'newsCategory',
    label: 'News Category',
    type: 'text',
    placeholder: 'technology',
    helperText: 'Stored category for imported articles from this source.',
  },
  {
    key: 'language',
    label: 'Language',
    type: 'text',
    placeholder: 'fa',
    helperText: 'Language metadata attached to imported articles.',
  },
]

const RSS_FEED_SOURCES: DefaultRssSource[] = [
  {
    key: 'rss_zoomit',
    name: 'Zoomit RSS',
    description: 'Primary Persian tech feed from Zoomit.',
    baseUrl: 'https://www.zoomit.ir/feed/',
    enabled: true,
    newsCategory: 'technology',
  },
  {
    key: 'rss_digikala_mag',
    name: 'Digikala Mag RSS',
    description: 'Persian tech feed from Digikala Mag.',
    baseUrl: 'https://www.digikala.com/mag/feed/',
    enabled: true,
    newsCategory: 'technology',
  },
  {
    key: 'rss_tekrato',
    name: 'Tekrato RSS',
    description: 'Persian technology news feed from Tekrato.',
    baseUrl: 'https://www.tekrato.com/feed/',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_gadgetnews',
    name: 'Gadget News RSS',
    description: 'Persian technology news feed from Gadget News.',
    baseUrl: 'https://www.gadgetnews.ir/feed/',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_arzdigital',
    name: 'ArzDigital RSS',
    description: 'Primary Persian crypto news feed from ArzDigital.',
    baseUrl: 'https://www.arzdigital.com/feed/',
    enabled: true,
    newsCategory: 'crypto',
  },
  {
    key: 'rss_coiniran',
    name: 'CoinIran RSS',
    description: 'Persian crypto analysis and news feed from CoinIran.',
    baseUrl: 'https://coiniran.com/feed/',
    enabled: false,
    newsCategory: 'crypto',
  },
  {
    key: 'rss_bbc_persian',
    name: 'BBC Persian RSS',
    description: 'International Persian-language news feed from BBC.',
    baseUrl: 'https://feeds.bbci.co.uk/persian/rss.xml',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_dw_persian',
    name: 'Deutsche Welle Persian RSS',
    description: 'Persian-language feed from Deutsche Welle.',
    baseUrl: 'https://www.dw.com/fa-ir/rss',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_radiofarda',
    name: 'Radio Farda RSS',
    description: 'Persian-language news feed from Radio Farda.',
    baseUrl: 'https://www.radiofarda.com/feed',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_itna',
    name: 'ITNA RSS',
    description: 'ITNA technology feed.',
    baseUrl: 'https://www.itna.ir/rss',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_mehrnews',
    name: 'Mehr News RSS',
    description: 'Mehr News feed used as backup content source.',
    baseUrl: 'https://www.mehrnews.com/rss',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_iranintl',
    name: 'Iran International RSS',
    description: 'Persian-language feed from Iran International.',
    baseUrl: 'https://www.iranintl.com/fa/rss.xml',
    enabled: false,
    newsCategory: 'technology',
  },
  {
    key: 'rss_voa_persian',
    name: 'VOA Persian RSS',
    description: 'VOA Persian feed used in fallback content flows.',
    baseUrl: 'https://www.voapersian.com/api/zrqvteqvtq',
    enabled: false,
    newsCategory: 'technology',
  },
]

function createRssFeedApi(source: DefaultRssSource): ExternalApiRecord {
  return createDefaultApi(
    {
      key: source.key,
      name: source.name,
      description: source.description,
      category: 'content',
      baseUrl: source.baseUrl,
      enabled: source.enabled,
      authType: 'none',
      supportsApiKeys: false,
      requiresCredentials: false,
      testEndpoint: '',
      usage: ['/api/education/tech-news', '/api/admin/education/tech-news/refresh'],
      apiKeys: [],
      fieldSchema: RSS_FIELD_SCHEMA,
      fields: {
        newsCategory: source.newsCategory,
        language: 'fa',
      },
    },
    source.enabled ? 'active' : 'disabled'
  )
}

const DEFAULT_EXTERNAL_APIS: ExternalApiRecord[] = [
  createDefaultApi({
    key: 'exchangerate_api',
    name: 'ExchangeRate-API',
    description: 'Primary FX source for USD, EUR, AFN and general conversions.',
    category: 'exchange',
    baseUrl: 'https://api.exchangerate-api.com/v4',
    enabled: true,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: false,
    testEndpoint: '/latest/USD',
    usage: ['/api/rates', '/api/rates/convert', '/api/rates/history', '/api/assets', '/api/market/overview', '/api/crypto'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'exchangerate_host',
    name: 'ExchangeRate.host',
    description: 'Secondary FX provider used for history and fallback flows.',
    category: 'exchange',
    baseUrl: 'https://api.exchangerate.host',
    enabled: false,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: false,
    testEndpoint: '/latest?base=USD&symbols=AFN',
    usage: ['/api/rates/history'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'fixer',
    name: 'Fixer.io',
    description: 'Fallback FX provider reserved for future failover.',
    category: 'exchange',
    baseUrl: 'https://data.fixer.io/api',
    enabled: false,
    authType: 'query',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/latest',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'currencylayer',
    name: 'CurrencyLayer',
    description: 'Backup FX provider for resilient exchange-rate loading.',
    category: 'exchange',
    baseUrl: 'https://api.currencylayer.com/live',
    enabled: false,
    authType: 'query',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '',
    usage: ['/api/rates'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'coingecko',
    name: 'CoinGecko',
    description: 'Primary crypto market data source.',
    category: 'crypto',
    baseUrl: 'https://api.coingecko.com/api/v3',
    enabled: true,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: false,
    testEndpoint: '/ping',
    usage: ['/api/crypto', '/api/assets', '/api/market/overview'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'coinmarketcap',
    name: 'CoinMarketCap',
    description: 'Backup crypto market data provider.',
    category: 'crypto',
    baseUrl: 'https://pro-api.coinmarketcap.com/v1',
    enabled: false,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/cryptocurrency/listings/latest?start=1&limit=1&convert=USD',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'binance',
    name: 'Binance API',
    description: 'Primary realtime chart and crypto history endpoint.',
    category: 'crypto',
    baseUrl: 'https://api.binance.com/api/v3',
    enabled: true,
    authType: 'none',
    supportsApiKeys: false,
    requiresCredentials: false,
    testEndpoint: '/ticker/24hr?symbol=BTCUSDT',
    usage: ['/api/charts/real-data', '/api/charts/data', '/api/market/commodities POST history'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'yahoo_finance',
    name: 'Yahoo Finance',
    description: 'Primary commodity and historical market data source.',
    category: 'commodity',
    baseUrl: 'https://query1.finance.yahoo.com/v8/finance/chart',
    enabled: true,
    authType: 'none',
    supportsApiKeys: false,
    requiresCredentials: false,
    testEndpoint: '/GC=F',
    usage: ['/api/market/commodities', '/api/charts/data', '/api/rates/history'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'metals_api',
    name: 'Metals-API',
    description: 'Precious-metals price provider.',
    category: 'commodity',
    baseUrl: 'https://metals-api.com/api',
    enabled: false,
    authType: 'query',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/latest?base=USD&symbols=XAU',
    usage: ['/api/market/commodities'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'commodities_api',
    name: 'Commodities-API',
    description: 'Backup commodity pricing provider.',
    category: 'commodity',
    baseUrl: 'https://www.commodities-api.com/api',
    enabled: false,
    authType: 'query',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/latest?base=USD&symbols=WTIOIL',
    usage: ['/api/market/commodities'],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'kavenegar',
    name: 'Kavenegar',
    description: 'SMS provider for OTP and notifications.',
    category: 'sms',
    baseUrl: 'https://api.kavenegar.com/v1',
    enabled: false,
    authType: 'path',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/account/info.json',
    usage: ['lib/sms-service.ts'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'senderNumber',
        label: 'Sender Number',
        type: 'text',
        placeholder: '1000xxxx',
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'ghasedak',
    name: 'Ghasedak',
    description: 'Backup SMS provider.',
    category: 'sms',
    baseUrl: 'https://api.ghasedak.me/v2',
    enabled: false,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/account/info',
    usage: ['lib/sms-service.ts'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'senderNumber',
        label: 'Sender Number',
        type: 'text',
        placeholder: '3000xxxx',
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'twilio',
    name: 'Twilio',
    description: 'SMS and WhatsApp provider for OTP and verification flows.',
    category: 'sms',
    baseUrl: 'https://api.twilio.com/2010-04-01',
    enabled: false,
    authType: 'basic',
    supportsApiKeys: false,
    requiresCredentials: true,
    testEndpoint: '/Messages.json',
    usage: ['/api/auth/otp/send', 'lib/sms-service.ts'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'accountSid',
        label: 'Account SID',
        type: 'password',
        secret: true,
        required: true,
      },
      {
        key: 'authToken',
        label: 'Auth Token',
        type: 'password',
        secret: true,
        required: true,
      },
      {
        key: 'fromNumber',
        label: 'SMS From Number',
        type: 'text',
        placeholder: '+1xxxxxxxxxx',
      },
      {
        key: 'whatsappFrom',
        label: 'WhatsApp From',
        type: 'text',
        placeholder: 'whatsapp:+1xxxxxxxxxx',
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'nexmo',
    name: 'Vonage / Nexmo',
    description: 'Secondary SMS provider.',
    category: 'sms',
    baseUrl: 'https://rest.nexmo.com',
    enabled: false,
    authType: 'query',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/account/get-balance',
    usage: ['lib/sms-service.ts'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'apiSecret',
        label: 'API Secret',
        type: 'password',
        secret: true,
        required: true,
      },
      {
        key: 'senderNumber',
        label: 'From',
        type: 'text',
        placeholder: 'SarayShahzada',
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'afghansms',
    name: 'AfghanSMS',
    description: 'Local SMS provider for notifications.',
    category: 'sms',
    baseUrl: 'https://api.afghansms.af/v1',
    enabled: false,
    authType: 'bearer',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/send',
    usage: ['lib/notifications.ts'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'senderId',
        label: 'Sender ID',
        type: 'text',
        placeholder: 'sender_id',
        required: true,
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'sendgrid',
    name: 'SendGrid',
    description: 'Transactional email provider.',
    category: 'email',
    baseUrl: 'https://api.sendgrid.com/v3',
    enabled: false,
    authType: 'bearer',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/scopes',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'mailgun',
    name: 'Mailgun',
    description: 'Alternative transactional email provider.',
    category: 'email',
    baseUrl: 'https://api.mailgun.net/v3',
    enabled: false,
    authType: 'basic',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/domains',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'ses',
    name: 'Amazon SES',
    description: 'Enterprise email provider.',
    category: 'email',
    baseUrl: 'https://email.us-east-1.amazonaws.com',
    enabled: false,
    authType: 'basic',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'stripe',
    name: 'Stripe',
    description: 'International payments provider.',
    category: 'payment',
    baseUrl: 'https://api.stripe.com/v1',
    enabled: false,
    authType: 'bearer',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/balance',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'zarinpal',
    name: 'ZarinPal',
    description: 'Iranian payment gateway.',
    category: 'payment',
    baseUrl: 'https://api.zarinpal.com/pg/v4',
    enabled: false,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/payment/verify.json',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'paypal',
    name: 'PayPal',
    description: 'PayPal gateway integration.',
    category: 'payment',
    baseUrl: 'https://api.paypal.com/v1',
    enabled: false,
    authType: 'basic',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/oauth2/token',
    usage: [],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'clientSecret',
        label: 'Client Secret',
        type: 'password',
        secret: true,
        required: true,
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'idpay',
    name: 'IDPay',
    description: 'Iranian payment gateway.',
    category: 'payment',
    baseUrl: 'https://api.idpay.ir/v1.1',
    enabled: false,
    authType: 'x-api-key',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '',
    usage: [],
    apiKeys: [],
    fieldSchema: [],
    fields: {},
  }),
  createDefaultApi({
    key: 'openrouter',
    name: 'OpenRouter',
    description: 'AI provider for the assistant and LLM routes.',
    category: 'ai',
    baseUrl: 'https://openrouter.ai/api/v1',
    enabled: false,
    authType: 'bearer',
    supportsApiKeys: true,
    requiresCredentials: true,
    testEndpoint: '/models',
    usage: ['/api/openrouter'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'defaultModel',
        label: 'Default Model',
        type: 'text',
        placeholder: 'deepseek/deepseek-r1-0528:free',
      },
    ],
    fields: {},
  }),
  createDefaultApi({
    key: 'recaptcha_google',
    name: 'Google reCAPTCHA v3',
    description: 'Bot protection provider for signin and signup forms.',
    category: 'security',
    baseUrl: 'https://www.google.com',
    enabled: false,
    authType: 'none',
    supportsApiKeys: false,
    requiresCredentials: true,
    testEndpoint: '/recaptcha/api/siteverify',
    usage: ['/api/auth/signin', '/api/auth/signup', '/api/auth/saraf-signup', '/api/auth/recaptcha/config', 'lib/auth.ts'],
    apiKeys: [],
    fieldSchema: [
      {
        key: 'siteKey',
        label: 'Site Key',
        type: 'text',
        required: true,
      },
      {
        key: 'secretKey',
        label: 'Secret Key',
        type: 'password',
        secret: true,
        required: true,
      },
      {
        key: 'minScore',
        label: 'Minimum Score',
        type: 'text',
        placeholder: '0.5',
      },
      {
        key: 'scriptPath',
        label: 'Script Path',
        type: 'text',
        placeholder: '/recaptcha/api.js',
      },
      {
        key: 'verifyPath',
        label: 'Verify Path',
        type: 'text',
        placeholder: '/recaptcha/api/siteverify',
      },
    ],
    fields: {
      minScore: '0.5',
      scriptPath: '/recaptcha/api.js',
      verifyPath: '/recaptcha/api/siteverify',
    },
  }),
  ...RSS_FEED_SOURCES.map(createRssFeedApi),
]

const LATE_DEFAULT_API_KEYS = new Set(['recaptcha_google', ...RSS_FEED_SOURCES.map((source) => source.key)])
const LIVE_LEGACY_MIRROR_KEYS = new Set(['recaptcha_google'])

const LEGACY_IMPORTS: Record<string, LegacyConfigImport> = {
  exchangerate_api: {
    baseUrlKey: 'external_api_exchangerate_url',
    enabledKey: 'external_api_exchangerate_enabled',
    apiKeyKey: 'external_api_exchangerate_key',
  },
  exchangerate_host: {
    baseUrlKey: 'external_api_exchangerate_host_url',
    enabledKey: 'external_api_exchangerate_host_enabled',
    apiKeyKey: 'external_api_exchangerate_host_key',
  },
  fixer: {
    baseUrlKey: 'external_api_fixer_url',
    enabledKey: 'external_api_fixer_enabled',
    apiKeyKey: 'external_api_fixer_key',
  },
  currencylayer: {
    baseUrlKey: 'external_api_currencylayer_url',
    enabledKey: 'external_api_currencylayer_enabled',
    apiKeyKey: 'external_api_currencylayer_key',
  },
  coingecko: {
    baseUrlKey: 'external_api_coingecko_url',
    enabledKey: 'external_api_coingecko_enabled',
    apiKeyKey: 'external_api_coingecko_key',
  },
  coinmarketcap: {
    baseUrlKey: 'external_api_coinmarketcap_url',
    enabledKey: 'external_api_coinmarketcap_enabled',
    apiKeyKey: 'external_api_coinmarketcap_key',
  },
  binance: {
    baseUrlKey: 'external_api_binance_url',
    enabledKey: 'external_api_binance_enabled',
    apiKeyKey: 'external_api_binance_key',
  },
  yahoo_finance: {
    baseUrlKey: 'external_api_yahoo_url',
    enabledKey: 'external_api_yahoo_enabled',
    apiKeyKey: 'external_api_yahoo_key',
  },
  metals_api: {
    baseUrlKey: 'external_api_metals_url',
    enabledKey: 'external_api_metals_enabled',
    apiKeyKey: 'external_api_metals_key',
  },
  commodities_api: {
    baseUrlKey: 'external_api_commodities_url',
    enabledKey: 'external_api_commodities_enabled',
    apiKeyKey: 'external_api_commodities_key',
  },
  kavenegar: {
    baseUrlKey: 'external_api_kavenegar_url',
    enabledKey: 'external_api_kavenegar_enabled',
    apiKeyKey: 'external_api_kavenegar_key',
    fieldKeys: {
      senderNumber: ['sms_sender_number'],
    },
  },
  ghasedak: {
    baseUrlKey: 'external_api_ghasedak_url',
    enabledKey: 'external_api_ghasedak_enabled',
    apiKeyKey: 'external_api_ghasedak_key',
    fieldKeys: {
      senderNumber: ['sms_sender_number'],
    },
  },
  twilio: {
    baseUrlKey: 'external_api_twilio_url',
    enabledKey: 'external_api_twilio_enabled',
    fieldKeys: {
      accountSid: ['twilio_account_sid'],
      authToken: ['twilio_auth_token'],
      fromNumber: ['sms_sender_number'],
      whatsappFrom: ['twilio_whatsapp_from'],
    },
  },
  nexmo: {
    baseUrlKey: 'external_api_nexmo_url',
    enabledKey: 'external_api_nexmo_enabled',
    apiKeyKey: 'external_api_nexmo_key',
    fieldKeys: {
      apiSecret: ['sms_api_secret'],
      senderNumber: ['sms_sender_number'],
    },
  },
  afghansms: {
    fieldKeys: {
      senderId: ['afghan_sms_sender_id'],
    },
  },
  sendgrid: {
    baseUrlKey: 'external_api_sendgrid_url',
    enabledKey: 'external_api_sendgrid_enabled',
    apiKeyKey: 'external_api_sendgrid_key',
  },
  mailgun: {
    baseUrlKey: 'external_api_mailgun_url',
    enabledKey: 'external_api_mailgun_enabled',
    apiKeyKey: 'external_api_mailgun_key',
  },
  ses: {
    baseUrlKey: 'external_api_ses_url',
    enabledKey: 'external_api_ses_enabled',
    apiKeyKey: 'external_api_ses_key',
  },
  stripe: {
    baseUrlKey: 'external_api_stripe_url',
    enabledKey: 'external_api_stripe_enabled',
    apiKeyKey: 'external_api_stripe_key',
  },
  zarinpal: {
    baseUrlKey: 'external_api_zarinpal_url',
    enabledKey: 'external_api_zarinpal_enabled',
    apiKeyKey: 'external_api_zarinpal_key',
  },
  paypal: {
    baseUrlKey: 'external_api_paypal_url',
    enabledKey: 'external_api_paypal_enabled',
    apiKeyKey: 'external_api_paypal_key',
    fieldKeys: {
      clientSecret: ['paypal_client_secret'],
    },
  },
  idpay: {
    baseUrlKey: 'external_api_idpay_url',
    enabledKey: 'external_api_idpay_enabled',
    apiKeyKey: 'external_api_idpay_key',
  },
  openrouter: {
    fieldKeys: {
      defaultModel: ['openrouter_default_model'],
    },
  },
  recaptcha_google: {
    enabledKey: 'recaptcha_enabled',
    fieldKeys: {
      siteKey: ['recaptcha_site_key'],
      secretKey: ['recaptcha_secret_key'],
      minScore: ['recaptcha_threshold'],
    },
  },
}

function normalizeKey(value: string) {
  return normalizeConfigValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
}

function normalizeString(value: unknown) {
  return normalizeConfigValue(value).slice(0, 4000)
}

function normalizeApiKeys(value: unknown) {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, 5)
}

function normalizeFields(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {} as Record<string, string>
  }

  return Object.entries(value).reduce((acc, [key, fieldValue]) => {
    const normalizedKey = normalizeKey(key)
    if (!normalizedKey) return acc
    acc[normalizedKey] = normalizeString(fieldValue)
    return acc
  }, {} as Record<string, string>)
}

function normalizeFieldSchema(value: unknown): ExternalApiFieldSchema[] {
  if (!Array.isArray(value)) return []

  return value
    .map((item) => {
      if (!item || typeof item !== 'object' || Array.isArray(item)) {
        return null
      }

      const schema = item as Record<string, unknown>
      const key = normalizeKey(schema.key as string)
      if (!key) return null

      const type = normalizeString(schema.type as string) as ExternalApiFieldType
      if (!['text', 'password', 'url', 'textarea'].includes(type)) {
        return null
      }

      return {
        key,
        label: normalizeString(schema.label || key),
        type,
        placeholder: normalizeString(schema.placeholder),
        helperText: normalizeString(schema.helperText),
        secret: Boolean(schema.secret),
        required: Boolean(schema.required),
      }
    })
    .filter(Boolean) as ExternalApiFieldSchema[]
}

function normalizeCategory(value: unknown): ExternalApiCategory {
  const category = normalizeString(value) as ExternalApiCategory
  if (
    category === 'exchange' ||
    category === 'crypto' ||
    category === 'commodity' ||
    category === 'sms' ||
    category === 'email' ||
    category === 'payment' ||
    category === 'ai' ||
    category === 'content' ||
    category === 'security'
  ) {
    return category
  }

  return 'other'
}

function normalizeAuthType(value: unknown): ExternalApiAuthType {
  const authType = normalizeString(value) as ExternalApiAuthType
  if (
    authType === 'none' ||
    authType === 'x-api-key' ||
    authType === 'bearer' ||
    authType === 'basic' ||
    authType === 'query' ||
    authType === 'path'
  ) {
    return authType
  }

  return 'none'
}

function hasRequiredCredentials(api: ExternalApiRecord) {
  if (!api.requiresCredentials) return true
  if (api.supportsApiKeys && api.apiKeys.length > 0) return true

  return api.fieldSchema
    .filter((field) => field.required)
    .every((field) => Boolean(api.fields[field.key]))
}

function computeStatus(api: ExternalApiRecord): ExternalApiStatus {
  if (!api.enabled) return 'disabled'
  if (!hasRequiredCredentials(api)) return 'unconfigured'
  if (api.status === 'error') return 'error'
  return 'active'
}

function normalizeApiRecord(input: Partial<ExternalApiRecord>, defaults?: ExternalApiRecord): ExternalApiRecord {
  const base = defaults ?? {
    key: '',
    name: '',
    description: '',
    category: 'other',
    baseUrl: '',
    enabled: false,
    authType: 'none',
    supportsApiKeys: true,
    requiresCredentials: false,
    testEndpoint: '',
    usage: [],
    source: 'custom',
    apiKeys: [],
    fieldSchema: [],
    fields: {},
    status: 'unconfigured',
    lastChecked: null,
  }

  const api: ExternalApiRecord = {
    key: normalizeKey(input.key || base.key),
    name: normalizeString(input.name || base.name),
    description: normalizeString(input.description || base.description),
    category: normalizeCategory(input.category || base.category),
    baseUrl: normalizeString(input.baseUrl || base.baseUrl).replace(/\/+$/, ''),
    enabled: typeof input.enabled === 'boolean' ? input.enabled : base.enabled,
    authType: normalizeAuthType(input.authType || base.authType),
    supportsApiKeys:
      typeof input.supportsApiKeys === 'boolean' ? input.supportsApiKeys : base.supportsApiKeys,
    requiresCredentials:
      typeof input.requiresCredentials === 'boolean'
        ? input.requiresCredentials
        : base.requiresCredentials,
    testEndpoint: normalizeString(input.testEndpoint || base.testEndpoint || ''),
    usage: Array.isArray(input.usage)
      ? input.usage.map((item) => normalizeString(item)).filter(Boolean)
      : base.usage,
    source: input.source === 'custom' ? 'custom' : base.source,
    apiKeys: normalizeApiKeys(input.apiKeys ?? base.apiKeys),
    fieldSchema: normalizeFieldSchema(input.fieldSchema ?? base.fieldSchema),
    fields: normalizeFields(input.fields ?? base.fields),
    status:
      input.status === 'active' ||
      input.status === 'error' ||
      input.status === 'disabled' ||
      input.status === 'unconfigured'
        ? input.status
        : base.status,
    lastChecked:
      input.lastChecked === null || typeof input.lastChecked === 'string'
        ? input.lastChecked
        : base.lastChecked,
  }

  api.status = computeStatus(api)
  return api
}

function getFieldValue(fields: Record<string, string>, key: string) {
  return fields[key] || fields[normalizeKey(key)] || ''
}

async function getLegacyValues() {
  const keys = new Set<string>()

  Object.values(LEGACY_IMPORTS).forEach((item) => {
    if (item.baseUrlKey) keys.add(item.baseUrlKey)
    if (item.enabledKey) keys.add(item.enabledKey)
    if (item.apiKeyKey) keys.add(item.apiKeyKey)
    Object.values(item.fieldKeys || {}).forEach((fieldKeys) => {
      fieldKeys.forEach((fieldKey) => keys.add(fieldKey))
    })
  })

  keys.add('openrouter_api_key')
  keys.add('sms_sender_number')
  keys.add('sms_api_secret')

  return ConfigService.getMany(Array.from(keys))
}

function hasLegacyValue(
  legacyValues: Record<string, string>,
  key: string,
  options?: { includeEmptyValues?: boolean }
) {
  return options?.includeEmptyValues
    ? Object.prototype.hasOwnProperty.call(legacyValues, key)
    : Boolean(legacyValues[key])
}

function hydrateFromLegacy(
  api: ExternalApiRecord,
  legacyValues: Record<string, string>,
  options?: { includeEmptyValues?: boolean }
) {
  const config = LEGACY_IMPORTS[api.key]
  if (!config) {
    return api
  }

  const hydrated = { ...api, fields: { ...api.fields } }

  if (config.baseUrlKey && hasLegacyValue(legacyValues, config.baseUrlKey, options)) {
    hydrated.baseUrl = legacyValues[config.baseUrlKey].replace(/\/+$/, '')
  }

  if (config.enabledKey && hasLegacyValue(legacyValues, config.enabledKey, options)) {
    hydrated.enabled = legacyValues[config.enabledKey] === 'true'
  }

  if (config.apiKeyKey && hasLegacyValue(legacyValues, config.apiKeyKey, options)) {
    hydrated.apiKeys = [legacyValues[config.apiKeyKey]]
  }

  Object.entries(config.fieldKeys || {}).forEach(([fieldKey, legacyFieldKeys]) => {
    const resolvedLegacyKey = legacyFieldKeys.find((legacyKey) => hasLegacyValue(legacyValues, legacyKey, options))
    if (!resolvedLegacyKey) {
      return
    }

    hydrated.fields[fieldKey] = legacyValues[resolvedLegacyKey]
  })

  if (api.key === 'openrouter' && hasLegacyValue(legacyValues, 'openrouter_api_key', options)) {
    hydrated.apiKeys = [legacyValues.openrouter_api_key]
  }

  hydrated.status = computeStatus(hydrated)
  return hydrated
}

async function getLiveLegacyValues() {
  const keys = new Set<string>()

  LIVE_LEGACY_MIRROR_KEYS.forEach((key) => {
    const config = LEGACY_IMPORTS[key]
    if (!config) return

    if (config.baseUrlKey) keys.add(config.baseUrlKey)
    if (config.enabledKey) keys.add(config.enabledKey)
    if (config.apiKeyKey) keys.add(config.apiKeyKey)
    Object.values(config.fieldKeys || {}).forEach((fieldKeys) => {
      fieldKeys.forEach((fieldKey) => keys.add(fieldKey))
    })
  })

  if (keys.size === 0) {
    return {}
  }

  return ConfigService.getMany(Array.from(keys))
}

function mergeLiveLegacyOverrides(api: ExternalApiRecord, legacyValues: Record<string, string>) {
  if (!LIVE_LEGACY_MIRROR_KEYS.has(api.key)) {
    return api
  }

  return hydrateFromLegacy(api, legacyValues, { includeEmptyValues: true })
}

async function syncLegacyMirror(api: ExternalApiRecord) {
  if (api.key !== 'recaptcha_google') {
    return
  }

  await Promise.all([
    ConfigService.set('recaptcha_enabled', api.enabled ? 'true' : 'false', 'reCAPTCHA enabled'),
    ConfigService.set('recaptcha_site_key', getFieldValue(api.fields, 'siteKey'), 'reCAPTCHA site key'),
    ConfigService.set('recaptcha_secret_key', getFieldValue(api.fields, 'secretKey'), 'reCAPTCHA secret key'),
    ConfigService.set('recaptcha_threshold', getFieldValue(api.fields, 'minScore') || '0.5', 'reCAPTCHA minimum score'),
  ])
}

async function clearLegacyMirror(key: string) {
  if (normalizeKey(key) !== 'recaptcha_google') {
    return
  }

  await Promise.all([
    ConfigService.set('recaptcha_enabled', 'false', 'reCAPTCHA enabled'),
    ConfigService.set('recaptcha_site_key', '', 'reCAPTCHA site key'),
    ConfigService.set('recaptcha_secret_key', '', 'reCAPTCHA secret key'),
    ConfigService.set('recaptcha_threshold', '0.5', 'reCAPTCHA minimum score'),
  ])
}

function defaultRegistryPayload(legacyValues: Record<string, string>): ExternalApiRegistryPayload {
  return {
    version: 3,
    apis: DEFAULT_EXTERNAL_APIS.map((api) => hydrateFromLegacy(api, legacyValues)),
    deletedDefaultKeys: [],
  }
}

function injectLateDefaultApis(registry: ExternalApiRegistryPayload, legacyValues: Record<string, string>) {
  const existingKeys = new Set(registry.apis.map((api) => normalizeKey(api.key)))
  const deletedKeys = new Set(registry.deletedDefaultKeys.map((key) => normalizeKey(key)))
  let changed = false

  DEFAULT_EXTERNAL_APIS.forEach((defaultApi) => {
    if (!LATE_DEFAULT_API_KEYS.has(defaultApi.key) || existingKeys.has(defaultApi.key) || deletedKeys.has(defaultApi.key)) {
      return
    }

    registry.apis.push(hydrateFromLegacy(defaultApi, legacyValues))
    changed = true
  })

  return changed
}

export class ExternalAPIService {
  static async loadRegistry(): Promise<ExternalApiRegistryPayload> {
    const rawRegistry = await ConfigService.get(REGISTRY_CONFIG_KEY, '')
    const legacyValues = await getLegacyValues()

    if (rawRegistry) {
      try {
        const parsed = JSON.parse(rawRegistry) as Partial<ExternalApiRegistryPayload>
        if (Array.isArray(parsed.apis)) {
          const registry: ExternalApiRegistryPayload = {
            version: 3,
            apis: parsed.apis
              .map((api) => {
                const defaults = DEFAULT_EXTERNAL_APIS.find((item) => item.key === normalizeKey(api.key || ''))
                return normalizeApiRecord(api, defaults)
              })
              .filter((api) => Boolean(api.key)),
            deletedDefaultKeys: Array.isArray(parsed.deletedDefaultKeys)
              ? parsed.deletedDefaultKeys.map((key) => normalizeKey(String(key))).filter(Boolean)
              : [],
          }

          if (injectLateDefaultApis(registry, legacyValues)) {
            await this.saveRegistry(registry).catch((error) => {
              console.error('Failed to persist late default external APIs:', error)
            })
          }

          return registry
        }
      } catch (error) {
        console.error('Failed to parse external API registry:', error)
      }
    }

    const registry = defaultRegistryPayload(legacyValues)
    await this.saveRegistry(registry).catch((error) => {
      console.error('Failed to persist default external API registry:', error)
    })
    return registry
  }

  static async saveRegistry(registry: ExternalApiRegistryPayload) {
    await ConfigService.set(REGISTRY_CONFIG_KEY, JSON.stringify(registry), 'Central external API registry')
    ConfigService.clearCache()
  }

  static async listApis() {
    const registry = await this.loadRegistry()
    const liveLegacyValues = await getLiveLegacyValues()

    return registry.apis
      .map((api) =>
        mergeLiveLegacyOverrides(
          normalizeApiRecord(api, DEFAULT_EXTERNAL_APIS.find((item) => item.key === api.key)),
          liveLegacyValues
        )
      )
      .sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name))
  }

  static async getApiConfig(key: string) {
    const normalizedKey = normalizeKey(key)
    const apis = await this.listApis()
    return apis.find((api) => api.key === normalizedKey) || null
  }

  static async createApi(input: Partial<ExternalApiRecord>) {
    const registry = await this.loadRegistry()
    const normalized = normalizeApiRecord(
      {
        ...input,
        source: 'custom',
        status: 'unconfigured',
        lastChecked: null,
      },
      undefined
    )

    if (!normalized.key) {
      throw new Error('API key is required')
    }

    if (registry.apis.some((api) => api.key === normalized.key)) {
      throw new Error('API key already exists')
    }

    registry.deletedDefaultKeys = registry.deletedDefaultKeys.filter((item) => item !== normalized.key)
    registry.apis.push(normalized)
    await this.saveRegistry(registry)
    await syncLegacyMirror(normalized)
    return normalized
  }

  static async updateApi(key: string, patch: Partial<ExternalApiRecord>) {
    const registry = await this.loadRegistry()
    const normalizedKey = normalizeKey(key)
    const index = registry.apis.findIndex((api) => api.key === normalizedKey)

    if (index === -1) {
      throw new Error('API not found')
    }

    const current = registry.apis[index]
    const defaults = DEFAULT_EXTERNAL_APIS.find((item) => item.key === normalizedKey)
    const updated = normalizeApiRecord(
      {
        ...current,
        ...patch,
        key: normalizedKey,
      },
      defaults
    )

    registry.apis[index] = updated
    await this.saveRegistry(registry)
    await syncLegacyMirror(updated)
    return updated
  }

  static async deleteApi(key: string) {
    const registry = await this.loadRegistry()
    const normalizedKey = normalizeKey(key)
    const index = registry.apis.findIndex((api) => api.key === normalizedKey)

    if (index === -1) {
      throw new Error('API not found')
    }

    const [deleted] = registry.apis.splice(index, 1)
    if (deleted.source === 'system' && !registry.deletedDefaultKeys.includes(deleted.key)) {
      registry.deletedDefaultKeys.push(deleted.key)
    }
    await this.saveRegistry(registry)
    await clearLegacyMirror(deleted.key)
    return deleted
  }

  static async updateHealth(key: string, status: ExternalApiStatus, lastChecked = new Date().toISOString()) {
    return this.updateApi(key, { status, lastChecked })
  }

  static buildUrl(baseUrl: string, path = '', query?: Record<string, string | number | boolean | undefined | null>) {
    const url = new URL(baseUrl)
    const [rawPath, rawQueryString] = String(path || '').split('?')
    const normalizedPath = rawPath.replace(/^\/+/, '')

    if (normalizedPath) {
      url.pathname = `${url.pathname.replace(/\/+$/, '')}/${normalizedPath}`.replace(/\/{2,}/g, '/')
    }

    if (rawQueryString) {
      const params = new URLSearchParams(rawQueryString)
      params.forEach((value, key) => {
        url.searchParams.set(key, value)
      })
    }

    Object.entries(query || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') return
      url.searchParams.set(key, String(value))
    })

    return url.toString()
  }

  static buildHeaders(
    apiKey?: string,
    options?: {
      headerName?: string
      extra?: Record<string, string>
    }
  ) {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'User-Agent': 'SarayShahzada/1.0',
      ...(options?.extra || {}),
    }

    if (apiKey) {
      headers[options?.headerName || 'X-API-Key'] = apiKey
    }

    return headers
  }

  private static async getStandardConfig(key: string) {
    const api = await this.getApiConfig(key)
    const fallback = DEFAULT_EXTERNAL_APIS.find((item) => item.key === key)

    if (!api && fallback) {
      const disabledFallback = normalizeApiRecord(
        {
          ...fallback,
          enabled: false,
          status: 'disabled',
          apiKeys: [],
          fields: {},
          lastChecked: null,
        },
        fallback
      )

      return {
        ...disabledFallback,
        apiKey: '',
      }
    }

    const merged = normalizeApiRecord(
      {
        ...(fallback || {}),
        ...(api || {}),
      },
      fallback
    )

    return {
      ...merged,
      apiKey: merged.apiKeys[0] || '',
    }
  }

  static async getCoinGeckoConfig() {
    return this.getStandardConfig('coingecko')
  }

  static async getExchangeRateConfig() {
    return this.getStandardConfig('exchangerate_api')
  }

  static async getExchangeRateHostConfig() {
    return this.getStandardConfig('exchangerate_host')
  }

  static async getCurrencyLayerConfig() {
    return this.getStandardConfig('currencylayer')
  }

  static async getKavenegarConfig() {
    const api = await this.getStandardConfig('kavenegar')
    return {
      ...api,
      senderNumber: getFieldValue(api.fields, 'senderNumber'),
    }
  }

  static async getGhasedakConfig() {
    const api = await this.getStandardConfig('ghasedak')
    return {
      ...api,
      senderNumber: getFieldValue(api.fields, 'senderNumber'),
    }
  }

  static async getMetalsAPIConfig() {
    return this.getStandardConfig('metals_api')
  }

  static async getCommoditiesAPIConfig() {
    return this.getStandardConfig('commodities_api')
  }

  static async getBinanceConfig() {
    return this.getStandardConfig('binance')
  }

  static async getYahooFinanceConfig() {
    return this.getStandardConfig('yahoo_finance')
  }

  static async getOpenRouterConfig() {
    const api = await this.getStandardConfig('openrouter')
    return {
      ...api,
      apiKey: api.apiKeys[0] || process.env.OPENROUTER_API_KEY || '',
      defaultModel:
        getFieldValue(api.fields, 'defaultModel') ||
        process.env.OPENROUTER_DEFAULT_MODEL ||
        'deepseek/deepseek-r1-0528:free',
    }
  }

  static async getRecaptchaConfig() {
    const api = await this.getStandardConfig('recaptcha_google')
    return {
      ...api,
      siteKey: getFieldValue(api.fields, 'siteKey'),
      secretKey: getFieldValue(api.fields, 'secretKey'),
      minScore: parseFloat(getFieldValue(api.fields, 'minScore') || '0.5'),
      scriptPath: getFieldValue(api.fields, 'scriptPath') || '/recaptcha/api.js',
      verifyPath: getFieldValue(api.fields, 'verifyPath') || '/recaptcha/api/siteverify',
    }
  }

  static async getTwilioConfig() {
    const api = await this.getStandardConfig('twilio')
    return {
      ...api,
      accountSid: getFieldValue(api.fields, 'accountSid') || process.env.TWILIO_ACCOUNT_SID || '',
      authToken: getFieldValue(api.fields, 'authToken') || process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: getFieldValue(api.fields, 'fromNumber') || process.env.TWILIO_FROM_NUMBER || '',
      whatsappFrom: getFieldValue(api.fields, 'whatsappFrom') || process.env.TWILIO_WHATSAPP_FROM || '',
    }
  }

  static async getNexmoConfig() {
    const api = await this.getStandardConfig('nexmo')
    return {
      ...api,
      apiSecret: getFieldValue(api.fields, 'apiSecret') || process.env.SMS_API_SECRET || '',
      senderNumber: getFieldValue(api.fields, 'senderNumber') || process.env.SMS_SENDER_NUMBER || '',
    }
  }

  static async getAfghanSMSConfig() {
    const api = await this.getStandardConfig('afghansms')
    return {
      ...api,
      senderId: getFieldValue(api.fields, 'senderId') || process.env.AFGHAN_SMS_SENDER_ID || '',
      apiKey: api.apiKeys[0] || process.env.AFGHAN_SMS_API_KEY || '',
    }
  }

  static async getContentFeedConfigs(keys?: string[]) {
    const normalizedKeys = keys?.length ? new Set(keys.map((key) => normalizeKey(key))) : null
    const apis = await this.listApis()

    return apis.filter((api) => {
      if (api.category !== 'content' || !api.enabled) {
        return false
      }

      if (!normalizedKeys) {
        return true
      }

      return normalizedKeys.has(api.key)
    })
  }
}
