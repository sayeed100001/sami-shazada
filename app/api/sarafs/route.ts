import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city') || 'all'
    const sort = searchParams.get('sort') || 'rating'
    const now = new Date()

    let orderBy: any = { rating: 'desc' }
    
    switch (sort) {
      case 'transactions':
        orderBy = { totalTransactions: 'desc' }
        break
      case 'name':
        orderBy = { businessName: 'asc' }
        break
      default:
        orderBy = { rating: 'desc' }
    }

    const whereClause: any = {
      status: 'APPROVED',
      isActive: true,
      AND: []
    }

    if (search) {
      whereClause.AND.push({
        OR: [
          { businessName: { contains: search } },
          { businessAddress: { contains: search } }
        ]
      })
    }

    if (city !== 'all') {
      whereClause.AND.push({
        businessAddress: { contains: city }
      })
    }

    const sarafs = await prisma.saraf.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        },
        rates: {
          where: {
            isActive: true,
            OR: [
              { validUntil: { gt: new Date() } },
              { validUntil: null }
            ]
          },
          take: 5,
          orderBy: { updatedAt: 'desc' }
        }
      },
      orderBy: [
        { isPremium: 'desc' },
        orderBy
      ]
    })

    const transformedSarafs = sarafs.map(saraf => ({
      id: saraf.id,
      businessName: saraf.businessName,
      businessAddress: saraf.businessAddress,
      businessPhone: saraf.businessPhone,
      rating: saraf.rating,
      totalTransactions: saraf.totalTransactions,
      isActive: saraf.isActive,
      isPremium: saraf.isPremium && (!saraf.premiumExpiry || saraf.premiumExpiry >= now),
      rates: saraf.rates.map(rate => ({
        fromCurrency: rate.fromCurrency,
        toCurrency: rate.toCurrency,
        buyRate: rate.buyRate,
        sellRate: rate.sellRate
      }))
    }))

    return NextResponse.json(transformedSarafs)
  } catch (error) {
    console.error('Sarafs API error:', error)
    return NextResponse.json({ error: 'Failed to fetch sarafs' }, { status: 500 })
  }
}
