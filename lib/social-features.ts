import { randomBytes } from 'crypto'
import { prisma } from '@/lib/prisma'
import { getStoredUserSettings } from '@/lib/user-settings'

type MinimalUserClient = {
  user: {
    findFirst: (...args: any[]) => Promise<any>
    update: (...args: any[]) => Promise<any>
  }
}

export type ActivityFeedItem = {
  id: string
  kind: string
  description: string
  timestamp: string
  amount?: number | null
  currency?: string | null
  sarafName?: string | null
  status: string
}

export type SocialAchievement = {
  id: string
  title: string
  description: string
  tone: 'default' | 'success' | 'warning' | 'accent'
  icon: string
  unlocked: boolean
  currentValue: number
  targetValue: number
}

type AchievementMetrics = {
  totalTransactions: number
  totalCompletedVolume: number
  followingCount: number
  rewardCount: number
  referralCount: number
  shareCount: number
  vipLevel: string
  exchangeCount: number
  hawalaCount: number
}

function createAchievement(
  id: string,
  title: string,
  description: string,
  tone: SocialAchievement['tone'],
  icon: string,
  currentValue: number,
  targetValue: number
): SocialAchievement {
  return {
    id,
    title,
    description,
    tone,
    icon,
    unlocked: currentValue >= targetValue,
    currentValue,
    targetValue,
  }
}

function buildAchievements(metrics: AchievementMetrics): SocialAchievement[] {
  return [
    createAchievement(
      'first-transfer',
      'First Transfer',
      'Complete your first hawala or exchange request.',
      'success',
      'Send',
      metrics.totalTransactions,
      1
    ),
    createAchievement(
      'community-follower',
      'Community Follower',
      'Follow at least 3 trusted sarafs.',
      'accent',
      'Heart',
      metrics.followingCount,
      3
    ),
    createAchievement(
      'reward-hunter',
      'Reward Hunter',
      'Collect at least 3 rewards or incentives.',
      'warning',
      'Gift',
      metrics.rewardCount,
      3
    ),
    createAchievement(
      'volume-builder',
      'Volume Builder',
      'Reach 50,000 AFN in completed transaction volume.',
      'default',
      'TrendingUp',
      Math.round(metrics.totalCompletedVolume),
      50000
    ),
    createAchievement(
      'cross-service',
      'Cross-Service User',
      'Use both hawala and exchange at least once.',
      'accent',
      'ArrowRightLeft',
      Math.min(metrics.exchangeCount, 1) + Math.min(metrics.hawalaCount, 1),
      2
    ),
    createAchievement(
      'vip-member',
      'VIP Member',
      'Reach any VIP level in the loyalty system.',
      'warning',
      'Gem',
      metrics.vipLevel === 'NONE' ? 0 : 1,
      1
    ),
    createAchievement(
      'referral-starter',
      'Referral Starter',
      'Invite your first successful referral.',
      'success',
      'Users',
      metrics.referralCount,
      1
    ),
    createAchievement(
      'referral-network',
      'Referral Network',
      'Invite 5 users into your network.',
      'accent',
      'Share2',
      metrics.referralCount,
      5
    ),
    createAchievement(
      'story-sharer',
      'Story Sharer',
      'Create your first public transaction share.',
      'default',
      'BadgePlus',
      metrics.shareCount,
      1
    ),
  ]
}

function buildActivityDescription(type: string, status: string): string {
  const prefix =
    status === 'COMPLETED'
      ? 'Completed'
      : status === 'PENDING'
        ? 'Created'
        : status === 'CANCELLED'
          ? 'Cancelled'
          : 'Updated'

  switch (type) {
    case 'HAWALA':
    case 'HAWALA_REQUEST':
      return `${prefix} hawala request`
    case 'EXCHANGE':
      return `${prefix} currency exchange`
    case 'CRYPTO':
      return `${prefix} crypto transfer`
    default:
      return `${prefix} transaction`
  }
}

function buildReferralCodeCandidate(name: string, attempt: number) {
  const cleanedName = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6)

  const base = cleanedName.length > 0 ? cleanedName : 'SHAHZD'
  const suffix = randomBytes(2 + attempt).toString('hex').slice(0, 4 + attempt).toUpperCase()
  return `${base}-${suffix}`
}

export async function generateUniqueReferralCode(
  client: MinimalUserClient,
  name: string
): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = buildReferralCodeCandidate(name, attempt)
    const existing = await client.user.findFirst({
      where: { referralCode: candidate },
      select: { id: true },
    })

    if (!existing) {
      return candidate
    }
  }

  return `SHAHZD-${randomBytes(6).toString('hex').toUpperCase()}`
}

export async function ensureUserReferralCode(userId: string, nameHint?: string | null): Promise<string> {
  const existingUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, referralCode: true },
  })

  if (!existingUser) {
    throw new Error('User not found')
  }

  if (existingUser.referralCode) {
    return existingUser.referralCode
  }

  const referralCode = await generateUniqueReferralCode(prisma as unknown as MinimalUserClient, nameHint || existingUser.name)

  await prisma.user.update({
    where: { id: userId },
    data: { referralCode },
  })

  return referralCode
}

export async function getUserActivityFeed(
  userId: string,
  options?: {
    limit?: number
    publicView?: boolean
    includeAmounts?: boolean
    includeSaraf?: boolean
  }
): Promise<ActivityFeedItem[]> {
  const limit = options?.limit ?? 8
  const publicView = options?.publicView ?? false
  const includeAmounts = options?.includeAmounts ?? false
  const includeSaraf = options?.includeSaraf ?? false

  const transactions = await prisma.transaction.findMany({
    where: {
      senderId: userId,
      ...(publicView ? { status: 'COMPLETED' } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      saraf: {
        select: {
          businessName: true,
        },
      },
    },
  })

  return transactions.map((transaction) => ({
    id: transaction.id,
    kind: transaction.type,
    description: buildActivityDescription(transaction.type, transaction.status),
    timestamp: transaction.createdAt.toISOString(),
    amount: includeAmounts ? transaction.toAmount : null,
    currency: includeAmounts ? transaction.toCurrency : null,
    sarafName: includeSaraf ? transaction.saraf.businessName : null,
    status: transaction.status,
  }))
}

async function getAchievementMetrics(userId: string): Promise<AchievementMetrics> {
  const [user, aggregate, followingCount, rewardCount, referralCount, shareCount, typeCounts] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        totalTransactions: true,
        vipLevel: true,
      },
    }),
    prisma.transaction.aggregate({
      where: {
        senderId: userId,
        status: 'COMPLETED',
      },
      _sum: { toAmount: true },
    }),
    prisma.userFavorite.count({ where: { userId } }),
    prisma.userReward.count({ where: { userId } }),
    prisma.user.count({ where: { referredById: userId } }),
    prisma.transactionShare.count({ where: { userId, isActive: true } }),
    prisma.transaction.findMany({
      where: {
        senderId: userId,
        status: 'COMPLETED',
        type: { in: ['HAWALA', 'HAWALA_REQUEST', 'EXCHANGE'] },
      },
      select: { type: true },
    }),
  ])

  const exchangeCount = typeCounts.filter((entry) => entry.type === 'EXCHANGE').length
  const hawalaCount = typeCounts.filter((entry) => entry.type === 'HAWALA' || entry.type === 'HAWALA_REQUEST').length

  return {
    totalTransactions: user?.totalTransactions || 0,
    totalCompletedVolume: aggregate._sum.toAmount || 0,
    followingCount,
    rewardCount,
    referralCount,
    shareCount,
    vipLevel: user?.vipLevel || 'NONE',
    exchangeCount,
    hawalaCount,
  }
}

export async function getUserAchievements(userId: string): Promise<SocialAchievement[]> {
  return buildAchievements(await getAchievementMetrics(userId))
}

export async function getUserSocialSummary(userId: string) {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        referralCode: true,
      },
    }),
    getStoredUserSettings(userId),
  ])

  if (!user) {
    throw new Error('User not found')
  }

  const referralCode = user.referralCode || (await ensureUserReferralCode(userId, user.name))
  const [referrals, totalReferrals, achievements] = await Promise.all([
    prisma.user.findMany({
      where: { referredById: userId },
      orderBy: { createdAt: 'desc' },
      take: 8,
      select: {
        id: true,
        name: true,
        createdAt: true,
        totalTransactions: true,
        avatarUrl: true,
      },
    }),
    prisma.user.count({
      where: { referredById: userId },
    }),
    getUserAchievements(userId),
  ])

  return {
    profile: {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      publicProfileUrl: `/community/users/${user.id}`,
    },
    visibility: settings.privacy,
    referral: {
      code: referralCode,
      signupUrl: `/auth/signup?ref=${encodeURIComponent(referralCode)}`,
      totalReferrals,
      recentReferrals: referrals.map((referral) => ({
        id: referral.id,
        name: referral.name,
        avatarUrl: referral.avatarUrl,
        createdAt: referral.createdAt.toISOString(),
        totalTransactions: referral.totalTransactions,
      })),
    },
    achievements,
  }
}

export async function getPublicUserProfile(userId: string) {
  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        isActive: true,
        vipLevel: true,
        totalTransactions: true,
      },
    }),
    getStoredUserSettings(userId),
  ])

  if (!user || !user.isActive || !settings.privacy.profileVisible) {
    return null
  }

  const [aggregate, followingCount, referralCount, achievements, activity] = await Promise.all([
    prisma.transaction.aggregate({
      where: { senderId: userId, status: 'COMPLETED' },
      _sum: { toAmount: true },
    }),
    prisma.userFavorite.count({ where: { userId } }),
    prisma.user.count({ where: { referredById: userId } }),
    getUserAchievements(userId),
    settings.privacy.activityVisible
      ? getUserActivityFeed(userId, {
          limit: 8,
          publicView: true,
          includeAmounts: settings.privacy.dataSharing,
          includeSaraf: true,
        })
      : Promise.resolve([]),
  ])

  return {
    id: user.id,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
    vipLevel: user.vipLevel,
    totalTransactions: user.totalTransactions,
    totalCompletedVolume: aggregate._sum.toAmount || 0,
    followingCount,
    referralCount,
    visibility: settings.privacy,
    achievements: achievements.filter((achievement) => achievement.unlocked),
    activity,
  }
}

function getUserBadgePreview(metrics: AchievementMetrics) {
  return buildAchievements(metrics)
    .filter((achievement) => achievement.unlocked)
    .slice(0, 3)
    .map((achievement) => achievement.title)
}

export async function getCommunityLeaderboards(limit = 10) {
  const cappedLimit = Math.max(3, Math.min(limit, 20))

  const [userCandidates, sarafCandidates] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: 'USER',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        vipLevel: true,
        totalTransactions: true,
        createdAt: true,
        transactions: {
          where: { status: 'COMPLETED' },
          select: { toAmount: true, type: true },
        },
        rewards: {
          select: { id: true },
        },
        favorites: {
          select: { id: true },
        },
        transactionShares: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      take: 150,
      orderBy: { totalTransactions: 'desc' },
    }),
    prisma.saraf.findMany({
      where: {
        status: 'APPROVED',
        isActive: true,
      },
      select: {
        id: true,
        businessName: true,
        rating: true,
        isPremium: true,
        totalTransactions: true,
        createdAt: true,
        branches: {
          where: { isActive: true },
          take: 1,
          select: { city: true },
        },
        transactions: {
          where: { status: 'COMPLETED' },
          select: { toAmount: true },
        },
        _count: {
          select: {
            favoritedBy: true,
            ratings: true,
          },
        },
      },
      take: 120,
    }),
  ])

  const settingsRecords = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: userCandidates.map((user) => `user_settings_${user.id}`),
      },
    },
    select: { key: true, value: true },
  })

  const settingsMap = new Map<string, ReturnType<typeof JSON.parse>>()
  for (const record of settingsRecords) {
    try {
      settingsMap.set(record.key.replace('user_settings_', ''), JSON.parse(record.value))
    } catch {
      settingsMap.set(record.key.replace('user_settings_', ''), null)
    }
  }

  const publicUsers = userCandidates
    .filter((user) => {
      const merged = settingsMap.has(user.id)
        ? {
            privacy: {
              profileVisible:
                settingsMap.get(user.id)?.privacy?.profileVisible ??
                true,
            },
          }
        : { privacy: { profileVisible: true } }
      return merged.privacy.profileVisible !== false
    })
    .map((user) => {
      const totalCompletedVolume = user.transactions.reduce((sum, transaction) => sum + transaction.toAmount, 0)
      const exchangeCount = user.transactions.filter((transaction) => transaction.type === 'EXCHANGE').length
      const hawalaCount = user.transactions.filter(
        (transaction) => transaction.type === 'HAWALA' || transaction.type === 'HAWALA_REQUEST'
      ).length
      const metrics: AchievementMetrics = {
        totalTransactions: user.totalTransactions,
        totalCompletedVolume,
        followingCount: user.favorites.length,
        rewardCount: user.rewards.length,
        referralCount: 0,
        shareCount: user.transactionShares.length,
        vipLevel: user.vipLevel,
        exchangeCount,
        hawalaCount,
      }

      return {
        id: user.id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        vipLevel: user.vipLevel,
        totalTransactions: user.totalTransactions,
        totalVolume: totalCompletedVolume,
        joinedAt: user.createdAt.toISOString(),
        badges: getUserBadgePreview(metrics),
      }
    })

  const topUsersByTransactions = [...publicUsers]
    .sort((left, right) => right.totalTransactions - left.totalTransactions)
    .slice(0, cappedLimit)
    .map((user, index) => ({ rank: index + 1, ...user }))

  const topUsersByVolume = [...publicUsers]
    .sort((left, right) => right.totalVolume - left.totalVolume)
    .slice(0, cappedLimit)
    .map((user, index) => ({ rank: index + 1, ...user }))

  const topSarafsByRating = [...sarafCandidates]
    .sort((left, right) => right.rating - left.rating || right._count.ratings - left._count.ratings)
    .slice(0, cappedLimit)
    .map((saraf, index) => ({
      rank: index + 1,
      id: saraf.id,
      businessName: saraf.businessName,
      rating: saraf.rating,
      totalTransactions: saraf.totalTransactions,
      city: saraf.branches[0]?.city || 'Kabul',
      followers: saraf._count.favoritedBy,
      totalVolume: saraf.transactions.reduce((sum, transaction) => sum + transaction.toAmount, 0),
      isPremium: saraf.isPremium,
    }))

  const topSarafsByFollowers = [...sarafCandidates]
    .sort((left, right) => right._count.favoritedBy - left._count.favoritedBy || right.rating - left.rating)
    .slice(0, cappedLimit)
    .map((saraf, index) => ({
      rank: index + 1,
      id: saraf.id,
      businessName: saraf.businessName,
      rating: saraf.rating,
      totalTransactions: saraf.totalTransactions,
      city: saraf.branches[0]?.city || 'Kabul',
      followers: saraf._count.favoritedBy,
      totalVolume: saraf.transactions.reduce((sum, transaction) => sum + transaction.toAmount, 0),
      isPremium: saraf.isPremium,
    }))

  return {
    users: {
      byTransactions: topUsersByTransactions,
      byVolume: topUsersByVolume,
    },
    sarafs: {
      byRating: topSarafsByRating,
      byFollowers: topSarafsByFollowers,
    },
  }
}
