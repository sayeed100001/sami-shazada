import { del, put } from '@vercel/blob'
import { mkdir, unlink, writeFile } from 'fs/promises'
import path from 'path'

const LOCAL_AD_PREFIX = '/uploads/ads/'
const BLOB_HOST_MARKER = 'vercel-storage.com'
const BLOB_AD_PATH_SEGMENT = '/advertisements/'

function getLocalAdvertisementUploadsDirectory(scopePath: string) {
  return path.join(process.cwd(), 'public', 'uploads', 'ads', scopePath)
}

export function isVercelBlobConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN)
}

export function isManagedLocalAdvertisementUrl(url: string | null | undefined) {
  return typeof url === 'string' && url.startsWith(LOCAL_AD_PREFIX)
}

export function isManagedBlobAdvertisementUrl(url: string | null | undefined) {
  if (typeof url !== 'string' || !url.startsWith('https://')) {
    return false
  }

  try {
    const parsed = new URL(url)
    return parsed.hostname.includes(BLOB_HOST_MARKER) && parsed.pathname.includes(BLOB_AD_PATH_SEGMENT)
  } catch {
    return false
  }
}

export function isManagedAdvertisementUrl(url: string | null | undefined) {
  return isManagedLocalAdvertisementUrl(url) || isManagedBlobAdvertisementUrl(url)
}

async function storeAdvertisementLocally(file: File, scopePath: string, filename: string) {
  const uploadDirectory = getLocalAdvertisementUploadsDirectory(scopePath)
  const destination = path.join(uploadDirectory, filename)

  await mkdir(uploadDirectory, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(destination, Buffer.from(bytes))

  return `${LOCAL_AD_PREFIX}${scopePath.replace(/\\/g, '/')}/${filename}`
}

async function storeAdvertisementInBlob(file: File, pathname: string) {
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

export async function storeManagedAdvertisement(params: {
  file: File
  scopePath: string
  filename: string
}) {
  const { file, scopePath, filename } = params
  const normalizedScopePath = scopePath.replace(/[\\/]+/g, '/')

  if (isVercelBlobConfigured()) {
    return storeAdvertisementInBlob(file, `advertisements/${normalizedScopePath}/${filename}`)
  }

  if (process.env.VERCEL === '1') {
    throw new Error('VERCEL_BLOB_NOT_CONFIGURED')
  }

  return storeAdvertisementLocally(file, normalizedScopePath, filename)
}

export async function deleteManagedAdvertisement(url: string | null | undefined) {
  if (!url) {
    return
  }

  if (isManagedLocalAdvertisementUrl(url)) {
    const relativePath = url.replace(LOCAL_AD_PREFIX, '')
    const fullPath = path.join(process.cwd(), 'public', 'uploads', 'ads', relativePath)
    await unlink(fullPath).catch(() => undefined)
    return
  }

  if (isManagedBlobAdvertisementUrl(url) && process.env.BLOB_READ_WRITE_TOKEN) {
    await del(url, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => undefined)
  }
}
