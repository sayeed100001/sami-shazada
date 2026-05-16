import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const THEME_KEYS = [
  'THEME_PRIMARY_COLOR',
  'THEME_SECONDARY_COLOR',
  'THEME_ACCENT_COLOR',
  'THEME_BACKGROUND_COLOR',
  'THEME_TEXT_COLOR',
  'THEME_FONT_PRIMARY',
  'THEME_FONT_HEADINGS',
  'THEME_LOGO_MAIN',
  'THEME_LOGO_FAVICON',
  'THEME_LOGO_DARK',
  'THEME_SIDEBAR_POSITION',
  'THEME_HEADER_STYLE',
  'THEME_BORDER_RADIUS',
  'THEME_SPACING',
  'SITE_NAME',
  'SITE_DESCRIPTION',
  'CONTACT_EMAIL',
  'CONTACT_PHONE',
] as const

const THEME_DEFAULTS: Record<(typeof THEME_KEYS)[number], string> = {
  THEME_PRIMARY_COLOR: '#6366f1',
  THEME_SECONDARY_COLOR: '#8b5cf6',
  THEME_ACCENT_COLOR: '#ec4899',
  THEME_BACKGROUND_COLOR: '#ffffff',
  THEME_TEXT_COLOR: '#1f2937',
  THEME_FONT_PRIMARY: 'Helvetica',
  THEME_FONT_HEADINGS: 'Helvetica',
  THEME_LOGO_MAIN: '/logo.png',
  THEME_LOGO_FAVICON: '/favicon.ico',
  THEME_LOGO_DARK: '/logo-dark.png',
  THEME_SIDEBAR_POSITION: 'right',
  THEME_HEADER_STYLE: 'fixed',
  THEME_BORDER_RADIUS: '8',
  THEME_SPACING: '16',
  SITE_NAME: 'سرای شهزاده',
  SITE_DESCRIPTION: 'پلتفورم جامع مالی افغانستان',
  CONTACT_EMAIL: 'info@saray.af',
  CONTACT_PHONE: '+93700000000',
}

const THEME_IMAGE_KEYS = new Set([
  'THEME_LOGO_MAIN',
  'THEME_LOGO_FAVICON',
  'THEME_LOGO_DARK',
])

// GET /api/admin/theme - Get current theme settings
export async function GET() {
  const theme = { ...THEME_DEFAULTS }

  try {
    const themeConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [...THEME_KEYS],
        },
      },
    })

    themeConfigs.forEach((config) => {
      if (config.key in theme && config.value) {
        theme[config.key as keyof typeof theme] = config.value
      }
    })
  } catch (error) {
    console.error('Get theme error:', error)
  }

  // Theme config should never block app boot. Fall back to defaults on any error.
  return NextResponse.json({
    success: true,
    theme,
  })
}

// POST /api/admin/theme - Update theme settings
export async function POST(request: NextRequest) {
  try {
    const [{ getServerSession }, { authOptions }, { deleteManagedImage }, { assertAllowedManagedOrInternalImageUrl }, { sanitizeInput }, { ConfigService }] = await Promise.all([
      import('next-auth'),
      import('@/lib/auth'),
      import('@/lib/managed-image-storage'),
      import('@/lib/image-url-policy'),
      import('@/lib/security'),
      import('@/lib/config-service'),
    ])

    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates = body?.theme || body || {}
    const allowedKeys = [...THEME_KEYS]

    const updatedConfigs: Array<{ key: string; value: string }> = []
    const existingConfigs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: allowedKeys,
        },
      },
      select: {
        key: true,
        value: true,
      },
    })
    const previousValues = new Map(existingConfigs.map((config) => [config.key, config.value]))

    for (const [key, value] of Object.entries(updates)) {
      if (!allowedKeys.includes(key as (typeof THEME_KEYS)[number])) {
        continue
      }

      const sanitizedValue = sanitizeInput(String(value ?? ''))

      if (THEME_IMAGE_KEYS.has(key)) {
        assertAllowedManagedOrInternalImageUrl(sanitizedValue, key)
      }

      const config = await prisma.systemConfig.upsert({
        where: { key },
        update: {
          value: sanitizedValue,
          description: `Updated by ${session.user.name}`,
        },
        create: {
          key,
          value: sanitizedValue,
          description: `Created by ${session.user.name}`,
        },
      })

      updatedConfigs.push(config)

      const previousValue = previousValues.get(key)
      if (THEME_IMAGE_KEYS.has(key) && previousValue && previousValue !== sanitizedValue) {
        await deleteManagedImage(previousValue)
      }
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'THEME_UPDATED',
        resource: 'SYSTEM_CONFIG',
        details: JSON.stringify({
          updatedKeys: Object.keys(updates),
          timestamp: new Date(),
        }),
      },
    })

    ConfigService.clearCache()

    return NextResponse.json({
      success: true,
      message: 'Theme settings updated successfully',
      updatedCount: updatedConfigs.length,
    })
  } catch (error) {
    console.error('Update theme error:', error)
    if (error instanceof Error && /managed upload storage|internal asset path/i.test(error.message)) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to update theme settings' },
      { status: 500 }
    )
  }
}
