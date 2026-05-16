import type { Prisma } from '@prisma/client'

export type VipLevel = 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'

export const VIP_LEVELS: Record<
  Exclude<VipLevel, 'NONE'>,
  { minTransactions: number; discount: number; name: string }
> = {
  BRONZE: { minTransactions: 10, discount: 0.05, name: 'برنزی' },
  SILVER: { minTransactions: 50, discount: 0.1, name: 'نقره‌ای' },
  GOLD: { minTransactions: 100, discount: 0.15, name: 'طلایی' },
  PLATINUM: { minTransactions: 500, discount: 0.2, name: 'پلاتینوم' },
}

export function calculateVipLevel(totalTransactions: number): VipLevel {
  const count = Number(totalTransactions)
  if (!Number.isFinite(count) || count < VIP_LEVELS.BRONZE.minTransactions) return 'NONE'
  if (count >= VIP_LEVELS.PLATINUM.minTransactions) return 'PLATINUM'
  if (count >= VIP_LEVELS.GOLD.minTransactions) return 'GOLD'
  if (count >= VIP_LEVELS.SILVER.minTransactions) return 'SILVER'
  return 'BRONZE'
}

export function vipDiscountForLevel(level: VipLevel): number {
  switch (level) {
    case 'BRONZE':
      return VIP_LEVELS.BRONZE.discount
    case 'SILVER':
      return VIP_LEVELS.SILVER.discount
    case 'GOLD':
      return VIP_LEVELS.GOLD.discount
    case 'PLATINUM':
      return VIP_LEVELS.PLATINUM.discount
    default:
      return 0
  }
}

export async function upgradeVipIfNeeded(
  tx: Prisma.TransactionClient,
  userId: string
): Promise<{ upgraded: boolean; oldLevel: VipLevel; newLevel: VipLevel }> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, vipLevel: true, totalTransactions: true },
  })

  if (!user) {
    return { upgraded: false, oldLevel: 'NONE', newLevel: 'NONE' }
  }

  const newLevel = calculateVipLevel(user.totalTransactions)
  const oldLevel = user.vipLevel as VipLevel

  if (newLevel === oldLevel) {
    return { upgraded: false, oldLevel, newLevel }
  }

  // Only upgrade automatically (avoid surprise downgrades)
  const order: VipLevel[] = ['NONE', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM']
  if (order.indexOf(newLevel) < order.indexOf(oldLevel)) {
    return { upgraded: false, oldLevel, newLevel: oldLevel }
  }

  const expiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  
  // Use update instead of updateMany for single user (more efficient)
  // Check oldLevel in where clause to prevent race condition
  try {
    await tx.user.update({
      where: {
        id: userId,
        vipLevel: oldLevel, // This prevents race condition
      },
      data: { vipLevel: newLevel, vipExpiry: expiry },
    })
  } catch (error) {
    // If update fails, it means another transaction already upgraded this user
    // Return false to prevent duplicate rewards
    return { upgraded: false, oldLevel, newLevel: oldLevel }
  }

  const levelInfo =
    newLevel === 'NONE' ? null : VIP_LEVELS[newLevel as Exclude<VipLevel, 'NONE'>]

  if (levelInfo) {
    await tx.userReward.create({
      data: {
        userId,
        type: 'VIP_UPGRADE',
        title: `ارتقا به سطح ${levelInfo.name}`,
        description: `تبریک! سطح VIP شما به ${levelInfo.name} ارتقا یافت و از ${(levelInfo.discount * 100).toFixed(
          0
        )}% تخفیف برخوردار هستید.`,
        value: levelInfo.discount,
        expiresAt: expiry,
      },
    })

    await tx.notification.create({
      data: {
        userId,
        title: 'ارتقا سطح VIP',
        message: `تبریک! سطح VIP شما به ${levelInfo.name} ارتقا یافت.`,
        type: 'success',
        action: 'VIP_UPGRADE',
      },
    })
  }

  return { upgraded: true, oldLevel, newLevel }
}
