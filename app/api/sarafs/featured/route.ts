import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const now = new Date()

    const sarafs = await prisma.saraf.findMany({
      where: {
        isActive: true,
        status: 'APPROVED',
        OR: [
          { isFeatured: true },
          { isPremium: true, premiumExpiry: null },
          { isPremium: true, premiumExpiry: { gte: now } },
          {
            promotionRequests: {
              some: {
                status: 'APPROVED',
                type: 'FEATURED',
                expiresAt: { gte: now },
              },
            },
          },
          {
            advertisements: {
              some: {
                status: 'ACTIVE',
                startDate: { lte: now },
                endDate: { gte: now },
              },
            },
          },
        ],
      },
      include: {
        branches: {
          where: { isActive: true },
          take: 1,
          select: {
            city: true,
            phone: true,
          },
        },
        rates: {
          where: {
            isActive: true,
            OR: [{ validUntil: null }, { validUntil: { gt: now } }],
          },
          take: 10,
          orderBy: { updatedAt: 'desc' },
        },
        advertisements: {
          where: {
            status: 'ACTIVE',
            startDate: { lte: now },
            endDate: { gte: now },
          },
          orderBy: { price: 'desc' },
          take: 1,
        },
        promotionRequests: {
          where: {
            status: 'APPROVED',
            type: 'FEATURED',
            expiresAt: { gte: now },
          },
          take: 1,
          select: { id: true },
        },
      },
      orderBy: [{ isFeatured: 'desc' }, { isPremium: 'desc' }, { rating: 'desc' }],
      take: 6,
    })

    const formattedSarafs = sarafs.map((saraf) => {
      const usdRate = saraf.rates.find(
        (rate) => rate.fromCurrency === 'USD' && rate.toCurrency === 'AFN'
      )
      const eurRate = saraf.rates.find(
        (rate) => rate.fromCurrency === 'EUR' && rate.toCurrency === 'AFN'
      )
      const pkrRate = saraf.rates.find(
        (rate) => rate.fromCurrency === 'PKR' && rate.toCurrency === 'AFN'
      )

      const isPremiumActive =
        saraf.isPremium && (!saraf.premiumExpiry || saraf.premiumExpiry >= now)
      const hasActiveFeaturedPromotion = saraf.promotionRequests.length > 0

      return {
        id: saraf.id,
        businessName: saraf.businessName,
        rating: saraf.rating,
        totalTransactions: saraf.totalTransactions,
        city: saraf.branches[0]?.city || 'Kabul',
        phone: saraf.branches[0]?.phone || saraf.businessPhone,
        isPremium: isPremiumActive,
        isFeatured: saraf.isFeatured || hasActiveFeaturedPromotion,
        promotionType:
          saraf.advertisements[0]?.position || (hasActiveFeaturedPromotion ? 'FEATURED' : null),
        rates: {
          usdToAfn: usdRate?.buyRate || 0,
          eurToAfn: eurRate?.buyRate || 0,
          pkrToAfn: pkrRate?.buyRate || 0,
        },
      }
    })

    return NextResponse.json({
      success: true,
      sarafs: formattedSarafs,
    })
  } catch (error) {
    console.error('Featured sarafs fetch error:', error)
    return NextResponse.json(
      {
        success: true,
        sarafs: [],
      },
      {
        status: 200,
        headers: {
          'X-Featured-Sarafs-Fallback': 'true',
        },
      }
    )
  }
}
