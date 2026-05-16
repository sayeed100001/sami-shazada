import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { deleteManagedAdvertisement, isManagedAdvertisementUrl } from '@/lib/advertisement-storage'
import { deleteManagedImage, isManagedImageUrl } from '@/lib/managed-image-storage'

export const dynamic = 'force-dynamic'

const MAX_URL_DELETES_PER_RUN = 220
const MAX_MESSAGE_MUTATIONS_PER_TABLE = 20000

function clampDays(value: unknown, fallback: number) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(Math.floor(parsed), 7), 365)
}

function uniqStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)))
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

async function deleteManagedUrl(url: string) {
  if (isManagedImageUrl(url)) {
    await deleteManagedImage(url)
    return 'managed-image'
  }
  if (isManagedAdvertisementUrl(url)) {
    await deleteManagedAdvertisement(url)
    return 'managed-advertisement'
  }
  return 'skipped'
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({} as Record<string, unknown>))
  const olderThanDays = clampDays(body.olderThanDays, 30)
  const purgeAttachments = body.purgeAttachments !== false
  const purgeMessages = body.purgeMessages === true
  const purgeChats = body.purgeChats === true
  const purgeExpiredStories = body.purgeExpiredStories !== false
  const dryRun = body.dryRun === true
  const confirm = body.confirm === true

  if (!confirm) {
    return NextResponse.json({ error: 'Confirmation required' }, { status: 400 })
  }

  const now = new Date()
  const threshold = new Date(now.getTime() - olderThanDays * 24 * 60 * 60 * 1000)

  const [
    internalChatMessagesWithFiles,
    guestChatMessagesWithFiles,
    supportChatMessagesWithFiles,
    expiredStoriesWithMedia,
  ] = await Promise.all([
    purgeAttachments
      ? prisma.internalChatMessage.findMany({
          where: { createdAt: { lt: threshold }, fileUrl: { not: null } },
          select: { fileUrl: true },
          take: MAX_MESSAGE_MUTATIONS_PER_TABLE,
        })
      : Promise.resolve([]),
    purgeAttachments
      ? prisma.guestChatMessage.findMany({
          where: { createdAt: { lt: threshold }, fileUrl: { not: null } },
          select: { fileUrl: true },
          take: MAX_MESSAGE_MUTATIONS_PER_TABLE,
        })
      : Promise.resolve([]),
    purgeAttachments
      ? prisma.chatMessage.findMany({
          where: { createdAt: { lt: threshold }, fileUrl: { not: null } },
          select: { fileUrl: true },
          take: MAX_MESSAGE_MUTATIONS_PER_TABLE,
        })
      : Promise.resolve([]),
    purgeExpiredStories
      ? prisma.portalStory.findMany({
          where: { expiresAt: { lt: threshold }, mediaUrl: { not: null } },
          select: { mediaUrl: true },
          take: MAX_MESSAGE_MUTATIONS_PER_TABLE,
        })
      : Promise.resolve([]),
  ])

  const fileUrls = uniqStrings([
    ...internalChatMessagesWithFiles.map((m) => m.fileUrl),
    ...guestChatMessagesWithFiles.map((m) => m.fileUrl),
    ...supportChatMessagesWithFiles.map((m) => m.fileUrl),
    ...expiredStoriesWithMedia.map((s) => s.mediaUrl),
  ])

  const deleteTargets = fileUrls.slice(0, MAX_URL_DELETES_PER_RUN)

  const deletionResults = dryRun
    ? deleteTargets.map((url) => ({ url, result: 'dry-run' as const }))
    : await mapWithConcurrency(deleteTargets, 8, async (url) => {
        const kind = await deleteManagedUrl(url)
        return { url, result: kind }
      })

  const deletedKinds = deletionResults.reduce<Record<string, number>>((acc, row) => {
    acc[row.result] = (acc[row.result] || 0) + 1
    return acc
  }, {})

  if (dryRun) {
    const counts = await Promise.all([
      prisma.internalChatMessage.count({ where: { createdAt: { lt: threshold } } }),
      prisma.guestChatMessage.count({ where: { createdAt: { lt: threshold } } }),
      prisma.chatMessage.count({ where: { createdAt: { lt: threshold } } }),
      prisma.portalStory.count({ where: { expiresAt: { lt: threshold } } }),
      prisma.internalChat.count({ where: { updatedAt: { lt: threshold } } }),
      prisma.guestChatSession.count({ where: { updatedAt: { lt: threshold } } }),
      prisma.chatSession.count({ where: { updatedAt: { lt: threshold } } }),
    ])

    return NextResponse.json({
      dryRun: true,
      threshold: threshold.toISOString(),
      olderThanDays,
      wouldDelete: {
        internalChatMessages: counts[0],
        guestChatMessages: counts[1],
        supportChatMessages: counts[2],
        portalStoriesExpired: counts[3],
        internalChats: purgeChats ? counts[4] : 0,
        guestChatSessions: purgeChats ? counts[5] : 0,
        supportChatSessions: purgeChats ? counts[6] : 0,
      },
      attachments: {
        uniqueUrlsFound: fileUrls.length,
        deleteTargets: deleteTargets.length,
        truncated: fileUrls.length > MAX_URL_DELETES_PER_RUN,
        deletedKinds,
      },
    })
  }

  const mutations = await prisma.$transaction(async (tx) => {
    const result = {
      internalChatMessagesUpdated: 0,
      guestChatMessagesUpdated: 0,
      supportChatMessagesUpdated: 0,
      internalChatMessagesDeleted: 0,
      guestChatMessagesDeleted: 0,
      supportChatMessagesDeleted: 0,
      portalStoriesDeleted: 0,
      internalChatsDeleted: 0,
      guestChatSessionsDeleted: 0,
      supportChatSessionsDeleted: 0,
    }

    if (purgeAttachments && !purgeMessages) {
      const [a, b, c] = await Promise.all([
        tx.internalChatMessage.updateMany({
          where: { createdAt: { lt: threshold }, fileUrl: { not: null } },
          data: { fileUrl: null, fileName: null },
        }),
        tx.guestChatMessage.updateMany({
          where: { createdAt: { lt: threshold }, fileUrl: { not: null } },
          data: { fileUrl: null, fileName: null },
        }),
        tx.chatMessage.updateMany({
          where: { createdAt: { lt: threshold }, fileUrl: { not: null } },
          data: { fileUrl: null },
        }),
      ])

      result.internalChatMessagesUpdated = a.count
      result.guestChatMessagesUpdated = b.count
      result.supportChatMessagesUpdated = c.count
    }

    if (purgeMessages) {
      const [a, b, c] = await Promise.all([
        tx.internalChatMessage.deleteMany({ where: { createdAt: { lt: threshold } } }),
        tx.guestChatMessage.deleteMany({ where: { createdAt: { lt: threshold } } }),
        tx.chatMessage.deleteMany({ where: { createdAt: { lt: threshold } } }),
      ])

      result.internalChatMessagesDeleted = a.count
      result.guestChatMessagesDeleted = b.count
      result.supportChatMessagesDeleted = c.count
    }

    if (purgeExpiredStories) {
      const deleted = await tx.portalStory.deleteMany({ where: { expiresAt: { lt: threshold } } })
      result.portalStoriesDeleted = deleted.count
    }

    if (purgeChats) {
      const [a, b, c] = await Promise.all([
        tx.internalChat.deleteMany({ where: { updatedAt: { lt: threshold } } }),
        tx.guestChatSession.deleteMany({ where: { updatedAt: { lt: threshold } } }),
        tx.chatSession.deleteMany({ where: { updatedAt: { lt: threshold } } }),
      ])
      result.internalChatsDeleted = a.count
      result.guestChatSessionsDeleted = b.count
      result.supportChatSessionsDeleted = c.count
    }

    await tx.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MAINTENANCE_CLEANUP',
        resource: 'SYSTEM',
        details: JSON.stringify({
          olderThanDays,
          threshold: threshold.toISOString(),
          purgeAttachments,
          purgeMessages,
          purgeChats,
          purgeExpiredStories,
          attachmentsFound: fileUrls.length,
          attachmentsDeletedAttempted: deleteTargets.length,
          deletedKinds,
          result,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    return result
  })

  return NextResponse.json({
    success: true,
    threshold: threshold.toISOString(),
    olderThanDays,
    purgeAttachments,
    purgeMessages,
    purgeChats,
    purgeExpiredStories,
    attachments: {
      uniqueUrlsFound: fileUrls.length,
      deleteTargets: deleteTargets.length,
      truncated: fileUrls.length > MAX_URL_DELETES_PER_RUN,
      deletedKinds,
    },
    mutations,
  })
}
