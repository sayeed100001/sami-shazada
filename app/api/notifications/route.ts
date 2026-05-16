import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user notifications from database
    const notifications = await prisma.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    const unreadCount = await prisma.notification.count({
      where: { 
        userId: session.user.id,
        read: false 
      }
    })

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error('Notifications error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, message, type = 'info', action, resource, resourceId, data } = await request.json()

    const notification = await prisma.notification.create({
      data: {
        userId: session.user.id,
        title,
        message,
        type,
        action,
        resource,
        resourceId,
        data: data ? JSON.stringify(data) : null
      }
    })

    return NextResponse.json(notification)
  } catch (error) {
    console.error('Create notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
