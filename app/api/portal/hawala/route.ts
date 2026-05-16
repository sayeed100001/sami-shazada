import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasRequiredBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'
import { sanitizeInput } from '@/lib/security'

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
    const limit = parseInt(searchParams.get('limit') || '10')
    const status = searchParams.get('status')
    const type = searchParams.get('type') // 'sent' or 'received'
    const branchId = searchParams.get('branchId')
    const search = sanitizeInput(searchParams.get('search') || '')
    const skip = (page - 1) * limit

    const baseScope: any =
      accessContext.accessMode === 'OWNER'
        ? {
            OR: [
              // Origin saraf transactions (billing owner)
              { sarafId: accessContext.sarafId },
              // Incoming payouts to this saraf's branches (cross-saraf partnerships)
              { destinationBranch: { sarafId: accessContext.sarafId } },
            ],
          }
        : {
            OR: [
              { originBranchId: { in: accessContext.accessibleBranchIds } },
              { destinationBranchId: { in: accessContext.accessibleBranchIds } },
            ],
          }

    const where: any = {
      type: 'HAWALA',
      ...baseScope,
    }

    if (status && status !== 'all') {
      where.status = status.toUpperCase()
    }

    if (branchId && !hasRequiredBranchAccess(accessContext, branchId)) {
      return NextResponse.json({ error: 'Forbidden branch access' }, { status: 403 })
    }

    if (type === 'sent') {
      if (branchId) {
        where.originBranchId = branchId
      } else if (accessContext.accessMode === 'BRANCH') {
        where.originBranchId = { in: accessContext.accessibleBranchIds }
      }
    } else if (type === 'received') {
      if (branchId) {
        where.destinationBranchId = branchId
      } else if (accessContext.accessMode === 'BRANCH') {
        where.destinationBranchId = { in: accessContext.accessibleBranchIds }
      } else {
        // OWNER: received means incoming payouts to this saraf's branches
        where.destinationBranch = { sarafId: accessContext.sarafId }
      }
    } else if (branchId) {
      where.OR = [{ originBranchId: branchId }, { destinationBranchId: branchId }]
    }

    if (search) {
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { referenceCode: { contains: search } },
            { senderName: { contains: search } },
            { senderPhone: { contains: search } },
            { receiverName: { contains: search } },
            { receiverPhone: { contains: search } },
          ],
        },
      ]
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
          destinationBranch: {
            select: {
              id: true,
              name: true,
              city: true
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
    console.error('Hawala fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch hawala transactions' },
      { status: 500 }
    )
  }
}
