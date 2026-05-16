import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { monitoring } from '@/lib/monitoring'
import { getCachedAdminStats, setCachedAdminStats } from '@/lib/admin-stats-cache'
import { ConfigService } from '@/lib/config-service'
import { createUsdRevenueNormalizer } from '@/lib/revenue-normalization'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const forceRefresh = searchParams.get('refresh') === '1'
    const cachedStats = forceRefresh ? null : getCachedAdminStats()
    if (cachedStats) {
      return NextResponse.json(cachedStats, {
        headers: { 'Cache-Control': 'private, no-store' }
      })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const revenueTrendStart = new Date(today)
    revenueTrendStart.setDate(revenueTrendStart.getDate() - 29)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    const [
      totalUsers,
      activeUsers,
      totalSarafs,
      approvedSarafs,
      pendingSarafs,
      rejectedSarafs,
      suspendedSarafs,
      totalTransactions,
      completedTransactions,
      pendingTransactions,
      todayTransactions,
      monthTransactions,
      totalTransactionVolume,
      totalCommission,
      totalWaivedCommission,
      todayCommission,
      todayWaivedCommission,
      monthCommission,
      monthWaivedCommission,
      totalCreditsSold,
      totalCreditRevenue,
      pendingCreditRequests,
      pendingSubscriptions,
      totalSubscriptionCreditsConsumed,
      pendingAdvertisements,
      activeBranches,
      recentTransactions,
      completedRevenueTransactions,
      totalHawalaCommission,
      totalHawalaWaivedCommission,
      totalExchangeCommission,
      totalExchangeWaivedCommission,
      totalPromotionRevenue,
      totalAdRevenue,
      totalFreeTrialWaivedCommission,
      totalFreeAccessWaivedCommission,
      newVisitorsToday,
      newVisitorsThisMonth
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.saraf.count(),
      prisma.saraf.count({ where: { status: 'APPROVED' } }),
      prisma.saraf.count({ where: { status: 'PENDING' } }),
      prisma.saraf.count({ where: { status: 'REJECTED' } }),
      prisma.saraf.count({ where: { status: 'SUSPENDED' } }),
      prisma.transaction.count(),
      prisma.transaction.count({ where: { status: 'COMPLETED' } }),
      prisma.transaction.count({ where: { status: 'PENDING' } }),
      prisma.transaction.count({
        where: { createdAt: { gte: today, lt: tomorrow } }
      }),
      prisma.transaction.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
      }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { toAmount: true }
      }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { systemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: today, lt: tomorrow }
        },
        _sum: { systemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: today, lt: tomorrow }
        },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { systemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.creditTransaction.aggregate({
        where: {
          type: 'PURCHASE',
          status: 'APPROVED'
        },
        _sum: { amount: true }
      }),
      prisma.creditTransaction.aggregate({
        where: {
          type: 'PURCHASE',
          status: 'APPROVED'
        },
        _sum: { price: true, discountAmount: true }
      }),
      prisma.creditTransaction.count({
        where: { status: 'PENDING', type: 'PURCHASE' }
      }),
      prisma.subscription.count({
        where: { status: 'PENDING' }
      }),
      prisma.subscription.aggregate({
        // Credits are consumed only when a subscription is activated (startDate set).
        // Rejected/cancelled-before-activation subscriptions keep startDate null.
        where: { startDate: { not: null } },
        _sum: { price: true }
      }),
      prisma.advertisement.count({
        where: { status: 'PENDING' }
      }),
      prisma.sarafBranch.count({
        where: { isActive: true }
      }),
      prisma.transaction.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          saraf: {
            select: {
              businessName: true
            }
          }
        }
      }),
      prisma.transaction.findMany({
        where: { status: 'COMPLETED' },
        select: {
          createdAt: true,
          type: true,
          fromCurrency: true,
          systemCommission: true,
          waivedSystemCommission: true,
          systemDiscountAmount: true,
          systemFeeWaiverReason: true,
        }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: 'HAWALA',
        },
        _sum: { systemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: 'HAWALA',
        },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: 'EXCHANGE',
        },
        _sum: { systemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          type: 'EXCHANGE',
        },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.promotionRequest.aggregate({
        where: {
          status: 'APPROVED',
        },
        _sum: { amount: true }
      }),
      prisma.advertisement.aggregate({
        where: {
          status: { in: ['ACTIVE', 'EXPIRED'] },
        },
        _sum: { price: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          systemFeeWaiverReason: 'FREE_TRIAL',
        },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.transaction.aggregate({
        where: {
          status: 'COMPLETED',
          systemFeeWaiverReason: 'FREE_ACCESS',
        },
        _sum: { waivedSystemCommission: true }
      }),
      prisma.user.count({
        where: { createdAt: { gte: today, lt: tomorrow } }
      }),
      prisma.user.count({
        where: { createdAt: { gte: startOfMonth, lte: endOfMonth } }
      })
    ])

    const revenueByDay = new Map<string, number>()
    for (let i = 0; i < 30; i++) {
      const date = new Date(revenueTrendStart)
      date.setDate(revenueTrendStart.getDate() + i)
      revenueByDay.set(date.toISOString().split('T')[0], 0)
    }

    const healthSnapshot = monitoring.getSystemHealth()
    const systemHealth =
      healthSnapshot.status === 'healthy'
        ? 'good'
        : healthSnapshot.status === 'warning'
          ? 'warning'
          : 'error'

    const normalizeAmountToUsd = createUsdRevenueNormalizer()
    let totalCommissionUsd = 0
    let totalWaivedRevenue = 0
    let todayCommissionUsd = 0
    let todayWaivedRevenueUsd = 0
    let monthCommissionUsd = 0
    let monthWaivedRevenueUsd = 0
    let hawalaProfit = 0
    let hawalaWaivedRevenue = 0
    let exchangeProfit = 0
    let exchangeWaivedRevenue = 0
    let freeTrialWaivedRevenue = 0
    let freeAccessWaivedRevenue = 0

    for (const transaction of completedRevenueTransactions) {
      const commissionUsd = await normalizeAmountToUsd(
        transaction.systemCommission,
        transaction.fromCurrency
      )
      const waivedRevenueUsd = await normalizeAmountToUsd(
        transaction.waivedSystemCommission,
        transaction.fromCurrency
      )

      totalCommissionUsd += commissionUsd
      totalWaivedRevenue += waivedRevenueUsd

      if (transaction.createdAt >= today && transaction.createdAt < tomorrow) {
        todayCommissionUsd += commissionUsd
        todayWaivedRevenueUsd += waivedRevenueUsd
      }

      if (transaction.createdAt >= startOfMonth && transaction.createdAt <= endOfMonth) {
        monthCommissionUsd += commissionUsd
        monthWaivedRevenueUsd += waivedRevenueUsd
      }

      if (transaction.type === 'HAWALA') {
        hawalaProfit += commissionUsd
        hawalaWaivedRevenue += waivedRevenueUsd
      } else if (transaction.type === 'EXCHANGE') {
        exchangeProfit += commissionUsd
        exchangeWaivedRevenue += waivedRevenueUsd
      }

      if (transaction.systemFeeWaiverReason === 'FREE_TRIAL') {
        freeTrialWaivedRevenue += waivedRevenueUsd
      } else if (transaction.systemFeeWaiverReason === 'FREE_ACCESS') {
        freeAccessWaivedRevenue += waivedRevenueUsd
      }

      if (transaction.createdAt >= revenueTrendStart && transaction.createdAt < tomorrow) {
        const dayKey = transaction.createdAt.toISOString().split('T')[0]
        revenueByDay.set(dayKey, (revenueByDay.get(dayKey) || 0) + commissionUsd)
      }
    }

    const last30Days = Array.from(revenueByDay.entries()).map(([date, revenue]) => ({
      date,
      revenue
    }))

    const creditRevenue = totalCreditRevenue._sum.price || 0
    const creditDiscountCost = totalCreditRevenue._sum.discountAmount || 0
    const subscriptionCreditsConsumed = totalSubscriptionCreditsConsumed._sum.price || 0
    const promotionRevenue = await normalizeAmountToUsd(totalPromotionRevenue._sum.amount || 0, 'AFN')
    const advertisementRevenue = await normalizeAmountToUsd(totalAdRevenue._sum.price || 0, 'AFN')
    const transactionRevenue = hawalaProfit + exchangeProfit
    const totalCollectedRevenue =
      transactionRevenue +
      creditRevenue +
      promotionRevenue +
      advertisementRevenue
    const totalSystemBenefit = totalCollectedRevenue

    const stats = {
      totalUsers,
      totalSarafs: approvedSarafs,
      pendingSarafs,
      totalTransactions,
      pendingTransactions,
      totalVolume: totalTransactionVolume._sum.toAmount || 0,
      systemHealth,
      users: {
        total: totalUsers,
        active: activeUsers
      },
      sarafs: {
        total: totalSarafs,
        approved: approvedSarafs,
        pending: pendingSarafs,
        rejected: rejectedSarafs,
        suspended: suspendedSarafs
      },
      transactions: {
        total: totalTransactions,
        completed: completedTransactions,
        pending: pendingTransactions,
        today: todayTransactions,
        thisMonth: monthTransactions
      },
      revenue: {
        total: totalCommissionUsd,
        waivedTotal: totalWaivedRevenue,
        today: todayCommissionUsd,
        waivedToday: todayWaivedRevenueUsd,
        thisMonth: monthCommissionUsd,
        waivedThisMonth: monthWaivedRevenueUsd,
        last30Days,
        breakdown: {
          hawalaProfit,
          hawalaWaivedRevenue,
          exchangeProfit,
          exchangeWaivedRevenue,
          transactionRevenue,
          creditRevenue,
          creditDiscountCost,
          subscriptionCreditsConsumed,
          promotionRevenue,
          advertisementRevenue,
          totalWaivedRevenue,
          freeTrialWaivedRevenue,
          freeAccessWaivedRevenue,
          totalCollectedRevenue,
          totalSystemBenefit,
        }
      },
      visitors: {
        newToday: newVisitorsToday,
        newThisMonth: newVisitorsThisMonth,
      },
      credits: {
        totalSold: totalCreditsSold._sum.amount || 0,
        pendingRequests: pendingCreditRequests
      },
      pending: {
        sarafs: pendingSarafs,
        transactions: pendingTransactions,
        creditRequests: pendingCreditRequests,
        subscriptions: pendingSubscriptions,
        advertisements: pendingAdvertisements
      },
      branches: {
        active: activeBranches
      },
      recentTransactions: recentTransactions.map(t => ({
        id: t.id,
        referenceCode: t.referenceCode,
        type: t.type,
        status: t.status,
        amount: t.fromAmount,
        currency: t.fromCurrency,
        commission: t.systemCommission,
        saraf: t.saraf.businessName,
        createdAt: t.createdAt
      })),
      lastUpdated: new Date().toISOString()
    }

    // Apply admin baseline reset display (does not delete history).
    try {
      const baselineRaw = await ConfigService.get('admin_stats_baseline_json', '')
      if (baselineRaw) {
        const baseline = JSON.parse(baselineRaw) as any
        const b = baseline?.values || {}

        const clamp = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0)
        const diff = (curr: number, base: any) => clamp(Number(curr || 0) - Number(base || 0))

        // DO NOT reset user/saraf counts - keep them real
        // stats.totalUsers = diff(stats.totalUsers, b.totalUsers)
        // stats.totalSarafs = diff(stats.totalSarafs, b.totalSarafs)
        // stats.pendingSarafs = diff(stats.pendingSarafs, b.pendingSarafs)
        
        // ONLY reset transaction counts and financial stats
        stats.totalTransactions = diff(stats.totalTransactions, b.totalTransactions)
        stats.pendingTransactions = diff(stats.pendingTransactions, b.pendingTransactions)
        stats.totalVolume = diff(stats.totalVolume, b.totalVolume)

        if (stats.revenue?.breakdown) {
          stats.revenue.total = diff(stats.revenue.total || 0, b.revenueTotal)
          stats.revenue.waivedTotal = diff(stats.revenue.waivedTotal || 0, b.revenueWaivedTotal)
          stats.revenue.today = diff(stats.revenue.today || 0, b.revenueToday)
          stats.revenue.waivedToday = diff(stats.revenue.waivedToday || 0, b.revenueWaivedToday)
          stats.revenue.thisMonth = diff(stats.revenue.thisMonth || 0, b.revenueThisMonth)
          stats.revenue.waivedThisMonth = diff(stats.revenue.waivedThisMonth || 0, b.revenueWaivedThisMonth)
          stats.revenue.breakdown.hawalaProfit = diff(stats.revenue.breakdown.hawalaProfit || 0, b?.revenue?.hawalaProfit)
          stats.revenue.breakdown.hawalaWaivedRevenue = diff(stats.revenue.breakdown.hawalaWaivedRevenue || 0, b?.revenue?.hawalaWaivedRevenue)
          stats.revenue.breakdown.exchangeProfit = diff(stats.revenue.breakdown.exchangeProfit || 0, b?.revenue?.exchangeProfit)
          stats.revenue.breakdown.exchangeWaivedRevenue = diff(stats.revenue.breakdown.exchangeWaivedRevenue || 0, b?.revenue?.exchangeWaivedRevenue)
          stats.revenue.breakdown.transactionRevenue = diff(stats.revenue.breakdown.transactionRevenue || 0, b?.revenue?.transactionRevenue)
          stats.revenue.breakdown.creditRevenue = diff(stats.revenue.breakdown.creditRevenue || 0, b?.revenue?.creditRevenue)
          stats.revenue.breakdown.creditDiscountCost = diff(stats.revenue.breakdown.creditDiscountCost || 0, b?.revenue?.creditDiscountCost)
          stats.revenue.breakdown.subscriptionCreditsConsumed = diff(stats.revenue.breakdown.subscriptionCreditsConsumed || 0, b?.revenue?.subscriptionCreditsConsumed)
          stats.revenue.breakdown.promotionRevenue = diff(stats.revenue.breakdown.promotionRevenue || 0, b?.revenue?.promotionRevenue)
          stats.revenue.breakdown.advertisementRevenue = diff(stats.revenue.breakdown.advertisementRevenue || 0, b?.revenue?.advertisementRevenue)
          stats.revenue.breakdown.totalWaivedRevenue = diff(stats.revenue.breakdown.totalWaivedRevenue || 0, b?.revenue?.totalWaivedRevenue)
          stats.revenue.breakdown.freeTrialWaivedRevenue = diff(stats.revenue.breakdown.freeTrialWaivedRevenue || 0, b?.revenue?.freeTrialWaivedRevenue)
          stats.revenue.breakdown.freeAccessWaivedRevenue = diff(stats.revenue.breakdown.freeAccessWaivedRevenue || 0, b?.revenue?.freeAccessWaivedRevenue)
          stats.revenue.breakdown.totalCollectedRevenue = diff(stats.revenue.breakdown.totalCollectedRevenue || 0, b?.revenue?.totalCollectedRevenue)
          stats.revenue.breakdown.totalSystemBenefit = diff(stats.revenue.breakdown.totalSystemBenefit || 0, b?.revenue?.totalSystemBenefit)
        }
      }
    } catch (baselineError) {
      console.error('Admin stats baseline parse error:', baselineError)
    }

    setCachedAdminStats(stats)

    return NextResponse.json(stats, {
      headers: { 'Cache-Control': 'private, no-store' }
    })

  } catch (error) {
    console.error('Admin stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    )
  }
}
