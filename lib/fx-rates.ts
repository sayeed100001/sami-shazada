import { prisma } from '@/lib/prisma'

function normalizeCurrency(currency: string | null | undefined): string | null {
  const normalized = currency?.trim().toUpperCase()
  return normalized || null
}

export async function getStoredFxRate(
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const from = normalizeCurrency(fromCurrency)
  const to = normalizeCurrency(toCurrency)

  if (!from || !to) return null
  if (from === to) return 1

  const direct = await prisma.marketData.findUnique({
    where: {
      symbol_type: {
        symbol: `${from}${to}`,
        type: 'forex',
      },
    },
    select: { price: true },
  })

  if (typeof direct?.price === 'number' && direct.price > 0) {
    return direct.price
  }

  if (from !== 'USD' && to !== 'USD') {
    const [fromUsd, usdTo] = await Promise.all([
      prisma.marketData.findUnique({
        where: { symbol_type: { symbol: `${from}USD`, type: 'forex' } },
        select: { price: true },
      }),
      prisma.marketData.findUnique({
        where: { symbol_type: { symbol: `USD${to}`, type: 'forex' } },
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

  if (to === 'USD') {
    const usdToFrom = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: `USD${from}`, type: 'forex' } },
      select: { price: true },
    })

    if (typeof usdToFrom?.price === 'number' && usdToFrom.price > 0) {
      return 1 / usdToFrom.price
    }
  }

  if (from === 'USD') {
    const usdToTarget = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: `USD${to}`, type: 'forex' } },
      select: { price: true },
    })

    if (typeof usdToTarget?.price === 'number' && usdToTarget.price > 0) {
      return usdToTarget.price
    }
  }

  const inverse = await prisma.marketData.findUnique({
    where: {
      symbol_type: {
        symbol: `${to}${from}`,
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

export async function convertStoredAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string
): Promise<number | null> {
  const normalizedAmount = Number(amount)
  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0) {
    return null
  }

  const rate = await getStoredFxRate(fromCurrency, toCurrency)
  if (!rate || rate <= 0) {
    return null
  }

  return Number((normalizedAmount * rate).toFixed(6))
}

export async function convertAmountToUsd(params: {
  amount: number
  currency: string | null | undefined
  quotedRate?: number | null
  quotedToCurrency?: string | null
}): Promise<number | null> {
  const normalizedAmount = Number(params.amount)
  const currency = normalizeCurrency(params.currency)

  if (!Number.isFinite(normalizedAmount) || normalizedAmount < 0 || !currency) {
    return null
  }

  if (currency === 'USD') {
    return Number(normalizedAmount.toFixed(6))
  }

  const storedConversion = await convertStoredAmount(normalizedAmount, currency, 'USD')
  if (storedConversion !== null) {
    return storedConversion
  }

  const quotedToCurrency = normalizeCurrency(params.quotedToCurrency)
  const quotedRate = Number(params.quotedRate)

  if (quotedToCurrency === 'USD' && Number.isFinite(quotedRate) && quotedRate > 0) {
    return Number((normalizedAmount * quotedRate).toFixed(6))
  }

  return null
}
