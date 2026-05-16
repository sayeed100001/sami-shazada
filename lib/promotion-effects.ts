import { prisma } from '@/lib/prisma'

export type PromotionEffects = {
  directoryWeight?: number
  maxRatePairs?: number
  prioritySupport?: boolean
  detailedReports?: boolean
}

function normalizeEffects(input: unknown): PromotionEffects {
  if (!input || typeof input !== 'object') return {}
  const src = input as any
  const out: PromotionEffects = {}

  const dw = Number(src.directoryWeight)
  if (Number.isFinite(dw)) out.directoryWeight = Math.trunc(dw)

  const mr = Number(src.maxRatePairs)
  if (Number.isFinite(mr) && mr >= 0) out.maxRatePairs = Math.trunc(mr)

  if (src.prioritySupport !== undefined) out.prioritySupport = Boolean(src.prioritySupport)
  if (src.detailedReports !== undefined) out.detailedReports = Boolean(src.detailedReports)

  return out
}

export async function getEffectivePromotionEffectsForSaraf(sarafId: string, now = new Date()): Promise<PromotionEffects> {
  const active = await prisma.promotionRequest.findMany({
    where: {
      sarafId,
      status: 'APPROVED',
      OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
    },
    select: { type: true },
    take: 20,
  })

  if (active.length === 0) return {}

  const types = Array.from(new Set(active.map((r) => r.type).filter(Boolean)))
  if (types.length === 0) return {}

  const configs = await prisma.promotionConfig.findMany({
    where: { isActive: true, type: { in: types } },
    select: { type: true, effects: true },
  })

  let directoryWeight = 0
  let maxRatePairs: number | undefined = undefined
  let prioritySupport = false
  let detailedReports = false

  for (const cfg of configs) {
    const eff = normalizeEffects((cfg as any).effects)
    directoryWeight += eff.directoryWeight || 0
    if (eff.maxRatePairs !== undefined) {
      maxRatePairs = maxRatePairs === undefined ? eff.maxRatePairs : Math.max(maxRatePairs, eff.maxRatePairs)
    }
    prioritySupport = prioritySupport || Boolean(eff.prioritySupport)
    detailedReports = detailedReports || Boolean(eff.detailedReports)
  }

  const out: PromotionEffects = {}
  if (directoryWeight) out.directoryWeight = directoryWeight
  if (maxRatePairs !== undefined) out.maxRatePairs = maxRatePairs
  if (prioritySupport) out.prioritySupport = true
  if (detailedReports) out.detailedReports = true
  return out
}

