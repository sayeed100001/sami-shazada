import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { sarafId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sarafId = sanitizeInput(params.sarafId)
    if (!sarafId) {
      return NextResponse.json({ error: 'Missing sarafId' }, { status: 400 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: sarafId },
      select: { id: true, status: true, isActive: true },
    })

    if (!saraf || saraf.status !== 'APPROVED' || !saraf.isActive) {
      return NextResponse.json({ error: 'Saraf not found or not available' }, { status: 404 })
    }

    const branches = await prisma.sarafBranch.findMany({
      where: { sarafId: saraf.id, isActive: true },
      select: {
        id: true,
        name: true,
        city: true,
        country: true,
        address: true,
        phone: true,
        isActive: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })

    return NextResponse.json({
      sarafId: saraf.id,
      branches,
    })
  } catch (error) {
    console.error('Destination saraf branches error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

