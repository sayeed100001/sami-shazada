import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sarafId } = await params

    const session = await getServerSession(authOptions)
    const canSeeContact = session?.user?.role === 'ADMIN'

    const saraf = await prisma.saraf.findUnique({
      where: { id: sarafId },
      include: {
        user: {
          select: {
            name: true,
            email: canSeeContact,
            phone: canSeeContact,
          },
        },
        rates: {
          where: { isActive: true },
          orderBy: { updatedAt: 'desc' },
          take: 10,
        },
        branches: {
          where: { isActive: true },
          orderBy: [{ createdAt: 'asc' }],
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            country: true,
            phone: true,
          },
        },
        transactions: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            toAmount: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            transactions: {
              where: { status: 'COMPLETED' },
            },
            rates: {
              where: { isActive: true },
            },
            favoritedBy: true,
          },
        },
      },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const completedTransactions = saraf._count.transactions
    const totalVolume = saraf.transactions.reduce((sum, transaction) => sum + transaction.toAmount, 0)
    const averageTransactionValue = completedTransactions > 0 ? totalVolume / completedTransactions : 0

    const completionSamples = await prisma.transaction.findMany({
      where: {
        sarafId: saraf.id,
        status: 'COMPLETED',
        completedAt: { not: null },
      },
      select: { createdAt: true, completedAt: true },
      orderBy: { completedAt: 'desc' },
      take: 50,
    })

    const averageResponseTime =
      completionSamples.length === 0
        ? null
        : `${Math.max(
            1,
            Math.round(
              completionSamples.reduce(
                (sum, transaction) => sum + (transaction.completedAt!.getTime() - transaction.createdAt.getTime()),
                0
              ) /
                completionSamples.length /
                60000
            )
          )} min`

    const customerSatisfaction = Math.round(Math.min(98, Math.max(75, (saraf.rating / 5) * 100)))

    return NextResponse.json({
      id: saraf.id,
      businessName: saraf.businessName,
      businessAddress: saraf.businessAddress,
      businessPhone: saraf.businessPhone,
      rating: saraf.rating,
      totalTransactions: saraf.totalTransactions,
      followerCount: saraf._count.favoritedBy,
      isActive: saraf.isActive,
      isPremium: saraf.isPremium,
      hawalaFeePercent: saraf.hawalaFeePercent,
      exchangeFeePercent: saraf.exchangeFeePercent,
      description: null,
      workingHours: null,
      services: [],
      branches: saraf.branches.map((branch) => ({
        id: branch.id,
        name: branch.name,
        address: branch.address,
        city: branch.city,
        country: branch.country,
        phone: branch.phone,
      })),
      rates: saraf.rates.map((rate) => ({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate,
        lastUpdate: rate.updatedAt.toISOString(),
      })),
      reviews: [],
      stats: {
        completedTransactions,
        averageResponseTime,
        customerSatisfaction,
        totalVolume: Math.round(totalVolume),
        averageTransactionValue: Math.round(averageTransactionValue),
        activeRates: saraf._count.rates,
        joinedDate: saraf.createdAt.toISOString(),
        lastActive: saraf.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Saraf detail API error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
      },
      { status: 500 }
    )
  }
}
