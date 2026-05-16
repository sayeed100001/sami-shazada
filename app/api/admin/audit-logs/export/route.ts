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
    const action = searchParams.get('action')
    const userId = searchParams.get('userId')
    const resource = searchParams.get('resource')
    const search = searchParams.get('search')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (action && action !== 'all') where.action = action
    if (userId && userId !== 'all') where.userId = userId
    if (resource) where.resource = resource
    if (search) {
      where.OR = [
        { action: caseInsensitiveContains(search) },
        { resource: caseInsensitiveContains(search) },
        { details: caseInsensitiveContains(search) },
      ]
    }
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 5000,
    })

    const userIds = [...new Set(logs.map((log) => log.userId).filter(Boolean))] as string[]
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : []

    const userMap = new Map(users.map((user) => [user.id, user]))
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`

    const rows = logs.map((log) => {
      const user = log.userId ? userMap.get(log.userId) : null
      return [
        log.id,
        log.userId || 'system',
        user?.name || 'System',
        user?.email || '',
        log.action,
        log.resource,
        log.resourceId || '',
        log.details || '',
        log.ipAddress || '',
        log.userAgent || '',
        log.createdAt.toISOString(),
      ]
    })

    const csv = [
      ['ID', 'User ID', 'User Name', 'User Email', 'Action', 'Resource', 'Resource ID', 'Details', 'IP Address', 'User Agent', 'Created At'].join(','),
      ...rows.map((row) => row.map(escapeCsv).join(',')),
    ].join('\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  } catch (error) {
    console.error('Error exporting audit logs:', error)
    return NextResponse.json({ error: 'Failed to export audit logs' }, { status: 500 })
  }
}
