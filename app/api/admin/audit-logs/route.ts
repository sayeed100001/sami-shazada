import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const resource = searchParams.get('resource')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const skip = (page - 1) * limit

    const where: any = {}
    if (action) where.action = action
    if (userId) where.userId = userId
    if (resource) where.resource = resource
    if (search) {
      where.OR = [
        { action: caseInsensitiveContains(search) },
        { resource: caseInsensitiveContains(search) },
        { details: caseInsensitiveContains(search) }
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.auditLog.count({ where })
    ])

    const userIds = [...new Set(logs.map(log => log.userId).filter(Boolean))] as string[]
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true }
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const logsWithUserInfo = logs.map(log => {
      const user = log.userId ? userMap.get(log.userId) : null
      return {
        id: log.id,
        userId: log.userId || 'system',
        userName: user?.name || 'System',
        userEmail: user?.email || null,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        details: log.details,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        createdAt: log.createdAt.toISOString()
      }
    })

    return NextResponse.json({ 
      logs: logsWithUserInfo,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching audit logs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
