import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import {
  createBranchUser,
  replaceBranchStaff,
  setBranchManager,
} from '@/lib/branch-management'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

function buildBranchMetrics(
  branches: Array<{ id: string }>,
  transactions: Array<{
    originBranchId: string | null
    destinationBranchId: string | null
    status: string
    toAmount: number
    systemCommission: number
    waivedSystemCommission: number
    sarafCommission: number
    systemDiscountAmount: number
  }>
) {
  const metrics = new Map(
    branches.map((branch) => [
      branch.id,
      {
        totalTransactions: 0,
        completedTransactions: 0,
        outgoingTransactions: 0,
        incomingTransactions: 0,
        totalVolume: 0,
        systemRevenue: 0,
        waivedSystemRevenue: 0,
        branchProfit: 0,
        systemDiscountCost: 0,
      },
    ])
  )

  for (const transaction of transactions) {
    const touchedBranchIds = Array.from(
      new Set([transaction.originBranchId, transaction.destinationBranchId].filter(Boolean))
    ) as string[]

    for (const branchId of touchedBranchIds) {
      const branchMetrics = metrics.get(branchId)
      if (!branchMetrics) continue

      branchMetrics.totalTransactions += 1
      if (transaction.originBranchId === branchId) {
        branchMetrics.outgoingTransactions += 1
      }
      if (transaction.destinationBranchId === branchId) {
        branchMetrics.incomingTransactions += 1
      }

      if (transaction.status === 'COMPLETED') {
        branchMetrics.completedTransactions += 1
        branchMetrics.totalVolume += transaction.toAmount
        branchMetrics.systemRevenue += transaction.systemCommission
        branchMetrics.waivedSystemRevenue += transaction.waivedSystemCommission
        branchMetrics.branchProfit += transaction.sarafCommission
        branchMetrics.systemDiscountCost += transaction.systemDiscountAmount
      }
    }
  }

  return metrics
}

async function getApprovedOwnerSaraf(userId: string) {
  return prisma.saraf.findFirst({
    where: {
      userId,
      status: 'APPROVED',
    },
    select: {
      id: true,
      businessName: true,
    },
  })
}

async function getAssignableUsers(sarafId: string) {
  const users = await prisma.user.findMany({
    where: {
      role: {
        in: ['USER', 'BRANCH_MANAGER', 'BRANCH_STAFF'],
      },
      saraf: null,
      isActive: true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      managedBranches: {
        where: { isActive: true },
        select: { id: true, name: true, sarafId: true },
      },
      branchStaff: {
        where: { isActive: true },
        select: {
          branchId: true,
          role: true,
          branch: {
            select: {
              id: true,
              name: true,
              sarafId: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  return users
    .filter((user) => {
      const relatedSarafIds = new Set<string>()
      for (const branch of user.managedBranches) {
        relatedSarafIds.add(branch.sarafId)
      }
      for (const membership of user.branchStaff) {
        relatedSarafIds.add(membership.branch.sarafId)
      }

      return relatedSarafIds.size === 0 || (relatedSarafIds.size === 1 && relatedSarafIds.has(sarafId))
    })
    .map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      managedBranchCount: user.managedBranches.length,
      staffBranchCount: user.branchStaff.length,
    }))
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 403 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: accessContext.sarafId },
      select: { id: true, status: true, businessName: true },
    })

    if (!saraf || saraf.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 })
    }

    const branchWhere =
      accessContext.accessMode === 'OWNER'
        ? { sarafId: saraf.id }
        : { sarafId: saraf.id, id: { in: accessContext.accessibleBranchIds } }

    const scope = request.nextUrl.searchParams.get('scope')
    const isHawalaScope = scope === 'hawala'

    const [branches, transactions, availableUsers, originBranches, destinationBranches] = await Promise.all([
      prisma.sarafBranch.findMany({
        where: branchWhere,
        include: {
          manager: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          staff: {
            where: { isActive: true },
            select: {
              role: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  role: true,
                },
              },
            },
          },
          _count: {
            select: {
              staff: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.transaction.findMany({
        where: {
          sarafId: saraf.id,
          OR: [{ originBranchId: { not: null } }, { destinationBranchId: { not: null } }],
        },
        select: {
          originBranchId: true,
          destinationBranchId: true,
          status: true,
          toAmount: true,
          systemCommission: true,
          waivedSystemCommission: true,
          sarafCommission: true,
          systemDiscountAmount: true,
        },
      }),
      accessContext.accessMode === 'OWNER' ? getAssignableUsers(saraf.id) : Promise.resolve([]),
      isHawalaScope
        ? prisma.sarafBranch.findMany({
            where:
              accessContext.accessMode === 'OWNER'
                ? { sarafId: saraf.id, isActive: true }
                : {
                    sarafId: saraf.id,
                    isActive: true,
                    id: { in: accessContext.accessibleBranchIds },
                  },
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              address: true,
              isActive: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
      isHawalaScope
        ? prisma.sarafBranch.findMany({
            where: { sarafId: saraf.id, isActive: true },
            select: {
              id: true,
              name: true,
              city: true,
              country: true,
              address: true,
              isActive: true,
            },
            orderBy: { createdAt: 'desc' },
          })
        : Promise.resolve([]),
    ])

    const metricsByBranch = buildBranchMetrics(branches, transactions)
    return NextResponse.json({
      branches: branches.map((branch) => ({
        ...branch,
        staffMembers: branch.staff.map((staff) => ({
          userId: staff.user.id,
          name: staff.user.name,
          email: staff.user.email,
          phone: staff.user.phone,
          systemRole: staff.user.role,
          branchRole: staff.role,
        })),
        metrics: metricsByBranch.get(branch.id),
        _count: {
          transactions: metricsByBranch.get(branch.id)?.totalTransactions || 0,
          staff: branch._count.staff,
        },
      })),
      availableUsers,
      originBranches,
      destinationBranches,
    })
  } catch (error) {
    console.error('Branches fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = sanitizeInput(body.name)
    const address = sanitizeInput(body.address)
    const phone = sanitizeInput(body.phone)
    const city = sanitizeInput(body.city)
    const country = sanitizeInput(body.country) || 'Afghanistan'
    const managerUserId = body.managerUserId ? sanitizeInput(body.managerUserId) : null
    const manager = body.manager
    const staffAssignments = Array.isArray(body.staffAssignments) ? body.staffAssignments : []
    const staffMembers = Array.isArray(body.staffMembers) ? body.staffMembers : []

    if (!name || !address || !phone || !city) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const saraf = await getApprovedOwnerSaraf(session.user.id)
    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 })
    }

    const createdBranch = await prisma.$transaction(async (tx) => {
      let resolvedManagerUserId = managerUserId
      if (!resolvedManagerUserId && manager?.email && manager?.name && manager?.password) {
        const createdManager = await createBranchUser(
          tx,
          {
            name: manager.name,
            email: manager.email,
            phone: manager.phone || null,
            password: manager.password,
          },
          'BRANCH_MANAGER'
        )
        resolvedManagerUserId = createdManager.id
      }

      const branch = await tx.sarafBranch.create({
        data: {
          sarafId: saraf.id,
          name,
          address,
          phone,
          city,
          country,
          isActive: true,
        },
        select: { id: true },
      })

      if (resolvedManagerUserId) {
        await setBranchManager({
          tx,
          branchId: branch.id,
          sarafId: saraf.id,
          managerUserId: resolvedManagerUserId,
        })
      }

      const materializedAssignments = [...staffAssignments]
      for (const staffMember of staffMembers) {
        if (!staffMember?.email || !staffMember?.name || !staffMember?.password) continue
        const createdStaff = await createBranchUser(
          tx,
          {
            name: staffMember.name,
            email: staffMember.email,
            phone: staffMember.phone || null,
            password: staffMember.password,
          },
          'BRANCH_STAFF'
        )
        materializedAssignments.push({
          userId: createdStaff.id,
          role: staffMember.role || 'OPERATOR',
        })
      }

      const filteredAssignments = materializedAssignments.filter(
        (assignment) => assignment?.userId && assignment.userId !== resolvedManagerUserId
      )

      await replaceBranchStaff({
        tx,
        branchId: branch.id,
        sarafId: saraf.id,
        assignments: filteredAssignments,
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BRANCH_CREATED',
          resource: 'SARAF_BRANCH',
          resourceId: branch.id,
          details: JSON.stringify({
            name,
            city,
            country,
            managerUserId: resolvedManagerUserId,
            staffCount: filteredAssignments.length,
          }),
        },
      })

      return tx.sarafBranch.findUnique({
        where: { id: branch.id },
        include: {
          manager: {
            select: { id: true, name: true, email: true, phone: true },
          },
          staff: {
            where: { isActive: true },
            select: {
              role: true,
              user: {
                select: { id: true, name: true, email: true, phone: true, role: true },
              },
            },
          },
        },
      })
    })

    return NextResponse.json({ success: true, branch: createdBranch })
  } catch (error) {
    console.error('Branch creation error:', error)
    if (error instanceof Error) {
      if (error.message === 'BRANCH_USER_ALREADY_EXISTS') {
        return NextResponse.json({ error: 'Branch user email or phone already exists' }, { status: 409 })
      }
      if (error.message === 'BRANCH_USER_NOT_ASSIGNABLE' || error.message === 'BRANCH_USER_BELONGS_TO_ANOTHER_SARAF') {
        return NextResponse.json({ error: 'Selected branch user cannot be assigned to this saraf' }, { status: 400 })
      }
      if (error.message === 'BRANCH_USER_NOT_FOUND') {
        return NextResponse.json({ error: 'Selected branch user was not found' }, { status: 404 })
      }
      if (error.message === 'INVALID_BRANCH_USER_INPUT') {
        return NextResponse.json({ error: 'New branch users require name, email, and password' }, { status: 400 })
      }
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
