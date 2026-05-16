import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedHomePageContent() {
  console.log('🏠 Seeding home page content...')

  // Check if HomePageContent model exists
  if (!prisma.homePageContent) {
    console.error('❌ HomePageContent model not found in Prisma Client')
    console.log('Please run: npx prisma generate')
    process.exit(1)
  }

  // Hero Section (Persian)
  await prisma.homePageContent.upsert({
    where: {
      section_order_language: {
        section: 'HERO',
        order: 0,
        language: 'fa'
      }
    },
    update: {},
    create: {
      section: 'HERO',
      title: 'سرای شهزاده',
      subtitle: 'پلتفرم جامع مالی افغانستان',
      description: 'نرخ ارز لحظهای • حواله سریع • صرافی معتبر',
      order: 0,
      language: 'fa',
      isActive: true
    }
  })

  // Feature Cards (Persian)
  const featureCards = [
    {
      title: 'پیگیری حواله',
      description: 'پیگیری وضعیت حواله با کد رهگیری',
      icon: '📍',
      linkUrl: '/track',
      linkText: 'پیگیری حواله',
      order: 0
    },
    {
      title: 'ماشین حساب ارز',
      description: 'تبدیل ارز و محاسبه نرخها',
      icon: '💱',
      linkUrl: '/calculator',
      linkText: 'ماشین حساب ارز',
      order: 1
    },
    {
      title: 'صرافان',
      description: 'مشاهده صرافان معتبر و نرخها',
      icon: '🏢',
      linkUrl: '/sarafs',
      linkText: 'صرافان',
      order: 2
    },
    {
      title: 'آموزش',
      description: 'راهنمای استفاده و مفاهیم مالی',
      icon: '📚',
      linkUrl: '/education',
      linkText: 'آموزش',
      order: 3
    },
    {
      title: 'اپلیکیشن موبایل',
      description: 'دانلود اپ موبایل سرای شهزاده',
      icon: '📱',
      linkUrl: '#',
      linkText: 'اپلیکیشن موبایل',
      order: 4
    },
    {
      title: 'نمودارها',
      description: 'مشاهده روند قیمتها و تحلیل بازار',
      icon: '📊',
      linkUrl: '/charts',
      linkText: 'نمودارها',
      order: 5
    }
  ]

  for (const card of featureCards) {
    await prisma.homePageContent.upsert({
      where: {
        section_order_language: {
          section: 'FEATURE_CARD',
          order: card.order,
          language: 'fa'
        }
      },
      update: {},
      create: {
        section: 'FEATURE_CARD',
        title: card.title,
        description: card.description,
        icon: card.icon,
        linkUrl: card.linkUrl,
        linkText: card.linkText,
        order: card.order,
        language: 'fa',
        isActive: true
      }
    })
  }

  // Stat Cards (Persian)
  const statCards = [
    {
      title: 'کاربر فعال',
      value: '10K+',
      icon: '👥',
      order: 0
    },
    {
      title: 'صراف معتبر',
      value: '50+',
      icon: '🏛️',
      order: 1
    },
    {
      title: 'پشتیبانی آنلاین',
      value: '24/7',
      icon: '💬',
      order: 2
    },
    {
      title: 'امنیت تضمین شده',
      value: '100%',
      icon: '🔒',
      order: 3
    }
  ]

  for (const stat of statCards) {
    await prisma.homePageContent.upsert({
      where: {
        section_order_language: {
          section: 'STAT_CARD',
          order: stat.order,
          language: 'fa'
        }
      },
      update: {},
      create: {
        section: 'STAT_CARD',
        title: stat.title,
        value: stat.value,
        icon: stat.icon,
        order: stat.order,
        language: 'fa',
        isActive: true
      }
    })
  }

  console.log('✅ Home page content seeded successfully!')
}

async function main() {
  try {
    await seedHomePageContent()
  } catch (error) {
    console.error('❌ Error seeding home page content:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
