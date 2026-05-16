import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [exchangeEnabled, freeTrialIncludesExchange] = await Promise.all([
      prisma.systemConfig.findUnique({
        where: { key: 'exchange_enabled' }
      }),
      prisma.systemConfig.findUnique({
        where: { key: 'free_trial_includes_exchange' }
      }),
    ])

    const [enabledUsers, disabledUsers] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'exchange_enabled_user_ids' } }),
      prisma.systemConfig.findUnique({ where: { key: 'exchange_disabled_user_ids' } }),
    ])
    const [systemFeePercent, feeOffTrialSarafs, rewardRate] = await Promise.all([
      prisma.systemConfig.findUnique({ where: { key: 'exchange_system_fee_percent' } }),
      prisma.systemConfig.findUnique({ where: { key: 'exchange_fee_off_for_trial_sarafs' } }),
      prisma.systemConfig.findUnique({ where: { key: 'exchange_reward_discount_rate' } }),
    ])

    return NextResponse.json({
      exchangeEnabled: exchangeEnabled?.value !== 'false',
      freeTrialIncludesExchange: freeTrialIncludesExchange?.value === 'true',
      exchangeEnabledUserIds: enabledUsers?.value || '',
      exchangeDisabledUserIds: disabledUsers?.value || '',
      exchangeSystemFeePercent: systemFeePercent?.value || '',
      exchangeFeeOffForTrialSarafs: feeOffTrialSarafs?.value === 'true',
      exchangeRewardDiscountRate: rewardRate?.value || '0.01',
    })

  } catch (error) {
    console.error('Exchange settings fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch exchange settings' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      exchangeEnabled,
      freeTrialIncludesExchange,
      exchangeEnabledUserIds,
      exchangeDisabledUserIds,
      exchangeSystemFeePercent,
      exchangeFeeOffForTrialSarafs,
      exchangeRewardDiscountRate,
    } = body

    const updates: Array<ReturnType<typeof prisma.systemConfig.upsert>> = []

    if (typeof exchangeEnabled === 'boolean') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'exchange_enabled' },
          update: { value: exchangeEnabled ? 'true' : 'false' },
          create: {
            key: 'exchange_enabled',
            value: exchangeEnabled ? 'true' : 'false',
            description: 'Enable or disable currency exchange feature globally'
          }
        })
      )
    }

    if (typeof freeTrialIncludesExchange === 'boolean') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'free_trial_includes_exchange' },
          update: { value: freeTrialIncludesExchange ? 'true' : 'false' },
          create: {
            key: 'free_trial_includes_exchange',
            value: freeTrialIncludesExchange ? 'true' : 'false',
            description: 'Include exchange feature in free trial period'
          }
        })
      )
    }

    if (typeof exchangeEnabledUserIds === 'string') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'exchange_enabled_user_ids' },
          update: { value: exchangeEnabledUserIds },
          create: {
            key: 'exchange_enabled_user_ids',
            value: exchangeEnabledUserIds,
            description: 'Comma-separated user IDs with explicit exchange enable override',
          },
        })
      )
    }

    if (typeof exchangeDisabledUserIds === 'string') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'exchange_disabled_user_ids' },
          update: { value: exchangeDisabledUserIds },
          create: {
            key: 'exchange_disabled_user_ids',
            value: exchangeDisabledUserIds,
            description: 'Comma-separated user IDs with explicit exchange disable override',
          },
        })
      )
    }

    if (typeof exchangeSystemFeePercent === 'string') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'exchange_system_fee_percent' },
          update: { value: exchangeSystemFeePercent.trim() },
          create: {
            key: 'exchange_system_fee_percent',
            value: exchangeSystemFeePercent.trim(),
            description: 'Optional override for exchange system fee percentage',
          },
        })
      )
    }

    if (typeof exchangeFeeOffForTrialSarafs === 'boolean') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'exchange_fee_off_for_trial_sarafs' },
          update: { value: exchangeFeeOffForTrialSarafs ? 'true' : 'false' },
          create: {
            key: 'exchange_fee_off_for_trial_sarafs',
            value: exchangeFeeOffForTrialSarafs ? 'true' : 'false',
            description: 'Disable exchange system fee for sarafs in free trial',
          },
        })
      )
    }

    if (typeof exchangeRewardDiscountRate === 'string') {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: 'exchange_reward_discount_rate' },
          update: { value: exchangeRewardDiscountRate.trim() },
          create: {
            key: 'exchange_reward_discount_rate',
            value: exchangeRewardDiscountRate.trim(),
            description: 'Discount reward rate for registered users after exchange',
          },
        })
      )
    }

    await Promise.all(updates)

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'EXCHANGE_SETTINGS_UPDATED',
        resource: 'SYSTEM_CONFIG',
        details: JSON.stringify({
          exchangeEnabled,
          freeTrialIncludesExchange,
          exchangeEnabledUserIds,
          exchangeDisabledUserIds,
          exchangeSystemFeePercent,
          exchangeFeeOffForTrialSarafs,
          exchangeRewardDiscountRate,
        })
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Exchange settings updated successfully'
    })

  } catch (error) {
    console.error('Exchange settings update error:', error)
    return NextResponse.json(
      { error: 'Failed to update exchange settings' },
      { status: 500 }
    )
  }
}
