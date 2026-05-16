type AdminStatsPayload = Record<string, unknown>

const ADMIN_STATS_CACHE_TTL_MS = 30 * 1000

let cachedAdminStats:
  | {
      expiresAt: number
      payload: AdminStatsPayload
    }
  | null = null

export function getCachedAdminStats() {
  const now = Date.now()
  if (!cachedAdminStats || cachedAdminStats.expiresAt <= now) {
    return null
  }

  return cachedAdminStats.payload
}

export function setCachedAdminStats(payload: AdminStatsPayload) {
  cachedAdminStats = {
    expiresAt: Date.now() + ADMIN_STATS_CACHE_TTL_MS,
    payload,
  }
}

export function clearAdminStatsCache() {
  cachedAdminStats = null
}
