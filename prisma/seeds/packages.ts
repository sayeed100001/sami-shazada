import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedPackages() {
  console.log('🌱 Seeding package configurations...');

  const packages = [
    {
      type: 'PRO',
      name: 'پکیج حرفهای',
      price: 99,
      credits: 50,
      maxBranches: 5,
      features: [
        'تا 5 شعبه',
        'گزارش روزانه و هفتگی',
        'چت داخلی',
        'ثبت حواله نامحدود',
        'تبدیل ارز نامحدود',
        'داشبورد آماری',
        'پشتیبانی استاندارد',
      ],
      isActive: true,
      displayOrder: 1,
      description: 'مناسب برای صرافیهای کوچک و متوسط',
      highlightFeature: 'تا 5 شعبه',
    },
    {
      type: 'PREMIUM',
      name: 'پکیج پریمیوم',
      price: 199,
      credits: 100,
      maxBranches: 20,
      features: [
        'تا 20 شعبه',
        'گزارش پیشرفته (سالانه)',
        'نمودار سود/زیان',
        'API دسترسی',
        'اولویت پشتیبانی',
        'تحلیل هوشمند',
        'یک کد تخفیف ماهانه',
      ],
      isActive: true,
      displayOrder: 2,
      description: 'مناسب برای صرافیهای بزرگ',
      highlightFeature: 'API دسترسی',
    },
    {
      type: 'ENTERPRISE',
      name: 'پکیج سازمانی',
      price: 499,
      credits: 200,
      maxBranches: -1, // Unlimited
      features: [
        'شعبه نامحدود',
        'گزارش سفارشی',
        'تحلیل هوشمند پیشرفته',
        'API کامل',
        'پشتیبانی اختصاصی 24/7',
        'مدیریت تیم',
        'کد تخفیف نامحدود',
        'مشاور اختصاصی',
      ],
      isActive: true,
      displayOrder: 3,
      description: 'مناسب برای شبکههای بزرگ صرافی',
      highlightFeature: 'شعبه نامحدود + پشتیبانی 24/7',
    },
  ];

  for (const pkg of packages) {
    await prisma.packageConfig.upsert({
      where: { type: pkg.type as any },
      update: pkg,
      create: pkg as any,
    });
    console.log(`✅ Package ${pkg.name} created/updated`);
  }

  console.log('✅ Package configurations seeded successfully!');
}

async function seedCommissionSettings() {
  console.log('🌱 Seeding commission settings...');

  const commissionSettings = [
    // HAWALA Commission Rates
    { type: 'HAWALA', minAmount: 0, maxAmount: 500, systemRate: 0.8, suggestedSarafRate: 1.0 },
    { type: 'HAWALA', minAmount: 501, maxAmount: 1000, systemRate: 0.7, suggestedSarafRate: 0.9 },
    { type: 'HAWALA', minAmount: 1001, maxAmount: 2500, systemRate: 0.6, suggestedSarafRate: 0.8 },
    { type: 'HAWALA', minAmount: 2501, maxAmount: 5000, systemRate: 0.5, suggestedSarafRate: 0.7 },
    { type: 'HAWALA', minAmount: 5001, maxAmount: 10000, systemRate: 0.4, suggestedSarafRate: 0.6 },
    { type: 'HAWALA', minAmount: 10001, maxAmount: null, systemRate: 0.3, suggestedSarafRate: 0.5 },
    
    // EXCHANGE Commission Rates
    { type: 'EXCHANGE', minAmount: 0, maxAmount: 500, systemRate: 0.5, suggestedSarafRate: 0.7 },
    { type: 'EXCHANGE', minAmount: 501, maxAmount: 1000, systemRate: 0.45, suggestedSarafRate: 0.65 },
    { type: 'EXCHANGE', minAmount: 1001, maxAmount: 2500, systemRate: 0.4, suggestedSarafRate: 0.6 },
    { type: 'EXCHANGE', minAmount: 2501, maxAmount: 5000, systemRate: 0.35, suggestedSarafRate: 0.55 },
    { type: 'EXCHANGE', minAmount: 5001, maxAmount: 10000, systemRate: 0.25, suggestedSarafRate: 0.45 },
    { type: 'EXCHANGE', minAmount: 10001, maxAmount: null, systemRate: 0.15, suggestedSarafRate: 0.35 },
  ];

  for (const setting of commissionSettings) {
    await prisma.commissionSetting.upsert({
      where: {
        type_minAmount: {
          type: setting.type,
          minAmount: setting.minAmount,
        },
      },
      update: setting,
      create: setting,
    });
  }

  console.log('✅ Commission settings seeded successfully!');
}

async function main() {
  try {
    await seedPackages();
    await seedCommissionSettings();
    console.log('🎉 All seeds completed successfully!');
  } catch (error) {
    console.error('❌ Seeding error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
