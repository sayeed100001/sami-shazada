import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PromotionType = string
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'HAWALA'
type Lang = 'fa' | 'en' | 'ps'

const LANGS = new Set<Lang>(['fa', 'en', 'ps'])
const TYPE_RE = /^[A-Z][A-Z0-9_]{1,39}$/

type PricingTier = { duration: number; amount: number }

type PromotionPackage = {
  type: PromotionType
  name: string
  description: string | null
  features: string[]
  effects: any | null
  pricing: PricingTier[]
  isActive: boolean
  displayOrder: number
}

function normalizeFeatures(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  return input.filter((v): v is string => typeof v === 'string' && v.trim().length > 0).slice(0, 100)
}

function normalizePricing(input: unknown): PricingTier[] {
  if (!Array.isArray(input)) return []
  const out: PricingTier[] = []
  for (const row of input) {
    const d = typeof (row as any)?.duration === 'number' ? (row as any).duration : Number((row as any)?.duration)
    const a = typeof (row as any)?.amount === 'number' ? (row as any).amount : Number((row as any)?.amount)
    const duration = Number.isFinite(d) ? Math.trunc(d) : NaN
    const amount = Number.isFinite(a) ? Math.trunc(a) : NaN
    if (!Number.isFinite(duration) || duration <= 0) continue
    if (!Number.isFinite(amount) || amount < 0) continue
    out.push({ duration, amount })
  }
  // de-dup by duration
  const map = new Map<number, PricingTier>()
  for (const row of out) map.set(row.duration, row)
  return Array.from(map.values()).sort((x, y) => x.duration - y.duration).slice(0, 30)
}

function parsePromotionOverrides(overrideMap: unknown, type: PromotionType): Record<number, number> {
  if (!overrideMap || typeof overrideMap !== 'object') return {}
  const typeMap = (overrideMap as any)[type]
  if (!typeMap || typeof typeMap !== 'object') return {}
  const out: Record<number, number> = {}
  for (const [k, v] of Object.entries(typeMap as Record<string, unknown>)) {
    const duration = Number(k)
    const amount = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
    if (!Number.isFinite(duration) || duration <= 0) continue
    if (!Number.isFinite(amount) || amount < 0) continue
    out[Math.trunc(duration)] = Math.trunc(amount)
  }
  return out
}

function pickI18nString(fallback: string, i18n: unknown, lang: Lang | null): string {
  if (!lang) return fallback
  if (!i18n || typeof i18n !== 'object') return fallback
  const value = (i18n as any)[lang]
  return typeof value === 'string' && value.trim() ? value.trim() : fallback
}

function pickI18nFeatures(fallback: string[], i18n: unknown, lang: Lang | null): string[] {
  if (!lang) return fallback
  if (!i18n || typeof i18n !== 'object') return fallback
  const value = (i18n as any)[lang]
  const normalized = normalizeFeatures(value)
  return normalized.length > 0 ? normalized : fallback
}

function parseLang(request: NextRequest): Lang | null {
  try {
    const { searchParams } = new URL(request.url)
    const raw = (searchParams.get('lang') || '').toLowerCase()
    return LANGS.has(raw as Lang) ? (raw as Lang) : null
  } catch {
    return null
  }
}

function getFallbackPackages(lang: Lang | null): PromotionPackage[] {
  const premiumName = lang === 'en' ? 'Premium Account' : lang === 'ps' ? 'پریمیوم حساب' : 'حساب پریمیوم'
  const premiumDesc =
    lang === 'en'
      ? 'Upgrade to premium with special features'
      : lang === 'ps'
        ? 'د ځانګړو امکاناتو سره پریمیوم ته ارتقاء'
        : 'ارتقاء به حساب پریمیوم با امکانات ویژه'
  const featuredName = lang === 'en' ? 'Featured Listing' : lang === 'ps' ? 'ځانګړی نمایش' : 'نمایش ویژه'
  const featuredDesc =
    lang === 'en'
      ? 'Special display on the home page'
      : lang === 'ps'
        ? 'په اصلي پاڼه کې ځانګړی نمایش'
        : 'نمایش ویژه در صفحه اصلی'

  return [
    {
      type: 'PREMIUM',
      name: premiumName,
      description: premiumDesc,
      features: [
        lang === 'en'
          ? 'Top placement in saraf directory'
          : lang === 'ps'
            ? 'د صرافانو لست کې په سر کې نمایش'
            : 'نمایش در بالای لیست صرافان',
        lang === 'en' ? 'Golden premium badge' : lang === 'ps' ? 'طلایي پریمیوم نښه' : 'نشان پریمیوم طلایی',
        lang === 'en' ? 'Priority in search results' : lang === 'ps' ? 'په لټون کې اولویت' : 'اولویت در نتایج جستجو',
        lang === 'en' ? 'More rate slots' : lang === 'ps' ? 'د نرخونو زیات ثبت' : 'امکان ثبت نرخهای بیشتر',
        lang === 'en' ? 'Priority support' : lang === 'ps' ? 'اولویتي پشتیباني' : 'پشتیبانی اولویتدار',
        lang === 'en'
          ? 'Detailed transaction stats'
          : lang === 'ps'
            ? 'تفصیلي د تراکنش آمار'
            : 'آمار تفصیلی تراکنشها',
      ],
      effects: { directoryWeight: 200, maxRatePairs: 50, prioritySupport: true, detailedReports: true },
      pricing: [
        { duration: 30, amount: 5000 },
        { duration: 90, amount: 13500 },
        { duration: 180, amount: 24000 },
        { duration: 365, amount: 42000 },
      ],
      isActive: true,
      displayOrder: 10,
    },
    {
      type: 'FEATURED',
      name: featuredName,
      description: featuredDesc,
      features: [
        lang === 'en'
          ? 'Shown in featured sarafs section'
          : lang === 'ps'
            ? 'د ځانګړو صرافانو برخه کې نمایش'
            : 'نمایش در بخش صرافان ویژه',
        lang === 'en' ? 'Blue star badge' : lang === 'ps' ? 'آبي ستوري نښه' : 'نشان ستاره آبی',
        lang === 'en'
          ? 'Appears in main slider'
          : lang === 'ps'
            ? 'په اصلي سلایډر کې نمایش'
            : 'نمایش در اسلایدر اصلی',
        lang === 'en' ? 'More profile views' : lang === 'ps' ? 'د پروفایل زیات بازدید' : 'بازدید بیشتر از پروفایل',
      ],
      effects: { directoryWeight: 120 },
      pricing: [
        { duration: 7, amount: 1500 },
        { duration: 15, amount: 2800 },
        { duration: 30, amount: 5000 },
      ],
      isActive: true,
      displayOrder: 20,
    },
  ]
}

async function loadPromotionPackages(lang: Lang | null): Promise<PromotionPackage[]> {
  const configs = await prisma.promotionConfig.findMany({
    where: { isActive: true },
    orderBy: [{ displayOrder: 'asc' }, { type: 'asc' }],
  })

  if (configs.length === 0) return getFallbackPackages(lang)

  return configs.map((cfg) => {
    const baseFeatures = normalizeFeatures(cfg.features)
    return {
      type: cfg.type as PromotionType,
      name: pickI18nString(cfg.name, (cfg as any).nameI18n, lang),
      description: cfg.description ? pickI18nString(cfg.description, (cfg as any).descriptionI18n, lang) : null,
      features: pickI18nFeatures(baseFeatures, (cfg as any).featuresI18n, lang),
      effects: (cfg as any).effects ?? null,
      pricing: normalizePricing(cfg.pricing),
      isActive: cfg.isActive,
      displayOrder: cfg.displayOrder,
    }
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => null)
    const type = typeof body?.type === 'string' ? body.type.trim().toUpperCase() : ''
    const duration = body?.duration
    const paymentMethod = body?.paymentMethod

    if (!type || !duration || !paymentMethod) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!TYPE_RE.test(type)) {
      return NextResponse.json({ error: 'Invalid promotion type' }, { status: 400 })
    }

    if (!['CASH', 'BANK_TRANSFER', 'HAWALA'].includes(paymentMethod)) {
      return NextResponse.json({ error: 'Invalid payment method' }, { status: 400 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { userId: session.user.id },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf profile not found' }, { status: 404 })
    }

    const existingRequest = await prisma.promotionRequest.findFirst({
      where: { sarafId: saraf.id, status: 'PENDING' },
      select: { id: true },
    })

    if (existingRequest) {
      return NextResponse.json({ error: 'You already have a pending promotion request' }, { status: 400 })
    }

    // Prevent duplicate active promotions of the same type.
    const now = new Date()
    const existingActive = await prisma.promotionRequest.findFirst({
      where: {
        sarafId: saraf.id,
        type,
        status: 'APPROVED',
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
      },
      select: { id: true },
    })
    if (existingActive) {
      return NextResponse.json({ error: 'You already have an active promotion for this package' }, { status: 400 })
    }

    const packages = await loadPromotionPackages(null)
    const pkg = packages.find((p) => p.type === (type as PromotionType))
    if (!pkg || !pkg.isActive) {
      return NextResponse.json({ error: 'Promotion package is not available' }, { status: 400 })
    }

    const durationDays = Math.trunc(Number(duration))
    if (!Number.isFinite(durationDays) || durationDays <= 0) {
      return NextResponse.json({ error: 'Invalid duration' }, { status: 400 })
    }

    const baseTier = pkg.pricing.find((t) => t.duration === durationDays)
    if (!baseTier) {
      return NextResponse.json({ error: 'Invalid duration for this package' }, { status: 400 })
    }

    // Compute amount server-side (override wins).
    const overrides = parsePromotionOverrides((saraf as any).promotionPriceOverrides, pkg.type)
    const amountAfn = overrides[durationDays] ?? baseTier.amount

    const promotionRequest = await prisma.promotionRequest.create({
      data: {
        sarafId: saraf.id,
        type,
        duration: durationDays,
        amount: amountAfn,
        paymentMethod: paymentMethod as PaymentMethod,
        status: 'PENDING',
      },
    })

    // Notify requesting saraf user
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'Promotion request submitted',
        message: `Your ${type} promotion request was submitted and is pending review.`,
        type: 'info',
        action: 'PROMOTION_REQUESTED',
        resource: 'PROMOTION',
        resourceId: promotionRequest.id,
      },
    })

    // Notify admins
    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', isActive: true },
      select: { id: true },
    })

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'New promotion request',
          message: `${saraf.businessName} submitted a ${type} promotion request.`,
          type: 'info',
          action: 'PROMOTION_REQUESTED',
          resource: 'PROMOTION',
          resourceId: promotionRequest.id,
        })),
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PROMOTION_REQUESTED',
        resource: 'PROMOTION_REQUEST',
        resourceId: promotionRequest.id,
        details: `Requested ${type} promotion for ${durationDays} days at ${amountAfn} AFN via ${paymentMethod}`,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      },
    })

    return NextResponse.json({
      success: true,
      promotionRequest: {
        id: promotionRequest.id,
        type: promotionRequest.type,
        duration: promotionRequest.duration,
        amount: promotionRequest.amount,
        paymentMethod: promotionRequest.paymentMethod,
        status: promotionRequest.status,
        createdAt: promotionRequest.createdAt,
      },
    })
  } catch (error) {
    console.error('Promotion request error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const lang = parseLang(request)

    const saraf = await prisma.saraf.findUnique({
      where: { userId: session.user.id },
      select: { id: true, promotionPriceOverrides: true },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf profile not found' }, { status: 404 })
    }

    const [packages, history] = await Promise.all([
      loadPromotionPackages(lang),
      prisma.promotionRequest.findMany({
        where: { sarafId: saraf.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    const effectivePackages = packages.map((pkg) => {
      const overrides = parsePromotionOverrides((saraf as any).promotionPriceOverrides, pkg.type)
      const pricing = pkg.pricing.map((tier) => ({
        ...tier,
        baseAmount: tier.amount,
        amount: overrides[tier.duration] ?? tier.amount,
        overrideAmount: overrides[tier.duration] ?? null,
      }))
      return { ...pkg, pricing }
    })

    return NextResponse.json({ success: true, packages: effectivePackages, history })
  } catch (error) {
    console.error('Promotions fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch promotions' }, { status: 500 })
  }
}
