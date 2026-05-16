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

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let snapshot:
      | {
          id: string
          label: string | null
          payload: any
          createdAt: Date
          createdBy: string | null
        }
      | null = null

    try {
      snapshot = await prisma.adminStatsSnapshot.findUnique({
        where: { id: params.id },
        select: {
          id: true,
          label: true,
          payload: true,
          createdAt: true,
          createdBy: true,
        },
      })
    } catch (err) {
      if (!isMissingTableError(err)) throw err
      const fallback = await prisma.systemConfig.findUnique({ where: { key: SNAPSHOTS_FALLBACK_KEY } })
      const items = fallback?.value ? (JSON.parse(fallback.value) as any[]) : []
      const found = (Array.isArray(items) ? items : []).find((it) => String(it.id) === params.id)
      snapshot = found
        ? {
            id: String(found.id),
            label: (found.label ?? null) as string | null,
            payload: found.payload ?? null,
            createdAt: new Date(String(found.createdAt || new Date().toISOString())),
            createdBy: (found.createdBy ?? null) as string | null,
          }
        : null
    }

    if (!snapshot) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ snapshot })
  } catch (error) {
    console.error('Admin stats snapshot detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

