import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

const ADMIN_REWARD_TYPES = [
  'WELCOME_DISCOUNT',
  'MANUAL_TRANSFER_DISCOUNT',
  'FREE_TRANSACTION',
  'VIP_UPGRADE',
  'CASH_BONUS',
] as const

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rewards = await prisma.userReward.findMany({
      where: { userId: params.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ rewards })
  } catch (error) {
    console.error('Reward fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: { id: true, name: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const body = await request.json()
    const type = sanitizeInput(body.type).trim().toUpperCase()
    const title = sanitizeInput(body.title).trim()
    const description = sanitizeInput(body.description).trim()
    const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
    const value =
      body.value === undefined || body.value === null || body.value === ''
        ? null
        : Number.parseFloat(String(body.value))
    const code = body.code ? sanitizeInput(body.code).trim() : null

    if (!ADMIN_REWARD_TYPES.includes(type as (typeof ADMIN_REWARD_TYPES)[number]) || !title || !description) {
      return NextResponse.json({ error: 'Invalid reward payload' }, { status: 400 })
    }

    if (['WELCOME_DISCOUNT', 'MANUAL_TRANSFER_DISCOUNT'].includes(type)) {
      if (!Number.isFinite(value) || value! <= 0 || value! > 1) {
        return NextResponse.json(
          { error: 'Transfer discount rewards require a decimal value between 0 and 1.' },
          { status: 400 }
        )
      }
    }

    const reward = await prisma.userReward.create({
      data: {
        userId: params.id,
        type,
        title,
        description,
        value,
        code,
        expiresAt,
      },
    })

    await Promise.all([
      prisma.notification.create({
        data: {
          userId: params.id,
          title: 'New reward added',
          message: `${title} has been added to your account.`,
          type: 'success',
          action: 'USER_REWARD_GRANTED',
          resource: 'USER_REWARD',
          resourceId: reward.id,
        },
      }),
      prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'USER_REWARD_GRANTED',
          resource: 'USER_REWARD',
          resourceId: reward.id,
          details: JSON.stringify({
            targetUserId: params.id,
            type,
            title,
            value,
          }),
        },
      }),
    ])

    return NextResponse.json({ success: true, reward })
  } catch (error) {
    console.error('Reward creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
