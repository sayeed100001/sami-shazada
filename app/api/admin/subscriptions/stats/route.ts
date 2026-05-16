import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      totalSubscriptions,
      pendingSubscriptions,
      activeSubscriptions,
      expiredSubscriptions,
      cancelledSubscriptions,
      thisMonthActivated,
      lastMonthActivated,
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
    ] = await Promise.all([
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'PENDING' } }),
      prisma.subscription.count({
        where: {
          status: 'ACTIVE',
          endDate: { gte: now },
        },
      }),
      prisma.subscription.count({
        where: {
          status: { in: ['ACTIVE', 'EXPIRED'] },
          endDate: { lt: now },
        },
      }),
      prisma.subscription.count({ where: { status: 'CANCELLED' } }),
      prisma.subscription.count({
        where: {
          startDate: { not: null, gte: startOfMonth, lt: startOfNextMonth },
        },
      }),
      prisma.subscription.count({
        where: {
          startDate: { not: null, gte: startOfLastMonth, lt: endOfLastMonth },
        },
      }),
      prisma.subscription.aggregate({
        where: {
          startDate: { not: null },
        },
        _sum: {
          price: true,
        },
      }),
      prisma.subscription.aggregate({
        where: {
          startDate: { not: null, gte: startOfMonth, lt: startOfNextMonth },
        },
        _sum: {
          price: true,
        },
      }),
      prisma.subscription.aggregate({
        where: {
          startDate: { not: null, gte: startOfLastMonth, lt: endOfLastMonth },
        },
        _sum: {
          price: true,
        },
      }),
    ])

    const stats = {
      total: totalSubscriptions,
      pending: pendingSubscriptions,
      active: activeSubscriptions,
      expired: expiredSubscriptions,
      cancelled: cancelledSubscriptions,
      revenue: {
        total: totalRevenue._sum.price || 0,
        thisMonth: thisMonthRevenue._sum.price || 0,
        lastMonth: lastMonthRevenue._sum.price || 0,
      },
      activated: {
        thisMonth: thisMonthActivated,
        lastMonth: lastMonthActivated,
      },
    }

    return NextResponse.json({ stats })
  } catch (error) {
    console.error('Subscription stats error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscription statistics' },
      { status: 500 }
    )
  }
}
