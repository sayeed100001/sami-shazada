import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ConfigService } from '@/lib/config-service'
import { isManagedBlobAdvertisementUrl } from '@/lib/advertisement-storage'
import { isManagedBlobImageUrl } from '@/lib/managed-image-storage'

export const dynamic = 'force-dynamic'

const IMAGE_CONFIG_KEYS = ['logo_url', 'favicon_url', 'default_image_url'] as const
const DEFAULT_HEAD_LIMIT = 160
const DEFAULT_HEAD_CONCURRENCY = 8

function getDbProvider() {
  const url = process.env.DATABASE_URL || ''
  const normalized = url.toLowerCase()
  if (normalized.startsWith('file:') || normalized.includes('sqlite')) return 'sqlite'
  if (normalized.startsWith('postgres') || normalized.includes('postgres')) return 'postgres'
  return 'unknown'
}

function uniqStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)))
}

async function fetchHeadSizeBytes(url: string, timeoutMs = 7000): Promise<number | null> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { method: 'HEAD', cache: 'no-store', signal: controller.signal })
    if (!res.ok) return null
    const len = res.headers.get('content-length')
    if (!len) return null
    const parsed = Number(len)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
  } catch {
    return null
  } finally {
    clearTimeout(timeout)
  }
}

async function mapWithConcurrency<T, R>(
  inputs: readonly T[],
  concurrency: number,
  fn: (input: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(inputs.length)
  let idx = 0

  const workers = new Array(Math.max(1, Math.min(concurrency, inputs.length))).fill(null).map(async () => {
    while (true) {
      const current = idx
      idx += 1
      if (current >= inputs.length) return
      results[current] = await fn(inputs[current])
    }
  })

  await Promise.all(workers)
  return results
}

async function getDatabaseSizeBytes(): Promise<number | null> {
  const provider = getDbProvider()
  try {
    if (provider === 'postgres') {
      const rows = await prisma.$queryRaw<Array<{ size: bigint | number | string }>>`
        SELECT pg_database_size(current_database()) as size
      `
      const size = rows?.[0]?.size
      if (typeof size === 'bigint') return Number(size)
      if (typeof size === 'number') return size
      if (typeof size === 'string') {
        const parsed = Number(size)
        return Number.isFinite(parsed) ? parsed : null
      }
      return null
    }

    if (provider === 'sqlite') {
      const pageCount = await prisma.$queryRawUnsafe<Array<{ page_count: number }>>('PRAGMA page_count')
      const pageSize = await prisma.$queryRawUnsafe<Array<{ page_size: number }>>('PRAGMA page_size')
      const pages = pageCount?.[0]?.page_count
      const size = pageSize?.[0]?.page_size
      if (!Number.isFinite(pages) || !Number.isFinite(size)) return null
      return pages * size
    }
  } catch {
    return null
  }

  return null
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const provider = getDbProvider()
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

  const [
    dbSizeBytes,
    internalChatCount,
    internalChatOldCount,
    guestChatMsgCount,
    guestChatOldCount,
    supportChatMsgCount,
    supportChatOldCount,
    portalStoryCount,
    portalStoryExpiredCount,
    contentItemCount,
    advertisementCount,
    documentCount,
    documentTotalBytes,
    systemImageConfig,
    imageContentUrls,
    storyMediaUrls,
    internalChatFileUrls,
    guestChatFileUrls,
    supportChatFileUrls,
    advertisementImageUrls,
  ] = await Promise.all([
    getDatabaseSizeBytes(),
    prisma.internalChatMessage.count(),
    prisma.internalChatMessage.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    prisma.guestChatMessage.count(),
    prisma.guestChatMessage.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    prisma.chatMessage.count(),
    prisma.chatMessage.count({ where: { createdAt: { lt: thirtyDaysAgo } } }),
    prisma.portalStory.count(),
    prisma.portalStory.count({ where: { expiresAt: { lt: now } } }),
    prisma.contentItem.count(),
    prisma.advertisement.count(),
    prisma.document.count(),
    prisma.document.aggregate({ _sum: { size: true } }).then((r) => Number(r?._sum?.size || 0)),
    ConfigService.getMany([...IMAGE_CONFIG_KEYS]),
    prisma.contentItem.findMany({ where: { type: 'IMAGE', isActive: true }, select: { url: true }, take: 5000 }),
    prisma.portalStory.findMany({ where: { mediaUrl: { not: null } }, select: { mediaUrl: true }, take: 5000 }),
    prisma.internalChatMessage.findMany({ where: { fileUrl: { not: null } }, select: { fileUrl: true }, take: 10000 }),
    prisma.guestChatMessage.findMany({ where: { fileUrl: { not: null } }, select: { fileUrl: true }, take: 10000 }),
    prisma.chatMessage.findMany({ where: { fileUrl: { not: null } }, select: { fileUrl: true }, take: 10000 }),
    prisma.advertisement.findMany({ where: { imageUrl: { not: null } }, select: { imageUrl: true }, take: 5000 }),
  ])

  const configUrls = IMAGE_CONFIG_KEYS.map((key) => systemImageConfig[key] || '').filter(Boolean)
  const urls = uniqStrings([
    ...configUrls,
    ...imageContentUrls.map((row) => row.url),
    ...storyMediaUrls.map((row) => row.mediaUrl),
    ...internalChatFileUrls.map((row) => row.fileUrl),
    ...guestChatFileUrls.map((row) => row.fileUrl),
    ...supportChatFileUrls.map((row) => row.fileUrl),
    ...advertisementImageUrls.map((row) => row.imageUrl),
  ])

  const blobUrls = urls.filter((url) => isManagedBlobImageUrl(url) || isManagedBlobAdvertisementUrl(url))
  const headTargets = blobUrls.slice(0, DEFAULT_HEAD_LIMIT)

  const headResults = await mapWithConcurrency(headTargets, DEFAULT_HEAD_CONCURRENCY, async (url) => {
    const bytes = await fetchHeadSizeBytes(url)
    return { url, bytes }
  })

  const headSucceeded = headResults.filter((r) => typeof r.bytes === 'number')
  const headFailed = headResults.length - headSucceeded.length
  const blobBytesFromHead = headSucceeded.reduce((sum, r) => sum + (r.bytes || 0), 0)

  return NextResponse.json({
    provider,
    now: now.toISOString(),
    database: {
      sizeBytes: dbSizeBytes,
      tableCounts: {
        internalChatMessages: internalChatCount,
        internalChatMessagesOlderThan30d: internalChatOldCount,
        guestChatMessages: guestChatMsgCount,
        guestChatMessagesOlderThan30d: guestChatOldCount,
        supportChatMessages: supportChatMsgCount,
        supportChatMessagesOlderThan30d: supportChatOldCount,
        portalStories: portalStoryCount,
        portalStoriesExpired: portalStoryExpiredCount,
        contentItems: contentItemCount,
        advertisements: advertisementCount,
        documents: documentCount,
      },
      documentsTotalBytes: documentTotalBytes,
    },
    blob: {
      uniqueReferencedUrls: blobUrls.length,
      headChecked: headTargets.length,
      headFailed,
      bytesFromHead: blobBytesFromHead,
      truncated: blobUrls.length > DEFAULT_HEAD_LIMIT,
      note:
        'Blob usage is computed from URLs referenced in the database. If you have objects in Blob that are no longer referenced, they will not be counted here.',
    },
    hosting: {
      vercelRegion: process.env.VERCEL_REGION || null,
      vercelEnv: process.env.VERCEL_ENV || null,
      note:
        'Vercel bandwidth/function invocation usage is not available inside the app unless you add a Vercel API token integration. Use the Vercel dashboard for exact platform usage.',
    },
  })
}

