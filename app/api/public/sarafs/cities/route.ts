import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET /api/public/sarafs/cities
// Returns distinct saraf cities from ACTIVE branches of APPROVED/ACTIVE sarafs.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = String(searchParams.get('q') || '').trim()
    const limitRaw = Number(searchParams.get('limit') || 80)
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(1, Math.trunc(limitRaw)), 200) : 80

    const orderBy = q
      ? [{ city: 'asc' as const }]
      : [{ _count: { city: 'desc' as const } }, { city: 'asc' as const }]

    const rows = await prisma.sarafBranch.groupBy({
      by: ['city'],
      where: {
        isActive: true,
        city: {
          not: '',
          ...(q ? { contains: q, mode: 'insensitive' } : {}),
        },
        saraf: {
          status: 'APPROVED',
          isActive: true,
        },
      },
      _count: { _all: true },
      orderBy,
      take: limit,
    })

    const cities = rows
      .map((row) => ({
        city: String(row.city || '').trim(),
        count: Number((row as any)?._count?._all || 0),
      }))
      .filter((row) => row.city.length > 0)

    return NextResponse.json({ cities })
  } catch (error) {
    console.error('Saraf cities error:', error)
    return NextResponse.json({ error: 'Failed to load cities' }, { status: 500 })
  }
}
