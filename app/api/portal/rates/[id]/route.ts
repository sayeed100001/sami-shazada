import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalOwnerRole, isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPortalOwnerRole(session.user.role)) {
      return NextResponse.json(
        { error: 'Only the saraf owner can delete rates' },
        { status: 403 }
      )
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    const rate = await prisma.rate.findUnique({
      where: { id: params.id, sarafId: accessContext.sarafId }
    })

    if (!rate) {
      return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
    }

    await prisma.rate.delete({
      where: { id: params.id, sarafId: accessContext.sarafId }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'RATE_DELETED',
        resource: 'RATE',
        resourceId: params.id,
        details: JSON.stringify({ 
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency
        })
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Rate deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
