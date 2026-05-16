import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import { syncExpiredAdvertisements } from '@/lib/public-advertisements'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = (searchParams.get('status') || 'PENDING').toUpperCase()
    const search = searchParams.get('search')?.trim() || ''

    await syncExpiredAdvertisements()

    const whereClause =
      status === 'ALL'
        ? {}
        : {
            status,
          }

    const advertisements = await prisma.advertisement.findMany({
      where: {
        ...whereClause,
        ...(search
          ? {
              OR: [
                { title: caseInsensitiveContains(search) },
                { description: caseInsensitiveContains(search) },
                { saraf: { businessName: caseInsensitiveContains(search) } },
                { saraf: { businessPhone: caseInsensitiveContains(search) } },
                { saraf: { user: { name: caseInsensitiveContains(search) } } },
                { saraf: { user: { email: caseInsensitiveContains(search) } } },
              ],
            }
          : {}),
      },
      include: {
        saraf: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
      orderBy: { requestedAt: 'desc' },
    })

    const statusCounts = await prisma.advertisement.groupBy({
      by: ['status'],
      _count: {
        _all: true,
      },
    })

    return NextResponse.json({
      advertisements,
      counts: {
        ALL: statusCounts.reduce((sum, item) => sum + item._count._all, 0),
        PENDING: statusCounts.find((item) => item.status === 'PENDING')?._count._all || 0,
        ACTIVE: statusCounts.find((item) => item.status === 'ACTIVE')?._count._all || 0,
        EXPIRED: statusCounts.find((item) => item.status === 'EXPIRED')?._count._all || 0,
        REJECTED: statusCounts.find((item) => item.status === 'REJECTED')?._count._all || 0,
      },
    })
  } catch (error) {
    console.error('Advertisements fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch advertisements' }, { status: 500 })
  }
}
