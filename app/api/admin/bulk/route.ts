import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { ConfigService } from '@/lib/config-service'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, ids, data } = await request.json()
    
    if (!action || !ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
    }

    const sanitizedIds = ids.map(id => sanitizeInput(id)).filter(Boolean)
    if (sanitizedIds.length === 0 || sanitizedIds.length > 100) {
      return NextResponse.json({ error: 'Invalid ids' }, { status: 400 })
    }

    const bulkEnabled = (await ConfigService.get('admin_bulk_enabled', 'false')) === 'true'
    if (!bulkEnabled) {
      return NextResponse.json({ error: 'Bulk operations are disabled' }, { status: 403 })
    }

    let result = { success: 0, failed: 0, errors: [] as string[] }

    switch (action) {
      case 'approve_sarafs':
        const approveResult = await prisma.saraf.updateMany({
          where: { id: { in: sanitizedIds } },
          data: { status: 'APPROVED' }
        })
        result.success = approveResult.count
        break

      case 'suspend_users':
        const suspendResult = await prisma.user.updateMany({
          where: { id: { in: sanitizedIds } },
          data: { isActive: false }
        })
        result.success = suspendResult.count
        break

      case 'complete_transactions':
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'ADMIN_BULK_ACTION',
        resource: 'ADMIN',
        details: JSON.stringify({
          action,
          idsCount: sanitizedIds.length,
          data: data ? '[REDACTED]' : undefined,
          successCount: result.success,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    }).catch(() => null)

    return NextResponse.json({
      success: true,
      result,
      message: `Bulk operation completed: ${result.success} items processed`
    })

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
