import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sanitizeInput } from '@/lib/security'
import { ConfigService } from '@/lib/config-service'
import {
  isSensitiveConfigKey,
  maskSensitiveValue,
  normalizeConfigValue,
} from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

const DEFAULT_CONFIGS: Record<string, string> = {
  'saraf_directory_title': 'صرافان معتبر',
  'site_title': 'سرای شهزاده',
  'site_description': 'پلتفورم جامع مالی برای افغانستان',
  'default_language': 'fa',
  'maintenance_mode': 'false',
  'notifications_enabled': 'true',
  'registration_enabled': 'true',
  'saraf_approval_required': 'true',
  'max_transaction_amount': '50000',
  'default_fee_percentage': '2.5',
  'currency_update_interval': '300'
}

const PUBLIC_CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIGS))

export async function GET(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const key = sanitizeInput(params.key)
    
    if (!key) {
      return NextResponse.json({ error: 'Key is required' }, { status: 400 })
    }

    const session = await getServerSession(authOptions)
    const isAdmin = session?.user?.role === 'ADMIN'

    if (!PUBLIC_CONFIG_KEYS.has(key) && !isAdmin) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    try {
      const value = await ConfigService.get(key, DEFAULT_CONFIGS[key] || '')
      const rawValue = value || DEFAULT_CONFIGS[key] || ''
      const sensitive = isSensitiveConfigKey(key)

      return NextResponse.json({
        key,
        value: sensitive && !isAdmin ? '' : sensitive ? '' : rawValue,
        description: `Value for ${key}`,
        isSensitive: sensitive,
        isConfigured: Boolean(rawValue),
        maskedValue: sensitive ? maskSensitiveValue(rawValue) : null,
      })
    } catch (dbError) {
      console.warn('Database error, using defaults:', dbError)
    }

    const defaultValue = DEFAULT_CONFIGS[key] || ''
    return NextResponse.json({
      key,
      value: defaultValue,
      description: `Default value for ${key}`
    })
    
  } catch (error) {
    console.error('System config fetch error:', error)
    
    // Always return a default response to prevent 500 errors
    const key = params?.key || 'unknown'
    return NextResponse.json({
      key,
      value: DEFAULT_CONFIGS[key] || '',
      description: `Fallback value for ${key}`
    })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const key = sanitizeInput(params.key)
    const { value, description } = await request.json()
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Key and value are required' }, { status: 400 })
    }

    const normalizedValue = normalizeConfigValue(value)
    const normalizedDescription = description ? sanitizeInput(String(description)) : undefined

    try {
      await ConfigService.set(key, normalizedValue, normalizedDescription)

      return NextResponse.json({
        key,
        value: isSensitiveConfigKey(key) ? '' : normalizedValue,
        description: normalizedDescription || null,
        isSensitive: isSensitiveConfigKey(key),
        isConfigured: Boolean(normalizedValue),
        maskedValue: isSensitiveConfigKey(key) ? maskSensitiveValue(normalizedValue) : null,
      })
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Failed to save configuration' }, { status: 500 })
    }
    
  } catch (error) {
    console.error('System config update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
