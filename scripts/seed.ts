import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create admin user with secure credentials
  const adminPassword = await bcrypt.hash('SecureAdmin!2024', 12)
  const admin = await prisma.user.upsert({
    where: { email: 'admin@sarayeshahzada.af' },
    update: {
      password: adminPassword,
      isActive: true,
      isVerified: true
    },
    create: {
      email: 'admin@sarayeshahzada.af',
      password: adminPassword,
      name: 'مدیر سیستم',
      phone: '+93700000000',
      role: 'ADMIN',
      isActive: true,
      isVerified: true
    }
  })

  // Create saraf user
  const sarafPassword = await bcrypt.hash('Saraf!2345', 12)
  const sarafUser = await prisma.user.upsert({
    where: { email: 'saraf@sarayeshahzada.af' },
    update: {
      password: sarafPassword,
      isActive: true,
      isVerified: true
    },
    create: {
      email: 'saraf@sarayeshahzada.af',
      password: sarafPassword,
      name: 'احمد علی صراف',
      phone: '+93700000001',
      role: 'SARAF',
      isActive: true,
      isVerified: true
    }
  })

  // Create saraf profile
  const saraf = await prisma.saraf.upsert({
    where: { userId: sarafUser.id },
    update: {},
    create: {
      userId: sarafUser.id,
      businessName: 'صرافی احمد علی',
      businessAddress: 'کابل، شهر نو، سرک اول',
      businessPhone: '+93700000001',
      licenseNumber: 'SF-2024-001',
      taxNumber: 'TX-001-2024',
      status: 'APPROVED',
      rating: 4.8,
      totalTransactions: 156
    }
  })

  // Create regular user
  const userPassword = await bcrypt.hash('User!2345', 12)
  const user = await prisma.user.upsert({
    where: { email: 'user@sarayeshahzada.af' },
    update: {
      password: userPassword,
      isActive: true,
      isVerified: true
    },
    create: {
      email: 'user@sarayeshahzada.af',
      password: userPassword,
      name: 'محمد حسن',
      phone: '+93700000002',
      role: 'USER',
      isActive: true,
      isVerified: true
    }
  })

  // Create sample rates
  const rates = [
    {
      sarafId: saraf.id,
      fromCurrency: 'USD',
      toCurrency: 'AFN',
      buyRate: 70.5,
      sellRate: 71.0,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    },
    {
      sarafId: saraf.id,
      fromCurrency: 'EUR',
      toCurrency: 'AFN',
      buyRate: 75.2,
      sellRate: 76.0,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
    },
    {
      sarafId: saraf.id,
      fromCurrency: 'PKR',
      toCurrency: 'AFN',
      buyRate: 0.25,
      sellRate: 0.26,
      validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000)
    }
  ]

  for (const rate of rates) {
    await prisma.rate.upsert({
      where: {
        sarafId_fromCurrency_toCurrency: {
          sarafId: rate.sarafId,
          fromCurrency: rate.fromCurrency,
          toCurrency: rate.toCurrency
        }
      },
      update: rate,
      create: rate
    })
  }

  // Create sample market data
  const marketData = [
    {
      symbol: 'BTCUSD',
      type: 'crypto',
      name: 'Bitcoin',
      price: 43250.00,
      change24h: 1250.50,
      changePercent24h: 2.98,
      volume24h: 25000000000,
      marketCap: 850000000000
    },
    {
      symbol: 'ETHUSD',
      type: 'crypto',
      name: 'Ethereum',
      price: 2680.75,
      change24h: -45.20,
      changePercent24h: -1.66,
      volume24h: 15000000000,
      marketCap: 320000000000
    },
    {
      symbol: 'USDAFN',
      type: 'forex',
      name: 'USD to AFN',
      price: 70.85,
      change24h: 0.15,
      changePercent24h: 0.21,
      volume24h: 0,
      marketCap: 0
    },
    {
      symbol: 'XAUUSD',
      type: 'commodity',
      name: 'Gold',
      price: 2034.50,
      change24h: 12.30,
      changePercent24h: 0.61,
      volume24h: 0,
      marketCap: 0
    }
  ]

  for (const data of marketData) {
    await prisma.marketData.upsert({
      where: {
        symbol_type: {
          symbol: data.symbol,
          type: data.type
        }
      },
      update: data,
      create: data
    })
  }

  // Create sample transaction
  await prisma.transaction.create({
    data: {
      referenceCode: 'SH' + Date.now().toString(36).toUpperCase(),
      type: 'HAWALA',
      status: 'PENDING',
      sarafId: saraf.id,
      fromCurrency: 'USD',
      toCurrency: 'AFN',
      fromAmount: 500,
      toAmount: 35425,
      rate: 70.85,
      fee: 100,
      senderCountry: 'United States',
      senderCity: 'New York',
      receiverCity: 'Kabul',
      senderName: 'John Smith',
      senderPhone: '+1234567890',
      receiverName: 'احمد محمد',
      receiverPhone: '+93700123456',
      notes: 'پرداخت برای خانواده'
    }
  })

  // Create system config
  const configs = [
    { key: 'site_title', value: 'سرای شهزاده', description: 'Site title' },
    { key: 'maintenance_mode', value: 'false', description: 'Maintenance mode' },
    { key: 'max_transaction_amount', value: '10000', description: 'Maximum transaction amount in USD' },
    { key: 'default_fee_percentage', value: '0.01', description: 'Default fee percentage' }
  ]

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config
    })
  }

  console.log('✅ Database seeded successfully!')
  console.log('\n📋 Admin Credentials:')
  console.log('Email: admin@sarayeshahzada.af')
  console.log('Password: SecureAdmin!2024')
  console.log('\n📋 Test Credentials:')
  console.log('Saraf: saraf@sarayeshahzada.af / Saraf!2345')
  console.log('User: user@sarayeshahzada.af / User!2345')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })