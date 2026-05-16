import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { Notification } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      let notifications: Notification[] = []

      if (session.user.role === 'SARAF') {
        const saraf = await prisma.saraf.findUnique({
          where: { userId: session.user.id }
        })

        if (saraf) {
          notifications = await prisma.notification.findMany({
            where: {
              userId: session.user.id,
              OR: [
                {
                  action: 'NEW_SARAF_MESSAGE',
                  resource: 'SARAF_CHAT'
                },
                {
                  action: 'NEW_GUEST_MESSAGE',
                  resource: 'GUEST_CHAT'
                }
              ]
            },
            orderBy: { createdAt: 'desc' },
            take: 10
          })
        }
      } else {
        notifications = await prisma.notification.findMany({
          where: {
            userId: session.user.id,
            OR: [
              {
                action: 'NEW_SARAF_MESSAGE',
                resource: 'SARAF_CHAT'
              },
              {
                action: 'NEW_GUEST_MESSAGE',
                resource: 'GUEST_CHAT'
              }
            ]
          },
          orderBy: { createdAt: 'desc' },
          take: 10
        })
      }

      return NextResponse.json(notifications)

    } catch (dbError) {
      console.error('Database error in saraf chat notifications:', dbError)
      throw dbError
    }

  } catch (error) {
    console.error('Saraf chat notifications error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { notificationId } = await request.json()

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 })
    }

    try {
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: session.user.id
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })

      return NextResponse.json({ success: true })

    } catch (dbError) {
      console.error('Database error in mark notification read:', dbError)
      return NextResponse.json({ success: true })
    }

  } catch (error) {
    console.error('Mark notification read error:', error)
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    )
  }
}
