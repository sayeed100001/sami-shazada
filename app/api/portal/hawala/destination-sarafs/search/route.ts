import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

function normalizePhone(value: string) {
  return value.replace(/[^\d+]/g, '')
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawQuery = sanitizeInput(searchParams.get('query') || '')
    const query = rawQuery.trim()
    const limit = Math.min(Math.max(Number.parseInt(searchParams.get('limit') || '10', 10) || 10, 1), 30)

    if (query.length < 2) {
      return NextResponse.json({ sarafs: [] })
    }

    const phoneQuery = normalizePhone(query)

    const sarafs = await prisma.saraf.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
        OR: [
          { businessName: { contains: query } },
          { businessPhone: { contains: query } },
          ...(phoneQuery && phoneQuery !== query ? [{ businessPhone: { contains: phoneQuery } }] : []),
        ],
      },
      select: {
        id: true,
        businessName: true,
        businessPhone: true,
        branches: {
          where: { isActive: true },
          select: { city: true, country: true },
          take: 50,
        },
      },
      orderBy: [{ rating: 'desc' }, { totalTransactions: 'desc' }],
      take: limit,
    })

    const results = sarafs.map((saraf) => {
      const firstBranch = saraf.branches[0] || null
      return {
        id: saraf.id,
        businessName: saraf.businessName,
        businessPhone: saraf.businessPhone,
        primaryCity: firstBranch?.city || '',
        primaryCountry: firstBranch?.country || '',
      }
    })

    return NextResponse.json({ sarafs: results })
  } catch (error) {
    console.error('Destination saraf search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

