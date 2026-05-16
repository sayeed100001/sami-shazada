import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await prisma.blacklist.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Blacklist entry not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      await tx.blacklist.delete({
        where: { id: params.id },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BLACKLIST_DELETED',
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
    console.error('Blacklist deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
