import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { cacheGet, cacheSet, isRedisAvailable } from '@/lib/redis'

export const dynamic = 'force-dynamic'
export const revalidate = 60

async function getCachedStats(sarafId: string) {
  if (!isRedisAvailable()) return null
  
  const cached = await cacheGet<any>(`portal:stats:${sarafId}`)
  return cached
}

async function setCachedStats(sarafId: string, stats: any) {
  if (!isRedisAvailable()) return
  
  await cacheSet(`portal:stats:${sarafId}`, stats, 60)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saraf = await prisma.saraf.findFirst({
      where: { userId: session.user.id },
      include: {
        branches: { 
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            city: true,
            phone: true
          }
        },
        transactions: {
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
            createdAt: true
          }
        }
      }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf profile not found' }, { status: 404 })
    }

    const cached = await getCachedStats(saraf.id)
    if (cached) {
      return NextResponse.json({
        ...cached,
        recentTransactions: saraf.transactions,
        branches: saraf.branches
      })
    }

    const now = new Date()
    const isPremiumActive = saraf.isPremium && (!saraf.premiumExpiry || saraf.premiumExpiry >= now)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59)

    const [statusGroups, activeRates, todayData, monthData, yesterdayData] = await Promise.all([
      prisma.transaction.groupBy({
        by: ['status'],
        where: { sarafId: saraf.id },
        _count: { id: true },
        _sum: { toAmount: true, systemCommission: true }
      }),
      prisma.rate.count({
        where: { sarafId: saraf.id, isActive: true }
      }),
      prisma.transaction.findMany({
        where: {
          sarafId: saraf.id,
          createdAt: { gte: today, lt: tomorrow }
        },
        select: {
          senderId: true,
          senderPhone: true,
          status: true,
          toAmount: true,
          systemCommission: true
        }
      }),
      prisma.transaction.findMany({
        where: {
          sarafId: saraf.id,
          createdAt: { gte: startOfMonth, lte: endOfMonth }
        },
        select: {
          senderId: true,
          senderPhone: true,
          status: true,
          toAmount: true,
          systemCommission: true,
          createdAt: true
        }
      }),
      prisma.transaction.findMany({
        where: {
          sarafId: saraf.id,
          createdAt: { gte: yesterday, lt: today }
        },
        select: {
          status: true,
          toAmount: true
        }
      })
    ])

    const totalTransactions = statusGroups.reduce((sum, g) => sum + g._count.id, 0)
    const pendingTransactions = statusGroups.find(g => g.status === 'PENDING')?._count.id || 0
    const completedTransactions = statusGroups.find(g => g.status === 'COMPLETED')?._count.id || 0
    const totalCompletedVolume = statusGroups.find(g => g.status === 'COMPLETED')?._sum.toAmount || 0

    const todayCompleted = todayData.filter(t => t.status === 'COMPLETED')
    const todayRevenue = todayCompleted.reduce((sum, t) => sum + (t.toAmount || 0), 0)
    const todayCommission = todayCompleted.reduce((sum, t) => sum + (t.systemCommission || 0), 0)

    const monthCompleted = monthData.filter(t => t.status === 'COMPLETED')
    const monthRevenue = monthCompleted.reduce((sum, t) => sum + (t.toAmount || 0), 0)
    const monthCommission = monthCompleted.reduce((sum, t) => sum + (t.systemCommission || 0), 0)

    const yesterdayCompleted = yesterdayData.filter(t => t.status === 'COMPLETED')
    const yesterdayRevenue = yesterdayCompleted.reduce((sum, t) => sum + (t.toAmount || 0), 0)

    const transactionsChange = yesterdayData.length > 0 
      ? ((todayData.length - yesterdayData.length) / yesterdayData.length) * 100
      : 0

    const revenueChange = yesterdayRevenue > 0
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100
      : 0

    const getUniqueCustomerCount = (records: Array<{ senderId: string | null; senderPhone: string }>) =>
      new Set(
        records.map((record) => record.senderId || `guest:${record.senderPhone.replace(/\D/g, '') || 'unknown'}`)
      ).size

    const stats = {
      status: saraf.status,
      totalTransactions,
      pendingTransactions,
      completedTransactions,
      totalVolume: totalCompletedVolume,
      rating: saraf.rating,
      activeRates,
      creditBalance: saraf.creditBalance,
      isPremium: isPremiumActive,
      subscriptionType: saraf.subscriptionType,
      subscriptionExpiry: saraf.subscriptionExpiry,
      todayStats: {
        transactions: todayData.length,
        revenue: todayRevenue,
        commission: todayCommission,
        customers: getUniqueCustomerCount(todayData)
      },
      monthStats: {
        transactions: monthData.length,
        revenue: monthRevenue,
        commission: monthCommission,
        customers: getUniqueCustomerCount(monthData)
      },
      trends: {
        transactionsChange,
        revenueChange
      }
    }

    await setCachedStats(saraf.id, stats)

    return NextResponse.json({
      ...stats,
      recentTransactions: saraf.transactions,
      branches: saraf.branches
    })

  } catch (error) {
    console.error('Portal stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch statistics' }, { status: 500 })
  }
}
