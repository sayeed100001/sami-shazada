import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Mark all user notifications as read
    await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false
      },
      data: {
        read: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Mark all notifications as read error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
