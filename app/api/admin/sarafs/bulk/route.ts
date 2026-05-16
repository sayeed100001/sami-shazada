import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const MAX_BULK_IDS = 200

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : []
    const action = String(body?.action || '')

    if (!ids.length) {
      return NextResponse.json({ error: 'No sarafs selected' }, { status: 400 })
    }
    if (ids.length > MAX_BULK_IDS) {
      return NextResponse.json({ error: `Maximum ${MAX_BULK_IDS} items allowed per action` }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    switch (action) {
      case 'approve':
        data.status = 'APPROVED'
        data.isActive = true
        break
      case 'suspend':
        data.status = 'SUSPENDED'
        break
      case 'activate':
        data.isActive = true
        break
      case 'deactivate':
        data.isActive = false
        break
      case 'enablePremium':
        data.isPremium = true
        data.premiumExpiry = new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        break
      case 'disablePremium':
        data.isPremium = false
        data.premiumExpiry = null
        break
      case 'grant30DayTrial':
        data.isOnFreeTrial = true
        data.freeTrialStartDate = new Date()
        data.freeTrialEndDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        break
      case 'disableTrial':
        data.isOnFreeTrial = false
        data.freeTrialEndDate = new Date()
        break
      default:
        return NextResponse.json({ error: 'Invalid bulk action' }, { status: 400 })
    }

    const result = await prisma.saraf.updateMany({
      where: { id: { in: ids } },
      data
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_BULK_UPDATED',
        resource: 'SARAF',
        details: JSON.stringify({
          action,
          idsCount: ids.length,
          updatedCount: result.count
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, updated: result.count })
  } catch (error) {
    console.error('Saraf bulk update failed:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
