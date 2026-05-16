import bcrypt from 'bcryptjs'
import type { Prisma, UserRole } from '@prisma/client'
import { sanitizeInput } from '@/lib/security'

type TransactionClient = Prisma.TransactionClient

interface BranchUserInput {
  name: string
  email: string
  phone?: string | null
  password: string
}

interface BranchStaffAssignmentInput {
  userId: string
  role?: string | null
}

function normalizeEmail(value: string) {
  return sanitizeInput(value).trim().toLowerCase()
}

function normalizeName(value: string) {
  return sanitizeInput(value).trim()
}

function normalizePhone(value?: string | null) {
  if (!value) return null
  const normalized = sanitizeInput(value).trim()
  return normalized || null
}

function normalizeStaffRole(value?: string | null) {
  const normalized = sanitizeInput(value || '').trim().toUpperCase()
  return normalized || 'OPERATOR'
}

export async function createBranchUser(
  tx: TransactionClient,
  input: BranchUserInput,
  role: 'BRANCH_MANAGER' | 'BRANCH_STAFF'
) {
  const email = normalizeEmail(input.email)
  const name = normalizeName(input.name)
  const phone = normalizePhone(input.phone)

  if (!email || !name || !input.password) {
    throw new Error('INVALID_BRANCH_USER_INPUT')
  }

  const [duplicateEmail, duplicatePhone] = await Promise.all([
    tx.user.findUnique({ where: { email }, select: { id: true } }),
    phone ? tx.user.findUnique({ where: { phone }, select: { id: true } }) : Promise.resolve(null),
  ])

  if (duplicateEmail || duplicatePhone) {
    throw new Error('BRANCH_USER_ALREADY_EXISTS')
  }

  return tx.user.create({
    data: {
      email,
      name,
      phone,
      password: await bcrypt.hash(input.password, 12),
      role,
      isVerified: true,
      isActive: true,
    },
    select: {
      id: true,
      email: true,
      name: true,
      phone: true,
      role: true,
    },
  })
}

export async function ensureAssignableBranchUser(
  tx: TransactionClient,
  userId: string,
  sarafId: string
) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      saraf: { select: { id: true } },
      managedBranches: {
        where: { isActive: true },
        select: { id: true, sarafId: true },
      },
      branchStaff: {
        where: { isActive: true },
        select: {
          id: true,
          branch: {
            select: {
              sarafId: true,
            },
          },
        },
      },
    },
  })

  if (!user) {
    throw new Error('BRANCH_USER_NOT_FOUND')
  }

  if (user.role === 'ADMIN' || user.role === 'SARAF' || user.saraf) {
    throw new Error('BRANCH_USER_NOT_ASSIGNABLE')
  }

  const relatedSarafIds = new Set<string>()
  for (const branch of user.managedBranches) {
    relatedSarafIds.add(branch.sarafId)
  }
  for (const membership of user.branchStaff) {
    relatedSarafIds.add(membership.branch.sarafId)
  }

  if (relatedSarafIds.size > 0 && !relatedSarafIds.has(sarafId)) {
    throw new Error('BRANCH_USER_BELONGS_TO_ANOTHER_SARAF')
  }

  return user
}

export async function syncBranchOperationalRole(tx: TransactionClient, userId: string) {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      saraf: { select: { id: true } },
      managedBranches: {
        where: { isActive: true },
        select: { id: true },
        take: 1,
      },
      branchStaff: {
        where: { isActive: true },
        select: { id: true },
        take: 1,
      },
    },
  })

  if (!user || user.role === 'ADMIN' || user.role === 'SARAF' || user.saraf) {
    return
  }

  let targetRole: UserRole = 'USER'
  if (user.managedBranches.length > 0) {
    targetRole = 'BRANCH_MANAGER'
  } else if (user.branchStaff.length > 0) {
    targetRole = 'BRANCH_STAFF'
  }

  if (user.role !== targetRole) {
    await tx.user.update({
      where: { id: userId },
      data: { role: targetRole },
    })
  }
}

export async function setBranchManager(params: {
  tx: TransactionClient
  branchId: string
  sarafId: string
  managerUserId?: string | null
}) {
  const { tx, branchId, sarafId, managerUserId } = params
  const branch = await tx.sarafBranch.findUnique({
    where: { id: branchId },
    select: { id: true, managerId: true },
  })

  if (!branch) {
    throw new Error('BRANCH_NOT_FOUND')
  }

  if (managerUserId) {
    await ensureAssignableBranchUser(tx, managerUserId, sarafId)
  }

  if (branch.managerId === managerUserId) {
    if (managerUserId) {
      await tx.user.update({
        where: { id: managerUserId },
        data: { role: 'BRANCH_MANAGER' },
      })
    }
    return
  }

  await tx.sarafBranch.update({
    where: { id: branchId },
    data: { managerId: managerUserId || null },
  })

  if (managerUserId) {
    await tx.user.update({
      where: { id: managerUserId },
      data: { role: 'BRANCH_MANAGER' },
    })
  }

  if (branch.managerId) {
    await syncBranchOperationalRole(tx, branch.managerId)
  }
}

export async function replaceBranchStaff(params: {
  tx: TransactionClient
  branchId: string
  sarafId: string
  assignments?: BranchStaffAssignmentInput[] | null
}) {
  const { tx, branchId, sarafId, assignments } = params
  const desiredAssignments = new Map<string, string>()

  for (const assignment of assignments || []) {
    if (!assignment?.userId) continue
    desiredAssignments.set(assignment.userId, normalizeStaffRole(assignment.role))
  }

  for (const userId of desiredAssignments.keys()) {
    await ensureAssignableBranchUser(tx, userId, sarafId)
  }

  const existingAssignments = await tx.branchStaff.findMany({
    where: { branchId },
    select: { userId: true },
  })

  const existingIds = new Set(existingAssignments.map((assignment) => assignment.userId))
  const desiredIds = new Set(desiredAssignments.keys())

  for (const [userId, role] of desiredAssignments.entries()) {
    await tx.branchStaff.upsert({
      where: {
        branchId_userId: {
          branchId,
          userId,
        },
      },
      update: {
        role,
        isActive: true,
      },
      create: {
        branchId,
        userId,
        role,
        isActive: true,
      },
    })
  }

  const removedUserIds = Array.from(existingIds).filter((userId) => !desiredIds.has(userId))
  if (removedUserIds.length > 0) {
    await tx.branchStaff.updateMany({
      where: { branchId, userId: { in: removedUserIds } },
      data: { isActive: false },
    })
  }

  for (const userId of desiredIds) {
    await syncBranchOperationalRole(tx, userId)
  }
  for (const userId of removedUserIds) {
    await syncBranchOperationalRole(tx, userId)
  }
}
