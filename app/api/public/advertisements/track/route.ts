import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { syncExpiredAdvertisements } from '@/lib/public-advertisements'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const advertisementId = typeof body.id === 'string' ? body.id.trim() : ''
    const eventType = typeof body.event === 'string' ? body.event.trim().toUpperCase() : ''

    if (!advertisementId || !['IMPRESSION', 'CLICK'].includes(eventType)) {
      return NextResponse.json({ error: 'Invalid advertisement tracking payload' }, { status: 400 })
    }

    const now = new Date()
    await syncExpiredAdvertisements(now)

    const advertisement = await prisma.advertisement.findFirst({
      where: {
        id: advertisementId,
        status: 'ACTIVE',
        AND: [
          {
            OR: [{ startDate: null }, { startDate: { lte: now } }],
          },
          {
            OR: [{ endDate: null }, { endDate: { gte: now } }],
          },
        ],
      },
      select: {
        id: true,
      },
    })

    if (!advertisement) {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }

    await prisma.advertisement.update({
      where: { id: advertisementId },
      data:
        eventType === 'CLICK'
          ? { clicks: { increment: 1 } }
          : { impressions: { increment: 1 } },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Public advertisement tracking error:', error)
    return NextResponse.json({ error: 'Failed to track advertisement event' }, { status: 500 })
  }
}
