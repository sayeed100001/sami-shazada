import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { assertAllowedAdvertisementImageUrl } from '@/lib/image-url-policy'
import { prisma } from '@/lib/prisma'
import { syncExpiredAdvertisements } from '@/lib/public-advertisements'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  calculateAdvertisementPrice,
  getAdvertisementPackage,
  isAdvertisementPosition,
  listAdvertisementPackages,
} from '@/lib/advertising'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adsEnabled = await ConfigEnforcer.isFeatureEnabled('feature_ads_enabled')
    if (!adsEnabled) {
      return NextResponse.json({ error: 'Advertisements are disabled', details: 'ADS_DISABLED' }, { status: 403 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { userId: session.user.id },
      select: {
        id: true,
        businessName: true,
      },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const position = typeof body.position === 'string' ? body.position.trim().toUpperCase() : ''
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const description = typeof body.description === 'string' ? body.description.trim() : null
    const imageUrl = typeof body.imageUrl === 'string' ? body.imageUrl.trim() : null
    const linkUrl = typeof body.linkUrl === 'string' ? body.linkUrl.trim() : null
    const duration =
      typeof body.duration === 'number'
        ? Math.max(1, Math.min(365, Math.floor(body.duration)))
        : 0

    if (!position || !title || !duration) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!isAdvertisementPosition(position)) {
      return NextResponse.json({ error: 'Invalid advertisement placement' }, { status: 400 })
    }

    assertAllowedAdvertisementImageUrl(imageUrl, 'imageUrl')

    const adPackage = getAdvertisementPackage(position)
    const totalPrice = calculateAdvertisementPrice(position, duration)

    if (!adPackage || totalPrice === null) {
      return NextResponse.json({ error: 'Advertisement package not found' }, { status: 400 })
    }

    const advertisement = await prisma.$transaction(async (tx) => {
      const created = await tx.advertisement.create({
        data: {
          sarafId: saraf.id,
          position,
          title,
          description,
          imageUrl,
          linkUrl,
          duration,
          price: totalPrice,
          status: 'PENDING',
        },
      })

      const admins = await tx.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
      })

      if (admins.length > 0) {
        await tx.notification.createMany({
          data: admins.map((admin) => ({
            userId: admin.id,
            title: 'New advertisement request',
            message: `${saraf.businessName} requested the ${adPackage.placementTitle} package for ${duration} day(s). Offline payment confirmation is pending admin approval.`,
            type: 'info',
            action: 'ADVERTISEMENT_REQUESTED',
            resource: 'ADVERTISEMENT',
            resourceId: created.id,
          })),
        })
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'ADVERTISEMENT_REQUESTED',
          resource: 'ADVERTISEMENT',
          resourceId: created.id,
          details: JSON.stringify({
            sarafId: saraf.id,
            position,
            packageCode: adPackage.code,
            billingMode: adPackage.billingMode,
            duration,
            totalPrice,
            currency: adPackage.currency,
          }),
        },
      })

      return created
    })

    return NextResponse.json({
      success: true,
      advertisement: {
        id: advertisement.id,
        position,
        duration,
        price: totalPrice,
        currency: adPackage.currency,
        billingMode: adPackage.billingMode,
        packageCode: adPackage.code,
        placementTitle: adPackage.placementTitle,
        status: advertisement.status,
      },
    })
  } catch (error) {
    console.error('Advertisement request error:', error)
    if (error instanceof Error && /managed advertisement upload storage|internal asset path/i.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create advertisement request' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adsEnabled = await ConfigEnforcer.isFeatureEnabled('feature_ads_enabled')
    if (!adsEnabled) {
      return NextResponse.json({ error: 'Advertisements are disabled', details: 'ADS_DISABLED' }, { status: 403 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    await syncExpiredAdvertisements()

    const advertisements = await prisma.advertisement.findMany({
      where: { sarafId: saraf.id },
      orderBy: { requestedAt: 'desc' },
    })

    return NextResponse.json({
      packages: listAdvertisementPackages(),
      advertisements,
    })
  } catch (error) {
    console.error('Advertisement fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch advertisements' }, { status: 500 })
  }
}
