import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

// GET /api/public/market - Get market data (no authentication required)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'CURRENCY' or 'CRYPTO'

    const where: any = {};
    if (type) {
      where.type = type;
    }

    const marketData = await prisma.marketData.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { symbol: 'asc' },
      ],
    });

    return NextResponse.json({
      success: true,
      data: marketData,
      lastUpdate: new Date(),
    });
  } catch (error: any) {
    console.error('Public market data error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch market data' },
      { status: 500 }
    );
  }
}
