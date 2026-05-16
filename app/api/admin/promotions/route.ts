import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const promotions = await prisma.promotionRequest.findMany({
      include: {
        saraf: {
          select: {
            businessName: true,
            businessPhone: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(promotions)
  } catch (error) {
    console.error('Promotions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}
