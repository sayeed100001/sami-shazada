import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SNAPSHOTS_FALLBACK_KEY = 'admin_stats_snapshots_fallback_json'

function isMissingTableError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error || '')
  return (
    msg.toLowerCase().includes('no such table') ||
    msg.toLowerCase().includes('does not exist') ||
    msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')
  )
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const take = Math.min(Math.max(Number.parseInt(searchParams.get('take') || '20', 10) || 20, 1), 100)

    let snapshots: Array<{ id: string; label: string | null; createdAt: Date; createdBy: string | null }> = []
    try {
      snapshots = await prisma.adminStatsSnapshot.findMany({
        orderBy: { createdAt: 'desc' },
        take,
        select: {
          id: true,
          label: true,
          createdAt: true,
          createdBy: true,
        },
      })
    } catch (err) {
      if (!isMissingTableError(err)) throw err

      const fallback = await prisma.systemConfig.findUnique({ where: { key: SNAPSHOTS_FALLBACK_KEY } })
      const items = fallback?.value ? (JSON.parse(fallback.value) as any[]) : []
      const mapped = (Array.isArray(items) ? items : []).slice(0, take).map((it) => ({
        id: String(it.id || ''),
        label: (it.label ?? null) as string | null,
        createdAt: new Date(String(it.createdAt || new Date().toISOString())),
        createdBy: (it.createdBy ?? null) as string | null,
      }))
      snapshots = mapped
    }

    return NextResponse.json({ snapshots })
  } catch (error) {
    console.error('Admin stats snapshots error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

