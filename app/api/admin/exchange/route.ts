import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sarafId = searchParams.get('sarafId')
    const skip = (page - 1) * limit

    const where: any = {
      type: 'EXCHANGE',
      status: 'COMPLETED'
    }

    if (sarafId) {
      where.sarafId = sarafId
    }

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfYear = new Date(now.getFullYear(), 0, 1)

    const [transactions, total, todayStats, monthStats, yearStats, topSarafs] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          saraf: {
            select: {
              id: true,
              businessName: true,
              businessPhone: true
            }
          },
          originBranch: {
            select: {
              name: true,
              city: true
            }
          },
          sender: {
            select: {
              name: true,
              email: true,
              vipLevel: true
            }
          }
        }
      }),
      prisma.transaction.count({ where }),
      prisma.transaction.aggregate({
        where: { ...where, createdAt: { gte: startOfToday } },
        _count: { id: true },
        _sum: {
          fromAmount: true,
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
          systemCommission: true,
          waivedSystemCommission: true,
          creditsDeducted: true
        }
      }),
      prisma.transaction.groupBy({
        by: ['sarafId'],
        where: { ...where, createdAt: { gte: startOfMonth } },
        _count: { id: true },
        _sum: {
          fromAmount: true,
          systemCommission: true,
          waivedSystemCommission: true
        },
        orderBy: {
          _sum: {
            systemCommission: 'desc'
          }
        },
        take: 10
      })
    ])

    const sarafIds = topSarafs.map(s => s.sarafId)
    const sarafDetails = await prisma.saraf.findMany({
      where: { id: { in: sarafIds } },
      select: {
        id: true,
        businessName: true
      }
    })

    const topSarafsWithNames = topSarafs.map(stat => {
      const saraf = sarafDetails.find(s => s.id === stat.sarafId)
      return {
        sarafId: stat.sarafId,
        sarafName: saraf?.businessName || 'Unknown',
        count: stat._count.id,
        volume: stat._sum.fromAmount || 0,
        systemRevenue: stat._sum.systemCommission || 0,
        waivedSystemRevenue: stat._sum.waivedSystemCommission || 0
      }
    })

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      },
      stats: {
        today: {
          count: todayStats._count.id || 0,
          volume: todayStats._sum.fromAmount || 0,
          systemRevenue: todayStats._sum.systemCommission || 0,
          waivedSystemRevenue: todayStats._sum.waivedSystemCommission || 0,
          creditsCollected: todayStats._sum.creditsDeducted || 0
        },
        month: {
          count: monthStats._count.id || 0,
          volume: monthStats._sum.fromAmount || 0,
          systemRevenue: monthStats._sum.systemCommission || 0,
          waivedSystemRevenue: monthStats._sum.waivedSystemCommission || 0,
          creditsCollected: monthStats._sum.creditsDeducted || 0
        },
        year: {
          count: yearStats._count.id || 0,
          volume: yearStats._sum.fromAmount || 0,
          systemRevenue: yearStats._sum.systemCommission || 0,
          waivedSystemRevenue: yearStats._sum.waivedSystemCommission || 0,
          creditsCollected: yearStats._sum.creditsDeducted || 0
        }
      },
      topSarafs: topSarafsWithNames
    })

  } catch (error) {
    console.error('Admin exchange fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange data' },
      { status: 500 }
    )
  }
}
