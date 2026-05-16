import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

const TYPE_RE = /^[A-Z][A-Z0-9_]{1,39}$/
const LANGS = ['fa', 'en', 'ps'] as const
type Lang = (typeof LANGS)[number]

type PromotionEffects = {
  directoryWeight?: number
  maxRatePairs?: number
  prioritySupport?: boolean
  detailedReports?: boolean
}

function normalizeEffects(input: unknown): PromotionEffects | null {
  if (!input || typeof input !== 'object') return null
  const src = input as any
  const out: PromotionEffects = {}

  const dw = Number(src.directoryWeight)
  if (Number.isFinite(dw)) out.directoryWeight = Math.max(-10000, Math.min(10000, Math.trunc(dw)))

  if (src.maxRatePairs !== undefined && src.maxRatePairs !== null && String(src.maxRatePairs).trim() !== '') {
    const mr = Number(src.maxRatePairs)
    if (Number.isFinite(mr)) out.maxRatePairs = Math.max(0, Math.min(500, Math.trunc(mr)))
  }

  if (src.prioritySupport !== undefined) out.prioritySupport = Boolean(src.prioritySupport)
  if (src.detailedReports !== undefined) out.detailedReports = Boolean(src.detailedReports)

  return Object.keys(out).length > 0 ? out : null
}

function normalizeFeatures(input: unknown): string[] {
  if (Array.isArray(input)) {
    return Array.from(
      new Set(
        input
          .filter((v): v is string => typeof v === 'string')
          .map((v) => sanitizeInput(v))
          .filter(Boolean)
      )
    ).slice(0, 100)
  }
  return []
}

function normalizeI18nStrings(input: unknown): Partial<Record<Lang, string>> | null {
  if (!input || typeof input !== 'object') return null
  const out: Partial<Record<Lang, string>> = {}
  for (const lang of LANGS) {
    const value = (input as any)[lang]
    if (typeof value === 'string') {
      const cleaned = sanitizeInput(value)
      if (cleaned) out[lang] = cleaned
    }
  }
  return Object.keys(out).length > 0 ? out : null
}

function normalizeI18nFeatures(input: unknown): Partial<Record<Lang, string[]>> | null {
  if (!input || typeof input !== 'object') return null
  const out: Partial<Record<Lang, string[]>> = {}
  for (const lang of LANGS) {
    const rows = (input as any)[lang]
    const normalized = normalizeFeatures(rows)
    if (normalized.length > 0) out[lang] = normalized
  }
  return Object.keys(out).length > 0 ? out : null
}

type PricingTier = { duration: number; amount: number }

function normalizePricing(input: unknown): PricingTier[] {
  if (!Array.isArray(input)) return []
  const tiers: PricingTier[] = []
  for (const row of input) {
    const d = typeof (row as any)?.duration === 'number' ? (row as any).duration : Number((row as any)?.duration)
    const a = typeof (row as any)?.amount === 'number' ? (row as any).amount : Number((row as any)?.amount)
    const duration = Number.isFinite(d) ? Math.trunc(d) : NaN
    const amount = Number.isFinite(a) ? Math.trunc(a) : NaN
    if (!Number.isFinite(duration) || duration <= 0) continue
    if (!Number.isFinite(amount) || amount < 0) continue
    tiers.push({ duration, amount })
  }
  // de-dup by duration, keep last
  const byDuration = new Map<number, PricingTier>()
  for (const tier of tiers) byDuration.set(tier.duration, tier)
  return Array.from(byDuration.values()).sort((x, y) => x.duration - y.duration).slice(0, 30)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const configs = await prisma.promotionConfig.findMany({
      orderBy: [{ displayOrder: 'asc' }, { type: 'asc' }],
    })

    return NextResponse.json({ success: true, configs })
  } catch (error) {
    console.error('Promotion configs fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch promotion configs' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const type = sanitizeInput(body?.type || '').toUpperCase()
    if (!type || !TYPE_RE.test(type)) {
      return NextResponse.json(
        { error: 'Invalid type (use A-Z, 0-9, underscore; start with a letter)' },
        { status: 400 }
      )
    }

    const name = sanitizeInput(body?.name || '')
    if (!name) return NextResponse.json({ error: 'Missing name' }, { status: 400 })

    const description = body?.description ? sanitizeInput(body.description) : null
    const nameI18n = normalizeI18nStrings(body?.nameI18n)
    const descriptionI18n = normalizeI18nStrings(body?.descriptionI18n)
    const isActive = body?.isActive === undefined ? true : Boolean(body.isActive)
    const displayOrderRaw = Number(body?.displayOrder)
    const displayOrder = Number.isFinite(displayOrderRaw) ? Math.trunc(displayOrderRaw) : 0

    const features = normalizeFeatures(body?.features)
    const featuresI18n = normalizeI18nFeatures(body?.featuresI18n)
    const pricing = normalizePricing(body?.pricing)
    const effects = normalizeEffects(body?.effects)
    if (pricing.length === 0) {
      return NextResponse.json({ error: 'Pricing tiers are required' }, { status: 400 })
    }

    const saved = await prisma.$transaction(async (tx) => {
      const existing = await tx.promotionConfig.findUnique({ where: { type } })
      const config = existing
        ? await tx.promotionConfig.update({
            where: { type },
            data: {
              name,
              description,
              nameI18n: nameI18n as any,
              descriptionI18n: descriptionI18n as any,
              features,
              featuresI18n: featuresI18n as any,
              effects: effects as any,
              pricing,
              isActive,
              displayOrder,
            },
          })
        : await tx.promotionConfig.create({
            data: {
              type,
              name,
              description,
              nameI18n: nameI18n as any,
              descriptionI18n: descriptionI18n as any,
              features,
              featuresI18n: featuresI18n as any,
              effects: effects as any,
              pricing,
              isActive,
              displayOrder,
            },
          })

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: existing ? 'PROMOTION_CONFIG_UPDATED' : 'PROMOTION_CONFIG_CREATED',
          resource: 'PROMOTION_CONFIG',
          resourceId: config.id,
          details: JSON.stringify({
            type,
            name,
            isActive,
            displayOrder,
            pricingCount: pricing.length,
          }),
        },
      })

      return config
    })

    return NextResponse.json({ success: true, config: saved })
  } catch (error) {
    console.error('Promotion config save error:', error)
    return NextResponse.json({ error: 'Failed to save promotion config' }, { status: 500 })
  }
}
