import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { caseInsensitiveContains } from '@/lib/prisma-filters'

export const dynamic = 'force-dynamic'

function parseTake(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), 200)
}

function parseDays(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value || '', 10)
  if (!Number.isFinite(parsed)) return fallback
  return Math.min(Math.max(parsed, 1), 3650)
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const take = parseTake(searchParams.get('take'), 50)
    const days = parseDays(searchParams.get('days'), 90)
    const q = sanitizeInput(searchParams.get('q') || '').trim()

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

    // Aggregate completed hawala + exchange activity by userId.
    const grouped = await prisma.transaction.groupBy({
      by: ['senderId', 'type'],
      where: {
        senderId: { not: null },
        status: 'COMPLETED',
        createdAt: { gte: since },
        type: { in: ['HAWALA', 'EXCHANGE'] },
        sender: { role: 'USER' },
      },
      _count: { id: true },
      _sum: { fromAmount: true, systemCommission: true },
    })

    const senderIds = Array.from(new Set(grouped.map((row) => row.senderId).filter(Boolean))) as string[]

    const [users, lastTransactions] = await Promise.all([
      prisma.user.findMany({
        where: {
          id: { in: senderIds },
          ...(q
            ? {
                OR: [
                  { name: caseInsensitiveContains(q) },
                  { email: caseInsensitiveContains(q) },
                  { phone: caseInsensitiveContains(q) },
                ],
              }
            : {}),
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          vipLevel: true,
          createdAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          senderId: { in: senderIds },
          status: 'COMPLETED',
          createdAt: { gte: since },
          type: { in: ['HAWALA', 'EXCHANGE'] },
        },
        select: { senderId: true, createdAt: true, type: true, id: true, referenceCode: true },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ])

    const userById = new Map(users.map((u) => [u.id, u]))

    const lastByUser = new Map<string, { createdAt: Date; type: string; id: string; referenceCode: string }>()
    for (const tx of lastTransactions) {
      if (!tx.senderId) continue
      if (!lastByUser.has(tx.senderId)) {
        lastByUser.set(tx.senderId, {
          createdAt: tx.createdAt,
          type: tx.type,
          id: tx.id,
          referenceCode: tx.referenceCode,
        })
      }
    }

    type Row = {
      userId: string
      hawalaCount: number
      exchangeCount: number
      totalCount: number
      totalVolume: number
      totalSystemCommission: number
      lastActivityAt: string | null
      lastActivityType: 'HAWALA' | 'EXCHANGE' | null
      user: {
        id: string
        name: string | null
        email: string | null
        phone: string | null
        vipLevel: string | null
        createdAt: string
      } | null
    }

    const aggregated = new Map<
      string,
      { hawalaCount: number; exchangeCount: number; totalVolume: number; totalSystemCommission: number }
    >()

    for (const g of grouped) {
      if (!g.senderId) continue
      const existing =
        aggregated.get(g.senderId) || ({
          hawalaCount: 0,
          exchangeCount: 0,
          totalVolume: 0,
          totalSystemCommission: 0,
        } as const)

      const count = g._count?.id ?? 0
      const sumVolume = g._sum?.fromAmount ?? 0
      const sumSystem = g._sum?.systemCommission ?? 0

      aggregated.set(g.senderId, {
        hawalaCount: existing.hawalaCount + (g.type === 'HAWALA' ? count : 0),
        exchangeCount: existing.exchangeCount + (g.type === 'EXCHANGE' ? count : 0),
        totalVolume: existing.totalVolume + (Number.isFinite(sumVolume) ? sumVolume : 0),
        totalSystemCommission: existing.totalSystemCommission + (Number.isFinite(sumSystem) ? sumSystem : 0),
      })
    }

    const rows: Row[] = []
    for (const [userId, agg] of aggregated.entries()) {
      const u = userById.get(userId)
      if (!u) continue

      const last = lastByUser.get(userId) || null
      rows.push({
        userId,
        hawalaCount: agg.hawalaCount,
        exchangeCount: agg.exchangeCount,
        totalCount: agg.hawalaCount + agg.exchangeCount,
        totalVolume: Number(agg.totalVolume.toFixed(2)),
        totalSystemCommission: Number(agg.totalSystemCommission.toFixed(2)),
        lastActivityAt: last ? last.createdAt.toISOString() : null,
        lastActivityType: last ? (last.type as 'HAWALA' | 'EXCHANGE') : null,
        user: {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone,
          vipLevel: (u.vipLevel as any) ?? null,
          createdAt: u.createdAt.toISOString(),
        },
      })
    }

    rows.sort((a, b) => b.totalCount - a.totalCount)

    return NextResponse.json({
      since: since.toISOString(),
      days,
      take,
      users: rows.slice(0, take),
    })
  } catch (error) {
    console.error('Admin rewards activity error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

