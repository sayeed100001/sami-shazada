import { ConfigEnforcer } from '@/lib/config-enforcer'
import { convertAmountToUsd } from '@/lib/fx-rates'

export async function calculateCreditsRequiredForCommission(params: {
  commissionAmount: number
  commissionCurrency?: string | null
  quotedRate?: number | null
  quotedToCurrency?: string | null
}): Promise<number> {
  const commissionAmount = Number(params.commissionAmount)
  if (!Number.isFinite(commissionAmount) || commissionAmount <= 0) {
    return 0
  }

  const configuredUnitPriceUsd = await ConfigEnforcer.getCreditPriceUsd()
  const unitPriceUsd =
    Number.isFinite(configuredUnitPriceUsd) && configuredUnitPriceUsd > 0
      ? configuredUnitPriceUsd
      : 1

  const commissionCurrency = params.commissionCurrency?.trim().toUpperCase() || 'USD'

  let commissionUsd: number | null
  if (commissionCurrency === 'USD') {
    commissionUsd = commissionAmount
  } else {
    commissionUsd = await convertAmountToUsd({
      amount: commissionAmount,
      currency: commissionCurrency,
      quotedRate: params.quotedRate,
      quotedToCurrency: params.quotedToCurrency,
    })
  }

  if (commissionUsd === null) {
    // Fail closed: if we can't reliably convert the fee to USD, we must not guess.
    // Guessing can under/over-charge credits and cause real money loss.
    throw new Error('FX_RATE_UNAVAILABLE')
  }

  return Math.max(0, Math.ceil(commissionUsd / unitPriceUsd))
}
