import { calculateCommission, type CommissionType } from '@/lib/commission'
import { calculateCreditsRequiredForCommission } from '@/lib/credit-usage'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { vipDiscountForLevel, type VipLevel } from '@/lib/vip'

export type SystemFeeWaiverReason = 'FREE_ACCESS' | 'FREE_TRIAL'
export type ChargeableFeature = 'HAWALA' | 'EXCHANGE'

export interface FeeWaiverEligibleSaraf {
  isOnFreeTrial: boolean
  freeTrialEndDate: Date | null
}

export interface TransactionChargeResult {
  systemCommission: number
  sarafCommission: number
  totalCommission: number
  creditsRequired: number
  vipDiscount: number
  systemDiscountAmount: number
  waivedSystemCommission: number
  systemFeeWaiverReason: SystemFeeWaiverReason | null
}

export interface SystemFeeWaiverState {
  waiveSystemFee: boolean
  waiverReason: SystemFeeWaiverReason | null
}

interface CalculateTransactionChargesParams {
  type: CommissionType
  amount: number
  amountCurrency?: string | null
  quotedRate?: number | null
  quotedToCurrency?: string | null
  sarafFeePercent?: number | null
  vipLevel?: VipLevel | null
  rewardDiscountRate?: number
  overrideSystemFeePercent?: number | null
  fallbackSystemFeePercent: number
  waiveSystemFee?: boolean
  waiverReason?: SystemFeeWaiverReason | null
}

export function isSarafOnActiveFreeTrial(
  saraf: FeeWaiverEligibleSaraf | null | undefined,
  now = new Date()
): boolean {
  return Boolean(saraf?.isOnFreeTrial && saraf?.freeTrialEndDate && saraf.freeTrialEndDate > now)
}

export async function resolveSystemFeeWaiver(
  feature: ChargeableFeature,
  saraf: FeeWaiverEligibleSaraf | null | undefined
): Promise<SystemFeeWaiverState> {
  const freeAccessEnabled = await ConfigEnforcer.isFreeAccessEnabledForSarafs()
  if (freeAccessEnabled) {
    return {
      waiveSystemFee: true,
      waiverReason: 'FREE_ACCESS',
    }
  }

  if (!isSarafOnActiveFreeTrial(saraf)) {
    return {
      waiveSystemFee: false,
      waiverReason: null,
    }
  }

  if (feature === 'EXCHANGE') {
    const [trialIncludesExchange, feeOffForTrialSarafs] = await Promise.all([
      ConfigEnforcer.isExchangeIncludedInFreeTrial(),
      ConfigEnforcer.isExchangeFeeOffForTrialSarafs(),
    ])

    if (!trialIncludesExchange || !feeOffForTrialSarafs) {
      return {
        waiveSystemFee: false,
        waiverReason: null,
      }
    }
  }

  return {
    waiveSystemFee: true,
    waiverReason: 'FREE_TRIAL',
  }
}

export async function calculateTransactionCharges(
  params: CalculateTransactionChargesParams
): Promise<TransactionChargeResult> {
  const amount = Number(params.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return {
      systemCommission: 0,
      sarafCommission: 0,
      totalCommission: 0,
      creditsRequired: 0,
      vipDiscount: 0,
      systemDiscountAmount: 0,
      waivedSystemCommission: 0,
      systemFeeWaiverReason: params.waiverReason || null,
    }
  }

  let systemCommission = 0
  let sarafCommission = 0
  let configuredSarafFeePercent: number | null = null
  let baseSarafCommission = 0

  const commission = await calculateCommission({ type: params.type, amount })
  if (commission) {
    const commissionBasedSystem = Number(commission.systemCommission.toFixed(2))
    const nominalSystemCommission =
      params.overrideSystemFeePercent !== null && params.overrideSystemFeePercent !== undefined
        ? Number((amount * (params.overrideSystemFeePercent / 100)).toFixed(2))
        : commissionBasedSystem

    if (
      Number.isFinite(params.sarafFeePercent) &&
      (params.sarafFeePercent || 0) > 0
    ) {
      configuredSarafFeePercent = Number(params.sarafFeePercent)
      const configuredTotalCommission = Number(
        ((amount * configuredSarafFeePercent) / 100).toFixed(2)
      )
      systemCommission = Number(
        Math.min(nominalSystemCommission, configuredTotalCommission).toFixed(2)
      )
      baseSarafCommission = Number(
        Math.max(0, configuredTotalCommission - systemCommission).toFixed(2)
      )
      sarafCommission = baseSarafCommission
    } else {
      systemCommission = nominalSystemCommission
      baseSarafCommission = Number(commission.suggestedSarafCommission.toFixed(2))
      sarafCommission = baseSarafCommission
    }
  } else {
    const fallbackSystemFeePercent =
      Number.isFinite(params.fallbackSystemFeePercent) && params.fallbackSystemFeePercent >= 0
        ? params.fallbackSystemFeePercent
        : 0

    const nominalSystemCommission = Number((amount * (fallbackSystemFeePercent / 100)).toFixed(2))

    if (
      Number.isFinite(params.sarafFeePercent) &&
      (params.sarafFeePercent || 0) > 0
    ) {
      configuredSarafFeePercent = Number(params.sarafFeePercent)
      const configuredTotalCommission = Number(
        ((amount * configuredSarafFeePercent) / 100).toFixed(2)
      )
      systemCommission = Number(
        Math.min(nominalSystemCommission, configuredTotalCommission).toFixed(2)
      )
      baseSarafCommission = Number(
        Math.max(0, configuredTotalCommission - systemCommission).toFixed(2)
      )
      sarafCommission = baseSarafCommission
    } else {
      systemCommission = nominalSystemCommission
    }
  }

  const vipDiscount = params.vipLevel ? vipDiscountForLevel(params.vipLevel) : 0
  const rewardDiscountRate = Number.isFinite(params.rewardDiscountRate)
    ? params.rewardDiscountRate || 0
    : 0
  const totalDiscountRate = Math.min(Math.max(vipDiscount + rewardDiscountRate, 0), 1)
  const preDiscountSystemCommission = systemCommission

  if (totalDiscountRate > 0) {
    systemCommission = Number((systemCommission * (1 - totalDiscountRate)).toFixed(2))
  }

  const systemDiscountAmount = Number(
    (preDiscountSystemCommission - systemCommission).toFixed(2)
  )

  let waivedSystemCommission = 0
  if (params.waiveSystemFee && systemCommission > 0) {
    waivedSystemCommission = systemCommission
    systemCommission = 0

    if (configuredSarafFeePercent !== null) {
      sarafCommission = Number((baseSarafCommission + waivedSystemCommission).toFixed(2))
    }
  }

  const creditsRequired = await calculateCreditsRequiredForCommission({
    commissionAmount: systemCommission,
    commissionCurrency: params.amountCurrency,
    quotedRate: params.quotedRate,
    quotedToCurrency: params.quotedToCurrency,
  })
  const totalCommission = Number((systemCommission + sarafCommission).toFixed(2))

  return {
    systemCommission,
    sarafCommission,
    totalCommission,
    creditsRequired,
    vipDiscount,
    systemDiscountAmount,
    waivedSystemCommission: Number(waivedSystemCommission.toFixed(2)),
    systemFeeWaiverReason: params.waiveSystemFee ? params.waiverReason || null : null,
  }
}
