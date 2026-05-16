import { describe, expect, it, vi, beforeEach } from 'vitest'

const prismaMock = {
  saraf: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
  },
  branchStaff: {
    findMany: vi.fn(),
  },
  sarafBranch: {
    findMany: vi.fn(),
  },
}

vi.mock('@/lib/prisma', () => ({
  prisma: prismaMock,
}))

describe('saraf-access', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('resolves OWNER access for approved active saraf', async () => {
    prismaMock.saraf.findFirst.mockResolvedValue({
      id: 'saraf_1',
      status: 'APPROVED',
      isActive: true,
    })

    const { resolvePortalAccessContext } = await import('@/lib/saraf-access')
    const ctx = await resolvePortalAccessContext({
      userId: 'user_1',
      role: 'SARAF',
      sarafId: 'saraf_1',
    })

    expect(ctx).toEqual({
      role: 'SARAF',
      sarafId: 'saraf_1',
      accessMode: 'OWNER',
      accessibleBranchIds: [],
    })
  })

  it('rejects saraf access if not approved/active', async () => {
    prismaMock.saraf.findUnique.mockResolvedValue({
      id: 'saraf_1',
      status: 'PENDING',
      isActive: true,
    })

    const { resolvePortalAccessContext } = await import('@/lib/saraf-access')
    const ctx = await resolvePortalAccessContext({
      userId: 'user_1',
      role: 'SARAF',
      sarafId: null,
    })

    expect(ctx).toBeNull()
  })

  it('resolves BRANCH access when memberships belong to exactly one saraf', async () => {
    prismaMock.branchStaff.findMany.mockResolvedValue([
      {
        branchId: 'b1',
        branch: { sarafId: 'saraf_1', isActive: true },
      },
      {
        branchId: 'b2',
        branch: { sarafId: 'saraf_1', isActive: true },
      },
    ])
    prismaMock.sarafBranch.findMany.mockResolvedValue([])

    const { resolvePortalAccessContext } = await import('@/lib/saraf-access')
    const ctx = await resolvePortalAccessContext({
      userId: 'staff_1',
      role: 'BRANCH_STAFF',
      sarafId: null,
    })

    expect(ctx).toEqual({
      role: 'BRANCH_STAFF',
      sarafId: 'saraf_1',
      accessMode: 'BRANCH',
      accessibleBranchIds: ['b1', 'b2'],
    })
  })

  it('rejects BRANCH access when memberships span multiple sarafs', async () => {
    prismaMock.branchStaff.findMany.mockResolvedValue([
      { branchId: 'b1', branch: { sarafId: 'saraf_1', isActive: true } },
      { branchId: 'b2', branch: { sarafId: 'saraf_2', isActive: true } },
    ])
    prismaMock.sarafBranch.findMany.mockResolvedValue([])

    const { resolvePortalAccessContext } = await import('@/lib/saraf-access')
    const ctx = await resolvePortalAccessContext({
      userId: 'staff_1',
      role: 'BRANCH_MANAGER',
      sarafId: null,
    })

    expect(ctx).toBeNull()
  })

  it('enforces branch access checks for BRANCH mode', async () => {
    const { hasRequiredBranchAccess, hasTransactionBranchAccess } = await import('@/lib/saraf-access')

    const ctx = {
      role: 'BRANCH_STAFF' as const,
      sarafId: 'saraf_1',
      accessMode: 'BRANCH' as const,
      accessibleBranchIds: ['b1'],
    }

    expect(hasRequiredBranchAccess(ctx, 'b1')).toBe(true)
    expect(hasRequiredBranchAccess(ctx, 'b2')).toBe(false)
    expect(hasTransactionBranchAccess(ctx, 'b2', 'b1')).toBe(true)
    expect(hasTransactionBranchAccess(ctx, 'b2', 'b3')).toBe(false)
  })
})

