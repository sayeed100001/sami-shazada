import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getStoredUserSettings } from '@/lib/user-settings'

export function generateTransactionShareToken() {
  return randomBytes(18).toString('base64url')
}

function maskName(value: string) {
  if (!value) return 'Hidden'
  if (value.length <= 2) return `${value[0] || '*'}*`
  return `${value.slice(0, 1)}***${value.slice(-1)}`
}

export async function buildPublicTransactionShare(shareToken: string) {
  const share = await prisma.transactionShare.findFirst({
    where: {
      shareToken,
      isActive: true,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      transaction: {
        include: {
          saraf: {
            select: {
              id: true,
              businessName: true,
              businessPhone: true,
            },
          },
        },
      },
    },
  })

  if (!share) {
    return null
  }

  const settings = await getStoredUserSettings(share.userId)
  if (!settings.privacy.dataSharing) {
    return null
  }

  return {
    id: share.id,
    shareToken: share.shareToken,
    title: share.title || `${share.transaction.type} update`,
    note: share.note,
    createdAt: share.createdAt.toISOString(),
    expiresAt: share.expiresAt?.toISOString() || null,
    views: share.views,
    owner: {
      id: share.user.id,
      name: settings.privacy.profileVisible ? share.user.name : 'Private user',
      avatarUrl: settings.privacy.profileVisible ? share.user.avatarUrl : null,
      profileUrl: settings.privacy.profileVisible ? `/community/users/${share.user.id}` : null,
    },
    transaction: {
      type: share.transaction.type,
      status: share.transaction.status,
      createdAt: share.transaction.createdAt.toISOString(),
      completedAt: share.transaction.completedAt?.toISOString() || null,
      fromCurrency: share.transaction.fromCurrency,
      toCurrency: share.transaction.toCurrency,
      fromAmount: share.allowAmounts ? share.transaction.fromAmount : null,
      toAmount: share.allowAmounts ? share.transaction.toAmount : null,
      rate: share.allowAmounts ? share.transaction.rate : null,
      senderName: share.allowParticipants ? share.transaction.senderName : maskName(share.transaction.senderName),
      receiverName: share.allowParticipants ? share.transaction.receiverName : maskName(share.transaction.receiverName),
      receiverCity: share.transaction.receiverCity,
      saraf: share.allowSaraf
        ? {
            id: share.transaction.saraf.id,
            businessName: share.transaction.saraf.businessName,
            businessPhone: share.transaction.saraf.businessPhone,
          }
        : null,
    },
  }
}
