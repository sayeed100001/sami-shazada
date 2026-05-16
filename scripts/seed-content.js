const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  try {
    // Create test content items
    const testContent = [
      {
        title: 'اعلان تست',
        type: 'ANNOUNCEMENT',
        content: 'این یک اعلان تستی است برای بررسی عملکرد سیستم مدیریت محتوا.',
        position: 'DASHBOARD',
        isActive: true
      },
      {
        title: 'ویدیو آموزشی',
        type: 'VIDEO',
        content: 'ویدیو آموزشی در مورد استفاده از سیستم',
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        position: 'DASHBOARD',
        isActive: true
      },
      {
        title: 'وبسایت تست',
        type: 'IFRAME',
        content: 'یک وبسایت تستی برای نمایش',
        url: 'https://example.com',
        position: 'DASHBOARD',
        isActive: true
      }
    ]

    for (const content of testContent) {
      await prisma.contentItem.create({
        data: content
      })
      console.log(`Created: ${content.title}`)
    }

    console.log('✅ Test content created successfully!')
  } catch (error) {
    console.error('❌ Error creating test content:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()