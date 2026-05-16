import { NextRequest, NextResponse } from 'next/server'
import path from 'path'
import crypto from 'crypto'
import { checkUserAuth } from '@/lib/auth-utils'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { IMAGE_UPLOAD_LIMITS } from '@/lib/image-upload-limits'
import { storeManagedAdvertisement } from '@/lib/advertisement-storage'

export const dynamic = 'force-dynamic'

const MAX_IMAGE_BYTES = IMAGE_UPLOAD_LIMITS.advertisement.maxBytes
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

function safeExt(filename: string) {
  const ext = path.extname(filename || '').toLowerCase()
  return ALLOWED_EXTENSIONS.includes(ext) ? ext : null
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
    const auth = await checkUserAuth()
    if (auth.status !== 200 || !auth.session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { user } = auth.session
    const role = user.role
    if (!['SARAF', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const adsEnabled = await ConfigEnforcer.isFeatureEnabled('feature_ads_enabled')
    if (!adsEnabled) {
      return NextResponse.json({ error: 'Advertisements are disabled', details: 'ADS_DISABLED' }, { status: 403 })
    }

    const form = await request.formData()
    const file = form.get('file') as unknown as File | null
    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > MAX_IMAGE_BYTES) {
      return NextResponse.json(
        { error: 'File too large', maxBytes: MAX_IMAGE_BYTES, maxLabel: IMAGE_UPLOAD_LIMITS.advertisement.label },
        { status: 400 }
      )
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    const ext = safeExt(file.name)
    if (!ext) {
      return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const isSafe = await basicScanForScript(bytes)
    if (!isSafe) {
      return NextResponse.json({ error: 'File contains potentially malicious content' }, { status: 400 })
    }

    const filename = `${Date.now()}-${crypto.randomUUID()}${ext}`
    const scopePath = role === 'SARAF' && user.sarafId ? path.join('sarafs', user.sarafId) : 'admin'
    const publicUrl = await storeManagedAdvertisement({
      file,
      scopePath,
      filename,
    })

    return NextResponse.json({ success: true, url: publicUrl })
  } catch (error) {
    console.error('Advertisement image upload error:', error)
    if (error instanceof Error && error.message === 'VERCEL_BLOB_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Advertisement storage is not configured for this deployment.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
