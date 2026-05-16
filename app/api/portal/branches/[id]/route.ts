import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import {
  createBranchUser,
  replaceBranchStaff,
  setBranchManager,
  syncBranchOperationalRole,
} from '@/lib/branch-management'
import { isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'

export const dynamic = 'force-dynamic'

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

async function getOwnedBranch(branchId: string, sarafId: string) {
  const branch = await prisma.sarafBranch.findFirst({
    where: { id: branchId, sarafId },
    include: {
      manager: {
        select: { id: true, name: true, email: true, phone: true, role: true },
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

  return branch
}

function serializeBranch(branch: NonNullable<Awaited<ReturnType<typeof getOwnedBranch>>>) {
  return {
    ...branch,
    staffMembers: branch.staff.map((staff) => ({
      userId: staff.user.id,
      name: staff.user.name,
      email: staff.user.email,
      phone: staff.user.phone,
      systemRole: staff.user.role,
      branchRole: staff.role,
    })),
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    if (accessContext.accessMode === 'BRANCH' && !accessContext.accessibleBranchIds.includes(params.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const branch = await getOwnedBranch(params.id, saraf.id)
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const transactions = await prisma.transaction.findMany({
      where: {
        sarafId: saraf.id,
        OR: [{ originBranchId: params.id }, { destinationBranchId: params.id }],
      },
      select: {
        id: true,
        referenceCode: true,
        type: true,
        status: true,
        fromAmount: true,
        toAmount: true,
        fromCurrency: true,
        toCurrency: true,
        systemCommission: true,
        waivedSystemCommission: true,
        sarafCommission: true,
        systemDiscountAmount: true,
        senderName: true,
        receiverName: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })

    const completedTransactions = transactions.filter((transaction) => transaction.status === 'COMPLETED')
    return NextResponse.json({
      branch: serializeBranch(branch),
      metrics: {
        totalTransactions: transactions.length,
        completedTransactions: completedTransactions.length,
        totalVolume: completedTransactions.reduce((sum, transaction) => sum + transaction.toAmount, 0),
        branchProfit: completedTransactions.reduce((sum, transaction) => sum + transaction.sarafCommission, 0),
        systemRevenue: completedTransactions.reduce((sum, transaction) => sum + transaction.systemCommission, 0),
        waivedSystemRevenue: completedTransactions.reduce(
          (sum, transaction) => sum + transaction.waivedSystemCommission,
          0
        ),
        systemDiscountCost: completedTransactions.reduce(
          (sum, transaction) => sum + transaction.systemDiscountAmount,
          0
        ),
      },
      recentTransactions: transactions,
    })
  } catch (error) {
    console.error('Branch fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const branchId = params.id
    const body = await request.json()

    const saraf = await getApprovedOwnerSaraf(session.user.id)
    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 })
    }

    const existingBranch = await getOwnedBranch(branchId, saraf.id)
    if (!existingBranch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const updateData: Record<string, unknown> = {}
    if (body.name !== undefined) updateData.name = sanitizeInput(body.name)
    if (body.address !== undefined) updateData.address = sanitizeInput(body.address)
    if (body.phone !== undefined) updateData.phone = sanitizeInput(body.phone)
    if (body.city !== undefined) updateData.city = sanitizeInput(body.city)
    if (body.country !== undefined) updateData.country = sanitizeInput(body.country)
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    const managerUserId =
      body.clearManager === true ? null : body.managerUserId ? sanitizeInput(body.managerUserId) : undefined
    const manager = body.manager
    const staffAssignments = Array.isArray(body.staffAssignments) ? body.staffAssignments : undefined
    const staffMembers = Array.isArray(body.staffMembers) ? body.staffMembers : []

    const branch = await prisma.$transaction(async (tx) => {
      if (Object.keys(updateData).length > 0) {
        await tx.sarafBranch.update({
          where: { id: branchId },
          data: updateData,
        })
      }

      let resolvedManagerUserId = managerUserId
      if (managerUserId === undefined && !existingBranch.managerId && manager?.email && manager?.name && manager?.password) {
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

      if (resolvedManagerUserId !== undefined) {
        await setBranchManager({
          tx,
          branchId,
          sarafId: saraf.id,
          managerUserId: resolvedManagerUserId,
        })
      }

      if (staffAssignments !== undefined || staffMembers.length > 0) {
        const materializedAssignments = [...(staffAssignments || [])]
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

        await replaceBranchStaff({
          tx,
          branchId,
          sarafId: saraf.id,
          assignments: materializedAssignments.filter(
            (assignment) => assignment?.userId && assignment.userId !== resolvedManagerUserId
          ),
        })
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BRANCH_UPDATED',
          resource: 'SARAF_BRANCH',
          resourceId: branchId,
          details: JSON.stringify({
            updatedFields: Object.keys(updateData),
            managerUserId: resolvedManagerUserId,
            replacedStaffAssignments: staffAssignments !== undefined || staffMembers.length > 0,
          }),
        },
      })

      return tx.sarafBranch.findFirst({
        where: { id: branchId, sarafId: saraf.id },
        include: {
          manager: {
            select: { id: true, name: true, email: true, phone: true, role: true },
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

    return NextResponse.json({
      success: true,
      branch: branch ? serializeBranch(branch) : null,
    })
  } catch (error) {
    console.error('Branch update error:', error)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const branchId = params.id
    const saraf = await getApprovedOwnerSaraf(session.user.id)
    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not approved or not found' }, { status: 403 })
    }

    const branch = await getOwnedBranch(branchId, saraf.id)
    if (!branch) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 })
    }

    const transactionCount = await prisma.transaction.count({
      where: {
        sarafId: saraf.id,
        OR: [{ originBranchId: branchId }, { destinationBranchId: branchId }],
      },
    })

    if (transactionCount > 0) {
      return NextResponse.json(
        { error: 'Cannot delete branch with existing transactions' },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      const existingStaff = await tx.branchStaff.findMany({
        where: { branchId },
        select: { userId: true },
      })

      await tx.branchStaff.deleteMany({ where: { branchId } })
      await tx.sarafBranch.delete({ where: { id: branchId } })

      if (branch.managerId) {
        await syncBranchOperationalRole(tx, branch.managerId)
      }
      for (const staff of existingStaff) {
        await syncBranchOperationalRole(tx, staff.userId)
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'BRANCH_DELETED',
          resource: 'SARAF_BRANCH',
          resourceId: branchId,
          details: JSON.stringify({
            name: branch.name,
            city: branch.city,
            country: branch.country,
          }),
        },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Branch deletion error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
