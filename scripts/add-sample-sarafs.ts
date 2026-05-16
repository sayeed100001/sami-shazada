import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🏪 Adding sample promoted sarafs...\n')

  const sampleSarafs = [
    {
      email: 'kabul.exchange@test.af',
      name: 'صرافی کابل',
      businessName: 'صرافی کابل - شعبه مرکزی',
      city: 'کابل',
      phone: '+93700111222',
      isPremium: true,
      isFeatured: true,
      rates: [
        { from: 'USD', to: 'AFN', buy: 72.5, sell: 73.0 },
        { from: 'EUR', to: 'AFN', buy: 78.2, sell: 78.8 },
        { from: 'PKR', to: 'AFN', buy: 0.26, sell: 0.27 },
      ]
    },
    {
      email: 'herat.saraf@test.af',
      name: 'صرافی هرات',
      businessName: 'صرافی هرات - خدمات سریع',
      city: 'هرات',
      phone: '+93700222333',
      isPremium: true,
      isFeatured: false,
      rates: [
        { from: 'USD', to: 'AFN', buy: 72.3, sell: 72.9 },
        { from: 'EUR', to: 'AFN', buy: 78.0, sell: 78.6 },
        { from: 'IRR', to: 'AFN', buy: 0.0017, sell: 0.0018 },
      ]
    },
    {
      email: 'mazar.exchange@test.af',
      name: 'صرافی مزار',
      businessName: 'صرافی مزار شریف - معتبر',
      city: 'مزار شریف',
      phone: '+93700333444',
      isPremium: false,
      isFeatured: true,
      rates: [
        { from: 'USD', to: 'AFN', buy: 72.4, sell: 73.1 },
        { from: 'EUR', to: 'AFN', buy: 78.1, sell: 78.9 },
        { from: 'PKR', to: 'AFN', buy: 0.26, sell: 0.28 },
      ]
    },
  ]

  for (const sarafData of sampleSarafs) {
    const password = await bcrypt.hash('Saraf@123456', 12)
    
    const user = await prisma.user.upsert({
      where: { email: sarafData.email },
      update: {},
      create: {
        email: sarafData.email,
        password,
        name: sarafData.name,
        phone: sarafData.phone,
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    const now = new Date()
    const freeTrialEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)

    const saraf = await prisma.saraf.upsert({
      where: { userId: user.id },
      update: {
        isPremium: sarafData.isPremium,
        isFeatured: sarafData.isFeatured,
        rating: 4.5 + Math.random() * 0.5,
        totalTransactions: Math.floor(Math.random() * 500) + 100
      },
      create: {
        userId: user.id,
        businessName: sarafData.businessName,
        businessAddress: `${sarafData.city}, افغانستان`,
        businessPhone: sarafData.phone,
        status: 'APPROVED',
        isActive: true,
        creditBalance: 100,
        isPremium: sarafData.isPremium,
        isFeatured: sarafData.isFeatured,
        rating: 4.5 + Math.random() * 0.5,
        totalTransactions: Math.floor(Math.random() * 500) + 100,
        isOnFreeTrial: false,
        freeTrialStartDate: now,
        freeTrialEndDate: freeTrialEnd
      }
    })

    // Create branch
    const branch = await prisma.sarafBranch.upsert({
      where: { id: `${saraf.id}-main` },
      update: {},
      create: {
        id: `${saraf.id}-main`,
        sarafId: saraf.id,
        name: 'شعبه مرکزی',
        address: `${sarafData.city}, شهر نو`,
        city: sarafData.city,
        country: 'Afghanistan',
        phone: sarafData.phone,
        isActive: true
      }
    })

    // Create rates
    for (const rate of sarafData.rates) {
      await prisma.rate.upsert({
        where: {
          sarafId_fromCurrency_toCurrency: {
            sarafId: saraf.id,
            fromCurrency: rate.from,
            toCurrency: rate.to
          }
        },
        update: {
          buyRate: rate.buy,
          sellRate: rate.sell
        },
        create: {
          sarafId: saraf.id,
          fromCurrency: rate.from,
          toCurrency: rate.to,
          buyRate: rate.buy,
          sellRate: rate.sell,
          isActive: true
        }
      })
    }

    // Create active advertisement for featured sarafs
    if (sarafData.isFeatured) {
      const startDate = new Date()
      const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      await prisma.advertisement.create({
        data: {
          sarafId: saraf.id,
          position: 'FEATURED',
          title: `تبلیغ ${sarafData.businessName}`,
          description: 'نمایش در صفحه اصلی',
          duration: 30,
          price: 500,
          status: 'ACTIVE',
          startDate,
          endDate,
          impressions: Math.floor(Math.random() * 10000),
          clicks: Math.floor(Math.random() * 500)
        }
      })
    }

    console.log(`✅ Created: ${sarafData.businessName}`)
  }

  console.log('\n🎉 Sample sarafs added successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
