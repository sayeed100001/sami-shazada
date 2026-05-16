import { prisma } from '@/lib/prisma'
import type { VipLevel } from '@/lib/vip'
import { ConfigService } from '@/lib/config-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  calculateTransactionCharges,
  isSarafOnActiveFreeTrial,
  type SystemFeeWaiverReason,
} from '@/lib/transaction-pricing'

type OperationalSarafRecord = {
  id: string
  userId: string
  businessName: string
  businessPhone: string
  businessAddress: string
  status: string
  isActive: boolean
  creditBalance: number
  hawalaFeePercent: number | null
  exchangeFeePercent: number | null
  isOnFreeTrial: boolean
  freeTrialEndDate: Date | null
  subscriptionExpiry: Date | null
}

export interface SarafOperationalState {
  saraf: OperationalSarafRecord | null
  isOperational: boolean
  requiresSubscription: boolean
  error: string | null
}

export interface HawalaChargeResult {
  systemCommission: number
  sarafCommission: number
  totalCommission: number
  creditsRequired: number
  vipDiscount: number
  systemDiscountAmount: number
  waivedSystemCommission: number
  systemFeeWaiverReason: SystemFeeWaiverReason | null
}

export async function getSarafOperationalState(
  sarafId: string
): Promise<SarafOperationalState> {
  const saraf = await prisma.saraf.findUnique({
    where: { id: sarafId },
    select: {
      id: true,
      userId: true,
      businessName: true,
      businessPhone: true,
      businessAddress: true,
      status: true,
      isActive: true,
      creditBalance: true,
      hawalaFeePercent: true,
      exchangeFeePercent: true,
      isOnFreeTrial: true,
      freeTrialEndDate: true,
      subscriptionExpiry: true,
    },
  })

  if (!saraf || saraf.status !== 'APPROVED' || !saraf.isActive) {
    return {
      saraf: null,
      isOperational: false,
      requiresSubscription: false,
      error: 'Saraf not approved or not active',
    }
  }

  const now = new Date()
  const isOnFreeTrial = isSarafOnActiveFreeTrial(saraf, now)
  const hasActiveSubscription =
    !!saraf.subscriptionExpiry && saraf.subscriptionExpiry > now
  const freeAccessEnabled = await ConfigEnforcer.isFreeAccessEnabledForSarafs()

  if (!freeAccessEnabled && !isOnFreeTrial && !hasActiveSubscription) {
    return {
      saraf,
      isOperational: false,
      requiresSubscription: true,
      error: 'No active subscription or free trial',
    }
  }

  return {
    saraf,
    isOperational: true,
    requiresSubscription: false,
    error: null,
  }
}

export async function calculateHawalaCharges(
  fromAmount: number,
  vipLevel?: VipLevel | null,
  rewardDiscountRate = 0,
  options?: {
    amountCurrency?: string | null
    quotedRate?: number | null
    quotedToCurrency?: string | null
    sarafFeePercent?: number | null
    waiveSystemFee?: boolean
    waiverReason?: SystemFeeWaiverReason | null
  }
): Promise<HawalaChargeResult> {
  const fallbackRateStr = await ConfigService.get('default_hawala_commission_rate', '0.8')
  const fallbackRate = Number.parseFloat(fallbackRateStr ?? '0.8')
  const fallbackSystemFeePercent =
    Number.isFinite(fallbackRate) && fallbackRate >= 0 ? fallbackRate : 0.8

  return calculateTransactionCharges({
    type: 'HAWALA',
    amount: fromAmount,
    amountCurrency: options?.amountCurrency,
    quotedRate: options?.quotedRate,
    quotedToCurrency: options?.quotedToCurrency,
    sarafFeePercent: options?.sarafFeePercent,
    vipLevel,
    rewardDiscountRate,
    fallbackSystemFeePercent,
    waiveSystemFee: options?.waiveSystemFee,
    waiverReason: options?.waiverReason,
  })
}

async function getMarketRate(fromCurrency: string, toCurrency: string): Promise<number | null> {
  const direct = await prisma.marketData.findUnique({
    where: {
      symbol_type: {
        symbol: `${fromCurrency}${toCurrency}`,
        type: 'forex',
      },
    },
    select: { price: true },
  })

  if (typeof direct?.price === 'number' && direct.price > 0) {
    return direct.price
  }

  if (fromCurrency !== 'USD' && toCurrency !== 'USD') {
    const [fromUsd, usdTo] = await Promise.all([
      prisma.marketData.findUnique({
        where: {
          symbol_type: {
            symbol: `${fromCurrency}USD`,
            type: 'forex',
          },
        },
        select: { price: true },
      }),
      prisma.marketData.findUnique({
        where: {
          symbol_type: {
            symbol: `USD${toCurrency}`,
            type: 'forex',
          },
        },
        select: { price: true },
      }),
    ])

    if (
      typeof fromUsd?.price === 'number' &&
      fromUsd.price > 0 &&
      typeof usdTo?.price === 'number' &&
      usdTo.price > 0
    ) {
      return fromUsd.price * usdTo.price
    }
  }

  if (toCurrency === 'USD') {
    const usdToFrom = await prisma.marketData.findUnique({
      where: {
        symbol_type: {
          symbol: `USD${fromCurrency}`,
          type: 'forex',
        },
      },
      select: { price: true },
    })

    if (typeof usdToFrom?.price === 'number' && usdToFrom.price > 0) {
      return 1 / usdToFrom.price
    }
  }

  if (fromCurrency === 'USD') {
    const usdToTarget = await prisma.marketData.findUnique({
      where: {
        symbol_type: {
          symbol: `USD${toCurrency}`,
          type: 'forex',
        },
      },
      select: { price: true },
    })

    if (typeof usdToTarget?.price === 'number' && usdToTarget.price > 0) {
      return usdToTarget.price
    }
  }

  const inverse = await prisma.marketData.findUnique({
    where: {
      symbol_type: {
        symbol: `${toCurrency}${fromCurrency}`,
        type: 'forex',
      },
    },
    select: { price: true },
  })

  if (typeof inverse?.price === 'number' && inverse.price > 0) {
    return 1 / inverse.price
  }

  return null
}

export async function resolveHawalaRate(
  sarafId: string,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  if (fromCurrency === toCurrency) {
    return 1
  }

  const now = new Date()
  const activeRateFilter = {
    sarafId,
    isActive: true,
    OR: [{ validUntil: null }, { validUntil: { gt: now } }],
  }

  const directRate = await prisma.rate.findFirst({
    where: {
      ...activeRateFilter,
      fromCurrency,
      toCurrency,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      buyRate: true,
      sellRate: true,
    },
  })

  if (directRate) {
    const candidate = directRate.buyRate > 0 ? directRate.buyRate : directRate.sellRate
    if (candidate > 0) {
      return candidate
    }
  }

  const inverseRate = await prisma.rate.findFirst({
    where: {
      ...activeRateFilter,
      fromCurrency: toCurrency,
      toCurrency: fromCurrency,
    },
    orderBy: { updatedAt: 'desc' },
    select: {
      buyRate: true,
      sellRate: true,
    },
  })

  if (inverseRate) {
    const inverseCandidate =
      inverseRate.sellRate > 0 ? inverseRate.sellRate : inverseRate.buyRate
    if (inverseCandidate > 0) {
      return 1 / inverseCandidate
    }
  }

  return getMarketRate(fromCurrency, toCurrency)
}
