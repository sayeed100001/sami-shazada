import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { resolvePortalAccessContext } from '@/lib/saraf-access'
import type { PortalConnectionStatus } from '@/lib/portal-internal-chat-types'

const PORTAL_MESSENGER_ROLES = ['USER', 'SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'] as const
const PORTAL_NETWORK_ROLES = ['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'] as const

export type PortalMessengerAccessMode = 'OWNER' | 'BRANCH' | 'USER' | 'ADMIN'

export interface InternalPortalChatAccessContext {
  role: string
  sarafId: string
  accessMode: PortalMessengerAccessMode
  accessibleBranchIds: string[]
}

function buildApprovedPortalDirectoryPredicates(): Prisma.UserWhereInput[] {
  return [
    {
      role: 'SARAF',
      saraf: {
        is: {
          status: 'APPROVED',
          isActive: true,
        },
      },
    },
    {
      role: 'BRANCH_MANAGER',
      managedBranches: {
        some: {
          isActive: true,
          saraf: {
            status: 'APPROVED',
            isActive: true,
          },
        },
      },
    },
    {
      role: 'BRANCH_STAFF',
      branchStaff: {
        some: {
          isActive: true,
          branch: {
            isActive: true,
            saraf: {
              status: 'APPROVED',
              isActive: true,
            },
          },
        },
      },
    },
  ]
}

export async function resolveInternalPortalChatAccess(session: any): Promise<InternalPortalChatAccessContext | null> {
  if (!session?.user?.id || !session?.user?.role) {
    return null
  }

  if (session.user.role === 'ADMIN') {
    return {
      role: 'ADMIN',
      sarafId: session.user.sarafId || '',
      accessMode: 'ADMIN',
      accessibleBranchIds: [],
    }
  }

  if (session.user.role === 'USER') {
    return {
      role: 'USER',
      sarafId: `user:${session.user.id}`,
      accessMode: 'USER',
      accessibleBranchIds: [],
    }
  }

  return resolvePortalAccessContext({
    userId: session.user.id,
    role: session.user.role,
    sarafId: session.user.sarafId,
  })
}

export function buildPortalParticipantUserSelect(
  sarafId?: string | null,
  accessMode: PortalMessengerAccessMode = 'OWNER'
) {
  const hasGlobalBranchView = accessMode === 'ADMIN' || accessMode === 'USER'

  const managedBranchesWhere = hasGlobalBranchView
    ? {
        isActive: true,
      }
    : {
        sarafId: sarafId || undefined,
        isActive: true,
      }

  const branchStaffWhere = hasGlobalBranchView
    ? {
        isActive: true,
        branch: {
          isActive: true,
        },
      }
    : {
        isActive: true,
        branch: {
          sarafId: sarafId || undefined,
          isActive: true,
        },
      }

  return {
    id: true,
    name: true,
    email: true,
    phone: true,
    role: true,
    avatarUrl: true,
    lastLogin: true,
    saraf: {
      select: {
        id: true,
        businessName: true,
        businessPhone: true,
      },
    },
    managedBranches: {
      where: managedBranchesWhere,
      select: {
        id: true,
        name: true,
        sarafId: true,
      },
    },
    branchStaff: {
      where: branchStaffWhere,
      select: {
        branch: {
          select: {
            id: true,
            name: true,
            sarafId: true,
          },
        },
      },
    },
  }
}

export function mapPortalParticipantUser(user: Record<string, any>) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone || null,
    role: user.role,
    avatarUrl: user.avatarUrl || null,
    lastLogin: user.lastLogin ? user.lastLogin.toISOString?.() || user.lastLogin : null,
    sarafId: user.saraf?.id || null,
    sarafName: user.saraf?.businessName || null,
    sarafPhone: user.saraf?.businessPhone || null,
    managedBranchNames: (user.managedBranches || []).map((branch: { name: string }) => branch.name),
    staffBranchNames: (user.branchStaff || []).map((assignment: { branch: { name: string } }) => assignment.branch.name),
  }
}

function buildPortalDirectoryWhere(
  currentUserId: string,
  accessMode: PortalMessengerAccessMode
): Prisma.UserWhereInput {
  const includeAdmin = accessMode === 'ADMIN'
  const includeUsers = accessMode === 'ADMIN' || accessMode === 'OWNER' || accessMode === 'BRANCH'

  return {
    isActive: true,
    id: { not: currentUserId },
    OR: [
      ...(includeAdmin
        ? [
            {
              role: 'ADMIN' as const,
            },
          ]
        : []),
      ...(includeUsers
        ? [
            {
              role: 'USER' as const,
            },
          ]
        : []),
      ...buildApprovedPortalDirectoryPredicates(),
    ],
  }
}

async function getAutomaticPortalContactIds(
  currentUserId: string,
  sarafId: string,
  accessMode: PortalMessengerAccessMode
) {
  if (accessMode === 'ADMIN') {
    const contacts = await prisma.user.findMany({
      where: buildPortalDirectoryWhere(currentUserId, 'ADMIN'),
      select: { id: true },
      take: 800,
    })

    return contacts.map((contact) => contact.id)
  }

  if (accessMode === 'USER') {
    return []
  }

  const contacts = await prisma.user.findMany({
    where: {
      isActive: true,
      id: { not: currentUserId },
      OR: [
        {
          role: 'SARAF',
          saraf: {
            is: {
              id: sarafId,
              status: 'APPROVED',
              isActive: true,
            },
          },
        },
        {
          role: 'BRANCH_MANAGER',
          managedBranches: {
            some: {
              sarafId,
              isActive: true,
            },
          },
        },
        {
          role: 'BRANCH_STAFF',
          branchStaff: {
            some: {
              isActive: true,
              branch: {
                sarafId,
                isActive: true,
              },
            },
          },
        },
      ],
    },
    select: { id: true },
    take: 400,
  })

  return contacts.map((contact) => contact.id)
}

async function getPortalConnectionSnapshot(currentUserId: string) {
  const requests = await prisma.portalConnectionRequest.findMany({
    where: {
      OR: [{ requesterId: currentUserId }, { targetId: currentUserId }],
      status: {
        in: ['PENDING', 'ACCEPTED'],
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  const acceptedIds = new Set<string>()
  const incomingPending = new Map<string, string>()
  const outgoingPending = new Map<string, string>()

  for (const request of requests) {
    const otherUserId = request.requesterId === currentUserId ? request.targetId : request.requesterId
    if (request.status === 'ACCEPTED') {
      acceptedIds.add(otherUserId)
      continue
    }
    if (request.requesterId === currentUserId) {
      outgoingPending.set(otherUserId, request.id)
    } else {
      incomingPending.set(otherUserId, request.id)
    }
  }

  return {
    acceptedIds,
    incomingPending,
    outgoingPending,
  }
}

function sortDirectoryStatus(status: PortalConnectionStatus) {
  if (status === 'PENDING_INCOMING') return 0
  if (status === 'CONNECTED') return 1
  if (status === 'PENDING_OUTGOING') return 2
  return 3
}

export async function listAvailablePortalChatContacts(
  currentUserId: string,
  sarafId: string,
  accessMode: PortalMessengerAccessMode
) {
  const [automaticIds, connectionSnapshot] = await Promise.all([
    getAutomaticPortalContactIds(currentUserId, sarafId, accessMode),
    getPortalConnectionSnapshot(currentUserId),
  ])

  const allowedIds = Array.from(new Set([...automaticIds, ...connectionSnapshot.acceptedIds]))
  if (!allowedIds.length) {
    return []
  }

  const contacts = await prisma.user.findMany({
    where: {
      id: { in: allowedIds },
      role: { in: [...PORTAL_MESSENGER_ROLES] },
      isActive: true,
    },
    select: buildPortalParticipantUserSelect(sarafId, accessMode),
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 400,
  })

  return contacts.map((contact) => mapPortalParticipantUser(contact))
}

export async function listPortalDirectoryEntries(
  currentUserId: string,
  sarafId: string,
  accessMode: PortalMessengerAccessMode
) {
  const [automaticIds, connectionSnapshot, users] = await Promise.all([
    getAutomaticPortalContactIds(currentUserId, sarafId, accessMode),
    getPortalConnectionSnapshot(currentUserId),
    prisma.user.findMany({
      where: buildPortalDirectoryWhere(currentUserId, accessMode),
      select: buildPortalParticipantUserSelect(sarafId, accessMode),
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
      take: 500,
    }),
  ])

  const automaticSet = new Set(automaticIds)
  const entries = users.map((user) => {
    const mappedUser = mapPortalParticipantUser(user)
    let connectionStatus: PortalConnectionStatus = 'NONE'
    let requestId: string | null = null

    if (automaticSet.has(user.id) || connectionSnapshot.acceptedIds.has(user.id)) {
      connectionStatus = 'CONNECTED'
    } else if (connectionSnapshot.incomingPending.has(user.id)) {
      connectionStatus = 'PENDING_INCOMING'
      requestId = connectionSnapshot.incomingPending.get(user.id) || null
    } else if (connectionSnapshot.outgoingPending.has(user.id)) {
      connectionStatus = 'PENDING_OUTGOING'
      requestId = connectionSnapshot.outgoingPending.get(user.id) || null
    }

    return {
      ...mappedUser,
      connectionStatus,
      requestId,
    }
  })

  entries.sort((left, right) => {
    const statusDiff = sortDirectoryStatus(left.connectionStatus) - sortDirectoryStatus(right.connectionStatus)
    if (statusDiff !== 0) return statusDiff
    return left.name.localeCompare(right.name)
  })

  return entries
}

export async function listPortalDirectChatContacts(
  currentUserId: string,
  sarafId: string,
  accessMode: PortalMessengerAccessMode
) {
  const users = await prisma.user.findMany({
    where: {
      ...buildPortalDirectoryWhere(currentUserId, accessMode),
      ...(accessMode === 'ADMIN'
        ? {}
        : {
            role: {
              in:
                accessMode === 'USER'
                  ? [...PORTAL_NETWORK_ROLES]
                  : [...PORTAL_MESSENGER_ROLES],
            },
          }),
    },
    select: buildPortalParticipantUserSelect(sarafId, accessMode),
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    take: 500,
  })

  return users.map((user) => mapPortalParticipantUser(user))
}
