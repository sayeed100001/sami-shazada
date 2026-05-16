export const CREDIT_PURCHASE_DISCOUNT_TIERS = [
  { amount: 50, discount: 5 },
  { amount: 100, discount: 10 },
  { amount: 500, discount: 15 },
  { amount: 1000, discount: 20 },
] as const

export interface CreditPurchaseQuote {
  amount: number
  unitPriceUsd: number
  basePriceUsd: number
  bulkDiscountRate: number
  bulkDiscountAmountUsd: number
  promoDiscountAmountUsd: number
  finalPriceUsd: number
}

export function roundUsdAmount(value: number): number {
  return Number((Number.isFinite(value) ? value : 0).toFixed(2))
}

export function getCreditBulkDiscountRate(amount: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return 0

  const matchedTier = [...CREDIT_PURCHASE_DISCOUNT_TIERS]
    .sort((a, b) => b.amount - a.amount)
    .find((tier) => amount >= tier.amount)

  return matchedTier ? matchedTier.discount / 100 : 0
}

export function quoteCreditPurchase(params: {
  amount: number
  unitPriceUsd: number
  promoDiscountAmountUsd?: number
}): CreditPurchaseQuote {
  const normalizedAmount = Math.max(0, Math.floor(Number(params.amount) || 0))
  const normalizedUnitPriceUsd = Math.max(0.01, Number(params.unitPriceUsd) || 1)
  const basePriceUsd = roundUsdAmount(normalizedAmount * normalizedUnitPriceUsd)
  const bulkDiscountRate = getCreditBulkDiscountRate(normalizedAmount)
  const bulkDiscountAmountUsd = roundUsdAmount(basePriceUsd * bulkDiscountRate)
  const subtotalAfterBulk = Math.max(0, basePriceUsd - bulkDiscountAmountUsd)
  const promoDiscountAmountUsd = roundUsdAmount(
    Math.min(Math.max(0, Number(params.promoDiscountAmountUsd) || 0), subtotalAfterBulk)
  )

  return {
    amount: normalizedAmount,
    unitPriceUsd: roundUsdAmount(normalizedUnitPriceUsd),
    basePriceUsd,
    bulkDiscountRate,
    bulkDiscountAmountUsd,
    promoDiscountAmountUsd,
    finalPriceUsd: roundUsdAmount(subtotalAfterBulk - promoDiscountAmountUsd),
  }
}
