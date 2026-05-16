import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalRole } from '@/lib/portal-access'
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

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 404 })
    }

    const existing = await prisma.blacklist.findUnique({
      where: { id: params.id },
    })

    if (!existing || existing.sarafId !== accessContext.sarafId) {
      return NextResponse.json({ error: 'Blacklist entry not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.blacklist.delete({
        where: { id: params.id },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SARAF_BLACKLIST_DELETED',
          resource: 'BLACKLIST',
          resourceId: existing.id,
          details: JSON.stringify({
            type: existing.type,
            value: existing.value,
            sarafId: existing.sarafId,
          }),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Portal blacklist deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
