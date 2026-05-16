import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'
import { getEffectivePromotionEffectsForSaraf } from '@/lib/promotion-effects'

export const dynamic = 'force-dynamic'

type AccessContext = {
  sarafId: string
  accessMode: 'OWNER' | 'BRANCH'
  accessibleBranchIds: string[]
}

type ReportTransaction = {
  originBranchId: string | null
  destinationBranchId: string | null
  status: string
  toAmount: number
  toCurrency: string
  systemCommission: number
  waivedSystemCommission: number
  systemFeeWaiverReason: string | null
  sarafCommission: number
  systemDiscountAmount: number
  createdAt: Date
}

function getScopedReportWhere(accessContext: AccessContext, createdAt: { gte: Date; lt?: Date }) {
  const where: any = {
    sarafId: accessContext.sarafId,
    createdAt,
  }

  if (accessContext.accessMode === 'BRANCH') {
    where.OR = [
      { originBranchId: { in: accessContext.accessibleBranchIds } },
      { destinationBranchId: { in: accessContext.accessibleBranchIds } },
    ]
  }

  return where
}

function resolvePeriodDays(period: string) {
  switch (period) {
    case '1d':
    case 'today':
      return 1
    case '7d':
      return 7
    case '90d':
      return 90
    case '365d':
    case '1y':
    case 'year':
      return 365
    case '30d':
    default:
      return 30
  }
}

function summarizeTransactions(transactions: ReportTransaction[]) {
  const completedTransactions = transactions.filter((transaction) => transaction.status === 'COMPLETED')
  const totalTransactions = transactions.length
  const totalVolume = completedTransactions.reduce((sum, transaction) => sum + transaction.toAmount, 0)
  const totalFees = completedTransactions.reduce((sum, transaction) => sum + transaction.systemCommission, 0)
  const totalWaivedSystemRevenue = completedTransactions.reduce(
    (sum, transaction) => sum + transaction.waivedSystemCommission,
    0
  )
  const freeTrialWaivedSystemRevenue = completedTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.systemFeeWaiverReason === 'FREE_TRIAL' ? transaction.waivedSystemCommission : 0),
    0
  )
  const freeAccessWaivedSystemRevenue = completedTransactions.reduce(
    (sum, transaction) =>
      sum + (transaction.systemFeeWaiverReason === 'FREE_ACCESS' ? transaction.waivedSystemCommission : 0),
    0
  )
  const totalBranchProfit = completedTransactions.reduce(
    (sum, transaction) => sum + transaction.sarafCommission,
    0
  )
  const totalDiscountCost = completedTransactions.reduce(
    (sum, transaction) => sum + transaction.systemDiscountAmount,
    0
  )

  return {
    totalTransactions,
    completedTransactions: completedTransactions.length,
    totalVolume,
    totalFees,
    totalWaivedSystemRevenue,
    freeTrialWaivedSystemRevenue,
    freeAccessWaivedSystemRevenue,
    totalBranchProfit,
    totalDiscountCost,
    netSystemRevenue: totalFees - totalDiscountCost,
    averageTransaction: totalTransactions > 0 ? totalVolume / totalTransactions : 0,
  }
}

function buildDailyStats(transactions: ReportTransaction[]) {
  const dailyStats = transactions.reduce(
    (
      accumulator: Record<
        string,
        {
          date: string
          transactions: number
          volume: number
          systemRevenue: number
          waivedSystemRevenue: number
          branchProfit: number
          discountCost: number
        }
      >,
      transaction
    ) => {
      const date = transaction.createdAt.toISOString().split('T')[0]
      if (!accumulator[date]) {
        accumulator[date] = {
          date,
          transactions: 0,
          volume: 0,
          systemRevenue: 0,
          waivedSystemRevenue: 0,
          branchProfit: 0,
          discountCost: 0,
        }
      }

      accumulator[date].transactions += 1
      if (transaction.status === 'COMPLETED') {
        accumulator[date].volume += transaction.toAmount
        accumulator[date].systemRevenue += transaction.systemCommission
        accumulator[date].waivedSystemRevenue += transaction.waivedSystemCommission
        accumulator[date].branchProfit += transaction.sarafCommission
        accumulator[date].discountCost += transaction.systemDiscountAmount
      }

      return accumulator
    },
    {}
  )

  return Object.values(dailyStats).sort(
    (left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()
  )
}

function buildBranchPerformance(
  branches: Array<{ id: string; name: string; city: string; country: string }>,
  transactions: ReportTransaction[]
) {
  const branchPerformance = new Map(
    branches.map((branch) => [
      branch.id,
      {
        branchId: branch.id,
        branchName: branch.name,
        city: branch.city,
        country: branch.country,
        totalTransactions: 0,
        completedTransactions: 0,
        incomingTransactions: 0,
        outgoingTransactions: 0,
        totalVolume: 0,
        systemRevenue: 0,
        waivedSystemRevenue: 0,
        branchProfit: 0,
        discountCost: 0,
      },
    ])
  )

  for (const transaction of transactions) {
    const touchedBranchIds = Array.from(
      new Set([transaction.originBranchId, transaction.destinationBranchId].filter(Boolean))
    ) as string[]

    for (const branchId of touchedBranchIds) {
      const stats = branchPerformance.get(branchId)
      if (!stats) continue

      stats.totalTransactions += 1
      if (transaction.originBranchId === branchId) stats.outgoingTransactions += 1
      if (transaction.destinationBranchId === branchId) stats.incomingTransactions += 1
      if (transaction.status === 'COMPLETED') {
        stats.completedTransactions += 1
        stats.totalVolume += transaction.toAmount
        stats.systemRevenue += transaction.systemCommission
        stats.waivedSystemRevenue += transaction.waivedSystemCommission
        stats.branchProfit += transaction.sarafCommission
        stats.discountCost += transaction.systemDiscountAmount
      }
    }
  }

  return Array.from(branchPerformance.values()).sort((left, right) => right.totalVolume - left.totalVolume)
}

export async function GET(request: NextRequest) {
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

    const saraf = await prisma.saraf.findUnique({
      where: { id: accessContext.sarafId },
      select: { status: true },
    })

    if (!saraf || saraf.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'
    const daysBack = resolvePeriodDays(period)
    const now = new Date()
    const promotionEffects = await getEffectivePromotionEffectsForSaraf(accessContext.sarafId, now)
    const hasDetailedReports = Boolean(promotionEffects.detailedReports)
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const previousStartDate = new Date(startDate.getTime() - daysBack * 24 * 60 * 60 * 1000)
    const startOfYear = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)

    const [periodTransactions, previousTransactions, yearTransactions, branches] = await Promise.all([
      prisma.transaction.findMany({
        where: getScopedReportWhere(accessContext, { gte: startDate }),
        orderBy: { createdAt: 'desc' },
        select: {
          originBranchId: true,
          destinationBranchId: true,
          status: true,
          toAmount: true,
          toCurrency: true,
          systemCommission: true,
          waivedSystemCommission: true,
          systemFeeWaiverReason: true,
          sarafCommission: true,
          systemDiscountAmount: true,
          createdAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: getScopedReportWhere(accessContext, { gte: previousStartDate, lt: startDate }),
        select: {
          originBranchId: true,
          destinationBranchId: true,
          status: true,
          toAmount: true,
          toCurrency: true,
          systemCommission: true,
          waivedSystemCommission: true,
          systemFeeWaiverReason: true,
          sarafCommission: true,
          systemDiscountAmount: true,
          createdAt: true,
        },
      }),
      prisma.transaction.findMany({
        where: getScopedReportWhere(accessContext, { gte: startOfYear }),
        select: {
          originBranchId: true,
          destinationBranchId: true,
          status: true,
          toAmount: true,
          toCurrency: true,
          systemCommission: true,
          waivedSystemCommission: true,
          systemFeeWaiverReason: true,
          sarafCommission: true,
          systemDiscountAmount: true,
          createdAt: true,
        },
      }),
      prisma.sarafBranch.findMany({
        where:
          accessContext.accessMode === 'OWNER'
            ? { sarafId: accessContext.sarafId, isActive: true }
            : {
                sarafId: accessContext.sarafId,
                isActive: true,
                id: { in: accessContext.accessibleBranchIds },
              },
        select: {
          id: true,
          name: true,
          city: true,
          country: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const currentSummary = summarizeTransactions(periodTransactions)
    const previousSummary = summarizeTransactions(previousTransactions)
    const monthlyGrowth =
      previousSummary.totalTransactions > 0
        ? ((currentSummary.totalTransactions - previousSummary.totalTransactions) /
            previousSummary.totalTransactions) *
          100
        : 0

    const currencyStats = periodTransactions
      .filter((transaction) => transaction.status === 'COMPLETED')
      .reduce((accumulator: Record<string, { currency: string; volume: number; count: number }>, transaction) => {
        const currency = transaction.toCurrency
        if (!accumulator[currency]) {
          accumulator[currency] = { currency, volume: 0, count: 0 }
        }

        accumulator[currency].volume += transaction.toAmount
        accumulator[currency].count += 1
        return accumulator
      }, {})

    const topCurrencies = Object.values(currencyStats)
      .sort((left, right) => right.volume - left.volume)
      .slice(0, 5)

    const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const periodSummaries = hasDetailedReports
      ? {
          day: summarizeTransactions(yearTransactions.filter((transaction) => transaction.createdAt >= dayStart)),
          week: summarizeTransactions(yearTransactions.filter((transaction) => transaction.createdAt >= weekStart)),
          month: summarizeTransactions(yearTransactions.filter((transaction) => transaction.createdAt >= monthStart)),
          year: summarizeTransactions(yearTransactions),
        }
      : undefined

    const branchPerformance = hasDetailedReports ? buildBranchPerformance(branches, periodTransactions) : undefined

    return NextResponse.json({
      ...currentSummary,
      monthlyGrowth,
      topCurrencies,
      dailyStats: buildDailyStats(periodTransactions),
      branchPerformance,
      periodSummaries,
      accessMode: accessContext.accessMode,
      selectedPeriod: period,
    })
  } catch (error) {
    console.error('Reports fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
