import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

const DEFAULTS = [
  {
    type: 'PREMIUM',
    name: 'حساب پریمیوم',
    description: 'ارتقاء به حساب پریمیوم با امکانات ویژه',
    features: [
      'نمایش در بالای لیست صرافان',
      'نشان پریمیوم طلایی',
      'اولویت در نتایج جستجو',
      'امکان ثبت نرخهای بیشتر',
      'پشتیبانی اولویتدار',
      'آمار تفصیلی تراکنشها',
    ],
    pricing: [
      { duration: 30, amount: 5000 },
      { duration: 90, amount: 13500 },
      { duration: 180, amount: 24000 },
      { duration: 365, amount: 42000 },
    ],
    effects: { directoryWeight: 200, maxRatePairs: 50, prioritySupport: true, detailedReports: true },
    displayOrder: 10,
  },
  {
    type: 'FEATURED',
    name: 'نمایش ویژه',
    description: 'نمایش ویژه در صفحه اصلی',
    features: ['نمایش در بخش صرافان ویژه', 'نشان ستاره آبی', 'نمایش در اسلایدر اصلی', 'بازدید بیشتر از پروفایل'],
    pricing: [
      { duration: 7, amount: 1500 },
      { duration: 15, amount: 2800 },
      { duration: 30, amount: 5000 },
    ],
    effects: { directoryWeight: 120 },
    displayOrder: 20,
  },
] as const

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const created = await prisma.$transaction(async (tx) => {
      const results: any[] = []
      for (const item of DEFAULTS) {
        const exists = await tx.promotionConfig.findUnique({ where: { type: item.type } })
        if (exists) {
          results.push(exists)
          continue
        }
        const cfg = await tx.promotionConfig.create({
          data: {
            type: item.type,
            name: item.name,
            description: item.description,
            features: item.features as any,
            pricing: item.pricing as any,
            effects: (item as any).effects,
            isActive: true,
            displayOrder: item.displayOrder,
          },
        })
        results.push(cfg)
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PROMOTION_CONFIG_SEEDED',
          resource: 'PROMOTION_CONFIG',
          resourceId: 'seed-defaults',
          details: JSON.stringify({ created: results.map((r) => r.type) }),
        },
      })

      return results
    })

    return NextResponse.json({ success: true, configs: created })
  } catch (error) {
    console.error('Seed promotion defaults error:', error)
    return NextResponse.json({ error: 'Failed to seed defaults' }, { status: 500 })
  }
}
