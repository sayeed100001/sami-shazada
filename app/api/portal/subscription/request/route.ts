import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type AvailablePackage = {
  type: 'PRO' | 'PREMIUM' | 'ENTERPRISE'
  name: string
  price: number
  features: string[]
  highlightFeature?: string | null
  description?: string | null
}

function resolveSarafPriceOverride(overrideMap: unknown, packageType: AvailablePackage['type']): number | null {
  if (!overrideMap || typeof overrideMap !== 'object') return null
  const record = overrideMap as Record<string, unknown>
  const raw = record[packageType]
  const parsed = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
  if (!Number.isFinite(parsed)) return null
  const rounded = Math.trunc(parsed)
  return rounded >= 0 ? rounded : null
}

const DEFAULT_PACKAGES: AvailablePackage[] = [
  {
    type: 'PRO',
    name: 'پرو',
    price: 50,
    features: ['5 شعبه', 'گزارشات پایه', 'پشتیبانی ایمیل'],
    highlightFeature: null,
    description: null,
  },
  {
    type: 'PREMIUM',
    name: 'پریمیوم',
    price: 100,
    features: ['15 شعبه', 'گزارشات پیشرفته', 'پشتیبانی 24/7', 'API دسترسی'],
    highlightFeature: 'محبوب‌ترین',
    description: null,
  },
  {
    type: 'ENTERPRISE',
    name: 'سازمانی',
    price: 200,
    features: ['شعب نامحدود', 'گزارشات سفارشی', 'مدیر اختصاصی', 'اولویت پشتیبانی'],
    highlightFeature: null,
    description: null,
  },
]

async function loadAvailablePackages(): Promise<AvailablePackage[]> {
  const packageConfigs = await prisma.packageConfig.findMany({
    where: {
      isActive: true,
      type: { in: ['PRO', 'PREMIUM', 'ENTERPRISE'] },
    },
    orderBy: [{ displayOrder: 'asc' }, { type: 'asc' }],
  })

  if (packageConfigs.length === 0) {
    return DEFAULT_PACKAGES
  }

  return packageConfigs.map((packageConfig) => ({
    type: packageConfig.type as AvailablePackage['type'],
    name: packageConfig.name,
    price: packageConfig.price,
    features: Array.isArray(packageConfig.features)
      ? packageConfig.features.filter((feature): feature is string => typeof feature === 'string')
      : [],
    highlightFeature: packageConfig.highlightFeature,
    description: packageConfig.description,
  }))
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { userId: session.user.id },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const body = await request.json()
    const packageType = typeof body.packageType === 'string' ? body.packageType : ''
    const availablePackages = await loadAvailablePackages()
    const selectedPackage = availablePackages.find((pkg) => pkg.type === packageType)

    if (!selectedPackage) {
      return NextResponse.json({ error: 'Invalid package type' }, { status: 400 })
    }

    const overridePrice = resolveSarafPriceOverride(
      (saraf as any).subscriptionPriceOverrides,
      selectedPackage.type
    )
    const effectivePrice = overridePrice ?? selectedPackage.price
    const needsTopUp = saraf.creditBalance < effectivePrice

    const existingRequest = await prisma.subscription.findFirst({
      where: {
        sarafId: saraf.id,
        status: 'PENDING',
      },
    })

    if (existingRequest) {
      return NextResponse.json(
        { error: 'You already have a pending subscription request' },
        { status: 400 }
      )
    }

    const subscription = await prisma.subscription.create({
      data: {
        sarafId: saraf.id,
        packageType: selectedPackage.type,
        price: effectivePrice,
        status: 'PENDING',
      },
    })

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'درخواست پکیج جدید',
          message: `${saraf.businessName} درخواست پکیج ${selectedPackage.type} داده است.`,
          type: 'info',
          action: 'SUBSCRIPTION_REQUESTED',
          resource: 'SUBSCRIPTION',
          resourceId: subscription.id,
        },
      })
    }

    return NextResponse.json({
      success: true,
      needsTopUp,
      requiredCredits: effectivePrice,
      currentCredits: saraf.creditBalance,
      subscription: {
        id: subscription.id,
        packageType: selectedPackage.type,
        price: effectivePrice,
        features: selectedPackage.features,
        status: subscription.status,
        basePrice: selectedPackage.price,
        overridePrice,
      },
    })
  } catch (error) {
    console.error('Subscription request error:', error)
    return NextResponse.json(
      { error: 'Failed to create subscription request' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { userId: session.user.id },
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const [subscriptions, availablePackages] = await Promise.all([
      prisma.subscription.findMany({
        where: { sarafId: saraf.id },
        orderBy: { requestedAt: 'desc' },
      }),
      loadAvailablePackages(),
    ])

    const packagesWithOverrides = availablePackages.map((pkg) => {
      const basePrice = pkg.price
      const overridePrice = resolveSarafPriceOverride((saraf as any).subscriptionPriceOverrides, pkg.type)
      const effectivePrice = overridePrice ?? basePrice
      return {
        ...pkg,
        price: effectivePrice,
        basePrice,
        overridePrice,
      }
    })

    return NextResponse.json({
      current: {
        type: saraf.subscriptionType,
        expiry: saraf.subscriptionExpiry,
      },
      packages: packagesWithOverrides,
      history: subscriptions,
    })
  } catch (error) {
    console.error('Subscription fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch subscriptions' },
      { status: 500 }
    )
  }
}
