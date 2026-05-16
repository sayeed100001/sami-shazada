import { prisma } from '@/lib/prisma'

export interface StoredCandle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

interface SnapshotInput {
  symbol: string
  name: string
  type: string
  price: number
  volume?: number | null
  timestamp?: Date
}

export function normalizeMarketSymbol(symbol: string) {
  return symbol.replace(/[\/\s]/g, '').toUpperCase()
}

export function parsePeriodToDays(period: string) {
  const normalized = period.trim().toLowerCase()
  const match = normalized.match(/^(\d+)([dwm])$/)
  if (!match) {
    return null
  }

  const value = Number.parseInt(match[1], 10)
  const unit = match[2]

  if (!Number.isFinite(value) || value <= 0) {
    return null
  }

  if (unit === 'd') return value
  if (unit === 'w') return value * 7
  return value * 30
}

export function timeframeToMs(timeframe: string) {
  const intervals: Record<string, number> = {
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000,
    '1d': 24 * 60 * 60 * 1000,
    '1w': 7 * 24 * 60 * 60 * 1000,
  }

  return intervals[timeframe] || intervals['1h']
}

function bucketTimestamp(timestamp: Date, timeframe: string) {
  const date = new Date(timestamp)

  if (timeframe === '1w') {
    const day = date.getUTCDay()
    const diff = (day + 6) % 7
    date.setUTCDate(date.getUTCDate() - diff)
    date.setUTCHours(0, 0, 0, 0)
    return date
  }

  if (timeframe === '1d') {
    date.setUTCHours(0, 0, 0, 0)
    return date
  }

  const bucketHours = timeframe === '4h' ? 4 : 1
  const currentHour = date.getUTCHours()
  const alignedHour = Math.floor(currentHour / bucketHours) * bucketHours
  date.setUTCHours(alignedHour, 0, 0, 0)
  return date
}

export async function storePriceSnapshot(
  input: SnapshotInput,
  timeframe: '1h' | '1d' = '1h'
) {
  if (!Number.isFinite(input.price) || input.price <= 0) {
    return
  }

  const normalizedSymbol = normalizeMarketSymbol(input.symbol)
  const snapshotTime = bucketTimestamp(input.timestamp || new Date(), timeframe)

  const asset = await prisma.asset.upsert({
    where: { symbol: normalizedSymbol },
    update: {
      name: input.name,
      type: input.type,
      isActive: true,
    },
    create: {
      symbol: normalizedSymbol,
      name: input.name,
      type: input.type,
      isActive: true,
    },
    select: { id: true },
  })

  const volume = Number.isFinite(input.volume || 0) ? Number(input.volume || 0) : 0

  await prisma.priceHistory.upsert({
    where: {
      symbol_timeframe_timestamp: {
        symbol: normalizedSymbol,
        timeframe,
        timestamp: snapshotTime,
      },
    },
    update: {
      open: input.price,
      high: input.price,
      low: input.price,
      close: input.price,
      volume,
    },
    create: {
      assetId: asset.id,
      symbol: normalizedSymbol,
      timeframe,
      timestamp: snapshotTime,
      open: input.price,
      high: input.price,
      low: input.price,
      close: input.price,
      volume,
    },
  })
}

export async function getStoredCandles(
  symbol: string,
  days: number,
  timeframe: '1h' | '1d' = '1h'
): Promise<StoredCandle[]> {
  const normalizedSymbol = normalizeMarketSymbol(symbol)
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  const rows = await prisma.priceHistory.findMany({
    where: {
      symbol: normalizedSymbol,
      timeframe,
      timestamp: { gte: cutoff },
    },
    orderBy: { timestamp: 'asc' },
    select: {
      timestamp: true,
      open: true,
      high: true,
      low: true,
      close: true,
      volume: true,
    },
  })

  return rows.map((row) => ({
    time: row.timestamp.getTime(),
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume || 0,
  }))
}

export function aggregateCandles(candles: StoredCandle[], timeframe: string) {
  const bucketMs = timeframeToMs(timeframe)
  const buckets = new Map<number, StoredCandle>()

  for (const candle of candles) {
    const bucket = Math.floor(candle.time / bucketMs) * bucketMs
    const existing = buckets.get(bucket)

    if (!existing) {
      buckets.set(bucket, { ...candle, time: bucket })
      continue
    }

    existing.high = Math.max(existing.high, candle.high)
    existing.low = Math.min(existing.low, candle.low)
    existing.close = candle.close
    existing.volume += candle.volume
  }

  return Array.from(buckets.values()).sort((left, right) => left.time - right.time)
}
