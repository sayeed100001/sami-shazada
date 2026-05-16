import crypto from 'crypto'
import path from 'path'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { IMAGE_UPLOAD_LIMITS } from '@/lib/image-upload-limits'
import { storeManagedImage } from '@/lib/managed-image-storage'

export const dynamic = 'force-dynamic'

const IMAGE_MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/x-icon': '.ico',
  'image/vnd.microsoft.icon': '.ico',
}

const UPLOAD_SCOPES: Record<
  string,
  {
    scopePath: string
    maxBytes: number
    allowedTypes: Set<string>
  }
> = {
  'home-content': {
    scopePath: 'admin/home-content',
    maxBytes: IMAGE_UPLOAD_LIMITS.homeContent.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
  'education-course': {
    scopePath: 'admin/education-courses',
    maxBytes: IMAGE_UPLOAD_LIMITS.educationCourse.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
  'content-image': {
    scopePath: 'admin/content/images',
    maxBytes: IMAGE_UPLOAD_LIMITS.contentImage.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
  'branding-logo': {
    scopePath: 'admin/branding/logo',
    maxBytes: IMAGE_UPLOAD_LIMITS.brandingLogo.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
  'branding-favicon': {
    scopePath: 'admin/branding/favicon',
    maxBytes: IMAGE_UPLOAD_LIMITS.brandingFavicon.maxBytes,
    allowedTypes: new Set(['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']),
  },
  'branding-default': {
    scopePath: 'admin/branding/default-image',
    maxBytes: IMAGE_UPLOAD_LIMITS.brandingDefault.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
  'theme-logo-main': {
    scopePath: 'admin/theme/logo-main',
    maxBytes: IMAGE_UPLOAD_LIMITS.brandingLogo.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
  'theme-logo-favicon': {
    scopePath: 'admin/theme/favicon',
    maxBytes: IMAGE_UPLOAD_LIMITS.brandingFavicon.maxBytes,
    allowedTypes: new Set(['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']),
  },
  'theme-logo-dark': {
    scopePath: 'admin/theme/logo-dark',
    maxBytes: IMAGE_UPLOAD_LIMITS.brandingLogo.maxBytes,
    allowedTypes: new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  },
}

async function basicScanForScript(buffer: Buffer) {
  const slice = buffer.subarray(0, Math.min(buffer.length, 2048))
  const text = slice.toString('utf8').toLowerCase()
  return !(
    text.includes('<script') ||
    text.includes('javascript:') ||
    text.includes('onerror=') ||
    text.includes('onload=')
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const form = await request.formData()
    const file = form.get('file')
    const scope = typeof form.get('scope') === 'string' ? String(form.get('scope')).trim() : ''

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const scopeConfig = UPLOAD_SCOPES[scope]
    if (!scopeConfig) {
      return NextResponse.json({ error: 'Invalid upload scope' }, { status: 400 })
    }

    const extension = IMAGE_MIME_TO_EXTENSION[file.type]
    if (!extension || !scopeConfig.allowedTypes.has(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > scopeConfig.maxBytes) {
      return NextResponse.json(
        { error: 'File too large', maxBytes: scopeConfig.maxBytes },
        { status: 400 }
      )
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const isSafe = await basicScanForScript(bytes)
    if (!isSafe) {
      return NextResponse.json({ error: 'File contains potentially unsafe content' }, { status: 400 })
    }

    const originalBaseName = path
      .basename(file.name || 'image', path.extname(file.name || ''))
      .replace(/[^a-zA-Z0-9-_]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'image'
    const filename = `${Date.now()}-${originalBaseName}-${crypto.randomUUID()}${extension}`

    const url = await storeManagedImage({
      file,
      scopePath: scopeConfig.scopePath,
      filename,
    })

    return NextResponse.json({ success: true, url })
  } catch (error) {
    console.error('Admin image upload error:', error)
    if (error instanceof Error && error.message === 'VERCEL_BLOB_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Managed image storage is not configured for this deployment.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Failed to upload image' }, { status: 500 })
  }
}
