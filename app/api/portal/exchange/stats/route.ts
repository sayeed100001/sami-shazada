import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
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

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const where: any = {
      sarafId: accessContext.sarafId,
      type: 'EXCHANGE',
      status: 'COMPLETED'
    }

    if (accessContext.accessMode === 'BRANCH') {
      where.originBranchId = { in: accessContext.accessibleBranchIds }
    }

    // Get all time stats
    const [allTimeStats, todayStats, weekStats, monthStats, yearStats] = await Promise.all([
      prisma.transaction.aggregate({
        where,
        _count: { id: true },
        _sum: {
          fromAmount: true,
          sarafCommission: true,
          systemCommission: true,
          waivedSystemCommission: true,
          creditsDeducted: true
        }
      }),
      prisma.transaction.aggregate({
        where: { ...where, createdAt: { gte: startOfToday } },
        _count: { id: true },
        _sum: {
          fromAmount: true,
          sarafCommission: true,
          systemCommission: true,
          waivedSystemCommission: true,
          creditsDeducted: true
        }
      }),
      prisma.transaction.aggregate({
        where: { ...where, createdAt: { gte: startOfWeek } },
        _count: { id: true },
        _sum: {
          fromAmount: true,
          sarafCommission: true,
          systemCommission: true,
          waivedSystemCommission: true,
          creditsDeducted: true
        }
      }),
      prisma.transaction.aggregate({
        where: { ...where, createdAt: { gte: startOfMonth } },
        _count: { id: true },
        _sum: {
          fromAmount: true,
          sarafCommission: true,
          systemCommission: true,
          waivedSystemCommission: true,
          creditsDeducted: true
        }
      }),
      prisma.transaction.aggregate({
        where: { ...where, createdAt: { gte: startOfYear } },
        _count: { id: true },
        _sum: {
          fromAmount: true,
          sarafCommission: true,
          systemCommission: true,
          waivedSystemCommission: true,
          creditsDeducted: true
        }
      })
    ])

    // Get currency breakdown
    const currencyBreakdown = await prisma.transaction.groupBy({
      by: ['fromCurrency', 'toCurrency'],
      where,
      _count: { id: true },
      _sum: {
        fromAmount: true,
        toAmount: true,
        sarafCommission: true
      }
    })

    const branchBreakdownRaw = await prisma.transaction.groupBy({
      by: ['originBranchId'],
      where,
      _count: { id: true },
      _sum: {
        fromAmount: true,
        sarafCommission: true,
        systemCommission: true,
        waivedSystemCommission: true,
      },
      orderBy: {
        _sum: { sarafCommission: 'desc' },
      },
    })

    const branchIds = branchBreakdownRaw
      .map((item) => item.originBranchId)
      .filter((id): id is string => Boolean(id))

    const branches = branchIds.length
      ? await prisma.sarafBranch.findMany({
          where: { id: { in: branchIds } },
          select: { id: true, name: true, city: true },
        })
      : []

    const branchMap = new Map(branches.map((branch) => [branch.id, branch]))

    // Get recent exchanges
    const recentExchanges = await prisma.transaction.findMany({
      where,
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        referenceCode: true,
        fromCurrency: true,
        toCurrency: true,
        fromAmount: true,
        toAmount: true,
        rate: true,
        sarafCommission: true,
        systemCommission: true,
        waivedSystemCommission: true,
        creditsDeducted: true,
        senderName: true,
        createdAt: true,
        originBranch: {
          select: {
            name: true,
            city: true
          }
        }
      }
    })

    return NextResponse.json({
      today: {
        count: todayStats._count.id || 0,
        volume: todayStats._sum.fromAmount || 0,
        profit: todayStats._sum.sarafCommission || 0,
        systemFee: todayStats._sum.systemCommission || 0,
        waivedSystemFee: todayStats._sum.waivedSystemCommission || 0,
        creditsUsed: todayStats._sum.creditsDeducted || 0
      },
      week: {
        count: weekStats._count.id || 0,
        volume: weekStats._sum.fromAmount || 0,
        profit: weekStats._sum.sarafCommission || 0,
        systemFee: weekStats._sum.systemCommission || 0,
        waivedSystemFee: weekStats._sum.waivedSystemCommission || 0,
        creditsUsed: weekStats._sum.creditsDeducted || 0
      },
      month: {
        count: monthStats._count.id || 0,
        volume: monthStats._sum.fromAmount || 0,
        profit: monthStats._sum.sarafCommission || 0,
        systemFee: monthStats._sum.systemCommission || 0,
        waivedSystemFee: monthStats._sum.waivedSystemCommission || 0,
        creditsUsed: monthStats._sum.creditsDeducted || 0
      },
      year: {
        count: yearStats._count.id || 0,
        volume: yearStats._sum.fromAmount || 0,
        profit: yearStats._sum.sarafCommission || 0,
        systemFee: yearStats._sum.systemCommission || 0,
        waivedSystemFee: yearStats._sum.waivedSystemCommission || 0,
        creditsUsed: yearStats._sum.creditsDeducted || 0
      },
      allTime: {
        count: allTimeStats._count.id || 0,
        volume: allTimeStats._sum.fromAmount || 0,
        profit: allTimeStats._sum.sarafCommission || 0,
        systemFee: allTimeStats._sum.systemCommission || 0,
        waivedSystemFee: allTimeStats._sum.waivedSystemCommission || 0,
        creditsUsed: allTimeStats._sum.creditsDeducted || 0
      },
      currencyBreakdown: currencyBreakdown.map(item => ({
        pair: `${item.fromCurrency}/${item.toCurrency}`,
        count: item._count.id,
        volume: item._sum.fromAmount || 0,
        converted: item._sum.toAmount || 0,
        profit: item._sum.sarafCommission || 0
      })),
      branchBreakdown: branchBreakdownRaw.map((item) => {
        const branch = item.originBranchId ? branchMap.get(item.originBranchId) : null
        return {
          branchId: item.originBranchId || null,
          branchName: branch?.name || 'Unknown Branch',
          branchCity: branch?.city || '',
          count: item._count.id,
          volume: item._sum.fromAmount || 0,
          profit: item._sum.sarafCommission || 0,
          systemFee: item._sum.systemCommission || 0,
          waivedSystemFee: item._sum.waivedSystemCommission || 0,
        }
      }),
      recentExchanges
    })

  } catch (error) {
    console.error('Exchange stats fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange statistics' },
      { status: 500 }
    )
  }
}
