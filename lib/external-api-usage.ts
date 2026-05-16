import { prisma } from '@/lib/prisma'

const USAGE_PREFIX = 'external_api_usage_'
const KEEP_DAYS = 30

export type ExternalApiUsageSnapshot = {
  totalCalls: number
  totalErrors: number
  lastCallAt: string | null
  lastErrorAt: string | null
  lastStatus: number | null
  byDay: Record<
    string,
    {
      calls: number
      errors: number
      sumLatencyMs: number
    }
  >
}

function todayKeyUtc(now = new Date()) {
  return now.toISOString().slice(0, 10)
}

function pruneDays(byDay: ExternalApiUsageSnapshot['byDay']) {
  const keys = Object.keys(byDay).sort()
  if (keys.length <= KEEP_DAYS) return byDay
  const keep = new Set(keys.slice(-KEEP_DAYS))
  const next: ExternalApiUsageSnapshot['byDay'] = {}
  for (const k of keys) {
    if (keep.has(k)) next[k] = byDay[k]
  }
  return next
}

export async function recordExternalApiCall(input: {
  key: string
  ok: boolean
  status: number | null
  latencyMs: number | null
}) {
  const apiKey = String(input.key || '').trim()
  if (!apiKey) return

  const now = new Date()
  const day = todayKeyUtc(now)
  const configKey = `${USAGE_PREFIX}${apiKey}`

  await prisma.$transaction(async (tx) => {
    const existing = await tx.systemConfig.findUnique({ where: { key: configKey } })
    let snapshot: ExternalApiUsageSnapshot = {
      totalCalls: 0,
      totalErrors: 0,
      lastCallAt: null,
      lastErrorAt: null,
      lastStatus: null,
      byDay: {},
    }

    if (existing?.value) {
      try {
        snapshot = JSON.parse(existing.value) as ExternalApiUsageSnapshot
      } catch {
        // keep defaults
      }
    }

    const latency = Math.max(0, Math.trunc(Number(input.latencyMs || 0)))
    const bucket = snapshot.byDay?.[day] || { calls: 0, errors: 0, sumLatencyMs: 0 }

    snapshot.totalCalls = Math.max(0, Math.trunc(Number(snapshot.totalCalls || 0))) + 1
    snapshot.lastCallAt = now.toISOString()
    snapshot.lastStatus = Number.isFinite(input.status as any) ? Number(input.status) : null
    bucket.calls += 1
    bucket.sumLatencyMs += latency

    if (!input.ok) {
      snapshot.totalErrors = Math.max(0, Math.trunc(Number(snapshot.totalErrors || 0))) + 1
      snapshot.lastErrorAt = now.toISOString()
      bucket.errors += 1
    }

    snapshot.byDay = pruneDays({ ...(snapshot.byDay || {}), [day]: bucket })

    await tx.systemConfig.upsert({
      where: { key: configKey },
      update: { value: JSON.stringify(snapshot), description: `External API usage: ${apiKey}` },
      create: { key: configKey, value: JSON.stringify(snapshot), description: `External API usage: ${apiKey}` },
    })
  })
}

export async function getAllExternalApiUsage() {
  const configs = await prisma.systemConfig.findMany({
    where: { key: { startsWith: USAGE_PREFIX } },
    select: { key: true, value: true },
    orderBy: { updatedAt: 'desc' },
  })

  const map: Record<string, ExternalApiUsageSnapshot> = {}
  for (const cfg of configs) {
    const key = String(cfg.key || '').replace(USAGE_PREFIX, '')
    if (!key) continue
    try {
      map[key] = JSON.parse(cfg.value) as ExternalApiUsageSnapshot
    } catch {
      // ignore
    }
  }
  return map
}

