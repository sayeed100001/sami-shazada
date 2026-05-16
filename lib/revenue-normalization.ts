import { getStoredFxRate } from '@/lib/fx-rates'

function normalizeCurrency(currency: string | null | undefined): string | null {
  const normalized = currency?.trim().toUpperCase()
  return normalized || null
}

export function roundUsdAmount(amount: number) {
  return Number(amount.toFixed(2))
}

export function createUsdRevenueNormalizer() {
  const rateCache = new Map<string, number | null>()

  return async function normalizeAmountToUsd(
    amount: number,
    currency: string | null | undefined
  ): Promise<number> {
    const normalizedAmount = Number(amount)
    const normalizedCurrency = normalizeCurrency(currency)

    if (!Number.isFinite(normalizedAmount) || normalizedAmount === 0) {
      return 0
    }

    if (!normalizedCurrency || normalizedCurrency === 'USD') {
      return roundUsdAmount(normalizedAmount)
    }

    if (!rateCache.has(normalizedCurrency)) {
      rateCache.set(normalizedCurrency, await getStoredFxRate(normalizedCurrency, 'USD'))
    }

    const rate = rateCache.get(normalizedCurrency)
    if (!rate || rate <= 0) {
      return 0
    }

    return roundUsdAmount(normalizedAmount * rate)
  }
}
