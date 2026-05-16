import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type PromotionType = 'PREMIUM' | 'FEATURED'

const DEFAULTS: Record<PromotionType, any> = {
  PREMIUM: {
    type: 'PREMIUM',
    name: 'Premium Account',
    description: 'Upgrade to premium with special features',
    nameI18n: { fa: 'حساب پریمیوم', en: 'Premium Account', ps: 'پریمیوم حساب' },
    descriptionI18n: {
      fa: 'ارتقاء به حساب پریمیوم با امکانات ویژه',
      en: 'Upgrade to premium with special features',
      ps: 'د ځانګړو امکاناتو سره پریمیوم ته ارتقاء',
    },
    features: [],
    effects: { directoryWeight: 200, maxRatePairs: 50, prioritySupport: true, detailedReports: true },
    featuresI18n: {
      fa: [
        'نمایش در بالای لیست صرافان',
        'نشان پریمیوم طلایی',
        'اولویت در نتایج جستجو',
        'امکان ثبت نرخهای بیشتر',
        'پشتیبانی اولویتدار',
        'آمار تفصیلی تراکنشها',
      ],
      en: [
        'Top placement in saraf directory',
        'Golden premium badge',
        'Priority in search results',
        'More rate slots',
        'Priority support',
        'Detailed transaction stats',
      ],
      ps: ['د صرافانو لست کې په سر کې نمایش', 'طلایي پریمیوم نښه', 'په لټون کې اولویت', 'د نرخونو زیات ثبت', 'اولویتي پشتیباني', 'تفصیلي د تراکنش آمار'],
    },
    pricing: [
      { duration: 30, amount: 5000 },
      { duration: 90, amount: 13500 },
      { duration: 180, amount: 24000 },
      { duration: 365, amount: 42000 },
    ],
    isActive: true,
    displayOrder: 10,
  },
  FEATURED: {
    type: 'FEATURED',
    name: 'Featured Listing',
    description: 'Special display on the home page',
    nameI18n: { fa: 'نمایش ویژه', en: 'Featured Listing', ps: 'ځانګړی نمایش' },
    descriptionI18n: { fa: 'نمایش ویژه در صفحه اصلی', en: 'Special display on the home page', ps: 'په اصلي پاڼه کې ځانګړی نمایش' },
    features: [],
    effects: { directoryWeight: 120 },
    featuresI18n: {
      fa: ['نمایش در بخش صرافان ویژه', 'نشان ستاره آبی', 'نمایش در اسلایدر اصلی', 'بازدید بیشتر از پروفایل'],
      en: ['Shown in featured sarafs section', 'Blue star badge', 'Appears in main slider', 'More profile views'],
      ps: ['د ځانګړو صرافانو برخه کې نمایش', 'آبي ستوري نښه', 'په اصلي سلایډر کې نمایش', 'د پروفایل زیات بازدید'],
    },
    pricing: [
      { duration: 7, amount: 1500 },
      { duration: 15, amount: 2800 },
      { duration: 30, amount: 5000 },
    ],
    isActive: true,
    displayOrder: 20,
  },
}

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saved = await prisma.$transaction(async (tx) => {
      const out: any[] = []
      for (const type of ['PREMIUM', 'FEATURED'] as const) {
        const payload = DEFAULTS[type]
        const existing = await tx.promotionConfig.findUnique({ where: { type } })
        const config = existing
          ? await tx.promotionConfig.update({
              where: { type },
              data: payload,
            })
          : await tx.promotionConfig.create({
              data: payload,
            })
        out.push(config)
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'PROMOTION_CONFIGS_SEEDED',
          resource: 'PROMOTION_CONFIG',
          resourceId: 'seed',
          details: JSON.stringify({ types: ['PREMIUM', 'FEATURED'] }),
        },
      })

      return out
    })

    return NextResponse.json({ success: true, configs: saved })
  } catch (error) {
    console.error('Promotion configs seed error:', error)
    return NextResponse.json({ error: 'Failed to seed promotion configs' }, { status: 500 })
  }
}
