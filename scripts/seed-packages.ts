import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding package configurations...')

  const packages = [
    {
      type: 'PRO',
      name: 'پکیج حرفه‌ای',
      price: 99,
      credits: 50,
      maxBranches: 5,
      features: [
        'تا 5 شعبه',
        '50 کریدیت ماهانه',
        'گزارش روزانه/هفتگی/ماهانه',
        'چت داخلی بین شعب',
        'ثبت حواله نامحدود',
        'پشتیبانی ایمیل'
      ],
      isActive: true,
      displayOrder: 1,
      description: 'مناسب برای صرافی‌های کوچک و متوسط',
      highlightFeature: 'بهترین قیمت'
    },
    {
      type: 'PREMIUM',
      name: 'پکیج پریمیوم',
      price: 199,
      credits: 100,
      maxBranches: 20,
      features: [
        'تا 20 شعبه',
        '100 کریدیت ماهانه',
        'گزارش پیشرفته (سالانه)',
        'نمودار سود/زیان',
        'API دسترسی',
        'اولویت پشتیبانی',
        'تبلیغات رایگان',
        'آمار پیشرفته'
      ],
      isActive: true,
      displayOrder: 2,
      description: 'مناسب برای صرافی‌های بزرگ',
      highlightFeature: 'محبوب‌ترین'
    },
    {
      type: 'ENTERPRISE',
      name: 'پکیج سازمانی',
      price: 499,
      credits: 200,
      maxBranches: -1,
      features: [
        'شعبه نامحدود',
        '200 کریدیت ماهانه',
        'گزارش سفارشی',
        'API کامل',
        'پشتیبانی 24/7',
        'مدیر حساب اختصاصی',
        'تبلیغات ویژه',
        'آموزش رایگان کارکنان',
        'یکپارچه‌سازی سفارشی'
      ],
      isActive: true,
      displayOrder: 3,
      description: 'مناسب برای شبکه‌های بزرگ صرافی',
      highlightFeature: 'کامل‌ترین'
    }
  ]

  for (const pkg of packages) {
    await prisma.packageConfig.upsert({
      where: { type: pkg.type as any },
      update: pkg,
      create: pkg
    })
    console.log(`✅ Package ${pkg.name} seeded`)
  }

  console.log('🎉 Package configurations seeded successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
