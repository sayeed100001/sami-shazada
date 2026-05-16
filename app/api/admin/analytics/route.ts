import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const period = sanitizeInput(searchParams.get('period') || '30')
    const days = parseInt(period)

    if (!Number.isFinite(days) || days <= 0 || days > 365) {
      return NextResponse.json({ error: 'Invalid period' }, { status: 400 })
    }

    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    const [totalTransactions, completedTransactions, totalVolume, activeSarafs] = await Promise.all([
      prisma.transaction.count({ where: { createdAt: { gte: startDate } } }),
      prisma.transaction.count({ where: { createdAt: { gte: startDate }, status: 'COMPLETED' } }),
      prisma.transaction.aggregate({ where: { createdAt: { gte: startDate }, status: 'COMPLETED' }, _sum: { fromAmount: true } }),
      prisma.saraf.count({ where: { isActive: true, status: 'APPROVED' } })
    ])

    return NextResponse.json(
      {
        totalTransactions,
        completedTransactions,
        completionRate: totalTransactions > 0 ? (completedTransactions / totalTransactions) * 100 : 0,
        totalVolume: totalVolume._sum.fromAmount || 0,
        activeSarafs
      },
      { headers: { 'Cache-Control': 'no-store' } }
    )

  } catch (error) {
    console.error('Analytics API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
