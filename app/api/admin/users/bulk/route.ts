import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'

export const dynamic = 'force-dynamic'

const MAX_BULK_USER_ACTIONS = 250

function buildNotificationPayload(
  userIds: string[],
  title: string,
  message: string,
  type: string,
  action?: string
) {
  return userIds.map((userId) => ({
    userId,
    title,
    message,
    type,
    ...(action ? { action } : {}),
  }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const userIds = Array.isArray(body.userIds) ? body.userIds.filter((value): value is string => typeof value === 'string') : []
    const action = typeof body.action === 'string' ? body.action : ''

    if (userIds.length === 0) {
      return NextResponse.json({ error: 'User IDs are required' }, { status: 400 })
    }

    if (userIds.length > MAX_BULK_USER_ACTIONS) {
      return NextResponse.json(
        { error: `Bulk actions are limited to ${MAX_BULK_USER_ACTIONS} users per request` },
        { status: 400 }
      )
    }

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 })
    }

    const result: Record<string, unknown> = { success: true, count: 0 }

    switch (action) {
      case 'activate': {
        const activateResult = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isActive: true },
        })
        result.count = activateResult.count

        await prisma.notification.createMany({
          data: buildNotificationPayload(
            userIds,
            'Account activated',
            'Your account has been activated by system administration.',
            'success'
          ),
        }).catch((error) => console.error('Notification error:', error))
        break
      }

      case 'deactivate': {
        const filteredIds = userIds.filter((id) => id !== session.user.id)

        const deactivateResult = await prisma.user.updateMany({
          where: { id: { in: filteredIds } },
          data: { isActive: false },
        })
        result.count = deactivateResult.count

        if (filteredIds.length > 0) {
          await prisma.notification.createMany({
            data: buildNotificationPayload(
              filteredIds,
              'Account deactivated',
              'Your account has been deactivated by system administration.',
              'warning',
              'CONTACT_SUPPORT'
            ),
          }).catch((error) => console.error('Notification error:', error))
        }
        break
      }

      case 'verify': {
        const verifyResult = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { isVerified: true, isEmailVerified: true },
        })
        result.count = verifyResult.count
        break
      }

      case 'delete': {
        const deleteFilteredIds = userIds.filter((id) => id !== session.user.id)

        const deletionCandidates = await prisma.user.findMany({
          where: {
            id: { in: deleteFilteredIds },
          },
          select: {
            id: true,
            _count: {
              select: {
                transactions: true,
              },
            },
            saraf: {
              select: {
                id: true,
              },
            },
            managedBranches: {
              select: { id: true },
              take: 1,
            },
            branchStaff: {
              select: { id: true },
              take: 1,
            },
          },
        })

        const blockedUsers = deletionCandidates.filter(
          (candidate) =>
            candidate._count.transactions > 0 ||
            Boolean(candidate.saraf) ||
            candidate.managedBranches.length > 0 ||
            candidate.branchStaff.length > 0
        )

        const blockedUserIds = blockedUsers.map((user) => user.id)
        const safeToDeleteIds = deleteFilteredIds.filter((id) => !blockedUserIds.includes(id))

        if (safeToDeleteIds.length > 0) {
          const deleteResult = await prisma.user.deleteMany({
            where: { id: { in: safeToDeleteIds } },
          })
          result.count = deleteResult.count
        }

        result.skipped = blockedUserIds.length
        result.message =
          blockedUserIds.length > 0
            ? `${blockedUserIds.length} users were skipped because they still have transactions or linked saraf/branch records`
            : undefined
        break
      }

      case 'upgrade_vip': {
        const upgradeResult = await prisma.user.updateMany({
          where: { id: { in: userIds } },
          data: { vipLevel: 'GOLD' },
        })
        result.count = upgradeResult.count

        await prisma.notification.createMany({
          data: buildNotificationPayload(
            userIds,
            'VIP upgraded',
            'Congratulations. Your account has been upgraded to GOLD VIP.',
            'success'
          ),
        }).catch((error) => console.error('Notification error:', error))
        break
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'BULK_USER_ACTION',
        resource: 'USER',
        resourceId: userIds.join(','),
        details: JSON.stringify({
          action,
          userCount: userIds.length,
          affectedCount: result.count,
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
      },
    })

    clearAdminStatsCache()

    return NextResponse.json(result)
  } catch (error) {
    console.error('Bulk user action error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
