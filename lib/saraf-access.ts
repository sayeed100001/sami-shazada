import { prisma } from '@/lib/prisma'

type PortalRole = 'SARAF' | 'BRANCH_MANAGER' | 'BRANCH_STAFF'

interface ResolvePortalAccessParams {
  userId: string
  role: string
  sarafId?: string | null
}

export interface PortalAccessContext {
  role: PortalRole
  sarafId: string
  accessMode: 'OWNER' | 'BRANCH'
  accessibleBranchIds: string[]
}

export async function resolvePortalAccessContext(
  params: ResolvePortalAccessParams
): Promise<PortalAccessContext | null> {
  const { userId, role, sarafId } = params

  if (role === 'SARAF') {
    const tokenBoundSaraf = sarafId
      ? await prisma.saraf.findFirst({
          where: { id: sarafId, userId },
          select: { id: true, status: true, isActive: true },
        })
      : null

    let sarafRecord = tokenBoundSaraf

    // If session token has stale sarafId or stale status, recover by
    // resolving the current approved+active saraf directly from DB.
    if (!sarafRecord || sarafRecord.status !== 'APPROVED' || !sarafRecord.isActive) {
      sarafRecord = await prisma.saraf.findFirst({
        where: {
          userId,
          status: 'APPROVED',
          isActive: true,
        },
        orderBy: { updatedAt: 'desc' },
        select: { id: true, status: true, isActive: true },
      })
    }

    if (!sarafRecord) {
      const fallbackSaraf = await prisma.saraf.findUnique({
        where: { userId },
        select: { id: true, status: true, isActive: true },
      })

      if (!fallbackSaraf) {
        console.error(
          `[SARAF_ACCESS] No matching saraf record for userId=${userId} and sarafId=${sarafId || 'none'}`
        )
        return null
      }

      if (fallbackSaraf.status !== 'APPROVED') {
        console.error(
          `[SARAF_ACCESS] Saraf not approved. Status: ${fallbackSaraf.status}, userId: ${userId}`
        )
        return null
      }

      if (!fallbackSaraf.isActive) {
        // Backward-compatible self-heal for legacy records that were approved
        // without being activated by admin tooling.
        await prisma.saraf.update({
          where: { id: fallbackSaraf.id },
          data: { isActive: true },
        })
        sarafRecord = {
          ...fallbackSaraf,
          isActive: true,
        }
      } else {
        sarafRecord = fallbackSaraf
      }
    }

    if (sarafRecord.status !== 'APPROVED') {
      console.error(`[SARAF_ACCESS] Saraf not approved. Status: ${sarafRecord.status}, userId: ${userId}`)
      return null
    }

    if (!sarafRecord.isActive) {
      console.error(`[SARAF_ACCESS] Saraf not active. userId: ${userId}`)
      return null
    }

    return {
      role,
      sarafId: sarafRecord.id,
      accessMode: 'OWNER',
      accessibleBranchIds: [],
    }
  }

  if (role !== 'BRANCH_MANAGER' && role !== 'BRANCH_STAFF') {
    return null
  }

  const [staffMemberships, managedBranches] = await Promise.all([
    prisma.branchStaff.findMany({
      where: { userId, isActive: true },
      select: {
        branchId: true,
        branch: {
          select: {
            sarafId: true,
            isActive: true,
          },
        },
      },
    }),
    prisma.sarafBranch.findMany({
      where: { managerId: userId, isActive: true },
      select: {
        id: true,
        sarafId: true,
      },
    }),
  ])

  const branchMap = new Map<string, string>()

  for (const membership of staffMemberships) {
    if (membership.branch.isActive) {
      branchMap.set(membership.branchId, membership.branch.sarafId)
    }
  }

  for (const branch of managedBranches) {
    branchMap.set(branch.id, branch.sarafId)
  }

  const accessibleBranchIds = Array.from(branchMap.keys())
  const sarafIds = Array.from(new Set(branchMap.values()))

  if (accessibleBranchIds.length === 0 || sarafIds.length !== 1) {
    return null
  }

  return {
    role,
    sarafId: sarafIds[0],
    accessMode: 'BRANCH',
    accessibleBranchIds,
  }
}

export function hasRequiredBranchAccess(
  context: PortalAccessContext,
  branchId?: string | null
): boolean {
  if (context.accessMode === 'OWNER') {
    return true
  }

  return !!branchId && context.accessibleBranchIds.includes(branchId)
}

export function hasTransactionBranchAccess(
  context: PortalAccessContext,
  originBranchId?: string | null,
  destinationBranchId?: string | null
): boolean {
  if (context.accessMode === 'OWNER') {
    return true
  }

  return [originBranchId, destinationBranchId].some(
    (branchId) => !!branchId && context.accessibleBranchIds.includes(branchId)
  )
}
