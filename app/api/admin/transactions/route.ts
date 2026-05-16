import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import { ensureDatabaseConnection } from '@/lib/database-health'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''
    const type = searchParams.get('type') || ''

    // Remove fake transaction storage - use only real database data

    const where: any = {}
    if (search) {
      where.OR = [
        { referenceCode: caseInsensitiveContains(search) },
        { senderName: caseInsensitiveContains(search) },
        { receiverName: caseInsensitiveContains(search) }
      ]
    }
    if (status) where.status = status
    if (type) where.type = type

    try {
      const transactions = await prisma.transaction.findMany({
        where,
        include: {
          saraf: {
            select: {
              businessName: true,
              user: {
                select: {
                  name: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      })

      return NextResponse.json({ transactions })
    } catch (dbError) {
      console.error('Database error in admin transactions:', dbError)
      
      // Return error instead of fake data
      return NextResponse.json({
        error: 'Database connection failed',
        transactions: []
      }, { status: 503 })
    }
  } catch (error) {
    console.error('Admin transactions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
