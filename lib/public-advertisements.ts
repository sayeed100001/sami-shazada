import { prisma } from '@/lib/prisma'
import { ADVERTISEMENT_POSITIONS, type AdvertisementPosition, isAdvertisementPosition } from '@/lib/advertising'

export interface PublicAdvertisementRecord {
  id: string
  position: AdvertisementPosition
  title: string
  description: string | null
  imageUrl: string | null
  linkUrl: string | null
  impressions: number
  clicks: number
  startDate: Date | null
  endDate: Date | null
  saraf: {
    id: string
    businessName: string
    businessPhone: string
  }
}

export type AdvertisementPlacementMap = Record<AdvertisementPosition, PublicAdvertisementRecord[]>

export function createEmptyAdvertisementPlacementMap(): AdvertisementPlacementMap {
  return ADVERTISEMENT_POSITIONS.reduce((accumulator, position) => {
    accumulator[position] = []
    return accumulator
  }, {} as AdvertisementPlacementMap)
}

export function normalizeAdvertisementPositions(rawValue: string | null): AdvertisementPosition[] {
  if (!rawValue) {
    return [...ADVERTISEMENT_POSITIONS]
  }

  const requestedPositions = rawValue
    .split(',')
    .map((value) => value.trim().toUpperCase())
    .filter((value): value is AdvertisementPosition => isAdvertisementPosition(value))

  return requestedPositions.length > 0 ? requestedPositions : [...ADVERTISEMENT_POSITIONS]
}

export async function syncExpiredAdvertisements(referenceDate = new Date()) {
  await prisma.advertisement.updateMany({
    where: {
      status: 'ACTIVE',
      endDate: {
        lt: referenceDate,
      },
    },
    data: {
      status: 'EXPIRED',
    },
  })
}

export async function getActivePublicAdvertisements(
  positions: AdvertisementPosition[] = [...ADVERTISEMENT_POSITIONS],
  referenceDate = new Date()
): Promise<PublicAdvertisementRecord[]> {
  await syncExpiredAdvertisements(referenceDate)

  return prisma.advertisement.findMany({
    where: {
      status: 'ACTIVE',
      position: {
        in: positions,
      },
      AND: [
        {
          OR: [{ startDate: null }, { startDate: { lte: referenceDate } }],
        },
        {
          OR: [{ endDate: null }, { endDate: { gte: referenceDate } }],
        },
      ],
      saraf: {
        isActive: true,
        status: 'APPROVED',
      },
    },
    select: {
      id: true,
      position: true,
      title: true,
      description: true,
      imageUrl: true,
      linkUrl: true,
      impressions: true,
      clicks: true,
      startDate: true,
      endDate: true,
      saraf: {
        select: {
          id: true,
          businessName: true,
          businessPhone: true,
        },
      },
    },
    orderBy: [{ position: 'asc' }, { approvedAt: 'desc' }, { requestedAt: 'desc' }],
  }) as Promise<PublicAdvertisementRecord[]>
}

export function groupAdvertisementsByPlacement(
  advertisements: PublicAdvertisementRecord[]
): AdvertisementPlacementMap {
  const grouped = createEmptyAdvertisementPlacementMap()

  for (const advertisement of advertisements) {
    grouped[advertisement.position].push(advertisement)
  }

  return grouped
}
