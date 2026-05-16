import { NextRequest, NextResponse } from 'next/server'
import {
  getActivePublicAdvertisements,
  groupAdvertisementsByPlacement,
  normalizeAdvertisementPositions,
} from '@/lib/public-advertisements'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const positions = normalizeAdvertisementPositions(searchParams.get('positions'))
    const advertisements = await getActivePublicAdvertisements(positions)

    return NextResponse.json({
      success: true,
      data: {
        advertisements,
        grouped: groupAdvertisementsByPlacement(advertisements),
        total: advertisements.length,
      },
    })
  } catch (error) {
    console.error('Public advertisements fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch advertisements' },
      { status: 500 }
    )
  }
}
