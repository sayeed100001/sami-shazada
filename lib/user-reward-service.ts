import type { Prisma } from '@prisma/client'
import { ConfigService } from '@/lib/config-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'

// Rewards that can be applied as a system-fee discount on the next transfer (hawala + portal hawala).
// Keep this list in sync with any reward types you create for "next transfer discount".
const TRANSFER_REWARD_TYPES = [
  'WELCOME_DISCOUNT',
  'MANUAL_TRANSFER_DISCOUNT',
  'REFERRAL_BONUS',
  'FREE_TRANSACTION',
] as const

export interface ReservedTransferReward {
  rewardId: string
  rewardType: string
  discountRate: number
}

export async function getWelcomeRewardConfig() {
  const [enabledValue, rateValue, expiryDaysValue] = await Promise.all([
    ConfigService.get('signup_bonus_enabled', 'true'),
    ConfigService.get('signup_bonus_discount_rate', '0.05'),
    ConfigService.get('signup_bonus_expiry_days', '30'),
  ])

  const parsedRate = Number.parseFloat(rateValue || '0.05')
  const parsedExpiryDays = Number.parseInt(expiryDaysValue || '30', 10)

  return {
    enabled: enabledValue !== 'false',
    discountRate: Number.isFinite(parsedRate) && parsedRate > 0 ? Math.min(parsedRate, 1) : 0.05,
    expiryDays: Number.isFinite(parsedExpiryDays) && parsedExpiryDays > 0 ? parsedExpiryDays : 30,
  }
}

export async function grantSignupWelcomeReward(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  if (!(await ConfigEnforcer.isFeatureEnabled('feature_rewards_enabled'))) {
    return
  }

  const config = await getWelcomeRewardConfig()
  if (!config.enabled || config.discountRate <= 0) {
    return
  }

  const existingReward = await tx.userReward.findFirst({
    where: {
      userId,
      type: 'WELCOME_DISCOUNT',
      isUsed: false,
    },
    select: { id: true },
  })

  if (existingReward) {
    return
  }

  const expiresAt = new Date(Date.now() + config.expiryDays * 24 * 60 * 60 * 1000)
  const percentage = Math.round(config.discountRate * 100)

  await tx.userReward.create({
    data: {
      userId,
      type: 'WELCOME_DISCOUNT',
      title: `Welcome transfer discount (${percentage}% off system fee)`,
      description: `Your next transfer gets ${percentage}% off the system fee.`,
      value: config.discountRate,
      expiresAt,
    },
  })

  if (await ConfigEnforcer.areNotificationsEnabled()) {
    await tx.notification.create({
      data: {
        userId,
        title: 'Welcome reward added',
        message: `A ${percentage}% transfer discount has been added to your account.`,
        type: 'success',
        action: 'WELCOME_REWARD_GRANTED',
      },
    })
  }
}

export async function reserveBestTransferReward(
  tx: Prisma.TransactionClient,
  userId: string | null | undefined
): Promise<ReservedTransferReward | null> {
  if (!userId) {
    return null
  }

  const now = new Date()
  const reward = await tx.userReward.findFirst({
    where: {
      userId,
      type: { in: [...TRANSFER_REWARD_TYPES] },
      isUsed: false,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: [{ value: 'desc' }, { createdAt: 'asc' }],
  })

  if (!reward) {
    return null
  }

  const discountRate =
    reward.type === 'FREE_TRANSACTION'
      ? 1
      : Number.isFinite(reward.value || NaN)
        ? Math.min(Math.max(reward.value || 0, 0), 1)
        : 0

  if (discountRate <= 0) {
    return null
  }

  await tx.userReward.update({
    where: { id: reward.id },
    data: {
      isUsed: true,
      usedAt: now,
    },
  })

  return {
    rewardId: reward.id,
    rewardType: reward.type,
    discountRate,
  }
}

export async function releaseReservedTransferReward(
  tx: Prisma.TransactionClient,
  rewardId: string | null | undefined
): Promise<void> {
  if (!rewardId) {
    return
  }

  await tx.userReward.updateMany({
    where: { id: rewardId },
    data: {
      isUsed: false,
      usedAt: null,
    },
  })
}

export async function grantExchangeUsageReward(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<void> {
  if (!(await ConfigEnforcer.isFeatureEnabled('feature_rewards_enabled'))) {
    return
  }

  const [enabledValue, rateValue] = await Promise.all([
    ConfigService.get('exchange_reward_enabled', 'true'),
    ConfigService.get('exchange_reward_discount_rate', '0.01'),
  ])

  if (enabledValue === 'false') return

  const parsedRate = Number.parseFloat(rateValue || '0.01')
  const discountRate = Number.isFinite(parsedRate) ? Math.min(Math.max(parsedRate, 0), 0.05) : 0.01
  if (discountRate <= 0) return

  const existingUnused = await tx.userReward.findFirst({
    where: {
      userId,
      type: 'MANUAL_TRANSFER_DISCOUNT',
      isUsed: false,
    },
    select: { id: true },
  })

  // Keep at most one unused reward to avoid runaway discount liability.
  if (existingUnused) return

  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  const percent = Math.round(discountRate * 100)

  await tx.userReward.create({
    data: {
      userId,
      type: 'MANUAL_TRANSFER_DISCOUNT',
      title: `Exchange reward (${percent}% off next transfer system fee)`,
      description: `Thanks for using exchange. You received ${percent}% off your next transfer system fee.`,
      value: discountRate,
      expiresAt,
    },
  })
}

export async function grantHawalaUsageReward(tx: Prisma.TransactionClient, userId: string): Promise<void> {
  if (!(await ConfigEnforcer.isFeatureEnabled('feature_rewards_enabled'))) {
    return
  }

  const config = await ConfigEnforcer.getHawalaRewardConfig()
  if (!config.enabled || config.discountRate <= 0) return

  const existingUnused = await tx.userReward.findFirst({
    where: {
      userId,
      type: 'MANUAL_TRANSFER_DISCOUNT',
      isUsed: false,
    },
    select: { id: true },
  })

  // Keep at most one unused reward to avoid runaway discount liability.
  if (existingUnused) return

  const expiresAt = new Date(Date.now() + config.expiryDays * 24 * 60 * 60 * 1000)
  const percent = Math.round(config.discountRate * 100)

  await tx.userReward.create({
    data: {
      userId,
      type: 'MANUAL_TRANSFER_DISCOUNT',
      title: `Hawala reward (${percent}% off next transfer system fee)`,
      description: `Thanks for using hawala. You received ${percent}% off your next transfer system fee.`,
      value: config.discountRate,
      expiresAt,
    },
  })
}

export async function grantReferralReward(
  tx: Prisma.TransactionClient,
  referrerUserId: string,
  referredUserName: string
): Promise<void> {
  if (!(await ConfigEnforcer.isFeatureEnabled('feature_rewards_enabled'))) {
    return
  }

  const [enabledValue, rateValue, expiryDaysValue, vipPointsValue] = await Promise.all([
    ConfigService.get('referral_program_enabled', 'true'),
    ConfigService.get('referral_reward_discount_rate', '0.05'),
    ConfigService.get('referral_reward_expiry_days', '45'),
    ConfigService.get('referral_reward_vip_points', '25'),
  ])

  if (enabledValue === 'false') {
    return
  }

  const parsedRate = Number.parseFloat(rateValue || '0.05')
  const parsedExpiryDays = Number.parseInt(expiryDaysValue || '45', 10)
  const parsedVipPoints = Number.parseInt(vipPointsValue || '25', 10)
  const discountRate = Number.isFinite(parsedRate) ? Math.min(Math.max(parsedRate, 0), 0.25) : 0.05
  const expiryDays = Number.isFinite(parsedExpiryDays) && parsedExpiryDays > 0 ? parsedExpiryDays : 45
  const vipPoints = Number.isFinite(parsedVipPoints) && parsedVipPoints > 0 ? parsedVipPoints : 25

  if (discountRate <= 0) {
    return
  }

  const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000)
  const percent = Math.round(discountRate * 100)

  await tx.userReward.create({
    data: {
      userId: referrerUserId,
      type: 'REFERRAL_BONUS',
      title: `Referral reward (${percent}% off next transfer system fee)`,
      description: `${referredUserName} joined with your referral. You earned ${percent}% off your next transfer system fee.`,
      value: discountRate,
      expiresAt,
    },
  })

  await tx.user.update({
    where: { id: referrerUserId },
    data: {
      vipPoints: {
        increment: vipPoints,
      },
    },
  })

  if (await ConfigEnforcer.areNotificationsEnabled()) {
    await tx.notification.create({
      data: {
        userId: referrerUserId,
        title: 'Referral reward added',
        message: `${referredUserName} joined using your code. A ${percent}% transfer discount was added to your account.`,
        type: 'success',
        action: 'REFERRAL_REWARD_GRANTED',
      },
    })
  }
}
