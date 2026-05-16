import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const SORT_OPTIONS = ['transactions', 'volume', 'discounts'] as const

type SortOption = (typeof SORT_OPTIONS)[number]

function normalizeSortOption(value: string | null): SortOption {
  if (value && SORT_OPTIONS.includes(value as SortOption)) {
    return value as SortOption
  }
  return 'transactions'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sortBy = normalizeSortOption(searchParams.get('by'))
    const limit = Math.max(1, Math.min(100, Number.parseInt(searchParams.get('limit') || '10', 10)))

    const users = await prisma.user.findMany({
      where: {
        role: 'USER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        vipLevel: true,
        totalTransactions: true,
        createdAt: true,
        transactions: {
          where: { status: 'COMPLETED' },
          select: {
            toAmount: true,
            systemDiscountAmount: true,
          },
        },
      },
      take: sortBy === 'transactions' ? limit : 250,
      orderBy: sortBy === 'transactions' ? { totalTransactions: 'desc' } : undefined,
    })

    const normalizedUsers = users
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        vipLevel: user.vipLevel,
        totalTransactions: user.totalTransactions,
        totalVolume: user.transactions.reduce((sum, transaction) => sum + transaction.toAmount, 0),
        totalDiscountSaved: user.transactions.reduce(
          (sum, transaction) => sum + transaction.systemDiscountAmount,
          0
        ),
        createdAt: user.createdAt,
      }))
      .sort((left, right) => {
        if (sortBy === 'volume') {
          return right.totalVolume - left.totalVolume
        }
        if (sortBy === 'discounts') {
          return right.totalDiscountSaved - left.totalDiscountSaved
        }
        return right.totalTransactions - left.totalTransactions
      })
      .slice(0, limit)

    return NextResponse.json({
      topUsers: normalizedUsers.map((user, index) => ({
        rank: index + 1,
        ...user,
      })),
      meta: {
        sortBy,
        limit,
      },
    })
  } catch (error) {
    console.error('Top users fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
