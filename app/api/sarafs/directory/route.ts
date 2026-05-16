import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { type PromotionEffects } from '@/lib/promotion-effects'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const featured = searchParams.get('featured') === 'true'
    const search = searchParams.get('search') || ''
    const city = searchParams.get('city') || 'all'
    const sort = searchParams.get('sort') || 'rating'
    const now = new Date()

    const cityTokens =
      city === 'all'
        ? []
        : city
            .split('|')
            .map((value) => value.trim())
            .filter(Boolean)
            .slice(0, 6)

    const whereClause: any = {
      status: 'APPROVED',
      isActive: true,
      AND: [],
    }

    if (featured) {
      whereClause.AND.push({
        OR: [
          { isFeatured: true },
          {
            promotionRequests: {
              some: {
                status: 'APPROVED',
                type: 'FEATURED',
                expiresAt: { gte: now },
              },
            },
          },
        ],
      })
    }

    if (search) {
      whereClause.AND.push({
        OR: [
          { businessName: { contains: search, mode: 'insensitive' } },
          { businessAddress: { contains: search, mode: 'insensitive' } },
          { businessPhone: { contains: search, mode: 'insensitive' } },
        ],
      })
    }

    if (cityTokens.length > 0) {
      whereClause.AND.push({
        branches: {
          some: {
            isActive: true,
            ...(cityTokens.length > 1
              ? { OR: cityTokens.map((token) => ({ city: { contains: token, mode: 'insensitive' } })) }
              : { city: { contains: cityTokens[0], mode: 'insensitive' } }),
          },
        },
      })
    }

    // Determine sort order
    let orderBy: any[] = []
    if (sort === 'rating') {
      orderBy = [{ rating: 'desc' }]
    } else if (sort === 'transactions') {
      orderBy = [{ totalTransactions: 'desc' }]
    } else if (sort === 'name') {
      orderBy = [{ businessName: 'asc' }]
    } else {
      orderBy = [
        { isPremium: 'desc' },
        { isFeatured: 'desc' },
        { rating: 'desc' },
        { totalTransactions: 'desc' },
        { createdAt: 'desc' },
      ]
    }

    const promotionConfigs = await prisma.promotionConfig.findMany({
      where: { isActive: true },
      select: { type: true, effects: true },
    })
    const effectsByType = new Map<string, PromotionEffects>()
    for (const cfg of promotionConfigs) {
      effectsByType.set(cfg.type, ((cfg as any).effects || {}) as PromotionEffects)
    }

    const includeBranches =
      cityTokens.length > 0
        ? {
            where: {
              isActive: true,
              ...(cityTokens.length > 1
                ? { OR: cityTokens.map((token) => ({ city: { contains: token, mode: 'insensitive' } })) }
                : { city: { contains: cityTokens[0], mode: 'insensitive' } }),
            },
            take: 4,
            orderBy: { updatedAt: 'desc' as const },
            select: { id: true, name: true, address: true, city: true, country: true, phone: true },
          }
        : {
            where: { isActive: true },
            take: 1,
            orderBy: { updatedAt: 'desc' as const },
            select: { id: true, name: true, address: true, city: true, country: true, phone: true },
          }

    const sarafs = await prisma.saraf.findMany({
      where: whereClause,
      include: {
        branches: includeBranches as any,
        rates: {
          where: {
            isActive: true,
            OR: [{ validUntil: { gt: new Date() } }, { validUntil: null }],
          },
          take: 5,
          orderBy: { updatedAt: 'desc' },
        },
        user: {
          select: {
            name: true,
            phone: true,
          },
        },
        _count: {
          select: {
            transactions: {
              where: { status: 'COMPLETED' },
            },
            ratings: true,
            favoritedBy: true,
          },
        },
        promotionRequests: {
          where: {
            status: 'APPROVED',
            OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
          },
          take: 10,
          select: { id: true, type: true },
        },
      },
      orderBy,
      take: featured ? 10 : 100, // Increased limit for directory view
    })

    const mapped = sarafs.map((saraf) => {
      let directoryWeight = 0
      for (const pr of saraf.promotionRequests || []) {
        const eff = effectsByType.get(pr.type)
        const w = Number((eff as any)?.directoryWeight)
        if (Number.isFinite(w)) directoryWeight += Math.trunc(w)
      }

      const primaryBranch = (saraf as any).branches?.[0]

      return {
        id: saraf.id,
        businessName: saraf.businessName,
        businessAddress: saraf.businessAddress,
        businessPhone: saraf.businessPhone,
        city: primaryBranch?.city || '',
        country: primaryBranch?.country || '',
        branches: Array.isArray((saraf as any).branches)
          ? (saraf as any).branches.map((branch: any) => ({
              id: branch.id,
              name: branch.name,
              address: branch.address,
              city: branch.city,
              country: branch.country,
              phone: branch.phone,
            }))
          : [],
        rating: Number(saraf.rating.toFixed(1)),
        totalTransactions: saraf.totalTransactions,
        completedTransactions: saraf._count.transactions,
        totalRatings: saraf._count.ratings,
        followerCount: saraf._count.favoritedBy,
        isActive: saraf.isActive,
        isPremium: saraf.isPremium && (!saraf.premiumExpiry || saraf.premiumExpiry >= now),
        isFeatured: saraf.isFeatured || saraf.promotionRequests.some((p) => p.type === 'FEATURED'),
        directoryWeight,
        hawalaFeePercent: saraf.hawalaFeePercent || 0,
        exchangeFeePercent: saraf.exchangeFeePercent || 0,
        ownerName: saraf.user.name,
        contactPhone: saraf.user.phone,
        createdAt: saraf.createdAt,
        rates: saraf.rates.map((rate) => ({
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency,
          buyRate: rate.buyRate,
          sellRate: rate.sellRate,
          lastUpdate: rate.updatedAt,
        })),
      }
    })

    // Always prioritize premium/featured results (product promise), then apply the chosen sort.
    mapped.sort((a, b) => {
      const weight = (b.directoryWeight || 0) - (a.directoryWeight || 0)
      if (weight !== 0) return weight
      const premium = Number(Boolean(b.isPremium)) - Number(Boolean(a.isPremium))
      if (premium !== 0) return premium
      const featuredSort = Number(Boolean(b.isFeatured)) - Number(Boolean(a.isFeatured))
      if (featuredSort !== 0) return featuredSort

      if (sort === 'transactions') return (b.totalTransactions || 0) - (a.totalTransactions || 0)
      if (sort === 'city') return String(a.city || '').localeCompare(String(b.city || ''))
      if (sort === 'name') return String(a.businessName || '').localeCompare(String(b.businessName || ''))
      // default: rating
      return (b.rating || 0) - (a.rating || 0)
    })

    return NextResponse.json({
      sarafs: mapped,
      total: mapped.length,
      featured: featured
    })
  } catch (error) {
    console.error('Saraf directory error:', error)
    return NextResponse.json({ error: 'Failed to fetch sarafs' }, { status: 500 })
  }
}
