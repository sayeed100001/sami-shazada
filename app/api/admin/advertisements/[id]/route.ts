import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  getAdvertisementPackage,
  isAdvertisementPosition,
  type AdvertisementPosition,
} from '@/lib/advertising'
import { syncExpiredAdvertisements } from '@/lib/public-advertisements'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: {
    id: string
  }
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') {
    return undefined
  }

  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const advertisementId = typeof params.id === 'string' ? params.id.trim() : ''
    if (!advertisementId) {
      return NextResponse.json({ error: 'Advertisement id is required' }, { status: 400 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const action = typeof body.action === 'string' ? body.action.trim().toUpperCase() : 'UPDATE'
    const nextPositionRaw = typeof body.position === 'string' ? body.position.trim().toUpperCase() : undefined
    const nextTitle = normalizeOptionalString(body.title)
    const nextDescription = normalizeOptionalString(body.description)
    const nextLinkUrl = normalizeOptionalString(body.linkUrl)

    if (nextPositionRaw && !isAdvertisementPosition(nextPositionRaw)) {
      return NextResponse.json({ error: 'Invalid advertisement position' }, { status: 400 })
    }

    await syncExpiredAdvertisements()

    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const advertisement = await tx.advertisement.findUnique({
        where: { id: advertisementId },
        include: {
          saraf: {
            select: {
              userId: true,
              businessName: true,
            },
          },
        },
      })

      if (!advertisement) {
        throw new Error('NOT_FOUND')
      }

      if (action === 'DEACTIVATE') {
        if (advertisement.status !== 'ACTIVE') {
          throw new Error('INVALID_STATUS')
        }

        const updatedAdvertisement = await tx.advertisement.update({
          where: { id: advertisementId },
          data: {
            status: 'EXPIRED',
            endDate: now,
            approvedBy: session.user.id,
            approvedAt: now,
          },
        })

        await tx.notification.create({
          data: {
            userId: advertisement.saraf.userId,
            title: 'Advertisement deactivated',
            message: `Your advertisement "${advertisement.title}" was deactivated by admin.`,
            type: 'warning',
            action: 'ADVERTISEMENT_DEACTIVATED',
            resource: 'ADVERTISEMENT',
            resourceId: advertisement.id,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ADVERTISEMENT_DEACTIVATED',
            resource: 'ADVERTISEMENT',
            resourceId: advertisement.id,
            details: JSON.stringify({
              previousStatus: advertisement.status,
              newStatus: 'EXPIRED',
              endedAt: now.toISOString(),
            }),
          },
        })

        return updatedAdvertisement
      }

      if (action === 'REACTIVATE') {
        if (!['EXPIRED', 'REJECTED'].includes(advertisement.status)) {
          throw new Error('INVALID_STATUS')
        }

        const nextEndDate = new Date(now)
        nextEndDate.setDate(nextEndDate.getDate() + advertisement.duration)
        const adPackage = getAdvertisementPackage(advertisement.position)

        const updatedAdvertisement = await tx.advertisement.update({
          where: { id: advertisementId },
          data: {
            status: 'ACTIVE',
            startDate: now,
            endDate: nextEndDate,
            approvedBy: session.user.id,
            approvedAt: now,
          },
        })

        await tx.notification.create({
          data: {
            userId: advertisement.saraf.userId,
            title: 'Advertisement reactivated',
            message: `Your ${adPackage?.placementTitle || advertisement.position} advertisement is active again until ${nextEndDate.toLocaleDateString('en-CA')}.`,
            type: 'success',
            action: 'ADVERTISEMENT_REACTIVATED',
            resource: 'ADVERTISEMENT',
            resourceId: advertisement.id,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ADVERTISEMENT_REACTIVATED',
            resource: 'ADVERTISEMENT',
            resourceId: advertisement.id,
            details: JSON.stringify({
              previousStatus: advertisement.status,
              newStatus: 'ACTIVE',
              startDate: now.toISOString(),
              endDate: nextEndDate.toISOString(),
            }),
          },
        })

        return updatedAdvertisement
      }

      const updateData: {
        position?: AdvertisementPosition
        title?: string
        description?: string | null
        linkUrl?: string | null
      } = {}

      if (nextPositionRaw) {
        updateData.position = nextPositionRaw
      }

      if (typeof body.title === 'string' && nextTitle) {
        updateData.title = nextTitle
      }

      if (typeof body.description === 'string') {
        updateData.description = nextDescription ?? null
      }

      if (typeof body.linkUrl === 'string') {
        updateData.linkUrl = nextLinkUrl ?? null
      }

      if (Object.keys(updateData).length === 0) {
        throw new Error('NOTHING_TO_UPDATE')
      }

      const updatedAdvertisement = await tx.advertisement.update({
        where: { id: advertisementId },
        data: updateData,
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ADVERTISEMENT_UPDATED',
          resource: 'ADVERTISEMENT',
          resourceId: advertisement.id,
          details: JSON.stringify({
            previousPosition: advertisement.position,
            nextPosition: updateData.position || advertisement.position,
            updatedFields: Object.keys(updateData),
          }),
        },
      })

      return updatedAdvertisement
    })

    return NextResponse.json({
      success: true,
      advertisement: result,
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
    }

    if (error instanceof Error && error.message === 'INVALID_STATUS') {
      return NextResponse.json({ error: 'Advertisement cannot be changed in its current status' }, { status: 400 })
    }

    if (error instanceof Error && error.message === 'NOTHING_TO_UPDATE') {
      return NextResponse.json({ error: 'No advertisement changes were provided' }, { status: 400 })
    }

    console.error('Advertisement update error:', error)
    return NextResponse.json({ error: 'Failed to update advertisement' }, { status: 500 })
  }
}
