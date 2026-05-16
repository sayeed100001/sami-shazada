import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const results = {
      messages: 0,
      sessions: 0,
      users: 0,
      notifications: 0
    }

    try {
      // Delete test chat messages
      const deletedMessages = await prisma.chatMessage.deleteMany({
        where: {
          OR: [
            { senderName: { contains: 'تست' } },
            { senderName: { contains: 'test' } },
            { message: { contains: 'تست' } },
            { message: { contains: 'test' } }
          ]
        }
      })
      results.messages = deletedMessages.count

      // Delete test chat sessions
      const deletedSessions = await prisma.chatSession.deleteMany({
        where: {
          user: {
            OR: [
              { email: { contains: 'test.com' } },
              { name: { contains: 'تست' } },
              { name: { contains: 'test' } }
            ]
          }
        }
      })
      results.sessions = deletedSessions.count

      // Delete test notifications
      const deletedNotifications = await prisma.notification.deleteMany({
        where: {
          OR: [
            { message: { contains: 'تست' } },
            { message: { contains: 'test' } },
            { title: { contains: 'تست' } },
            { title: { contains: 'test' } }
          ]
        }
      })
      results.notifications = deletedNotifications.count

      // Delete test users (be careful)
      const deletedUsers = await prisma.user.deleteMany({
        where: {
          AND: [
            {
              OR: [
                { email: { contains: 'test.com' } },
                { name: { contains: 'تست' } },
                { name: { contains: 'test' } }
              ]
            },
            { role: { not: 'ADMIN' } }
          ]
        }
      })
      results.users = deletedUsers.count

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SEED_DATA_CLEARED',
          resource: 'SYSTEM',
          resourceId: 'seed-data',
          details: JSON.stringify(results)
        }
      })

      return NextResponse.json({
        success: true,
        message: 'Seed data cleared successfully',
        results
      })

    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Database operation failed' }, { status: 503 })
    }

  } catch (error) {
    console.error('Clear seed data error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
