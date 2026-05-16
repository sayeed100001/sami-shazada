import { del, put } from '@vercel/blob'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

const LOCAL_AVATAR_PREFIX = '/uploads/avatars/'
const BLOB_HOST_MARKER = 'vercel-storage.com'
const BLOB_AVATAR_PATH_SEGMENT = '/avatars/'

function getLocalAvatarUploadsDirectory() {
  return path.join(process.cwd(), 'public', 'uploads', 'avatars')
}

export function isVercelBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export function isManagedLocalAvatarUrl(avatarUrl: string | null | undefined) {
  return typeof avatarUrl === 'string' && avatarUrl.startsWith(LOCAL_AVATAR_PREFIX)
}

export function isManagedBlobAvatarUrl(avatarUrl: string | null | undefined) {
  if (typeof avatarUrl !== 'string' || !avatarUrl.startsWith('https://')) {
    return false
  }

  try {
    const parsed = new URL(avatarUrl)
    return parsed.hostname.includes(BLOB_HOST_MARKER) && parsed.pathname.includes(BLOB_AVATAR_PATH_SEGMENT)
  } catch {
    return false
  }
}

export function isManagedAvatarUrl(avatarUrl: string | null | undefined) {
  return isManagedLocalAvatarUrl(avatarUrl) || isManagedBlobAvatarUrl(avatarUrl)
}

async function storeAvatarLocally(file: File, filename: string) {
  const uploadDirectory = getLocalAvatarUploadsDirectory()
  const destination = path.join(uploadDirectory, filename)

  await mkdir(uploadDirectory, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(destination, Buffer.from(bytes))

  return `${LOCAL_AVATAR_PREFIX}${filename}`
}

async function storeAvatarInBlob(file: File, pathname: string) {
  const options: {
    access: 'public'
    addRandomSuffix: false
    cacheControlMaxAge: number
    contentType: string
    token?: string
  } = {
    access: 'public',
    addRandomSuffix: false,
    cacheControlMaxAge: 60 * 60 * 24 * 365,
    contentType: file.type,
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    options.token = process.env.BLOB_READ_WRITE_TOKEN
  }

  const blob = await put(pathname, file, options)
  return blob.url
}

export async function storeManagedAvatar(params: {
  file: File
  userId: string
  filename: string
}) {
  const { file, userId, filename } = params

  if (isVercelBlobConfigured()) {
    return storeAvatarInBlob(file, `avatars/${userId}/${filename}`)
  }

  if (process.env.VERCEL === '1') {
    throw new Error('VERCEL_BLOB_NOT_CONFIGURED')
  }

  return storeAvatarLocally(file, filename)
}

export async function deleteManagedAvatar(avatarUrl: string | null | undefined) {
  if (!avatarUrl) {
    return
  }

  if (isManagedLocalAvatarUrl(avatarUrl)) {
    const filename = path.basename(avatarUrl)
    const fullPath = path.join(getLocalAvatarUploadsDirectory(), filename)
    await unlink(fullPath).catch(() => undefined)
    return
  }

  if (isManagedBlobAvatarUrl(avatarUrl) && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(avatarUrl, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined)
  }
}
