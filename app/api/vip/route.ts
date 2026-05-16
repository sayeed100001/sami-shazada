import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateVipLevel, type VipLevel, VIP_LEVELS, vipDiscountForLevel, upgradeVipIfNeeded } from '@/lib/vip';

export const dynamic = 'force-dynamic'

/* Legacy VIP thresholds (replaced by `lib/vip`)
const LEGACY_VIP_LEVELS = {
  BRONZE: { minTransactions: 1, maxTransactions: 10, discount: 0.05, name: 'برنزی' },
  SILVER: { minTransactions: 11, maxTransactions: 50, discount: 0.10, name: 'نقره‌ای' },
  GOLD: { minTransactions: 51, maxTransactions: 200, discount: 0.15, name: 'طلایی' },
  PLATINUM: { minTransactions: 201, maxTransactions: Infinity, discount: 0.20, name: 'پلاتینیوم' },
};

type LegacyVipLevel = 'NONE' | keyof typeof LEGACY_VIP_LEVELS;

// Calculate VIP level based on transaction count
function legacyCalculateVIPLevel(transactionCount: number): LegacyVipLevel {
  if (transactionCount >= LEGACY_VIP_LEVELS.PLATINUM.minTransactions) return 'PLATINUM';
  if (transactionCount >= LEGACY_VIP_LEVELS.GOLD.minTransactions) return 'GOLD';
  if (transactionCount >= LEGACY_VIP_LEVELS.SILVER.minTransactions) return 'SILVER';
  if (transactionCount >= LEGACY_VIP_LEVELS.BRONZE.minTransactions) return 'BRONZE';
  return 'NONE';
}
*/

// GET /api/vip/status - Get user's VIP status
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        vipLevel: true,
        totalTransactions: true,
        vipPoints: true,
        vipExpiry: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate current level based on transactions
    const calculatedLevel: VipLevel = calculateVipLevel(user.totalTransactions);
    const currentDiscount = vipDiscountForLevel(calculatedLevel);
    const currentLevelInfo =
      calculatedLevel === 'NONE' ? null : VIP_LEVELS[calculatedLevel as Exclude<VipLevel, 'NONE'>];

    // Get next level info
    let nextLevel: { minTransactions: number; discount: number; name: string } | null = null;
    let transactionsToNextLevel = 0;

    if (calculatedLevel === 'NONE') {
      nextLevel = VIP_LEVELS.BRONZE;
      transactionsToNextLevel = VIP_LEVELS.BRONZE.minTransactions - user.totalTransactions;
    } else if (calculatedLevel === 'BRONZE') {
      nextLevel = VIP_LEVELS.SILVER;
      transactionsToNextLevel = VIP_LEVELS.SILVER.minTransactions - user.totalTransactions;
    } else if (calculatedLevel === 'SILVER') {
      nextLevel = VIP_LEVELS.GOLD;
      transactionsToNextLevel = VIP_LEVELS.GOLD.minTransactions - user.totalTransactions;
    } else if (calculatedLevel === 'GOLD') {
      nextLevel = VIP_LEVELS.PLATINUM;
      transactionsToNextLevel = VIP_LEVELS.PLATINUM.minTransactions - user.totalTransactions;
    }

    // Get user's rewards
    const rewards = await prisma.userReward.findMany({
      where: {
        userId: user.id,
        isUsed: false,
        OR: [
          { expiresAt: null },
          { expiresAt: { gte: new Date() } },
        ],
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      vipStatus: {
        level: calculatedLevel,
        levelName: currentLevelInfo?.name || 'عادی',
        discount: currentDiscount,
        totalTransactions: user.totalTransactions,
        vipPoints: user.vipPoints,
        nextLevel: nextLevel ? {
          name: nextLevel.name,
          transactionsNeeded: transactionsToNextLevel,
          discount: nextLevel.discount,
        } : null,
      },
      rewards: {
        active: rewards,
        total: rewards.length
      },
      benefits: {
        currentDiscount: `${currentDiscount * 100}%`,
        prioritySupport: calculatedLevel !== 'NONE',
        monthlyDiscountCodes: calculatedLevel === 'SILVER' ? 1 : calculatedLevel === 'GOLD' ? 2 : calculatedLevel === 'PLATINUM' ? 999 : 0,
        dedicatedManager: calculatedLevel === 'PLATINUM',
      },
    });
  } catch (error: any) {
    console.error('VIP status error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch VIP status' },
      { status: 500 }
    );
  }
}

// POST /api/vip/check-upgrade - Check and upgrade VIP level (called after transaction)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await prisma.$transaction(async (tx) => {
      return upgradeVipIfNeeded(tx, session.user.id)
    })

    return NextResponse.json({
      success: true,
      upgraded: result.upgraded,
      oldLevel: result.oldLevel,
      newLevel: result.newLevel,
    })

    /*
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        vipLevel: true,
        totalTransactions: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const newLevel = calculateVIPLevel(user.totalTransactions);
    const oldLevel = user.vipLevel;

    // Check if level changed
    if (newLevel !== oldLevel) {
      // Update user level
      await prisma.user.update({
        where: { id: user.id },
        data: {
          vipLevel: newLevel,
          vipExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        },
      });

      // Create reward for level upgrade
      const levelInfo = VIP_LEVELS[newLevel as keyof typeof VIP_LEVELS];
      await prisma.userReward.create({
        data: {
          userId: user.id,
          type: 'VIP_UPGRADE',
          title: `ارتقا به سطح ${levelInfo.name}`,
          description: `تبریک! شما به سطح VIP ${levelInfo.name} ارتقا یافتید و از ${levelInfo.discount * 100}% تخفیف برخوردار هستید`,
          value: levelInfo.discount,
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: '🎉 ارتقا سطح VIP',
          message: `تبریک! شما به سطح ${levelInfo.name} ارتقا یافتید`,
          type: 'success',
          action: 'VIP_UPGRADE',
        },
      });

      return NextResponse.json({
        success: true,
        upgraded: true,
        oldLevel,
        newLevel,
        levelInfo,
      });
    }

    return NextResponse.json({
      success: true,
      upgraded: false,
      currentLevel: oldLevel,
    });
    */
  } catch (error: any) {
    console.error('VIP upgrade check error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to check VIP upgrade' },
      { status: 500 }
    );
  }
}
