import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createUsdRevenueNormalizer } from '@/lib/revenue-normalization'

export const dynamic = 'force-dynamic'

function mapDateFilter(dateFilter: any, key: string) {
  if (!dateFilter?.createdAt) {
    return {}
  }

  return {
    [key]: dateFilter.createdAt,
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const reportType = searchParams.get('type') || 'overview'
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const dateFilter =
      startDate && endDate
        ? {
            createdAt: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }
        : {}

    try {
      const [overviewData, requestedReport] = await Promise.all([
        generateOverviewReport(dateFilter),
        generateRequestedReport(reportType, dateFilter),
      ])

      return NextResponse.json({
        ...overviewData,
        requestedReportType: reportType,
        requestedReport,
      })
    } catch (dbError) {
      console.error('Database error in reports:', dbError)
      return NextResponse.json(
        { error: 'Database connection failed while generating reports' },
        { status: 503 }
      )
    }
  } catch (error) {
    console.error('Admin reports error:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

async function generateRequestedReport(reportType: string, dateFilter: any) {
  switch (reportType) {
    case 'financial':
      return generateFinancialReport(dateFilter)
    case 'users':
      return generateUserReport(dateFilter)
    case 'sarafs':
      return generateSarafReport(dateFilter)
    case 'transactions':
      return generateTransactionReport(dateFilter)
    default:
      return generateOverviewReport(dateFilter)
  }
}

async function generateFinancialReport(dateFilter: any) {
  const [
    completedTransactions,
    creditRevenue,
    subscriptionCreditsConsumed,
    promotionRevenue,
    advertisementRevenue,
  ] =
    await Promise.all([
      prisma.transaction.findMany({
        where: { status: 'COMPLETED', ...dateFilter },
        select: {
          type: true,
          toAmount: true,
          fromCurrency: true,
          systemCommission: true,
          waivedSystemCommission: true,
          systemFeeWaiverReason: true,
          sarafCommission: true,
          systemDiscountAmount: true,
          createdAt: true,
          sarafId: true,
          senderId: true,
          senderName: true,
          saraf: {
            select: {
              businessName: true,
            },
          },
        },
      }),
      prisma.creditTransaction.aggregate({
        where: {
          status: 'APPROVED',
          type: 'PURCHASE',
          ...mapDateFilter(dateFilter, 'createdAt'),
        },
        _sum: {
          price: true,
          discountAmount: true,
        },
      }),
      prisma.subscription.aggregate({
        // Revenue impact (credits consumed) happens at activation time (startDate).
        // Rejected requests never get startDate set.
        where: {
          startDate: { not: null },
          ...mapDateFilter(dateFilter, 'startDate'),
        },
        _sum: { price: true },
      }),
      prisma.promotionRequest.aggregate({
        where: {
          status: { in: ['APPROVED', 'ACTIVE', 'EXPIRED'] },
          ...mapDateFilter(dateFilter, 'createdAt'),
        },
        _sum: { amount: true },
      }),
      prisma.advertisement.aggregate({
        where: {
          status: { in: ['ACTIVE', 'EXPIRED'] },
          ...mapDateFilter(dateFilter, 'requestedAt'),
        },
        _sum: { price: true },
      }),
    ])

  const transactionsByTypeMap = new Map<string, { type: string; total: number; count: number }>()
  const monthlyTrendMap = new Map<string, number>()
  const topSarafMap = new Map<string, { name: string; volume: number; transactions: number }>()
  const topUserMap = new Map<
    string,
    { userId: string | null; name: string; volume: number; transactions: number; discountSaved: number }
  >()

  let totalVolume = 0
  let totalFees = 0
  let totalBranchProfit = 0
  let totalDiscountCost = 0
  let totalWaivedSystemRevenue = 0
  let hawalaRevenue = 0
  let exchangeRevenue = 0
  let freeTrialWaivedSystemRevenue = 0
  let freeAccessWaivedSystemRevenue = 0
  const normalizeAmountToUsd = createUsdRevenueNormalizer()

  for (const transaction of completedTransactions) {
    const systemCommissionUsd = await normalizeAmountToUsd(
      transaction.systemCommission,
      transaction.fromCurrency
    )
    const branchProfitUsd = await normalizeAmountToUsd(
      transaction.sarafCommission,
      transaction.fromCurrency
    )
    const discountCostUsd = await normalizeAmountToUsd(
      transaction.systemDiscountAmount,
      transaction.fromCurrency
    )
    const waivedRevenueUsd = await normalizeAmountToUsd(
      transaction.waivedSystemCommission,
      transaction.fromCurrency
    )

    totalVolume += transaction.toAmount
    totalFees += systemCommissionUsd
    totalBranchProfit += branchProfitUsd
    totalDiscountCost += discountCostUsd
    totalWaivedSystemRevenue += waivedRevenueUsd

    if (transaction.systemFeeWaiverReason === 'FREE_TRIAL') {
      freeTrialWaivedSystemRevenue += waivedRevenueUsd
    } else if (transaction.systemFeeWaiverReason === 'FREE_ACCESS') {
      freeAccessWaivedSystemRevenue += waivedRevenueUsd
    }

    if (transaction.type === 'HAWALA') {
      hawalaRevenue += systemCommissionUsd
    } else if (transaction.type === 'EXCHANGE') {
      exchangeRevenue += systemCommissionUsd
    }

    const typeEntry = transactionsByTypeMap.get(transaction.type) || {
      type: transaction.type,
      total: 0,
      count: 0,
    }
    typeEntry.total += transaction.toAmount
    typeEntry.count += 1
    transactionsByTypeMap.set(transaction.type, typeEntry)

    const monthKey = transaction.createdAt.toISOString().slice(0, 7)
    monthlyTrendMap.set(monthKey, (monthlyTrendMap.get(monthKey) || 0) + transaction.toAmount)

    const sarafEntry = topSarafMap.get(transaction.sarafId) || {
      name: transaction.saraf.businessName,
      volume: 0,
      transactions: 0,
    }
    sarafEntry.volume += transaction.toAmount
    sarafEntry.transactions += 1
    topSarafMap.set(transaction.sarafId, sarafEntry)

    const userKey = transaction.senderId || `guest:${transaction.senderName}`
    const userEntry = topUserMap.get(userKey) || {
      userId: transaction.senderId,
      name: transaction.senderName,
      volume: 0,
      transactions: 0,
      discountSaved: 0,
    }
    userEntry.volume += transaction.toAmount
    userEntry.transactions += 1
    userEntry.discountSaved += discountCostUsd
    topUserMap.set(userKey, userEntry)
  }

  const creditRevenueAmount = creditRevenue._sum.price || 0
  const promotionRevenueAmount = await normalizeAmountToUsd(promotionRevenue._sum.amount || 0, 'AFN')
  const advertisementRevenueAmount = await normalizeAmountToUsd(
    advertisementRevenue._sum.price || 0,
    'AFN'
  )
  const totalCollectedRevenue =
    totalFees +
    creditRevenueAmount +
    promotionRevenueAmount +
    advertisementRevenueAmount

  return {
    reportingCurrency: 'USD',
    totalVolume,
    totalFees,
    hawalaRevenue,
    exchangeRevenue,
    totalBranchProfit,
    totalDiscountCost,
    totalWaivedSystemRevenue,
    freeTrialWaivedSystemRevenue,
    freeAccessWaivedSystemRevenue,
    netSystemRevenue: totalFees - totalDiscountCost,
    creditRevenue: creditRevenueAmount,
    creditDiscountCost: creditRevenue._sum.discountAmount || 0,
    subscriptionCreditsConsumed: subscriptionCreditsConsumed._sum.price || 0,
    promotionRevenue: promotionRevenueAmount,
    advertisementRevenue: advertisementRevenueAmount,
    totalCollectedRevenue,
    transactionsByType: Array.from(transactionsByTypeMap.values())
      .sort((left, right) => right.total - left.total)
      .map((entry) => ({
        type: entry.type,
        _sum: { toAmount: entry.total },
        _count: entry.count,
      })),
    monthlyTrends: Array.from(monthlyTrendMap.entries())
      .sort((left, right) => left[0].localeCompare(right[0]))
      .map(([month, amount]) => ({
        month,
        totalVolume: amount,
      })),
    topSarafs: Array.from(topSarafMap.values())
      .sort((left, right) => right.volume - left.volume)
      .slice(0, 5),
    topUsers: Array.from(topUserMap.values())
      .sort((left, right) => right.volume - left.volume)
      .slice(0, 10),
  }
}

async function generateUserReport(dateFilter: any) {
  const recentWindowStart = dateFilter.createdAt?.gte || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [totalUsers, newUsers, activeUsers, usersByRole] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({
      where: {
        createdAt: { gte: recentWindowStart },
      },
    }),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.groupBy({
      by: ['role'],
      _count: true,
    }),
  ])

  return {
    totalUsers,
    newUsers,
    activeUsers,
    usersByRole,
  }
}

async function generateSarafReport(dateFilter: any) {
  const [totalSarafs, approvedSarafs, pendingSarafs, premiumSarafs] = await Promise.all([
    prisma.saraf.count(),
    prisma.saraf.count({ where: { status: 'APPROVED' } }),
    prisma.saraf.count({ where: { status: 'PENDING' } }),
    prisma.saraf.count({ where: { isPremium: true } }),
  ])

  return {
    totalSarafs,
    approvedSarafs,
    pendingSarafs,
    premiumSarafs,
  }
}

async function generateTransactionReport(dateFilter: any) {
  const [totalTransactions, completedTransactions, pendingTransactions, transactionVolume] = await Promise.all([
    prisma.transaction.count({ where: dateFilter }),
    prisma.transaction.count({ where: { status: 'COMPLETED', ...dateFilter } }),
    prisma.transaction.count({ where: { status: 'PENDING', ...dateFilter } }),
    prisma.transaction.aggregate({
      where: { status: 'COMPLETED', ...dateFilter },
      _sum: { toAmount: true },
    }),
  ])

  return {
    totalTransactions,
    completedTransactions,
    pendingTransactions,
    totalVolume: transactionVolume._sum.toAmount || 0,
  }
}

async function generateOverviewReport(dateFilter: any) {
  const [userStats, sarafStats, transactionStats, financialStats] = await Promise.all([
    generateUserReport(dateFilter),
    generateSarafReport(dateFilter),
    generateTransactionReport(dateFilter),
    generateFinancialReport(dateFilter),
  ])

  return {
    users: userStats,
    sarafs: sarafStats,
    transactions: transactionStats,
    financial: financialStats,
    topSarafs: financialStats.topSarafs,
    topUsers: financialStats.topUsers,
  }
}
