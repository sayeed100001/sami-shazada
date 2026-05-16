import { NextRequest, NextResponse } from 'next/server'
import { put } from '@vercel/blob'
import { mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import { checkUserAuth } from '@/lib/auth-utils'
import crypto from 'crypto'

export const dynamic = 'force-dynamic'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB
const DANGEROUS_EXTENSIONS = ['.exe', '.bat', '.cmd', '.com', '.pif', '.scr', '.vbs', '.js', '.jar', '.php', '.asp', '.jsp']

async function storeUploadInBlob(file: File, pathname: string) {
  const blob = await put(pathname, file, {
    access: 'public',
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType: file.type,
    token: process.env.BLOB_READ_WRITE_TOKEN,
  })

  return blob.url
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await checkUserAuth()
    if (authResult.status !== 200) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.formData()
    const file: File | null = data.get('file') as unknown as File

    if (!file) {
      return NextResponse.json({ error: 'No file received' }, { status: 400 })
    }

    // Security checks
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: 'File too large' }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: 'File type not allowed' }, { status: 400 })
    }

    // Check dangerous extensions
    const fileExt = file.name.toLowerCase().substring(file.name.lastIndexOf('.'))
    if (DANGEROUS_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({ error: 'File extension not allowed' }, { status: 400 })
    }

    // Sanitize filename
    const timestamp = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_').substring(0, 100)
    const filename = `${timestamp}-${crypto.randomUUID()}-${safeName}`
    const ownerSegment = authResult.session?.user?.id || authResult.session?.user?.role?.toLowerCase() || 'user'

    if (process.env.BLOB_READ_WRITE_TOKEN) {
      const blobUrl = await storeUploadInBlob(file, `chat-uploads/${ownerSegment}/${filename}`)

      return NextResponse.json({
        success: true,
        url: blobUrl,
        filename: safeName,
        storage: 'blob',
      })
    }

    if (process.env.VERCEL === '1') {
      return NextResponse.json(
        { error: 'Upload storage is not configured for this deployment' },
        { status: 503 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const uploadDirectory = join(process.cwd(), 'storage', 'uploads')
    const path = join(uploadDirectory, filename)

    await mkdir(uploadDirectory, { recursive: true })
    await writeFile(path, buffer)

    return NextResponse.json({
      success: true,
      url: `/api/uploads/${filename}`,
      filename: safeName,
      storage: 'local',
    })

  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    )
  }
}
