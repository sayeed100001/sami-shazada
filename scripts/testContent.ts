import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🧪 Testing Content System...\n')

  // Test 1: Check database connection
  console.log('1️⃣ Testing database connection...')
  try {
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Database connected\n')
  } catch (error) {
    console.error('❌ Database connection failed:', error)
    process.exit(1)
  }

  // Test 2: Count existing content
  console.log('2️⃣ Checking existing content...')
  const totalCount = await prisma.contentItem.count()
  const activeCount = await prisma.contentItem.count({ where: { isActive: true } })
  console.log(`📊 Total content: ${totalCount}`)
  console.log(`✅ Active content: ${activeCount}\n`)

  // Test 3: List all content
  if (totalCount > 0) {
    console.log('3️⃣ Existing content items:')
    const items = await prisma.contentItem.findMany({
      orderBy: { createdAt: 'desc' }
    })
    items.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title}`)
      console.log(`      Type: ${item.type}`)
      console.log(`      Active: ${item.isActive ? '✅' : '❌'}`)
      console.log(`      Created: ${item.createdAt.toLocaleString()}`)
      if (item.url) console.log(`      URL: ${item.url}`)
      console.log()
    })
  }

  // Test 4: Create sample content if none exists
  if (totalCount === 0) {
    console.log('4️⃣ Creating sample content...')
    
    const samples = [
      {
        title: 'خوش آمدید به سرای شهزاده',
        type: 'ANNOUNCEMENT',
        content: 'پلتفورم جامع مالی افغانستان در خدمت شماست. از امکانات صرافی، حواله و آموزش استفاده کنید.',
        position: 'DASHBOARD',
        isActive: true
      },
      {
        title: 'نرخ های روز ارز',
        type: 'ANNOUNCEMENT',
        content: 'نرخ های ارز به صورت لحظه ای بروزرسانی می شود. برای مشاهده نرخ ها به بخش نرخ ارز مراجعه کنید.',
        position: 'DASHBOARD',
        isActive: true
      }
    ]

    for (const sample of samples) {
      const created = await prisma.contentItem.create({ data: sample })
      console.log(`   ✅ Created: ${created.title}`)
    }
    console.log()
  }

  // Test 5: Verify active content
  console.log('5️⃣ Verifying active content for dashboard...')
  const activeItems = await prisma.contentItem.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' }
  })
  
  if (activeItems.length > 0) {
    console.log(`✅ ${activeItems.length} active items ready for display:`)
    activeItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.title} (${item.type})`)
    })
  } else {
    console.log('⚠️  No active content found!')
  }

  console.log('\n✅ Content system test completed!')
  console.log('\n📝 Next steps:')
  console.log('   1. Login as admin: admin@saray.af / Admin@123456')
  console.log('   2. Visit: http://localhost:3000/admin/content')
  console.log('   3. Create content items')
  console.log('   4. View on dashboard: http://localhost:3000')
}

main()
  .catch((e) => {
    console.error('❌ Test failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
