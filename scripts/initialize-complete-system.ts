import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Initializing complete system...\n')
  const isProduction = process.env.NODE_ENV === 'production'
  const initAdminEmail = process.env.INIT_ADMIN_EMAIL?.trim()
  const initAdminPassword = process.env.INIT_ADMIN_PASSWORD
  const seedTestAccounts = !isProduction && process.env.SEED_TEST_ACCOUNTS !== 'false'

  // ============= COMMISSION SETTINGS =============
  console.log('📊 Seeding commission settings...')

  const hawalaSettings = [
    { type: 'HAWALA', minAmount: 0, maxAmount: 500, systemRate: 0.8, suggestedSarafRate: 1.5 },
    { type: 'HAWALA', minAmount: 501, maxAmount: 1000, systemRate: 0.7, suggestedSarafRate: 1.2 },
    { type: 'HAWALA', minAmount: 1001, maxAmount: 2500, systemRate: 0.6, suggestedSarafRate: 1.0 },
    { type: 'HAWALA', minAmount: 2501, maxAmount: 5000, systemRate: 0.5, suggestedSarafRate: 0.8 },
    { type: 'HAWALA', minAmount: 5001, maxAmount: 10000, systemRate: 0.4, suggestedSarafRate: 0.6 },
    { type: 'HAWALA', minAmount: 10001, maxAmount: null, systemRate: 0.3, suggestedSarafRate: 0.5 },
  ]

  const exchangeSettings = [
    { type: 'EXCHANGE', minAmount: 0, maxAmount: 500, systemRate: 0.5, suggestedSarafRate: 1.0 },
    { type: 'EXCHANGE', minAmount: 501, maxAmount: 1000, systemRate: 0.45, suggestedSarafRate: 0.8 },
    { type: 'EXCHANGE', minAmount: 1001, maxAmount: 2500, systemRate: 0.4, suggestedSarafRate: 0.6 },
    { type: 'EXCHANGE', minAmount: 2501, maxAmount: 5000, systemRate: 0.35, suggestedSarafRate: 0.5 },
    { type: 'EXCHANGE', minAmount: 5001, maxAmount: 10000, systemRate: 0.25, suggestedSarafRate: 0.4 },
    { type: 'EXCHANGE', minAmount: 10001, maxAmount: null, systemRate: 0.15, suggestedSarafRate: 0.3 },
  ]

  for (const setting of [...hawalaSettings, ...exchangeSettings]) {
    await prisma.commissionSetting.upsert({
      where: {
        type_minAmount: {
          type: setting.type,
          minAmount: setting.minAmount,
        },
      },
      update: setting,
      create: setting,
    })
  }

  console.log('✅ Commission settings seeded (12 tiers)\n')

  // ============= PACKAGE CONFIGURATIONS =============
  console.log('📦 Seeding package configurations...')

  const packages = [
    {
      type: 'PRO',
      name: 'پکیج حرفهای',
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
      description: 'مناسب برای صرافیهای کوچک و متوسط',
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
      description: 'مناسب برای صرافیهای بزرگ',
      highlightFeature: 'محبوبترین'
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
        'یکپارچهسازی سفارشی'
      ],
      isActive: true,
      displayOrder: 3,
      description: 'مناسب برای شبکههای بزرگ صرافی',
      highlightFeature: 'کاملترین'
    }
  ]

  for (const pkg of packages) {
    await prisma.packageConfig.upsert({
      where: { type: pkg.type as any },
      update: {
        ...pkg,
        features: pkg.features
      },
      create: {
        ...pkg,
        features: pkg.features
      }
    })
  }

  console.log('✅ Package configurations seeded (3 packages)\n')

  // ============= ADMIN USER =============
  console.log('👤 Ensuring admin user...')

  if (isProduction) {
    if (initAdminEmail && initAdminPassword) {
      const adminPasswordHashed = await bcrypt.hash(initAdminPassword, 12)

      await prisma.user.upsert({
        where: { email: initAdminEmail },
        update: {
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          isEmailVerified: true
        },
        create: {
          email: initAdminEmail,
          password: adminPasswordHashed,
          name: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
          isVerified: true,
          isEmailVerified: true
        }
      })

      console.log(`✅ Admin user ensured: ${initAdminEmail}\n`)
    } else {
      console.log('ℹ️ Skipped admin seeding in production (set INIT_ADMIN_EMAIL and INIT_ADMIN_PASSWORD to create one).\n')
    }
  } else {
    const emailToSeed = initAdminEmail || 'admin@saray.af'
    const passwordToSeed = initAdminPassword || 'Admin@123456'
    const adminPasswordHashed = await bcrypt.hash(passwordToSeed, 12)

    await prisma.user.upsert({
      where: { email: emailToSeed },
      update: {
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        isEmailVerified: true
      },
      create: {
        email: emailToSeed,
        password: adminPasswordHashed,
        name: 'System Administrator',
        role: 'ADMIN',
        isActive: true,
        isVerified: true,
        isEmailVerified: true
      }
    })

    console.log(`✅ Admin user ensured: ${emailToSeed}\n`)
  }

  if (seedTestAccounts) {
    // ============= TEST SARAF =============
    console.log('🏪 Creating test saraf...')

    const sarafPassword = await bcrypt.hash('Saraf@123456', 12)

    const sarafUser = await prisma.user.upsert({
      where: { email: 'saraf@test.af' },
      update: {},
      create: {
        email: 'saraf@test.af',
        password: sarafPassword,
        name: 'Test Saraf',
        phone: '+93700000001',
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    const now = new Date()
    const freeTrialEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const saraf = await prisma.saraf.upsert({
      where: { userId: sarafUser.id },
      update: {},
      create: {
        userId: sarafUser.id,
        businessName: 'صرافی تست',
        businessAddress: 'کابل، افغانستان',
        businessPhone: '+93700000001',
        status: 'APPROVED',
        isActive: true,
        creditBalance: 100,
        isOnFreeTrial: true,
        freeTrialStartDate: now,
        freeTrialEndDate: freeTrialEnd
      }
    })

    // Create a test branch if none exists for this saraf
    const existingBranch = await prisma.sarafBranch.findFirst({
      where: { sarafId: saraf.id }
    })

    if (!existingBranch) {
      await prisma.sarafBranch.create({
        data: {
          sarafId: saraf.id,
          name: 'شعبه مرکزی',
          address: 'کابل، شهر نو',
          city: 'Kabul',
          country: 'Afghanistan',
          phone: '+93700000001',
          isActive: true
        }
      })
    }

    console.log('✅ Test saraf ensured (non-production only)\n')

    // ============= TEST USER =============
    console.log('👥 Creating test user...')

    const userPassword = await bcrypt.hash('User@123456', 12)

    await prisma.user.upsert({
      where: { email: 'user@test.af' },
      update: {},
      create: {
        email: 'user@test.af',
        password: userPassword,
        name: 'Test User',
        phone: '+93700000002',
        role: 'USER',
        isActive: true,
        isVerified: true,
        vipLevel: 'BRONZE',
        totalTransactions: 10
      }
    })

    console.log('✅ Test user ensured (non-production only)\n')
  } else {
    console.log('ℹ️ Skipped test account seeding (production)\n')
  }

  // ============= NOTIFICATION TEMPLATES =============
  console.log('📧 Seeding notification templates...')

  const templates = [
    {
      type: 'LOW_CREDIT',
      titleTemplate: 'کریدیت کم است',
      messageTemplate: 'موجودی کریدیت شما به {{balance}} رسیده است. لطفا کریدیت خریداری کنید.',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'HAWALA_RECEIVED',
      titleTemplate: 'حواله جدید دریافتی',
      messageTemplate: 'حواله جدید با کد {{code}} از شعبه {{branch}} دریافت شد. مبلغ: {{amount}} {{currency}}',
      channels: ['IN_APP', 'SMS', 'WHATSAPP'],
    },
    {
      type: 'HAWALA_PAID',
      titleTemplate: 'حواله پرداخت شد',
      messageTemplate: 'حواله {{code}} توسط شعبه {{branch}} پرداخت شد.',
      channels: ['IN_APP', 'SMS'],
    },
    {
      type: 'CREDIT_APPROVED',
      titleTemplate: 'درخواست کریدیت تایید شد',
      messageTemplate: '{{amount}} کریدیت به حساب شما اضافه شد. موجودی جدید: {{balance}}',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'SUBSCRIPTION_APPROVED',
      titleTemplate: 'پکیج تایید شد',
      messageTemplate: 'پکیج {{package}} شما فعال شد. انقضا: {{expiry}}',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'VIP_UPGRADE',
      titleTemplate: 'ارتقا سطح VIP',
      messageTemplate: 'تبریک! شما به سطح {{level}} ارتقا یافتید و از {{discount}}% تخفیف برخوردار هستید',
      channels: ['IN_APP', 'EMAIL'],
    },
  ]

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { type: template.type },
      update: template,
      create: template,
    })
  }

  console.log('✅ Notification templates seeded\n')

  // ============= SYSTEM CONFIG =============
  console.log('⚙️  Setting system configurations...')

  const configs = [
    { key: 'SYSTEM_NAME', value: 'سرای شهزاده', description: 'نام سیستم' },
    { key: 'SYSTEM_VERSION', value: '2.0.0', description: 'نسخه سیستم' },
    { key: 'FREE_TRIAL_DAYS', value: '90', description: 'تعداد روزهای دوره رایگان پیشفرض' },
    { key: 'MIN_CREDIT_WARNING', value: '10', description: 'حداقل کریدیت برای هشدار' },
    { key: 'MAX_BRANCHES_FREE', value: '1', description: 'حداکثر شعبه در دوره رایگان' },
    { key: 'VIP_BRONZE_MIN', value: '10', description: 'حداقل تراکنش برای برنزی' },
    { key: 'VIP_SILVER_MIN', value: '50', description: 'حداقل تراکنش برای نقرهای' },
    { key: 'VIP_GOLD_MIN', value: '100', description: 'حداقل تراکنش برای طلایی' },
    { key: 'VIP_PLATINUM_MIN', value: '500', description: 'حداقل تراکنش برای پلاتینیوم' },
    { key: 'MAX_TRANSACTION_AMOUNT', value: '1000000', description: 'حداکثر مبلغ تراکنش (دلار)' },
    { key: 'MAINTENANCE_MODE', value: 'false', description: 'حالت تعمیر سیستم' },
    { key: 'THEME_PRIMARY_COLOR', value: '#6366f1', description: 'رنگ اصلی سیستم' },
    { key: 'THEME_SECONDARY_COLOR', value: '#8b5cf6', description: 'رنگ ثانویه سیستم' },
    { key: 'THEME_ACCENT_COLOR', value: '#ec4899', description: 'رنگ تاکیدی سیستم' },
    { key: 'THEME_BACKGROUND_COLOR', value: '#ffffff', description: 'رنگ پسزمینه' },
    { key: 'THEME_TEXT_COLOR', value: '#1f2937', description: 'رنگ متن' },
    { key: 'THEME_FONT_PRIMARY', value: 'Helvetica', description: 'فونت اصلی' },
    { key: 'THEME_FONT_HEADINGS', value: 'Helvetica', description: 'فونت عناوین' },
    { key: 'THEME_LOGO_MAIN', value: '/logo.png', description: 'لوگوی اصلی' },
    { key: 'THEME_LOGO_FAVICON', value: '/favicon.ico', description: 'Favicon' },
    { key: 'THEME_LOGO_DARK', value: '/logo-dark.png', description: 'لوگوی Dark Mode' },
    { key: 'THEME_SIDEBAR_POSITION', value: 'right', description: 'موقعیت Sidebar (right/left)' },
    { key: 'THEME_HEADER_STYLE', value: 'fixed', description: 'نوع Header (fixed/static)' },
    { key: 'THEME_BORDER_RADIUS', value: '8', description: 'شعاع گوشهها (px)' },
    { key: 'THEME_SPACING', value: '16', description: 'فاصلهگذاری (px)' },
    { key: 'SITE_NAME', value: 'سرای شهزاده', description: 'نام سایت' },
    { key: 'SITE_DESCRIPTION', value: 'پلتفورم جامع مالی افغانستان', description: 'توضیحات سایت' },
    { key: 'CONTACT_EMAIL', value: 'info@saray.af', description: 'ایمیل تماس' },
    { key: 'CONTACT_PHONE', value: '+93700000000', description: 'شماره تماس' }
  ]

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value, description: config.description },
      create: config
    })
  }

  console.log('✅ System configurations set\n')

  console.log('🎉 System initialization completed successfully!\n')
  if (seedTestAccounts) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('📝 SEEDED TEST CREDENTIALS (NON-PRODUCTION):')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    console.log('👑 ADMIN:')
    console.log(`   Email: ${initAdminEmail || 'admin@saray.af'}`)
    console.log('   Password: Admin@123456 (default unless INIT_ADMIN_PASSWORD was set)')
    console.log('')
    console.log('🏪 SARAF:')
    console.log('   Email: saraf@test.af')
    console.log('   Password: Saraf@123456')
    console.log('')
    console.log('👤 USER:')
    console.log('   Email: user@test.af')
    console.log('   Password: User@123456')
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n')
  } else if (isProduction) {
    console.log('ℹ️ Production mode: no default credentials were created.')
    console.log('ℹ️ To create an admin, re-run with INIT_ADMIN_EMAIL and INIT_ADMIN_PASSWORD.\n')
  }
}

main()
  .catch((e) => {
    console.error('❌ Initialization failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
