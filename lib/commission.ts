import { prisma } from '@/lib/prisma'
import { calculateCreditsRequiredForCommission } from '@/lib/credit-usage'

export type CommissionType = 'HAWALA' | 'EXCHANGE'

type DefaultCommissionSetting = {
  minAmount: number
  maxAmount: number | null
  systemRate: number
  suggestedSarafRate: number
}

const DEFAULT_COMMISSION_SETTINGS: Record<CommissionType, DefaultCommissionSetting[]> = {
  HAWALA: [
    { minAmount: 0, maxAmount: 500, systemRate: 0.8, suggestedSarafRate: 1.0 },
    { minAmount: 501, maxAmount: 1000, systemRate: 0.7, suggestedSarafRate: 0.9 },
    { minAmount: 1001, maxAmount: 2500, systemRate: 0.6, suggestedSarafRate: 0.8 },
    { minAmount: 2501, maxAmount: 5000, systemRate: 0.5, suggestedSarafRate: 0.7 },
    { minAmount: 5001, maxAmount: 10000, systemRate: 0.4, suggestedSarafRate: 0.6 },
    { minAmount: 10001, maxAmount: null, systemRate: 0.3, suggestedSarafRate: 0.5 },
  ],
  EXCHANGE: [
    { minAmount: 0, maxAmount: 500, systemRate: 0.5, suggestedSarafRate: 0.7 },
    { minAmount: 501, maxAmount: 1000, systemRate: 0.45, suggestedSarafRate: 0.65 },
    { minAmount: 1001, maxAmount: 2500, systemRate: 0.4, suggestedSarafRate: 0.6 },
    { minAmount: 2501, maxAmount: 5000, systemRate: 0.35, suggestedSarafRate: 0.55 },
    { minAmount: 5001, maxAmount: 10000, systemRate: 0.25, suggestedSarafRate: 0.45 },
    { minAmount: 10001, maxAmount: null, systemRate: 0.15, suggestedSarafRate: 0.35 },
  ],
}

export interface CommissionResult {
  amount: number
  type: CommissionType
  systemRate: number
  systemCommission: number
  suggestedSarafRate: number
  suggestedSarafCommission: number
  totalRate: number
  totalCommission: number
  creditsRequired: number
  customerPays: number
}

async function ensureDefaultCommissionSettings(type: CommissionType) {
  const existingCount = await prisma.commissionSetting.count({
    where: { type, isActive: true },
  })

  if (existingCount > 0) {
    return
  }

  for (const setting of DEFAULT_COMMISSION_SETTINGS[type]) {
    await prisma.commissionSetting.upsert({
      where: {
        type_minAmount: {
          type,
          minAmount: setting.minAmount,
        },
      },
      update: {
        maxAmount: setting.maxAmount,
        systemRate: setting.systemRate,
        suggestedSarafRate: setting.suggestedSarafRate,
        isActive: true,
      },
      create: {
        type,
        minAmount: setting.minAmount,
        maxAmount: setting.maxAmount,
        systemRate: setting.systemRate,
        suggestedSarafRate: setting.suggestedSarafRate,
        isActive: true,
      },
    })
  }
}

export async function calculateCommission(params: {
  type: CommissionType
  amount: number
  currency?: string | null
  quotedRate?: number | null
  quotedToCurrency?: string | null
}): Promise<CommissionResult | null> {
  const amount = Number(params.amount)
  if (!Number.isFinite(amount) || amount <= 0) return null

  let setting = await prisma.commissionSetting.findFirst({
    where: {
      type: params.type,
      isActive: true,
      minAmount: { lte: amount },
      OR: [{ maxAmount: { gte: amount } }, { maxAmount: null }],
    },
    orderBy: { minAmount: 'desc' },
  })

  if (!setting) {
    await ensureDefaultCommissionSettings(params.type)

    setting = await prisma.commissionSetting.findFirst({
      where: {
        type: params.type,
        isActive: true,
        minAmount: { lte: amount },
        OR: [{ maxAmount: { gte: amount } }, { maxAmount: null }],
      },
      orderBy: { minAmount: 'desc' },
    })
  }

  if (!setting) return null

  const systemCommission = (amount * setting.systemRate) / 100
  const suggestedSarafRate = setting.suggestedSarafRate || 0
  const suggestedSarafCommission = (amount * suggestedSarafRate) / 100
  const totalCommission = systemCommission + suggestedSarafCommission
  const creditsRequired = await calculateCreditsRequiredForCommission({
    commissionAmount: systemCommission,
    commissionCurrency: params.currency,
    quotedRate: params.quotedRate,
    quotedToCurrency: params.quotedToCurrency,
  })
  const customerPays = amount + totalCommission

  return {
    amount,
    type: params.type,
    systemRate: setting.systemRate,
    systemCommission: Number(systemCommission.toFixed(2)),
    suggestedSarafRate,
    suggestedSarafCommission: Number(suggestedSarafCommission.toFixed(2)),
    totalRate: setting.systemRate + suggestedSarafRate,
    totalCommission: Number(totalCommission.toFixed(2)),
    creditsRequired,
    customerPays: Number(customerPays.toFixed(2)),
  }
}
