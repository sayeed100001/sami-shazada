import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const branchId = params.id

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 403 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: accessContext.sarafId },
      select: { id: true, status: true },
    })

    if (!saraf || saraf.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 })
    }

    if (
      accessContext.accessMode === 'BRANCH' &&
      !accessContext.accessibleBranchIds.includes(branchId)
    ) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        sarafId: saraf.id,
        OR: [
          { originBranchId: branchId },
          { destinationBranchId: branchId }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    return NextResponse.json({
      success: true,
      transactions
    })

  } catch (error) {
    console.error('Branch transactions fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
