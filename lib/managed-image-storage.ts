import { del, put } from '@vercel/blob'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

const LOCAL_MANAGED_IMAGE_PREFIX = '/uploads/managed/'
const BLOB_HOST_MARKER = 'vercel-storage.com'
const BLOB_IMAGE_PATH_SEGMENT = '/managed-images/'

function getLocalManagedUploadsDirectory(scopePath: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'managed', scopePath)
}

export function isManagedImageStorageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export function isManagedLocalImageUrl(url: string | null | undefined) {
  return typeof url === 'string' && url.startsWith(LOCAL_MANAGED_IMAGE_PREFIX)
}

export function isManagedBlobImageUrl(url: string | null | undefined) {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.hostname.includes(BLOB_HOST_MARKER) && parsed.pathname.includes(BLOB_IMAGE_PATH_SEGMENT)
  } catch {
    return false
  }
}

export function isManagedImageUrl(url: string | null | undefined) {
  return isManagedLocalImageUrl(url) || isManagedBlobImageUrl(url)
}

async function storeImageLocally(file: File, scopePath: string, filename: string) {
  const uploadDirectory = getLocalManagedUploadsDirectory(scopePath)
  const destination = path.join(uploadDirectory, filename)

  await mkdir(uploadDirectory, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(destination, Buffer.from(bytes))

  return `${LOCAL_MANAGED_IMAGE_PREFIX}${scopePath.replace(/\\/g, '/')}/${filename}`
}

async function storeImageInBlob(file: File, pathname: string) {
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

export async function storeManagedImage(params: {
  file: File
  scopePath: string
  filename: string
}) {
  const { file, scopePath, filename } = params
  const normalizedScopePath = scopePath.replace(/[\\/]+/g, '/').replace(/^\/+|\/+$/g, '')

  if (isManagedImageStorageConfigured()) {
    return storeImageInBlob(file, `managed-images/${normalizedScopePath}/${filename}`)
  }

  if (process.env.VERCEL === '1') {
    throw new Error('VERCEL_BLOB_NOT_CONFIGURED')
  }

  return storeImageLocally(file, normalizedScopePath, filename)
}

export async function deleteManagedImage(url: string | null | undefined) {
  if (!url) {
    return
  }

  if (isManagedLocalImageUrl(url)) {
    const relativePath = url.replace(LOCAL_MANAGED_IMAGE_PREFIX, '')
    const fullPath = path.join(process.cwd(), 'public', 'uploads', 'managed', relativePath)
    await unlink(fullPath).catch(() => undefined)
    return
  }

  if (isManagedBlobImageUrl(url) && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined)
  }
}
