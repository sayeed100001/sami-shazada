import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getAdvertisementPackage } from '@/lib/advertising'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const advertisementId = typeof body.id === 'string' ? body.id.trim() : ''

    if (!advertisementId) {
      return NextResponse.json({ error: 'Advertisement id is required' }, { status: 400 })
    }

    const startDate = new Date()
    const endDate = new Date(startDate)
    const approvedAt = new Date()

    try {
      await prisma.$transaction(async (tx) => {
        const advertisement = await tx.advertisement.findUnique({
          where: { id: advertisementId },
          include: {
            saraf: {
              select: {
                id: true,
                userId: true,
                businessName: true,
              },
            },
          },
        })

        if (!advertisement) throw new Error('NOT_FOUND')
        if (advertisement.status !== 'PENDING') throw new Error('ALREADY_PROCESSED')

        endDate.setDate(endDate.getDate() + advertisement.duration)
        const adPackage = getAdvertisementPackage(advertisement.position)

        await tx.advertisement.update({
          where: { id: advertisementId },
          data: {
            status: 'ACTIVE',
            startDate,
            endDate,
            approvedBy: session.user.id,
            approvedAt,
          },
        })

        await tx.notification.create({
          data: {
            userId: advertisement.saraf.userId,
            title: 'Advertisement approved',
            message: `Your ${adPackage?.placementTitle || advertisement.position} advertisement is now active until ${endDate.toLocaleDateString('en-CA')}.`,
            type: 'success',
            action: 'ADVERTISEMENT_APPROVED',
            resource: 'ADVERTISEMENT',
            resourceId: advertisement.id,
          },
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id,
            action: 'ADVERTISEMENT_APPROVED',
            resource: 'ADVERTISEMENT',
            resourceId: advertisement.id,
            details: JSON.stringify({
              sarafId: advertisement.sarafId,
              position: advertisement.position,
              duration: advertisement.duration,
              price: advertisement.price,
              billingMode: adPackage?.billingMode || 'OFFLINE',
              currency: adPackage?.currency || 'AFN',
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
            }),
          },
        })
      })
    } catch (error) {
      if (error instanceof Error && error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Advertisement not found' }, { status: 404 })
      }
      if (error instanceof Error && error.message === 'ALREADY_PROCESSED') {
        return NextResponse.json({ error: 'Advertisement already processed' }, { status: 400 })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Advertisement approved successfully',
    })
  } catch (error) {
    console.error('Advertisement approval error:', error)
    return NextResponse.json({ error: 'Failed to approve advertisement' }, { status: 500 })
  }
}
