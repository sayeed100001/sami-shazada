import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { caseInsensitiveContains } from '@/lib/prisma-filters';
import { getActivePublicAdvertisements } from '@/lib/public-advertisements';

export const dynamic = 'force-dynamic'

// GET /api/public/sarafs - Public search for sarafs (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const now = new Date();
    const city = searchParams.get('city');
    const country = searchParams.get('country') || 'Afghanistan';
    const search = searchParams.get('search');
    const featured = searchParams.get('featured') === 'true';

    const where: any = {
      status: 'APPROVED',
      isActive: true,
      AND: [],
    };

    // Filter by featured
    if (featured) {
      where.AND.push({
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
      });
    }

    // Build branch filter for city/country
    const branchWhere: any = {
      isActive: true,
    };

    if (city) {
      branchWhere.city = caseInsensitiveContains(city);
    }

    if (country) {
      branchWhere.country = caseInsensitiveContains(country);
    }

    // Search filter
    if (search) {
      where.AND.push({
        OR: [
          { businessName: caseInsensitiveContains(search) },
          { businessAddress: caseInsensitiveContains(search) },
        ],
      });
    }

    const sarafs = await prisma.saraf.findMany({
      where: {
        ...where,
        branches: {
          some: branchWhere,
        },
      },
      select: {
        id: true,
        businessName: true,
        businessAddress: true,
        businessPhone: true,
        rating: true,
        totalTransactions: true,
        isFeatured: true,
        isPremium: true,
        premiumExpiry: true,
        createdAt: true,
        promotionRequests: {
          where: {
            status: 'APPROVED',
            type: 'FEATURED',
            expiresAt: { gte: now },
          },
          select: { id: true },
          take: 1,
        },
        branches: {
          where: branchWhere,
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            country: true,
            phone: true,
          },
        },
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [
        { isFeatured: 'desc' },
        { rating: 'desc' },
        { totalTransactions: 'desc' },
      ],
      take: 50,
    });

    const processedSarafs = sarafs.map(({ promotionRequests, premiumExpiry, ...rest }) => ({
      ...rest,
      isPremium: rest.isPremium && (!premiumExpiry || premiumExpiry >= now),
      isFeatured: rest.isFeatured || promotionRequests.length > 0,
    }));

    const advertisements = await getActivePublicAdvertisements();

    return NextResponse.json({
      success: true,
      data: {
        sarafs: processedSarafs,
        advertisements,
        total: processedSarafs.length,
      },
    });
  } catch (error: any) {
    console.error('Public sarafs search error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch sarafs' },
      { status: 500 }
    );
  }
}
