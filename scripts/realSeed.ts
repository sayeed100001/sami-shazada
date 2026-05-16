import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding real data...')

  // Create admin user (matches CREDENTIALS.txt)
  const adminPassword = await bcrypt.hash('Admin@123456', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@saray.af' },
    update: {},
    create: {
      email: 'admin@saray.af',
      password: adminPassword,
      name: 'System Administrator',
      phone: '+93700000001',
      role: 'ADMIN',
      isActive: true
    }
  })

  // Create test saraf user (matches CREDENTIALS.txt)
  const sarafPassword = await bcrypt.hash('Saraf@123456', 12)
  const sarafUser = await prisma.user.upsert({
    where: { email: 'saraf@test.af' },
    update: {},
    create: {
      email: 'saraf@test.af',
      password: sarafPassword,
      name: 'Test Saraf',
      phone: '+93700123456',
      role: 'SARAF',
      isActive: true
    }
  })

  await prisma.saraf.upsert({
    where: { userId: sarafUser.id },
    update: {},
    create: {
      userId: sarafUser.id,
      businessName: 'صرافی تست',
      businessAddress: 'کابل، افغانستان',
      businessPhone: '+93202301234',
      licenseNumber: 'DAB-2024-TEST',
      taxNumber: 'TIN-TEST123',
      status: 'APPROVED',
      isActive: true,
      rating: 4.5,
      totalTransactions: 100
    }
  })

  // Create test regular user (matches CREDENTIALS.txt)
  const userPassword = await bcrypt.hash('User@123456', 12)
  await prisma.user.upsert({
    where: { email: 'user@test.af' },
    update: {},
    create: {
      email: 'user@test.af',
      password: userPassword,
      name: 'Test User',
      phone: '+93700999999',
      role: 'USER',
      isActive: true
    }
  })

  // Create additional real saraf users
  const realSarafs = [
    {
      email: 'kabul.exchange@gmail.com',
      name: 'احمد شاه احمدی',
      phone: '+93700123457',
      businessName: 'صرافی کابل سنتر',
      businessAddress: 'شهر نو، کابل، افغانستان',
      businessPhone: '+93202301235',
      licenseNumber: 'DAB-2024-001',
      taxNumber: 'TIN-1234567890'
    },
    {
      email: 'herat.money@outlook.com',
      name: 'محمد حسن حسینی',
      phone: '+93701234567',
      businessName: 'صرافی هرات گلد',
      businessAddress: 'چهارراهی انجیل، هرات، افغانستان',
      businessPhone: '+93402301234',
      licenseNumber: 'DAB-2024-002',
      taxNumber: 'TIN-2345678901'
    },
    {
      email: 'mazar.exchange@yahoo.com',
      name: 'عبدالرحمن عبدالله',
      phone: '+93702345678',
      businessName: 'صرافی مزار شریف',
      businessAddress: 'شهر مزار شریف، بلخ، افغانستان',
      businessPhone: '+93502301234',
      licenseNumber: 'DAB-2024-003',
      taxNumber: 'TIN-3456789012'
    },
    {
      email: 'kandahar.money@gmail.com',
      name: 'غلام محمد غلامی',
      phone: '+93703456789',
      businessName: 'صرافی قندهار پلازا',
      businessAddress: 'چهارراهی شهیدان، قندهار، افغانستان',
      businessPhone: '+93302301234',
      licenseNumber: 'DAB-2024-004',
      taxNumber: 'TIN-4567890123'
    },
    {
      email: 'jalalabad.exchange@hotmail.com',
      name: 'نور محمد نوری',
      phone: '+93704567890',
      businessName: 'صرافی ننگرهار',
      businessAddress: 'شهر جلال آباد، ننگرهار، افغانستان',
      businessPhone: '+93602301234',
      licenseNumber: 'DAB-2024-005',
      taxNumber: 'TIN-5678901234'
    }
  ]

  for (const sarafData of realSarafs) {
    const password = await bcrypt.hash('saraf123!@#', 12)
    
    const user = await prisma.user.upsert({
      where: { email: sarafData.email },
      update: {},
      create: {
        email: sarafData.email,
        password,
        name: sarafData.name,
        phone: sarafData.phone,
        role: 'SARAF',
        isActive: true
      }
    })

    await prisma.saraf.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        businessName: sarafData.businessName,
        businessAddress: sarafData.businessAddress,
        businessPhone: sarafData.businessPhone,
        licenseNumber: sarafData.licenseNumber,
        taxNumber: sarafData.taxNumber,
        status: 'APPROVED',
        isActive: true,
        rating: 4.2 + Math.random() * 0.8, // 4.2-5.0 rating
        totalTransactions: Math.floor(Math.random() * 500) + 100
      }
    })
  }

  // Create real exchange rates
  const realRates = [
    { from: 'USD', to: 'AFN', buy: 70.50, sell: 71.00 },
    { from: 'EUR', to: 'AFN', buy: 76.20, sell: 76.80 },
    { from: 'GBP', to: 'AFN', buy: 88.50, sell: 89.20 },
    { from: 'PKR', to: 'AFN', buy: 0.25, sell: 0.26 },
    { from: 'IRR', to: 'AFN', buy: 0.0017, sell: 0.0018 }
  ]

  const sarafs = await prisma.saraf.findMany()
  
  for (const saraf of sarafs) {
    for (const rate of realRates) {
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
          sellRate: rate.sell,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
        },
        create: {
          sarafId: saraf.id,
          fromCurrency: rate.from,
          toCurrency: rate.to,
          buyRate: rate.buy,
          sellRate: rate.sell,
          isActive: true,
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      })
    }
  }

  // Create real transactions
  const transactionTypes = ['HAWALA', 'EXCHANGE', 'CRYPTO'] as const
  const statuses = ['PENDING', 'COMPLETED', 'CANCELLED'] as const
  const cities = ['کابل', 'هرات', 'مزار شریف', 'قندهار', 'جلال آباد', 'غزنی', 'بامیان']
  
  for (let i = 0; i < 50; i++) {
    const saraf = sarafs[Math.floor(Math.random() * sarafs.length)]
    const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    
    await prisma.transaction.create({
      data: {
        referenceCode: `TXN${Date.now()}${i.toString().padStart(3, '0')}`,
        type,
        status,
        sarafId: saraf.id,
        fromCurrency: 'USD',
        toCurrency: 'AFN',
        fromAmount: Math.floor(Math.random() * 5000) + 100,
        toAmount: Math.floor(Math.random() * 350000) + 7000,
        rate: 70.5 + Math.random() * 2,
        fee: Math.floor(Math.random() * 50) + 10,
        senderName: `فرستنده ${i + 1}`,
        senderPhone: `+9370${Math.floor(Math.random() * 9000000) + 1000000}`,
        receiverName: `گیرنده ${i + 1}`,
        receiverPhone: `+9370${Math.floor(Math.random() * 9000000) + 1000000}`,
        senderCountry: 'Afghanistan',
        senderCity: cities[Math.floor(Math.random() * cities.length)],
        receiverCity: cities[Math.floor(Math.random() * cities.length)],
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    })
  }

  console.log('✅ Real data seeding completed!')
  console.log('\n📋 Login Credentials:')
  console.log('Admin: admin@saray.af / Admin@123456')
  console.log('Saraf: saraf@test.af / Saraf@123456')
  console.log('User: user@test.af / User@123456')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })