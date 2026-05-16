import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

// Simple in-memory cache
const statsCache = new Map<string, { data: any; timestamp: number }>()
const CACHE_TTL = 30000 // 30 seconds

function getScopedTransactionWhere(accessContext: {
  sarafId: string
  accessMode: 'OWNER' | 'BRANCH'
  accessibleBranchIds: string[]
}) {
  const where: any = {
    sarafId: accessContext.sarafId,
  }

  if (accessContext.accessMode === 'BRANCH') {
    where.OR = [
      { originBranchId: { in: accessContext.accessibleBranchIds } },
      { destinationBranchId: { in: accessContext.accessibleBranchIds } },
    ]
  }

  return where
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    // Check cache
    const scopedBranchKey =
      accessContext.accessMode === 'OWNER'
        ? 'owner'
        : [...accessContext.accessibleBranchIds].sort().join(',')
    const cacheKey = `stats:${accessContext.sarafId}:${accessContext.accessMode}:${scopedBranchKey}`
    const cached = statsCache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data)
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: accessContext.sarafId },
      include: {
        branches: {
          where:
            accessContext.accessMode === 'OWNER'
              ? { isActive: true }
              : { isActive: true, id: { in: accessContext.accessibleBranchIds } },
        },
      },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf profile not found' }, { status: 404 })
    }

    const now = new Date()
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const isPremiumActive = saraf.isPremium && (!saraf.premiumExpiry || saraf.premiumExpiry >= now)
    const transactionScopeWhere = getScopedTransactionWhere(accessContext)

    const [
      recentTransactions,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      totalCompletedVolume,
      activeRates,
      todayCustomersRaw,
      monthCustomersRaw,
      todayTransactions,
      todayRevenue,
      todayWaivedRevenue,
      monthTransactions,
      monthRevenue,
      monthWaivedRevenue,
      yesterdayTransactions,
      yesterdayRevenue,
    ] = await Promise.all([
      prisma.transaction.findMany({
        where: transactionScopeWhere,
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          referenceCode: true,
          status: true,
          type: true,
          fromAmount: true,
          toAmount: true,
          fromCurrency: true,
          toCurrency: true,
          senderName: true,
          receiverName: true,
          systemCommission: true,
          waivedSystemCommission: true,
          createdAt: true,
        },
      }),
      prisma.transaction.count({
        where: transactionScopeWhere,
      }),
      prisma.transaction.count({
        where: { ...transactionScopeWhere, status: 'PENDING' },
      }),
      prisma.transaction.count({
        where: { ...transactionScopeWhere, status: 'COMPLETED' },
      }),
      prisma.transaction.aggregate({
        where: { ...transactionScopeWhere, status: 'COMPLETED' },
        _sum: { toAmount: true },
      }),
      prisma.rate.count({
        where: { sarafId: accessContext.sarafId, isActive: true },
      }),
      prisma.transaction.findMany({
        where: {
          ...transactionScopeWhere,
          createdAt: { gte: today, lt: tomorrow },
        },
        select: {
          senderId: true,
          senderPhone: true,
        },
      }),
      prisma.transaction.findMany({
        where: {
          ...transactionScopeWhere,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        select: {
          senderId: true,
          senderPhone: true,
        },
      }),
      prisma.transaction.count({
        where: {
          ...transactionScopeWhere,
          createdAt: { gte: today, lt: tomorrow },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          ...transactionScopeWhere,
          status: 'COMPLETED',
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { toAmount: true, systemCommission: true },
      }),
      prisma.transaction.aggregate({
        where: {
          ...transactionScopeWhere,
          status: 'COMPLETED',
          createdAt: { gte: today, lt: tomorrow },
        },
        _sum: { waivedSystemCommission: true },
      }),
      prisma.transaction.count({
        where: {
          ...transactionScopeWhere,
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          ...transactionScopeWhere,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { toAmount: true, systemCommission: true },
      }),
      prisma.transaction.aggregate({
        where: {
          ...transactionScopeWhere,
          status: 'COMPLETED',
          createdAt: { gte: startOfMonth, lte: endOfMonth },
        },
        _sum: { waivedSystemCommission: true },
      }),
      prisma.transaction.count({
        where: {
          ...transactionScopeWhere,
          createdAt: { gte: yesterday, lt: today },
        },
      }),
      prisma.transaction.aggregate({
        where: {
          ...transactionScopeWhere,
          status: 'COMPLETED',
          createdAt: { gte: yesterday, lt: today },
        },
        _sum: { toAmount: true },
      }),
    ])

    const transactionsChange =
      yesterdayTransactions > 0
        ? ((todayTransactions - yesterdayTransactions) / yesterdayTransactions) * 100
        : 0

    const yesterdayRevenueTotal = yesterdayRevenue._sum.toAmount || 0
    const todayRevenueTotal = todayRevenue._sum.toAmount || 0
    const revenueChange =
      yesterdayRevenueTotal > 0
        ? ((todayRevenueTotal - yesterdayRevenueTotal) / yesterdayRevenueTotal) * 100
        : 0

    const getUniqueCustomerCount = (records: Array<{ senderId: string | null; senderPhone: string }>) =>
      new Set(
        records.map((record) => record.senderId || `guest:${record.senderPhone.replace(/\D/g, '') || 'unknown'}`)
      ).size

    const result = {
      status: saraf.status,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      totalVolume: totalCompletedVolume._sum.toAmount || 0,
      rating: saraf.rating,
      activeRates,
      creditBalance: saraf.creditBalance,
      isPremium: isPremiumActive,
      subscriptionType: saraf.subscriptionType,
      subscriptionExpiry: saraf.subscriptionExpiry,
      accessMode: accessContext.accessMode,
      accessibleBranches: accessContext.accessMode === 'BRANCH' ? saraf.branches.length : undefined,
      todayStats: {
        transactions: todayTransactions,
        revenue: todayRevenueTotal,
        commission: todayRevenue._sum.systemCommission || 0,
        waivedRevenue: todayWaivedRevenue._sum.waivedSystemCommission || 0,
        customers: getUniqueCustomerCount(todayCustomersRaw),
      },
      monthStats: {
        transactions: monthTransactions,
        revenue: monthRevenue._sum.toAmount || 0,
        commission: monthRevenue._sum.systemCommission || 0,
        waivedRevenue: monthWaivedRevenue._sum.waivedSystemCommission || 0,
        customers: getUniqueCustomerCount(monthCustomersRaw),
      },
      trends: {
        transactionsChange,
        revenueChange,
      },
      recentTransactions,
      branches: saraf.branches,
    }

    // Cache the result
    statsCache.set(cacheKey, { data: result, timestamp: Date.now() })
    
    return NextResponse.json(result)
  } catch (error) {
    console.error('Portal stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
