import { NextRequest, NextResponse } from 'next/server'
import { access, readFile } from 'fs/promises'
import { constants } from 'fs'
import { extname, join, normalize } from 'path'
import { checkUserAuth } from '@/lib/auth-utils'

export const dynamic = 'force-dynamic'

const MIME_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
  '.webm': 'audio/webm',
  '.ogg': 'audio/ogg',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
}

export async function GET(
  request: NextRequest,
  { params }: { params: { filename: string } }
) {
  const authResult = await checkUserAuth()
  if (authResult.status !== 200) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawFilename = decodeURIComponent(params.filename || '')
  const normalizedFilename = normalize(rawFilename).replace(/^(\.\.(\/|\\|$))+/, '')

  if (!normalizedFilename || normalizedFilename.includes('..')) {
    return NextResponse.json({ error: 'Invalid filename' }, { status: 400 })
  }

  const filePath = join(process.cwd(), 'storage', 'uploads', normalizedFilename)

  try {
    await access(filePath, constants.R_OK)
    const fileBuffer = await readFile(filePath)
    const extension = extname(normalizedFilename).toLowerCase()
    const contentType = MIME_TYPES[extension] || 'application/octet-stream'

    return new NextResponse(new Uint8Array(fileBuffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=60',
      }
    })
  } catch {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }
}
