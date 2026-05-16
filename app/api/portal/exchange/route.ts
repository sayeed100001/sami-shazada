import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRequiredBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const branchId = searchParams.get('branchId')
    const fromCurrency = searchParams.get('fromCurrency')
    const toCurrency = searchParams.get('toCurrency')
    const skip = (page - 1) * limit

    const where: any = {
      sarafId: accessContext.sarafId,
      type: 'EXCHANGE'
    }

    if (branchId && !hasRequiredBranchAccess(accessContext, branchId)) {
      return NextResponse.json({ error: 'Forbidden branch access' }, { status: 403 })
    }

    if (branchId) {
      where.originBranchId = branchId
    } else if (accessContext.accessMode === 'BRANCH') {
      where.originBranchId = { in: accessContext.accessibleBranchIds }
    }

    if (fromCurrency) {
      where.fromCurrency = fromCurrency
    }

    if (toCurrency) {
      where.toCurrency = toCurrency
    }

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          originBranch: {
            select: {
              id: true,
              name: true,
              city: true
            }
          },
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              vipLevel: true
            }
          }
        }
      }),
      prisma.transaction.count({ where })
    ])

    return NextResponse.json({
      transactions,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Exchange fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange transactions' },
      { status: 500 }
    )
  }
}
