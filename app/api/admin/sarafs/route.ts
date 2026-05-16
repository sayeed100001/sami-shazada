import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const search = sanitizeInput(searchParams.get('search') || '')
    const status = sanitizeInput(searchParams.get('status') || '')
    const trial = sanitizeInput(searchParams.get('trial') || '')
    const active = sanitizeInput(searchParams.get('active') || '')

    const skip = (page - 1) * limit

    try {
      // Build where clause
      const where: any = {}
      if (search) {
        where.OR = [
          { businessName: caseInsensitiveContains(search) },
          { businessPhone: caseInsensitiveContains(search) },
          { user: { is: { name: caseInsensitiveContains(search) } } },
          { user: { is: { email: caseInsensitiveContains(search) } } }
        ]
      }
      if (status && status !== 'ALL') {
        where.status = status
      }
      if (active === 'ACTIVE') {
        where.isActive = true
      } else if (active === 'INACTIVE') {
        where.isActive = false
      }
      if (trial === 'ON_TRIAL') {
        where.isOnFreeTrial = true
      } else if (trial === 'NO_TRIAL') {
        where.isOnFreeTrial = false
      } else if (trial === 'EXPIRED_TRIAL') {
        where.isOnFreeTrial = true
        where.freeTrialEndDate = { lt: new Date() }
      }

      const now = new Date()
      const [sarafs, total] = await Promise.all([
        prisma.saraf.findMany({
          where,
          select: {
            id: true,
            businessName: true,
            businessAddress: true,
            businessPhone: true,
            licenseNumber: true,
            status: true,
            isActive: true,
            isPremium: true,
            isFeatured: true,
            isOnFreeTrial: true,
            freeTrialEndDate: true,
            creditBalance: true,
            subscriptionType: true,
            rating: true,
            totalTransactions: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                isActive: true,
                createdAt: true,
                lastLogin: true
              }
            },
            _count: {
              select: {
                transactions: true,
                rates: true,
                documents: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.saraf.count({ where })
      ])

      // Derive featured state from active promotions (so admin view stays accurate without permanent flags).
      const ids = sarafs.map((s) => s.id)
      const featuredRows =
        ids.length === 0
          ? []
          : await prisma.promotionRequest.findMany({
              where: {
                sarafId: { in: ids },
                status: 'APPROVED',
                type: 'FEATURED',
                OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
              },
              select: { sarafId: true },
              take: 5000,
            })
      const featuredSet = new Set(featuredRows.map((r) => r.sarafId))
      const mappedSarafs = sarafs.map((s) => ({ ...s, isFeatured: featuredSet.has(s.id) || Boolean((s as any).isFeatured) }))

      return NextResponse.json({
        sarafs: mappedSarafs,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (dbError) {
      console.error('Database error in admin sarafs:', dbError)
      
      // Return error instead of fake data
      return NextResponse.json({
        error: 'Database connection failed',
        sarafs: [],
        pagination: {
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        }
      }, { status: 503 })
    }

  } catch (error) {
    console.error('Admin sarafs fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
