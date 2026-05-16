/**
 * UNIFIED MESSENGER SERVICE
 * Enterprise-grade messenger system for Saray Shahzada
 * Handles all chat types: internal, visitor, admin, friend requests, groups, stories
 */

import { prisma } from '@/lib/prisma'
import type { UserRole } from '@prisma/client'

export type MessengerUserType = 'USER' | 'SARAF' | 'BRANCH_MANAGER' | 'BRANCH_STAFF' | 'ADMIN' | 'VISITOR'
export type ChatType = 'DIRECT' | 'GROUP' | 'BRANCH_TO_BRANCH' | 'VISITOR_TO_SARAF' | 'VISITOR_TO_ADMIN' | 'SUPPORT'
export type ConnectionStatus = 'NONE' | 'PENDING_INCOMING' | 'PENDING_OUTGOING' | 'CONNECTED' | 'BLOCKED'

interface UnifiedMessengerContext {
  userId: string
  role: UserRole
  sarafId?: string | null
  accessMode: 'OWNER' | 'BRANCH' | 'ADMIN' | 'USER' | 'VISITOR'
}

/**
 * Check if user can access unified messenger
 */
export async function canAccessUnifiedMessenger(userId: string, role: UserRole): Promise<boolean> {
  if (role === 'ADMIN') return true
  if (['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(role)) return true
  if (role === 'USER') return true
  return false
}

/**
 * Get messenger context for user
 */
export async function getMessengerContext(userId: string, role: UserRole): Promise<UnifiedMessengerContext | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId, isActive: true },
    select: {
      id: true,
      role: true,
      saraf: { select: { id: true } },
      managedBranches: { where: { isActive: true }, select: { sarafId: true }, take: 1 },
      branchStaff: { where: { isActive: true }, select: { branch: { select: { sarafId: true } } }, take: 1 },
    },
  })

  if (!user) return null

  let accessMode: UnifiedMessengerContext['accessMode'] = 'USER'
  let sarafId: string | null = null

  if (user.role === 'ADMIN') {
    accessMode = 'ADMIN'
  } else if (user.role === 'SARAF' && user.saraf) {
    accessMode = 'OWNER'
    sarafId = user.saraf.id
  } else if (user.role === 'BRANCH_MANAGER' && user.managedBranches[0]) {
    accessMode = 'BRANCH'
    sarafId = user.managedBranches[0].sarafId
  } else if (user.role === 'BRANCH_STAFF' && user.branchStaff[0]) {
    accessMode = 'BRANCH'
    sarafId = user.branchStaff[0].branch.sarafId
  }

  return {
    userId: user.id,
    role: user.role,
    sarafId,
    accessMode,
  }
}

/**
 * Create branch group for main saraf with all branches
 */
export async function createBranchGroup(sarafId: string, creatorId: string, branchIds: string[]) {
  const saraf = await prisma.saraf.findUnique({
    where: { id: sarafId, isActive: true },
    select: {
      id: true,
      businessName: true,
      branches: {
        where: { id: { in: branchIds }, isActive: true },
        select: {
          id: true,
          name: true,
          managerId: true,
          staff: { where: { isActive: true }, select: { userId: true } },
        },
      },
    },
  })

  if (!saraf) throw new Error('Saraf not found')
  if (saraf.branches.length === 0) throw new Error('No valid branches found')

  const participantIds = new Set<string>([creatorId])
  for (const branch of saraf.branches) {
    if (branch.managerId) participantIds.add(branch.managerId)
    for (const staff of branch.staff) {
      participantIds.add(staff.userId)
    }
  }

  const chat = await prisma.internalChat.create({
    data: {
      sarafId,
      type: 'BRANCH_TO_BRANCH',
      name: `${saraf.businessName} - Network Group`,
      participants: {
        create: Array.from(participantIds).map((userId) => ({
          userId,
          lastSeen: new Date(),
        })),
      },
    },
    include: {
      participants: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  })

  return chat
}

/**
 * Send friend request
 */
export async function sendFriendRequest(requesterId: string, targetId: string) {
  if (requesterId === targetId) throw new Error('Cannot send friend request to yourself')

  const [requester, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: requesterId, isActive: true } }),
    prisma.user.findUnique({ where: { id: targetId, isActive: true } }),
  ])

  if (!requester || !target) throw new Error('User not found')

  const existing = await prisma.portalConnectionRequest.findFirst({
    where: {
      OR: [
        { requesterId, targetId },
        { requesterId: targetId, targetId: requesterId },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'ACCEPTED') {
      throw new Error('Already connected')
    }
    if (existing.status === 'PENDING') {
      if (existing.requesterId === targetId && existing.targetId === requesterId) {
        await prisma.portalConnectionRequest.update({
          where: { id: existing.id },
          data: { status: 'ACCEPTED', respondedAt: new Date() },
        })
        return { status: 'ACCEPTED', requestId: existing.id }
      }
      throw new Error('Request already pending')
    }
  }

  const request = await prisma.portalConnectionRequest.create({
    data: {
      requesterId,
      targetId,
      status: 'PENDING',
    },
  })

  await prisma.notification.create({
    data: {
      userId: targetId,
      title: 'New Connection Request',
      message: `${requester.name} sent you a connection request`,
      type: 'info',
      action: 'CONNECTION_REQUEST',
      resourceId: request.id,
    },
  })

  return { status: 'PENDING', requestId: request.id }
}

/**
 * Get all accessible chats for user
 */
export async function getAllAccessibleChats(context: UnifiedMessengerContext) {
  const chats: Array<Record<string, unknown>> = []

  if (context.accessMode === 'ADMIN' || context.accessMode === 'OWNER' || context.accessMode === 'BRANCH') {
    const internalChats = await prisma.internalChat.findMany({
      where: {
        participants: {
          some: { userId: context.userId },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
                avatarUrl: true,
                lastLogin: true,
              },
            },
          },
        },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    chats.push(...internalChats.map((chat) => ({ ...chat, chatType: 'INTERNAL' as const })))
  }

  if (context.role === 'USER' || context.accessMode === 'ADMIN') {
    const supportChats = await prisma.chatSession.findMany({
      where: {
        userId: context.userId,
        isActive: true,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
        saraf: {
          select: {
            id: true,
            businessName: true,
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })
    chats.push(...supportChats.map((chat) => ({ ...chat, chatType: 'SUPPORT' as const })))
  }

  return chats
}

/**
 * Check voice recording permissions
 */
export function getVoiceRecordingRequirements() {
  return {
    requiredPermissions: ['microphone'],
    requiredAPIs: ['MediaRecorder', 'getUserMedia'],
    requiredContext: 'secure (HTTPS or localhost)',
    supportedFormats: ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus'],
    maxDuration: 300,
    maxSize: 10 * 1024 * 1024,
  }
}

/**
 * Validate voice recording capability
 */
export async function validateVoiceRecordingCapability(): Promise<{
  supported: boolean
  errors: string[]
  warnings: string[]
}> {
  const errors: string[] = []
  const warnings: string[] = []

  if (typeof window === 'undefined') {
    errors.push('Not in browser environment')
    return { supported: false, errors, warnings }
  }

  if (!window.isSecureContext) {
    errors.push('Requires secure context (HTTPS or localhost)')
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    errors.push('getUserMedia API not available')
  }

  if (!window.MediaRecorder) {
    errors.push('MediaRecorder API not available')
  }

  if (errors.length === 0) {
    try {
      const permissionStatus = await navigator.permissions?.query?.({ name: 'microphone' as PermissionName })
      if (permissionStatus?.state === 'denied') {
        errors.push('Microphone permission denied')
      } else if (permissionStatus?.state === 'prompt') {
        warnings.push('Microphone permission will be requested')
      }
    } catch {
      warnings.push('Could not check microphone permission status')
    }
  }

  return {
    supported: errors.length === 0,
    errors,
    warnings,
  }
}
