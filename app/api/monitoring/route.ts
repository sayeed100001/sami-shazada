import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { monitoring } from '@/lib/monitoring'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const health = monitoring.getSystemHealth()
    const performance = monitoring.getPerformanceReport()

    const [userCount, sarafCount, transactionCount, messageCount, activeSessionCount] = await Promise.all([
      prisma.user.count(),
      prisma.saraf.count(),
      prisma.transaction.count(),
      prisma.chatMessage.count(),
      prisma.chatSession.count({ where: { isActive: true } })
    ])

    return NextResponse.json({
      health,
      performance,
      database: { users: userCount, sarafs: sarafCount, transactions: transactionCount, messages: messageCount, activeSessions: activeSessionCount },
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch monitoring data' }, { status: 500 })
  }
}
