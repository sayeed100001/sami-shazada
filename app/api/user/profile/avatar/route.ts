import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { IMAGE_UPLOAD_LIMITS } from '@/lib/image-upload-limits'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { deleteManagedAvatar, storeManagedAvatar } from '@/lib/avatar-storage'

export const dynamic = 'force-dynamic'

const MAX_FILE_SIZE = IMAGE_UPLOAD_LIMITS.avatar.maxBytes
const MIME_TO_EXTENSION: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const extension = MIME_TO_EXTENSION[file.type]
    if (!extension) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${IMAGE_UPLOAD_LIMITS.avatar.label}.` },
        { status: 400 }
      )
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    })

    const filename = `${crypto.randomBytes(16).toString('hex')}${extension}`
    const avatarUrl = await storeManagedAvatar({
      file,
      userId: session.user.id,
      filename,
    })

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { avatarUrl },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'AVATAR_UPDATED',
          resource: 'USER',
          resourceId: session.user.id,
          details: JSON.stringify({ avatarUrl }),
        },
      })
    })

    await deleteManagedAvatar(currentUser?.avatarUrl)

    return NextResponse.json({
      success: true,
      avatarUrl,
    })
  } catch (error) {
    console.error('Avatar upload error:', error)
    if (error instanceof Error && error.message === 'VERCEL_BLOB_NOT_CONFIGURED') {
      return NextResponse.json(
        { error: 'Avatar storage is not configured for this deployment.' },
        { status: 503 }
      )
    }
    return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 })
  }
}

export async function DELETE() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { avatarUrl: true },
    })

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: { avatarUrl: null },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'AVATAR_REMOVED',
          resource: 'USER',
          resourceId: session.user.id,
          details: JSON.stringify({ previousAvatarUrl: currentUser?.avatarUrl || null }),
        },
      })
    })

    await deleteManagedAvatar(currentUser?.avatarUrl)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Avatar delete error:', error)
    return NextResponse.json({ error: 'Failed to delete avatar' }, { status: 500 })
  }
}
