import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isPortalOwnerRole, isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

type ParsedPercent = {
  value: number | null
  error?: string
}

function parseOptionalPercent(value: unknown): ParsedPercent {
  if (value === null || value === undefined || value === '') {
    return { value: null }
  }

  const parsed = Number.parseFloat(String(value))
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
    return {
      value: null,
      error: 'Fee percentage must be between 0 and 100',
    }
  }

  return { value: Number(parsed.toFixed(4)) }
}

export async function GET() {
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
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: accessContext.sarafId },
      select: {
        id: true,
        hawalaFeePercent: true,
        exchangeFeePercent: true,
      },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    return NextResponse.json({
      hawalaFeePercent: saraf.hawalaFeePercent,
      exchangeFeePercent: saraf.exchangeFeePercent,
    })
  } catch (error) {
    console.error('Portal fee settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPortalOwnerRole(session.user.role)) {
      return NextResponse.json(
        { error: 'Only the saraf owner can change fee settings' },
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

    const body = await request.json()
    const hawalaFeePercent = parseOptionalPercent(body.hawalaFeePercent)
    const exchangeFeePercent = parseOptionalPercent(body.exchangeFeePercent)

    if (hawalaFeePercent.error) {
      return NextResponse.json({ error: hawalaFeePercent.error }, { status: 400 })
    }

    if (exchangeFeePercent.error) {
      return NextResponse.json({ error: exchangeFeePercent.error }, { status: 400 })
    }

    const saraf = await prisma.saraf.update({
      where: { id: accessContext.sarafId },
      data: {
        hawalaFeePercent: hawalaFeePercent.value,
        exchangeFeePercent: exchangeFeePercent.value,
      },
      select: {
        id: true,
        hawalaFeePercent: true,
        exchangeFeePercent: true,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_FEE_SETTINGS_UPDATED',
        resource: 'SARAF',
        resourceId: saraf.id,
        details: JSON.stringify({
          hawalaFeePercent: saraf.hawalaFeePercent,
          exchangeFeePercent: saraf.exchangeFeePercent,
        }),
      },
    })

    return NextResponse.json(saraf)
  } catch (error) {
    console.error('Portal fee settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
