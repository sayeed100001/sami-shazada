import { NextRequest, NextResponse } from 'next/server'
import { checkAdminAuth } from '@/lib/auth-utils'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const authResult = await checkAdminAuth()
    if (authResult.status !== 200) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get security metrics
    const [
      failedLogins,
      rateLimitBlocks,
      suspiciousActivity,
      topRateLimitedIps,
      recentUploads,
      adminActions
    ] = await Promise.all([
      // Failed login attempts (from audit logs)
      prisma.auditLog.count({
        where: {
          action: 'LOGIN_FAILED',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),

      // Rate limit blocks (last 24 hours)
      prisma.auditLog.count({
        where: {
          action: 'RATE_LIMIT_BLOCKED',
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        }
      }),
      
      // Suspicious activity patterns
      prisma.auditLog.findMany({
        where: {
          OR: [
            { action: { contains: 'FAILED' } },
            { action: { contains: 'BLOCKED' } },
            { action: { contains: 'SUSPICIOUS' } }
          ],
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        take: 10,
        orderBy: { createdAt: 'desc' }
      }),

      // Top IPs that hit rate limits (last 24 hours)
      prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          action: 'RATE_LIMIT_BLOCKED',
          ipAddress: { not: null },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        },
        _count: { ipAddress: true },
        orderBy: { _count: { ipAddress: 'desc' } },
        take: 10
      }),
      
      // Recent file uploads
      prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      }),
      
      // Admin actions
      prisma.auditLog.count({
        where: {
          action: { in: ['USER_CREATED', 'USER_DELETED', 'CONTENT_CREATED'] },
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
          }
        }
      })
    ])

    return NextResponse.json({
      metrics: {
        failedLogins,
        rateLimitBlocks,
        suspiciousActivity: suspiciousActivity.length,
        recentUploads,
        adminActions
      },
      topRateLimitedIps: topRateLimitedIps.map((row) => ({
        ip: row.ipAddress,
        count: row._count?.ipAddress ?? 0
      })),
      alerts: suspiciousActivity.map(log => ({
        timestamp: log.createdAt,
        action: log.action,
        details: log.details,
        userId: log.userId
      })),
      recommendations: [
        failedLogins > 10 ? 'High number of failed logins detected' : null,
        rateLimitBlocks > 50 ? 'High rate-limit activity detected' : null,
        recentUploads > 50 ? 'Unusual upload activity detected' : null,
        'Regularly review audit logs',
        'Monitor for suspicious patterns'
      ].filter(Boolean)
    })

  } catch (error) {
    console.error('Security monitoring error:', error)
    return NextResponse.json({ error: 'Failed to fetch security data' }, { status: 500 })
  }
}
