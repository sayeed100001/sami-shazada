import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const PUBLIC_KEYS = [
  'site_title',
  'site_description',
  'contact_email',
  'contact_phone',
  'support_email',
  'address',
  'logo_url',
  'favicon_url',
  'default_image_url',
  'primary_color',
  'secondary_color',
  'success_color',
  'ui_scale',
  'theme_mode',
  'default_language',
  'maintenance_mode',
  'registration_enabled',
  'forgot_password_enabled',
  'saraf_directory_title',
]

const DEFAULTS: Record<string, string> = {
  site_title: 'Saray Shahzada',
  site_description: 'Integrated Afghanistan financial platform',
  contact_email: 'info@sarayshahzada.af',
  contact_phone: '+93 700 000 000',
  support_email: 'support@sarayshahzada.af',
  logo_url: '/logo.png',
  favicon_url: '/favicon.ico',
  primary_color: '#6366f1',
  secondary_color: '#8b5cf6',
  success_color: '#10b981',
  ui_scale: '',
  theme_mode: 'light',
  default_language: 'fa',
  maintenance_mode: 'false',
  registration_enabled: 'true',
  forgot_password_enabled: 'true',
  saraf_directory_title: 'Saraf Directory',
}

function buildPublicConfig(configMap: Record<string, string>) {
  const result: Record<string, string> = { ...DEFAULTS, ...configMap }
  for (const key of PUBLIC_KEYS) {
    if (!result[key]) {
      result[key] = DEFAULTS[key] || ''
    }
  }
  return result
}

function createResponse(configMap: Record<string, string>) {
  return NextResponse.json(buildPublicConfig(configMap), {
    headers: {
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
    },
  })
}

export async function GET() {
  if (process.env.NEXT_PHASE === 'phase-production-build') {
    return createResponse({})
  }

  try {
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: PUBLIC_KEYS,
        },
      },
      select: {
        key: true,
        value: true,
      },
    })

    const configMap: Record<string, string> = {}
    configs.forEach((config) => {
      configMap[config.key] = config.value
    })

    return createResponse(configMap)
  } catch (error) {
    console.error('Error fetching public config:', error)
    return createResponse({})
  }
}
