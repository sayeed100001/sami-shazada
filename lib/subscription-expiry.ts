import { prisma } from './prisma'
import { logger } from './logger'

export async function checkExpiredSubscriptions() {
  try {
    const now = new Date()

    const expiredSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lt: now
        }
      },
      include: {
        saraf: {
          select: {
            id: true,
            businessName: true,
            userId: true
          }
        }
      }
    })

    if (expiredSubscriptions.length === 0) {
      logger.info('No expired subscriptions found')
      return { expired: 0, updated: 0 }
    }

    const results = await Promise.allSettled(
      expiredSubscriptions.map(async (subscription) => {
        await prisma.$transaction(async (tx) => {
          await tx.subscription.update({
            where: { id: subscription.id },
            data: { status: 'EXPIRED' }
          })

          await tx.saraf.update({
            where: { id: subscription.saraf.id },
            data: {
              subscriptionType: 'BASIC',
              subscriptionExpiry: null
            }
          })

          await tx.notification.create({
            data: {
              userId: subscription.saraf.userId,
              title: 'اشتراک شما منقضی شد',
              message: `اشتراک ${subscription.packageType} شما منقضی شده است. برای تمدید اقدام کنید.`,
              type: 'warning',
              action: 'VIEW_SUBSCRIPTION',
              resource: 'SUBSCRIPTION',
              resourceId: subscription.id
            }
          })

          await tx.auditLog.create({
            data: {
              userId: subscription.saraf.userId,
              action: 'SUBSCRIPTION_EXPIRED',
              resource: 'SUBSCRIPTION',
              resourceId: subscription.id,
              details: JSON.stringify({
                sarafId: subscription.saraf.id,
                packageType: subscription.packageType,
                endDate: subscription.endDate
              })
            }
          })
        })

        logger.info('Expired subscription processed', {
          subscriptionId: subscription.id,
          sarafId: subscription.saraf.id,
          packageType: subscription.packageType
        })
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    logger.info('Subscription expiry check completed', {
      total: expiredSubscriptions.length,
      successful,
      failed
    })

    return {
      expired: expiredSubscriptions.length,
      updated: successful,
      failed
    }
  } catch (error) {
    logger.error('Failed to check expired subscriptions', {}, error as Error)
    throw error
  }
}

export async function checkExpiredPremiumSarafs() {
  try {
    const now = new Date()

    const expiredPremium = await prisma.saraf.findMany({
      where: {
        isPremium: true,
        premiumExpiry: {
          lt: now
        }
      },
      select: {
        id: true,
        businessName: true,
        userId: true,
        premiumExpiry: true
      }
    })

    if (expiredPremium.length === 0) {
      logger.info('No expired premium sarafs found')
      return { expired: 0, updated: 0 }
    }

    const results = await Promise.allSettled(
      expiredPremium.map(async (saraf) => {
        await prisma.$transaction(async (tx) => {
          await tx.saraf.update({
            where: { id: saraf.id },
            data: {
              isPremium: false,
              premiumExpiry: null
            }
          })

          await tx.notification.create({
            data: {
              userId: saraf.userId,
              title: 'اشتراک ویژه شما منقضی شد',
              message: 'اشتراک ویژه شما منقضی شده است. برای تمدید اقدام کنید.',
              type: 'warning',
              action: 'VIEW_SUBSCRIPTION',
              resource: 'SARAF',
              resourceId: saraf.id
            }
          })

          await tx.auditLog.create({
            data: {
              userId: saraf.userId,
              action: 'PREMIUM_EXPIRED',
              resource: 'SARAF',
              resourceId: saraf.id,
              details: JSON.stringify({
                businessName: saraf.businessName,
                expiredAt: saraf.premiumExpiry
              })
            }
          })
        })

        logger.info('Expired premium processed', {
          sarafId: saraf.id,
          businessName: saraf.businessName
        })
      })
    )

    const successful = results.filter(r => r.status === 'fulfilled').length
    const failed = results.filter(r => r.status === 'rejected').length

    logger.info('Premium expiry check completed', {
      total: expiredPremium.length,
      successful,
      failed
    })

    return {
      expired: expiredPremium.length,
      updated: successful,
      failed
    }
  } catch (error) {
    logger.error('Failed to check expired premium sarafs', {}, error as Error)
    throw error
  }
}

export async function runExpiryChecks() {
  logger.info('Starting expiry checks')

  const [subscriptionResults, premiumResults] = await Promise.allSettled([
    checkExpiredSubscriptions(),
    checkExpiredPremiumSarafs()
  ])

  const results = {
    subscriptions: subscriptionResults.status === 'fulfilled' ? subscriptionResults.value : null,
    premium: premiumResults.status === 'fulfilled' ? premiumResults.value : null,
    timestamp: new Date().toISOString()
  }

  logger.info('Expiry checks completed', results)

  return results
}
