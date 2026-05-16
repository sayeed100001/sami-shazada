import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function getTransactionDescription(type: string, receiverName: string) {
  switch (type) {
    case 'HAWALA':
      return `Hawala to ${receiverName}`
    case 'HAWALA_REQUEST':
      return `Hawala request for ${receiverName}`
    case 'CRYPTO':
      return `Crypto transfer to ${receiverName}`
    default:
      return `Exchange for ${receiverName}`
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [sentTransactions, unreadNotifications, recentNotifications, favoritesCount, rewards, monthAggregate] =
      await Promise.all([
        prisma.transaction.findMany({
          where: { senderId: userId },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.notification.count({
          where: {
            userId,
            read: false,
          },
        }),
        prisma.notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'desc' },
          take: 5,
        }),
        prisma.userFavorite.count({
          where: { userId },
        }),
        prisma.userReward.findMany({
          where: {
            userId,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
          orderBy: { createdAt: 'desc' },
        }),
        prisma.transaction.aggregate({
          where: {
            senderId: userId,
            createdAt: { gte: startOfMonth },
            status: 'COMPLETED',
          },
          _count: true,
          _sum: {
            toAmount: true,
            systemDiscountAmount: true,
          },
        }),
      ])

    const totalTransactions = sentTransactions.length
    const completedTransactions = sentTransactions.filter((transaction) => transaction.status === 'COMPLETED')
    const totalVolume = completedTransactions.reduce((sum, transaction) => sum + transaction.toAmount, 0)
    const pendingTransactions = sentTransactions.filter((transaction) => transaction.status === 'PENDING').length
    const lifetimeDiscountSaved = completedTransactions.reduce(
      (sum, transaction) => sum + transaction.systemDiscountAmount,
      0
    )
    const activeRewards = rewards.filter((reward) => !reward.isUsed)
    const freeTransfersAvailable = activeRewards.filter((reward) => reward.type === 'FREE_TRANSACTION').length
    const transferDiscountRewards = activeRewards.filter((reward) =>
      ['WELCOME_DISCOUNT', 'MANUAL_TRANSFER_DISCOUNT'].includes(reward.type)
    ).length

    const recentActivity = sentTransactions.slice(0, 10).map((transaction) => ({
      id: transaction.id,
      type: 'transaction',
      description: getTransactionDescription(transaction.type, transaction.receiverName),
      amount: transaction.toAmount,
      status: transaction.status,
      timestamp: transaction.createdAt.toISOString(),
      referenceCode: transaction.referenceCode,
    }))

    const notificationActivities = recentNotifications.map((notification) => ({
      id: notification.id,
      type: 'notification',
      description: notification.title,
      timestamp: notification.createdAt.toISOString(),
    }))

    const allActivity = [...recentActivity, ...notificationActivities]
      .sort((left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({
      totalTransactions,
      completedTransactions: completedTransactions.length,
      pendingTransactions,
      totalVolume,
      unreadNotifications,
      favoritesCount,
      accountStatus: 'active',
      recentActivity: allActivity,
      monthly: {
        transactionCount: monthAggregate._count,
        totalVolume: monthAggregate._sum.toAmount || 0,
        discountSaved: monthAggregate._sum.systemDiscountAmount || 0,
      },
      rewards: {
        activeCount: activeRewards.length,
        freeTransfersAvailable,
        transferDiscountRewards,
      },
      lifetimeDiscountSaved,
    })
  } catch (error) {
    console.error('User stats error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
