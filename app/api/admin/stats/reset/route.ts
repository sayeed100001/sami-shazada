import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ConfigService } from '@/lib/config-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'

export const dynamic = 'force-dynamic'

const BASELINE_KEY = 'admin_stats_baseline_json'
const SNAPSHOTS_FALLBACK_KEY = 'admin_stats_snapshots_fallback_json'

function isMissingTableError(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error || '')
  return (
    msg.toLowerCase().includes('no such table') ||
    msg.toLowerCase().includes('does not exist') ||
    msg.toLowerCase().includes('relation') && msg.toLowerCase().includes('does not exist')
  )
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const label = typeof body?.label === 'string' ? body.label.trim().slice(0, 120) : null

    // Get current stats payload (raw)
    const statsRes = await fetch(new URL('/api/admin/stats?refresh=1', request.url), {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
      cache: 'no-store',
    })
    const statsPayload = await statsRes.json().catch(() => null)

    if (!statsRes.ok || !statsPayload || statsPayload.error) {
      return NextResponse.json(
        { error: 'Failed to load current stats before reset' },
        { status: 500 }
      )
    }

    const baseline = {
      resetAt: new Date().toISOString(),
      snapshotId: 'latest',
      values: {
        totalUsers: Number(statsPayload.totalUsers || 0),
        totalSarafs: Number(statsPayload.totalSarafs || 0),
        pendingSarafs: Number(statsPayload.pendingSarafs || 0),
        totalTransactions: Number(statsPayload.totalTransactions || 0),
        pendingTransactions: Number(statsPayload.pendingTransactions || 0),
        totalVolume: Number(statsPayload.totalVolume || 0),
        revenueTotal: Number(statsPayload?.revenue?.total || 0),
        revenueWaivedTotal: Number(statsPayload?.revenue?.waivedTotal || 0),
        revenueToday: Number(statsPayload?.revenue?.today || 0),
        revenueWaivedToday: Number(statsPayload?.revenue?.waivedToday || 0),
        revenueThisMonth: Number(statsPayload?.revenue?.thisMonth || 0),
        revenueWaivedThisMonth: Number(statsPayload?.revenue?.waivedThisMonth || 0),
        revenue: {
          hawalaProfit: Number(statsPayload?.revenue?.breakdown?.hawalaProfit || 0),
          hawalaWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.hawalaWaivedRevenue || 0),
          exchangeProfit: Number(statsPayload?.revenue?.breakdown?.exchangeProfit || 0),
          exchangeWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.exchangeWaivedRevenue || 0),
          transactionRevenue: Number(statsPayload?.revenue?.breakdown?.transactionRevenue || 0),
          creditRevenue: Number(statsPayload?.revenue?.breakdown?.creditRevenue || 0),
          creditDiscountCost: Number(statsPayload?.revenue?.breakdown?.creditDiscountCost || 0),
          subscriptionCreditsConsumed: Number(statsPayload?.revenue?.breakdown?.subscriptionCreditsConsumed || 0),
          promotionRevenue: Number(statsPayload?.revenue?.breakdown?.promotionRevenue || 0),
          advertisementRevenue: Number(statsPayload?.revenue?.breakdown?.advertisementRevenue || 0),
          totalWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.totalWaivedRevenue || 0),
          freeTrialWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.freeTrialWaivedRevenue || 0),
          freeAccessWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.freeAccessWaivedRevenue || 0),
          totalCollectedRevenue: Number(statsPayload?.revenue?.breakdown?.totalCollectedRevenue || 0),
          totalSystemBenefit: Number(statsPayload?.revenue?.breakdown?.totalSystemBenefit || 0),
        },
      },
    }

    // Persist snapshot + update baseline atomically
    await prisma.$transaction(async (tx) => {
      // Try DB snapshot table first; fallback to SystemConfig JSON if table missing.
      try {
        await tx.adminStatsSnapshot.create({
          data: {
            label: label || 'Reset baseline snapshot',
            payload: statsPayload,
            createdBy: session.user.id,
          },
        })
      } catch (snapErr) {
        if (!isMissingTableError(snapErr)) {
          throw snapErr
        }

        const existingRaw = await tx.systemConfig.findUnique({ where: { key: SNAPSHOTS_FALLBACK_KEY } })
        const existing = existingRaw?.value ? (JSON.parse(existingRaw.value) as any[]) : []
        const next = Array.isArray(existing) ? existing.slice(0, 49) : []
        next.unshift({
          id: `fallback_${Date.now()}`,
          label: label || 'Reset baseline snapshot',
          payload: statsPayload,
          createdAt: new Date().toISOString(),
          createdBy: session.user.id,
        })

        await tx.systemConfig.upsert({
          where: { key: SNAPSHOTS_FALLBACK_KEY },
          update: { value: JSON.stringify(next), description: 'Fallback storage for admin stats snapshots when DB table is unavailable' },
          create: { key: SNAPSHOTS_FALLBACK_KEY, value: JSON.stringify(next), description: 'Fallback storage for admin stats snapshots when DB table is unavailable' },
        })
      }

      const baseline = {
        resetAt: new Date().toISOString(),
        snapshotId: 'latest',
        values: {
          totalUsers: Number(statsPayload.totalUsers || 0),
          totalSarafs: Number(statsPayload.totalSarafs || 0),
          pendingSarafs: Number(statsPayload.pendingSarafs || 0),
          totalTransactions: Number(statsPayload.totalTransactions || 0),
          pendingTransactions: Number(statsPayload.pendingTransactions || 0),
          totalVolume: Number(statsPayload.totalVolume || 0),
          revenueTotal: Number(statsPayload?.revenue?.total || 0),
          revenueWaivedTotal: Number(statsPayload?.revenue?.waivedTotal || 0),
          revenueToday: Number(statsPayload?.revenue?.today || 0),
          revenueWaivedToday: Number(statsPayload?.revenue?.waivedToday || 0),
          revenueThisMonth: Number(statsPayload?.revenue?.thisMonth || 0),
          revenueWaivedThisMonth: Number(statsPayload?.revenue?.waivedThisMonth || 0),
          revenue: {
            hawalaProfit: Number(statsPayload?.revenue?.breakdown?.hawalaProfit || 0),
            hawalaWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.hawalaWaivedRevenue || 0),
            exchangeProfit: Number(statsPayload?.revenue?.breakdown?.exchangeProfit || 0),
            exchangeWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.exchangeWaivedRevenue || 0),
            transactionRevenue: Number(statsPayload?.revenue?.breakdown?.transactionRevenue || 0),
            creditRevenue: Number(statsPayload?.revenue?.breakdown?.creditRevenue || 0),
            creditDiscountCost: Number(statsPayload?.revenue?.breakdown?.creditDiscountCost || 0),
            subscriptionCreditsConsumed: Number(statsPayload?.revenue?.breakdown?.subscriptionCreditsConsumed || 0),
            promotionRevenue: Number(statsPayload?.revenue?.breakdown?.promotionRevenue || 0),
            advertisementRevenue: Number(statsPayload?.revenue?.breakdown?.advertisementRevenue || 0),
            totalWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.totalWaivedRevenue || 0),
            freeTrialWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.freeTrialWaivedRevenue || 0),
            freeAccessWaivedRevenue: Number(statsPayload?.revenue?.breakdown?.freeAccessWaivedRevenue || 0),
            totalCollectedRevenue: Number(statsPayload?.revenue?.breakdown?.totalCollectedRevenue || 0),
            totalSystemBenefit: Number(statsPayload?.revenue?.breakdown?.totalSystemBenefit || 0),
          },
        },
      }

      await tx.systemConfig.upsert({
        where: { key: BASELINE_KEY },
        update: { value: JSON.stringify(baseline), description: 'Admin stats baseline used for \"reset to zero\" display' },
        create: { key: BASELINE_KEY, value: JSON.stringify(baseline), description: 'Admin stats baseline used for \"reset to zero\" display' },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ADMIN_STATS_RESET',
          resource: 'AdminStats',
          details: JSON.stringify({ label: label || null }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })
    })

    ConfigService.clearCache()
    clearAdminStatsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin stats reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
