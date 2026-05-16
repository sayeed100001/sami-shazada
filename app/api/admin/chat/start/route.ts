import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const userId = typeof body.userId === 'string' ? body.userId.trim() : ''

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        role: true,
        isActive: true,
      },
    })

    if (!targetUser || !targetUser.isActive) {
      return NextResponse.json({ error: 'Target user not found' }, { status: 404 })
    }

    if (targetUser.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin-to-admin support sessions are not created here' },
        { status: 400 }
      )
    }

    const existingSupportSession = await prisma.chatSession.findFirst({
      where: {
        userId: targetUser.id,
        type: 'SUPPORT',
      },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
      },
    })

    const supportSession = existingSupportSession
      ? await prisma.chatSession.update({
          where: { id: existingSupportSession.id },
          data: {
            isActive: true,
          },
          select: {
            id: true,
            userId: true,
            type: true,
          },
        })
      : await prisma.chatSession.create({
          data: {
            userId: targetUser.id,
            type: 'SUPPORT',
            isActive: true,
          },
          select: {
            id: true,
            userId: true,
            type: true,
          },
        })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_SUPPORT_SESSION_OPENED',
        resource: 'CHAT',
        resourceId: supportSession.id,
        details: JSON.stringify({
          targetUserId: targetUser.id,
          targetRole: targetUser.role,
        }),
      },
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      sessionId: supportSession.id,
      targetUser: {
        id: targetUser.id,
        name: targetUser.name,
        role: targetUser.role,
      },
    })
  } catch (error) {
    console.error('Admin chat start error:', error)
    return NextResponse.json({ error: 'Failed to open support session' }, { status: 500 })
  }
}
