import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

// GET /api/rewards - Get user's rewards
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rewards = await prisma.userReward.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const activeRewards = rewards.filter(
      (r) => !r.isUsed && (!r.expiresAt || r.expiresAt > new Date())
    );
    const usedRewards = rewards.filter((r) => r.isUsed);
    const expiredRewards = rewards.filter(
      (r) => !r.isUsed && r.expiresAt && r.expiresAt < new Date()
    );

    return NextResponse.json({
      success: true,
      rewards: {
        active: activeRewards,
        used: usedRewards,
        expired: expiredRewards,
      },
      stats: {
        totalRewards: rewards.length,
        activeCount: activeRewards.length,
        usedCount: usedRewards.length,
        expiredCount: expiredRewards.length,
      },
    });
  } catch (error: any) {
    console.error('Get rewards error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch rewards' },
      { status: 500 }
    );
  }
}

// POST /api/rewards/use - Use a reward
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { rewardId } = body;

    if (!rewardId) {
      return NextResponse.json(
        { error: 'Reward ID required' },
        { status: 400 }
      );
    }

    const reward = await prisma.userReward.findUnique({
      where: { id: rewardId },
    });

    if (!reward) {
      return NextResponse.json(
        { error: 'Reward not found' },
        { status: 404 }
      );
    }

    if (reward.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    if (reward.isUsed) {
      return NextResponse.json(
        { error: 'Reward already used' },
        { status: 400 }
      );
    }

    if (reward.expiresAt && reward.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Reward expired' },
        { status: 400 }
      );
    }

    // Mark reward as used
    const updatedReward = await prisma.userReward.update({
      where: { id: rewardId },
      data: {
        isUsed: true,
        usedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      reward: updatedReward,
      message: 'Reward used successfully',
    });
  } catch (error: any) {
    console.error('Use reward error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to use reward' },
      { status: 500 }
    );
  }
}
