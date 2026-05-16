import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // ============= COMMISSION SETTINGS =============
  console.log('📊 Seeding commission settings...')

  const hawalaSettings = [
    { type: 'HAWALA', minAmount: 0, maxAmount: 500, systemRate: 0.8, suggestedSarafRate: 1.5 },
    { type: 'HAWALA', minAmount: 501, maxAmount: 1000, systemRate: 0.6, suggestedSarafRate: 1.2 },
    { type: 'HAWALA', minAmount: 1001, maxAmount: 3000, systemRate: 0.4, suggestedSarafRate: 1.0 },
    { type: 'HAWALA', minAmount: 3001, maxAmount: 5000, systemRate: 0.3, suggestedSarafRate: 0.8 },
    { type: 'HAWALA', minAmount: 5001, maxAmount: 10000, systemRate: 0.2, suggestedSarafRate: 0.6 },
    { type: 'HAWALA', minAmount: 10001, maxAmount: null, systemRate: 0.15, suggestedSarafRate: 0.5 },
  ]

  const exchangeSettings = [
    { type: 'EXCHANGE', minAmount: 0, maxAmount: 500, systemRate: 0.5, suggestedSarafRate: 1.0 },
    { type: 'EXCHANGE', minAmount: 501, maxAmount: 1000, systemRate: 0.4, suggestedSarafRate: 0.8 },
    { type: 'EXCHANGE', minAmount: 1001, maxAmount: 3000, systemRate: 0.3, suggestedSarafRate: 0.6 },
    { type: 'EXCHANGE', minAmount: 3001, maxAmount: 5000, systemRate: 0.25, suggestedSarafRate: 0.5 },
    { type: 'EXCHANGE', minAmount: 5001, maxAmount: 10000, systemRate: 0.2, suggestedSarafRate: 0.4 },
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

  console.log('✅ Commission settings seeded')

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
      type: 'CREDIT_REJECTED',
      titleTemplate: 'درخواست کریدیت رد شد',
      messageTemplate: 'درخواست خرید {{amount}} کریدیت شما رد شد. دلیل: {{reason}}',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'SUBSCRIPTION_APPROVED',
      titleTemplate: 'پکیج تایید شد',
      messageTemplate: 'پکیج {{package}} شما فعال شد. انقضا: {{expiry}}',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'SUBSCRIPTION_EXPIRING',
      titleTemplate: 'انقضای اشتراک',
      messageTemplate: 'پکیج {{package}} شما {{days}} روز دیگر منقضی میشود.',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'SUBSCRIPTION_EXPIRED',
      titleTemplate: 'اشتراک منقضی شد',
      messageTemplate: 'پکیج {{package}} شما منقضی شد. برای تمدید اقدام کنید.',
      channels: ['IN_APP', 'EMAIL'],
    },
    {
      type: 'AD_APPROVED',
      titleTemplate: 'تبلیغ تایید شد',
      messageTemplate: 'تبلیغ شما در موقعیت {{position}} فعال شد. مدت: {{duration}} روز',
      channels: ['IN_APP'],
    },
    {
      type: 'AD_REJECTED',
      titleTemplate: 'تبلیغ رد شد',
      messageTemplate: 'تبلیغ شما رد شد. دلیل: {{reason}}',
      channels: ['IN_APP'],
    },
    {
      type: 'NEW_MESSAGE',
      titleTemplate: 'پیام جدید',
      messageTemplate: 'پیام جدید از {{sender}}: {{preview}}',
      channels: ['IN_APP'],
    },
  ]

  for (const template of templates) {
    await prisma.notificationTemplate.upsert({
      where: { type: template.type },
      update: template,
      create: template,
    })
  }

  console.log('✅ Notification templates seeded')

  console.log('🎉 Seed completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
