import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { sampleCourses, sampleTechNews } from './seedEducation'

const prisma = new PrismaClient()

async function initializeSystem() {
  console.log('🚀 Initializing Complete System...')

  try {
    // 1. Create Admin User
    console.log('👤 Creating admin user...')
    const adminPassword = await bcrypt.hash('admin123', 12)
    
    const admin = await prisma.user.upsert({
      where: { email: 'admin@sarayshahzada.com' },
      update: {},
      create: {
        email: 'admin@sarayshahzada.com',
        password: adminPassword,
        name: 'مدیر سیستم',
        role: 'ADMIN',
        isActive: true,
        isVerified: true
      }
    })
    console.log('✅ Admin user created')

    // 2. Create Sample Sarafs
    console.log('🏢 Creating sample sarafs...')
    const sarafUsers = [
      {
        email: 'saraf1@example.com',
        name: 'صرافی شاه زاده',
        businessName: 'صرافی شاه زاده کابل',
        businessAddress: 'شهر نو، کابل، افغانستان',
        businessPhone: '+93701234567',
        city: 'کابل'
      },
      {
        email: 'saraf2@example.com',
        name: 'صرافی هرات',
        businessName: 'صرافی مرکزی هرات',
        businessAddress: 'مرکز شهر هرات، افغانستان',
        businessPhone: '+93702345678',
        city: 'هرات'
      },
      {
        email: 'saraf3@example.com',
        name: 'صرافی مزار',
        businessName: 'صرافی بلخ مزار شریف',
        businessAddress: 'مرکز شهر مزار شریف، افغانستان',
        businessPhone: '+93703456789',
        city: 'مزار شریف'
      }
    ]

    for (const sarafData of sarafUsers) {
      const password = await bcrypt.hash('saraf123', 12)
      
      const user = await prisma.user.upsert({
        where: { email: sarafData.email },
        update: {},
        create: {
          email: sarafData.email,
          password: password,
          name: sarafData.name,
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      })

      const saraf = await prisma.saraf.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          businessName: sarafData.businessName,
          businessAddress: sarafData.businessAddress,
          businessPhone: sarafData.businessPhone,
          status: 'APPROVED',
          isActive: true,
          rating: 4.5 + Math.random() * 0.5,
          totalTransactions: Math.floor(Math.random() * 1000) + 100
        }
      })

      // Create sample rates for each saraf
      const currencies = [
        { from: 'USD', to: 'AFN', buy: 70, sell: 72 },
        { from: 'EUR', to: 'AFN', buy: 75, sell: 77 },
        { from: 'PKR', to: 'AFN', buy: 0.25, sell: 0.27 },
        { from: 'IRR', to: 'AFN', buy: 0.0017, sell: 0.0019 }
      ]

      for (const currency of currencies) {
        await prisma.rate.upsert({
          where: {
            sarafId_fromCurrency_toCurrency: {
              sarafId: saraf.id,
              fromCurrency: currency.from,
              toCurrency: currency.to
            }
          },
          update: {
            buyRate: currency.buy + (Math.random() - 0.5) * 2,
            sellRate: currency.sell + (Math.random() - 0.5) * 2
          },
          create: {
            sarafId: saraf.id,
            fromCurrency: currency.from,
            toCurrency: currency.to,
            buyRate: currency.buy + (Math.random() - 0.5) * 2,
            sellRate: currency.sell + (Math.random() - 0.5) * 2,
            isActive: true
          }
        })
      }

      console.log(`✅ Created saraf: ${sarafData.businessName}`)
    }

    // 3. Create Sample Users
    console.log('👥 Creating sample users...')
    for (let i = 1; i <= 10; i++) {
      const password = await bcrypt.hash('user123', 12)
      
      await prisma.user.upsert({
        where: { email: `user${i}@example.com` },
        update: {},
        create: {
          email: `user${i}@example.com`,
          password: password,
          name: `کاربر ${i}`,
          role: 'USER',
          isActive: true,
          isVerified: true
        }
      })
    }
    console.log('✅ Sample users created')

    // 4. Populate Education System
    console.log('📚 Populating education system...')
    
    // Clear existing courses and news
    await prisma.userLessonProgress.deleteMany()
    await prisma.userCourseEnrollment.deleteMany()
    await prisma.educationLesson.deleteMany()
    await prisma.educationCourse.deleteMany()
    await prisma.techNews.deleteMany()

    // Create courses from sample data
    for (const courseData of sampleCourses) {
      const course = await prisma.educationCourse.create({
        data: {
          title: courseData.title,
          description: courseData.description,
          category: courseData.category,
          level: courseData.level,
          duration: courseData.duration,
          price: courseData.price,
          isPremium: courseData.isPremium,
          isPublished: true,
          thumbnailUrl: courseData.thumbnailUrl,
          videoUrl: courseData.videoUrl,
          tags: JSON.stringify(courseData.tags),
          rating: courseData.rating,
          enrollments: courseData.enrollments,
          content: `# ${courseData.title}

## مقدمه
${courseData.description}

## محتوای دوره
این دوره شامل مباحث جامع و کاربردی در زمینه ${courseData.category === 'crypto' ? 'ارزهای دیجیتال' : courseData.category === 'trading' ? 'معاملات' : courseData.category === 'finance' ? 'مالی' : 'امنیت'} است.

## اهداف یادگیری
- درک مفاهیم پایه
- یادگیری تکنیک های عملی  
- کسب مهارت های کاربردی
- آمادگی برای پیاده سازی

## پیش نیازها
${courseData.level === 'beginner' ? 'هیچ پیش نیاز خاصی ندارد' : courseData.level === 'intermediate' ? 'آشنایی با مفاهیم پایه' : 'تسلط بر مفاهیم متوسط'}

## مدت زمان
${courseData.duration} دقیقه

## قیمت
${courseData.price === 0 ? 'رایگان' : `${courseData.price} افغانی`}
`
        }
      })

      // Create lessons for each course
      const lessons = [
        {
          title: 'مقدمه و اهداف دوره',
          description: 'آشنایی با محتوای دوره و اهداف یادگیری',
          content: `# مقدمه و اهداف دوره

در این درس با اهداف و محتوای دوره ${courseData.title} آشنا خواهید شد.

## اهداف این درس:
- آشنایی با ساختار دوره
- درک اهداف یادگیری
- آمادگی برای شروع یادگیری

## محتوای درس:
این دوره طراحی شده تا شما را با مفاهیم ${courseData.category} آشنا کند.`,
          duration: 15,
          order: 1
        },
        {
          title: 'مفاهیم پایه و تعاریف',
          description: 'یادگیری مفاهیم اساسی و تعاریف مهم',
          content: `# مفاهیم پایه و تعاریف

در این درس مفاهیم پایه و تعاریف کلیدی را یاد خواهید گرفت.

## مفاهیم کلیدی:
- تعاریف اساسی
- اصطلاحات مهم
- مبانی نظری

## کاربردها:
این مفاهیم در عمل چگونه استفاده می شوند.`,
          duration: 30,
          order: 2
        },
        {
          title: 'مطالعه موردی و نمونه های عملی',
          description: 'بررسی نمونه های عملی و کاربردی',
          content: `# مطالعه موردی و نمونه های عملی

در این درس نمونه های عملی و کاربردی را بررسی خواهیم کرد.

## نمونه های عملی:
- مثال های واقعی
- تجربیات موفق
- درس های آموخته شده

## تحلیل موردی:
بررسی دقیق موارد مختلف و نتیجه گیری.`,
          duration: 45,
          order: 3
        },
        {
          title: 'تمرین و ارزیابی',
          description: 'انجام تمرینات عملی برای تثبیت یادگیری',
          content: `# تمرین و ارزیابی

در این درس تمرینات عملی انجام خواهید داد.

## تمرینات:
- تمرین های عملی
- پروژه های کوچک
- ارزیابی خودی

## ارزیابی:
- آزمون پایان دوره
- پروژه نهایی
- دریافت گواهینامه`,
          duration: 30,
          order: 4
        }
      ]

      for (const lessonData of lessons) {
        await prisma.educationLesson.create({
          data: {
            courseId: course.id,
            title: lessonData.title,
            description: lessonData.description,
            content: lessonData.content,
            duration: lessonData.duration,
            order: lessonData.order,
            isPublished: true
          }
        })
      }

      console.log(`✅ Created course: ${courseData.title}`)
    }

    // Create tech news from sample data
    for (const newsData of sampleTechNews) {
      await prisma.techNews.create({
        data: {
          title: newsData.title,
          description: newsData.description,
          url: newsData.url,
          source: newsData.source,
          category: newsData.category,
          language: newsData.language,
          imageUrl: newsData.imageUrl,
          publishedAt: new Date(newsData.publishedAt),
          views: newsData.views,
          isActive: true
        }
      })
      console.log(`✅ Created tech news: ${newsData.title}`)
    }

    // 5. Create Sample Transactions
    console.log('💰 Creating sample transactions...')
    const sarafs = await prisma.saraf.findMany()
    const users = await prisma.user.findMany({ where: { role: 'USER' } })

    for (let i = 0; i < 50; i++) {
      const randomSaraf = sarafs[Math.floor(Math.random() * sarafs.length)]
      const randomUser = users[Math.floor(Math.random() * users.length)]
      
      const currencies = ['USD', 'EUR', 'PKR', 'IRR']
      const fromCurrency = currencies[Math.floor(Math.random() * currencies.length)]
      const amount = Math.floor(Math.random() * 10000) + 100
      const rate = fromCurrency === 'USD' ? 71 : fromCurrency === 'EUR' ? 76 : fromCurrency === 'PKR' ? 0.26 : 0.0018
      
      await prisma.transaction.create({
        data: {
          referenceCode: `TXN${Date.now()}${i}`,
          type: 'EXCHANGE',
          status: Math.random() > 0.3 ? 'COMPLETED' : 'PENDING',
          senderId: randomUser.id,
          sarafId: randomSaraf.id,
          fromCurrency: fromCurrency,
          toCurrency: 'AFN',
          fromAmount: amount,
          toAmount: amount * rate,
          rate: rate,
          fee: amount * 0.01,
          senderName: randomUser.name,
          senderPhone: `+9370${Math.floor(Math.random() * 9000000) + 1000000}`,
          receiverName: 'گیرنده نمونه',
          receiverPhone: `+9370${Math.floor(Math.random() * 9000000) + 1000000}`,
          receiverCity: 'کابل',
          completedAt: Math.random() > 0.3 ? new Date() : null
        }
      })
    }
    console.log('✅ Sample transactions created')

    // 6. Create System Configuration
    console.log('⚙️ Setting up system configuration...')
    const configs = [
      { key: 'SYSTEM_NAME', value: 'سرای شهزاده', description: 'نام سیستم' },
      { key: 'SYSTEM_VERSION', value: '1.0.0', description: 'نسخه سیستم' },
      { key: 'MAINTENANCE_MODE', value: 'false', description: 'حالت تعمیر و نگهداری' },
      { key: 'REGISTRATION_ENABLED', value: 'true', description: 'فعال بودن ثبت نام' },
      { key: 'DEFAULT_CURRENCY', value: 'AFN', description: 'ارز پیش فرض' },
      { key: 'MAX_TRANSACTION_AMOUNT', value: '100000', description: 'حداکثر مبلغ تراکنش' },
      { key: 'TRANSACTION_FEE_PERCENT', value: '1', description: 'درصد کارمزد تراکنش' }
    ]

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: config
      })
    }
    console.log('✅ System configuration set')

    // 7. Create Sample Notifications
    console.log('🔔 Creating sample notifications...')
    for (const user of users.slice(0, 5)) {
      await prisma.notification.create({
        data: {
          userId: user.id,
          title: 'خوش آمدید',
          message: 'به سیستم سرای شهزاده خوش آمدید. از امکانات کامل سیستم استفاده کنید.',
          type: 'info',
          action: 'welcome'
        }
      })
    }
    console.log('✅ Sample notifications created')

    // 8. Create Market Data
    console.log('📈 Creating market data...')
    const marketAssets = [
      { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto', price: 43250.50 },
      { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto', price: 2650.75 },
      { symbol: 'USDAFN', name: 'US Dollar to Afghan Afghani', type: 'forex', price: 71.25 },
      { symbol: 'EURAFN', name: 'Euro to Afghan Afghani', type: 'forex', price: 76.80 },
      { symbol: 'GOLD', name: 'Gold', type: 'commodity', price: 2025.30 }
    ]

    for (const asset of marketAssets) {
      await prisma.marketData.upsert({
        where: { symbol_type: { symbol: asset.symbol, type: asset.type } },
        update: {
          price: asset.price,
          change24h: (Math.random() - 0.5) * 100,
          changePercent24h: (Math.random() - 0.5) * 10,
          lastUpdate: new Date()
        },
        create: {
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type,
          price: asset.price,
          change24h: (Math.random() - 0.5) * 100,
          changePercent24h: (Math.random() - 0.5) * 10,
          volume24h: Math.random() * 1000000000,
          marketCap: asset.type === 'crypto' ? Math.random() * 1000000000000 : null
        }
      })
    }
    console.log('✅ Market data created')

    console.log('🎉 System initialization completed successfully!')
    
    // Print summary
    const stats = {
      users: await prisma.user.count(),
      sarafs: await prisma.saraf.count(),
      courses: await prisma.educationCourse.count(),
      lessons: await prisma.educationLesson.count(),
      techNews: await prisma.techNews.count(),
      transactions: await prisma.transaction.count(),
      rates: await prisma.rate.count()
    }

    console.log('\n📊 System Statistics:')
    console.log(`- Users: ${stats.users}`)
    console.log(`- Sarafs: ${stats.sarafs}`)
    console.log(`- Courses: ${stats.courses}`)
    console.log(`- Lessons: ${stats.lessons}`)
    console.log(`- Tech News: ${stats.techNews}`)
    console.log(`- Transactions: ${stats.transactions}`)
    console.log(`- Exchange Rates: ${stats.rates}`)

    console.log('\n🔑 Login Credentials:')
    console.log('Admin: admin@sarayshahzada.com / admin123')
    console.log('Saraf: saraf1@example.com / saraf123')
    console.log('User: user1@example.com / user123')

  } catch (error) {
    console.error('❌ Error initializing system:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  initializeSystem()
    .then(() => {
      console.log('✅ System initialization completed')
      process.exit(0)
    })
    .catch((error) => {
      console.error('❌ System initialization failed:', error)
      process.exit(1)
    })
}

export default initializeSystem