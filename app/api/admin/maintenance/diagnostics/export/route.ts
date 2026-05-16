import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptConfigValue, isSensitiveConfigKey, maskSensitiveValue } from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

function jsonResponseAsAttachment(data: unknown, filename: string) {
  const body = JSON.stringify(data, null, 2)
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const stamp = now.toISOString().replace(/[:.]/g, '-')

    const [
      systemConfigs,
      promotionConfigs,
      counts,
    ] = await Promise.all([
      prisma.systemConfig.findMany({
        select: { key: true, value: true, description: true, updatedAt: true },
        orderBy: { key: 'asc' },
      }),
      prisma.promotionConfig.findMany({
        orderBy: [{ displayOrder: 'asc' }, { type: 'asc' }],
      }),
      (async () => {
        const out: Record<string, number> = {}
        // Key operational tables (keep this list stable and small).
        out.users = await prisma.user.count()
        out.sarafs = await prisma.saraf.count()
        out.sarafBranches = await prisma.sarafBranch.count()
        out.transactions = await prisma.transaction.count()
        out.rates = await prisma.rate.count()
        out.creditTransactions = await prisma.creditTransaction.count()
        out.subscriptions = await prisma.subscription.count()
        out.advertisements = await prisma.advertisement.count()
        out.promotionRequests = await prisma.promotionRequest.count()
        out.internalChats = await prisma.internalChat.count()
        out.internalChatMessages = await prisma.internalChatMessage.count()
        out.guestChatSessions = await prisma.guestChatSession.count()
        out.guestChatMessages = await prisma.guestChatMessage.count()
        out.chatSessions = await prisma.chatSession.count()
        out.chatMessages = await prisma.chatMessage.count()
        out.portalStories = await prisma.portalStory.count()
        out.notifications = await prisma.notification.count()
        out.auditLogs = await prisma.auditLog.count()
        return out
      })(),
    ])

    const safeSystemConfig = systemConfigs.map((c) => {
      const isSensitive = isSensitiveConfigKey(c.key)
      const rawValue = decryptConfigValue(c.key, c.value)
      return {
        key: c.key,
        value: isSensitive ? '***' : rawValue,
        maskedValue: isSensitive ? maskSensitiveValue(rawValue) : null,
        isSensitive,
        description: c.description,
        updatedAt: c.updatedAt,
      }
    })

    const payload = {
      generatedAt: now.toISOString(),
      vercel: {
        gitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA || null,
        env: process.env.VERCEL_ENV || null,
        region: process.env.VERCEL_REGION || null,
      },
      counts,
      systemConfig: safeSystemConfig,
      promotionConfigs,
    }

    return jsonResponseAsAttachment(payload, `diagnostics-${stamp}.json`)
  } catch (error) {
    console.error('Diagnostics export error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
