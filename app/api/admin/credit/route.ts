import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'

    const where: any = { type: 'PURCHASE' }
    if (status !== 'ALL') {
      where.status = status
    }

    const transactions = await prisma.creditTransaction.findMany({
      where,
      include: {
        saraf: {
          include: {
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return NextResponse.json({ transactions })

  } catch (error) {
    console.error('Credit requests fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch credit requests' },
      { status: 500 }
    )
  }
}
