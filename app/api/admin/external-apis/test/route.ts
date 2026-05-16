import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExternalAPIService, type ExternalApiRecord } from '@/lib/external-api-service'
import { ConfigService } from '@/lib/config-service'

export const dynamic = 'force-dynamic'

type TestRequestConfig = {
  url: string
  init: RequestInit
}

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return session
}

function getMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  }
}

function getFieldValue(api: ExternalApiRecord, key: string) {
  const normalizedKey = key.toLowerCase().replace(/[^a-z0-9]+/g, '')
  return api.fields[key] || api.fields[normalizedKey] || ''
}

function buildGenericTestConfig(api: ExternalApiRecord): TestRequestConfig {
  const endpoint = api.testEndpoint || ''
  const headerApiKey = api.apiKeys[0] || ''

  switch (api.key) {
    case 'currencylayer':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, '', {
          access_key: headerApiKey,
          currencies: 'AFN',
          source: 'USD',
          format: 1,
        }),
        init: { method: 'GET' },
      }
    case 'kavenegar':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, `${headerApiKey}${endpoint}`.replace(/^\/+/, '')),
        init: { method: 'GET' },
      }
    case 'nexmo':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, endpoint, {
          api_key: headerApiKey,
          api_secret: getFieldValue(api, 'apiSecret'),
        }),
        init: { method: 'GET' },
      }
    case 'twilio': {
      const accountSid = getFieldValue(api, 'accountSid')
      const authToken = getFieldValue(api, 'authToken')
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, `Accounts/${accountSid}${endpoint}`),
        init: {
          method: 'GET',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          },
        },
      }
    }
    case 'sendgrid':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, endpoint),
        init: {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${headerApiKey}`,
          },
        },
      }
    case 'mailgun':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, endpoint),
        init: {
          method: 'GET',
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${headerApiKey}`).toString('base64')}`,
          },
        },
      }
    case 'stripe':
    case 'openrouter':
    case 'afghansms':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, endpoint),
        init: {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${headerApiKey}`,
          },
        },
      }
    case 'metals_api':
    case 'commodities_api':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, 'latest', {
          access_key: headerApiKey,
          base: 'USD',
          symbols: api.key === 'metals_api' ? 'XAU' : 'WTIOIL',
        }),
        init: { method: 'GET' },
      }
    case 'paypal':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, endpoint.replace(/^\/+/, '')),
        init: {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${headerApiKey}:${getFieldValue(api, 'clientSecret')}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: 'grant_type=client_credentials',
        },
      }
    case 'recaptcha_google':
      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, getFieldValue(api, 'verifyPath') || endpoint || '/recaptcha/api/siteverify'),
        init: {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            secret: getFieldValue(api, 'secretKey') || 'test-secret',
            response: 'test-response',
          }).toString(),
        },
      }
    default: {
      const headerName =
        api.key === 'coinmarketcap'
          ? 'X-CMC_PRO_API_KEY'
          : api.authType === 'bearer'
            ? 'Authorization'
            : 'X-API-Key'

      const headers =
        api.authType === 'bearer' && headerApiKey
          ? { Authorization: `Bearer ${headerApiKey}` }
          : headerApiKey
            ? { [headerName]: headerApiKey }
            : {}

      return {
        url: ExternalAPIService.buildUrl(api.baseUrl, endpoint),
        init: {
          method: 'GET',
          headers,
        },
      }
    }
  }
}

function parseAllowedHosts(value: string | null) {
  return (value || '')
    .split(',')
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
}

async function assertAllowedTestUrl(url: string) {
  const allowedHosts = parseAllowedHosts(await ConfigService.get('external_api_test_allowed_hosts', ''))
  if (allowedHosts.length === 0) {
    throw new Error('External API testing is not configured')
  }

  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error('Invalid URL')
  }

  if (parsed.protocol !== 'https:') {
    throw new Error('Only https URLs are allowed')
  }

  const host = parsed.hostname.toLowerCase()
  const allowed = allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`))
  if (!allowed) {
    throw new Error('Host not allowed for API test')
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { key?: string }
    if (!body.key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const api = await ExternalAPIService.getApiConfig(body.key)
    if (!api) {
      return NextResponse.json({ error: 'API not found' }, { status: 404 })
    }

    if (!api.enabled) {
      return NextResponse.json(
        { success: false, apiName: api.name, error: 'API is disabled' },
        { status: 400 }
      )
    }

    if (api.status === 'unconfigured') {
      return NextResponse.json(
        { success: false, apiName: api.name, error: 'API credentials are incomplete' },
        { status: 400 }
      )
    }

    const testConfig = buildGenericTestConfig(api)
    await assertAllowedTestUrl(testConfig.url)
    let status: 'active' | 'error' = 'error'
    let httpStatus = 0
    let errorMessage = ''

    try {
      const response = await fetch(testConfig.url, {
        ...testConfig.init,
        signal: AbortSignal.timeout(10000),
      })

      httpStatus = response.status
      status = response.status !== 404 && response.status < 500 ? 'active' : 'error'
      errorMessage = response.ok ? '' : `HTTP ${response.status}`
    } catch (error) {
      errorMessage = error instanceof Error ? error.message : 'Connection failed'
      status = 'error'
    }

    const updatedApi = await ExternalAPIService.updateHealth(body.key, status)

    const meta = getMeta(request)
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXTERNAL_API_TESTED',
        resource: 'EXTERNAL_API',
        resourceId: updatedApi.key,
        details: JSON.stringify({
          status,
          httpStatus,
          url: testConfig.url,
          error: errorMessage || undefined,
        }),
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    })

    if (status === 'active') {
      return NextResponse.json({
        success: true,
        apiName: updatedApi.name,
        status,
        httpStatus,
      })
    }

    return NextResponse.json(
      {
        success: false,
        apiName: updatedApi.name,
        status,
        error: errorMessage || 'Connection failed',
        httpStatus,
      },
      { status: 400 }
    )
  } catch (error) {
    console.error('Error testing external API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
