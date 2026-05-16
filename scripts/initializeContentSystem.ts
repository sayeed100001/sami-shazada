import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function initializeContentSystem() {
  try {
    console.log('🚀 Initializing content system...')

    // Create sample content items for demonstration
    const sampleContent = [
      {
        title: 'ویدیو آموزشی تجارت ارز',
        type: 'VIDEO' as const,
        content: 'آموزش کامل تجارت ارز برای مبتدیان',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        position: 'DASHBOARD',
        isActive: true
      },
      {
        title: 'اعلان مهم سیستم',
        type: 'ANNOUNCEMENT' as const,
        content: 'سیستم سرای شهزاده با موفقیت راه‌اندازی شده و آماده ارائه خدمات به کاربران عزیز می‌باشد. شما می‌توانید از تمامی امکانات پلتفورم استفاده کنید.',
        url: null,
        position: 'DASHBOARD',
        isActive: true
      },
      {
        title: 'صفحه اخبار بازار',
        type: 'IFRAME' as const,
        content: 'آخرین اخبار و تحلیل‌های بازار مالی',
        url: 'https://www.tradingview.com/markets/',
        position: 'DASHBOARD',
        isActive: true
      },
      {
        title: 'کانال تلگرام رسمی',
        type: 'ANNOUNCEMENT' as const,
        content: 'برای دریافت آخرین اخبار و اطلاعیه‌ها، به کانال تلگرام رسمی ما بپیوندید: @SarayShahzada',
        url: null,
        position: 'DASHBOARD',
        isActive: true
      }
    ]

    // Check if content already exists
    const existingContent = await prisma.contentItem.count()
    
    if (existingContent === 0) {
      console.log('📝 Creating sample content items...')
      
      for (const content of sampleContent) {
        await prisma.contentItem.create({
          data: content
        })
        console.log(`✅ Created: ${content.title}`)
      }
      
      console.log(`🎉 Successfully created ${sampleContent.length} content items`)
    } else {
      console.log(`ℹ️  Content system already initialized with ${existingContent} items`)
    }

    // Verify content system
    const totalContent = await prisma.contentItem.count()
    const activeContent = await prisma.contentItem.count({
      where: { isActive: true }
    })

    console.log(`📊 Content System Status:`)
    console.log(`   Total items: ${totalContent}`)
    console.log(`   Active items: ${activeContent}`)
    console.log(`   Dashboard items: ${await prisma.contentItem.count({ where: { position: 'DASHBOARD', isActive: true } })}`)

    console.log('✅ Content system initialization completed successfully!')

  } catch (error) {
    console.error('❌ Error initializing content system:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  initializeContentSystem()
    .then(() => {
      console.log('🏁 Content system initialization finished')
      process.exit(0)
    })
    .catch((error) => {
      console.error('💥 Content system initialization failed:', error)
      process.exit(1)
    })
}

export { initializeContentSystem }