import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import crypto from 'crypto'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { checkUserAuth } from '@/lib/auth-utils'
import {
  PORTAL_CHAT_MAX_AUDIO_BYTES,
  PORTAL_CHAT_MAX_DOCUMENT_BYTES,
  PORTAL_CHAT_MAX_IMAGE_BYTES,
  formatPortalUploadLimit,
} from '@/lib/portal-chat-upload'

export const dynamic = 'force-dynamic'

const ALLOWED_PORTAL_ROLES = new Set(['ADMIN', 'USER', 'SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'])
const DANGEROUS_EXTENSIONS = new Set(['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.php', '.asp', '.jsp'])
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const AUDIO_TYPES = new Set([
  'audio/webm',
  'audio/ogg',
  'audio/mp4',
  'audio/mpeg',
  // Mobile Safari / iOS: some recordings and uploads are labeled as m4a/aac/wav variants.
  'audio/x-m4a',
  'audio/aac',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
])
const DOCUMENT_TYPES = new Set(['application/pdf'])

function normalizeExtension(name: string) {
  const dotIndex = name.lastIndexOf('.')
  return dotIndex >= 0 ? name.slice(dotIndex).toLowerCase() : ''
}

function resolveUploadKind(file: File) {
  const normalizedType = file.type.split(';')[0].trim().toLowerCase()
  if (IMAGE_TYPES.has(normalizedType)) return { kind: 'image', maxSize: PORTAL_CHAT_MAX_IMAGE_BYTES }
  if (AUDIO_TYPES.has(normalizedType)) return { kind: 'audio', maxSize: PORTAL_CHAT_MAX_AUDIO_BYTES }
  if (DOCUMENT_TYPES.has(normalizedType)) return { kind: 'document', maxSize: PORTAL_CHAT_MAX_DOCUMENT_BYTES }
  return null
}

async function storeInBlob(file: File, pathname: string) {
  const normalizedType = file.type.split(';')[0].trim().toLowerCase()
  const blob = await put(pathname, file, {
    access: 'public',
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType: normalizedType || file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })
  return blob.url
}

export async function POST(request: NextRequest) {
  try {
    const authResult = await checkUserAuth()
    if (authResult.status !== 200) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = authResult.session?.user?.role
    if (!role || !ALLOWED_PORTAL_ROLES.has(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    const uploadKind = resolveUploadKind(file)
    if (!uploadKind) {
      return NextResponse.json({ error: 'File type not allowed for internal chat' }, { status: 400 })
    }

    const extension = normalizeExtension(file.name)
    if (DANGEROUS_EXTENSIONS.has(extension)) {
      return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 })
    }

    if (file.size <= 0 || file.size > uploadKind.maxSize) {
      return NextResponse.json(
        { error: `File too large for ${uploadKind.kind}. Limit is ${formatPortalUploadLimit(uploadKind.maxSize)}.` },
        { status: 400 }
      )
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || `${uploadKind.kind}${extension || ''}`
    const filename = `${Date.now()}-${crypto.randomUUID()}-${safeName}`
    const ownerSegment = authResult.session?.user?.id || role.toLowerCase()

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const url = await storeInBlob(file, `chat-uploads/internal/${ownerSegment}/${filename}`)
      return NextResponse.json({ success: true, url, filename: safeName, kind: uploadKind.kind, storage: 'blob' })
    }

    if (process.env.VERCEL === '1') {
      return NextResponse.json({ error: 'Upload storage is not configured for this deployment' }, { status: 503 })
    }

    const uploadDirectory = join(process.cwd(), 'storage', 'uploads')
    const path = join(uploadDirectory, filename)
    const buffer = Buffer.from(await file.arrayBuffer())

    await mkdir(uploadDirectory, { recursive: true })
    await writeFile(path, buffer)

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${filename}`,
      filename: safeName,
      kind: uploadKind.kind,
      storage: 'local',
    })
  } catch (error) {
    console.error('Portal internal chat upload error:', error)
    return NextResponse.json({ error: 'Failed to upload internal chat file' }, { status: 500 })
  }
}
