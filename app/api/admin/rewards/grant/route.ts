import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min
  return Math.min(Math.max(value, min), max)
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    if (!body) {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const userId = sanitizeInput(body.userId || '').trim()
    const rewardType = sanitizeInput(body.rewardType || '').trim().toUpperCase()
    const title = sanitizeInput(body.title || '').trim()
    const description = sanitizeInput(body.description || '').trim()
    const expiryDaysRaw = Number.parseInt(String(body.expiryDays ?? '14'), 10)
    const expiryDays = Number.isFinite(expiryDaysRaw) ? Math.min(Math.max(expiryDaysRaw, 1), 365) : 14

    if (!userId || !rewardType) {
      return NextResponse.json({ error: 'userId and rewardType are required' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    })
    if (!user || user.role !== 'USER') {
      return NextResponse.json({ error: 'User not found (simple USER only)' }, { status: 404 })
    }

    const now = new Date()
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)

    if (rewardType === 'FREE_TRANSACTION') {
      const created = await prisma.userReward.create({
        data: {
          userId,
          type: 'FREE_TRANSACTION',
          title: title || 'Free transfer reward',
          description: description || 'Your next transfer system fee will be fully discounted.',
          value: 1,
          expiresAt,
        },
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_REWARD_GRANTED',
          resource: 'USER_REWARD',
          resourceId: created.id,
          details: JSON.stringify({ userId, type: created.type, expiresAt }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return NextResponse.json({ success: true, reward: created })
    }

    if (rewardType === 'TRANSFER_DISCOUNT') {
      const rawRate = Number.parseFloat(String(body.discountRate ?? '0.01'))
      // Safety cap: admin can grant up to 50% off system fee per reward.
      const discountRate = clampNumber(rawRate, 0, 0.5)
      if (discountRate <= 0) {
        return NextResponse.json({ error: 'discountRate must be > 0' }, { status: 400 })
      }

      const created = await prisma.userReward.create({
        data: {
          userId,
          type: 'MANUAL_TRANSFER_DISCOUNT',
          title: title || `Transfer discount (${Math.round(discountRate * 100)}% off system fee)`,
          description:
            description || `You received ${Math.round(discountRate * 100)}% off your next transfer system fee.`,
          value: discountRate,
          expiresAt,
        },
      })

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_REWARD_GRANTED',
          resource: 'USER_REWARD',
          resourceId: created.id,
          details: JSON.stringify({ userId, type: created.type, value: discountRate, expiresAt }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        },
      })

      return NextResponse.json({ success: true, reward: created })
    }

    return NextResponse.json(
      { error: 'Unsupported rewardType. Use TRANSFER_DISCOUNT or FREE_TRANSACTION.' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Admin reward grant error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

