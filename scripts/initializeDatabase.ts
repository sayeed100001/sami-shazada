#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { existsSync, mkdirSync } from 'fs'
import { dirname } from 'path'

const prisma = new PrismaClient()

async function initializeDatabase() {
  try {
    console.log('🔄 Initializing database...')
    
    // Ensure database directory exists
    const dbPath = './prisma/dev.db'
    const dbDir = dirname(dbPath)
    if (!existsSync(dbDir)) {
      mkdirSync(dbDir, { recursive: true })
      console.log('📁 Created database directory')
    }
    
    // Test database connection
    await prisma.$connect()
    console.log('✅ Database connection established')
    
    // Check if tables exist by trying to count users
    try {
      await prisma.user.count()
      console.log('✅ Database tables exist')
    } catch (error) {
      console.log('⚠️  Database tables not found, they will be created automatically')
    }
    
    // Create default admin user if not exists
    const adminEmail = 'admin@sarayshazada.com'
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    })
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash('Admin@2024!', 12)
      
      await prisma.user.create({
        data: {
          email: adminEmail,
          password: hashedPassword,
          name: 'System Administrator',
          role: 'ADMIN',
          isActive: true,
          isVerified: true
        }
      })
      
      console.log('✅ Default admin user created')
      console.log('📧 Email: admin@sarayshazada.com')
      console.log('🔑 Password: Admin@2024!')
    } else {
      console.log('✅ Admin user already exists')
    }
    
    // Create default saraf user if not exists
    const sarafEmail = 'saraf@sarayshazada.com'
    const existingSaraf = await prisma.user.findUnique({
      where: { email: sarafEmail }
    })
    
    if (!existingSaraf) {
      const hashedPassword = await bcrypt.hash('Saraf@2024!', 12)
      
      const sarafUser = await prisma.user.create({
        data: {
          email: sarafEmail,
          password: hashedPassword,
          name: 'Test Saraf',
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      })
      
      await prisma.saraf.create({
        data: {
          userId: sarafUser.id,
          businessName: 'Test Exchange',
          businessAddress: 'Kabul, Afghanistan',
          businessPhone: '+93700000000',
          status: 'APPROVED',
          isActive: true
        }
      })
      
      console.log('✅ Default saraf user created')
      console.log('📧 Email: saraf@sarayshazada.com')
      console.log('🔑 Password: Saraf@2024!')
    } else {
      console.log('✅ Saraf user already exists')
    }
    
    // Create default regular user if not exists
    const userEmail = 'user@sarayshazada.com'
    const existingUser = await prisma.user.findUnique({
      where: { email: userEmail }
    })
    
    if (!existingUser) {
      const hashedPassword = await bcrypt.hash('User@2024!', 12)
      
      await prisma.user.create({
        data: {
          email: userEmail,
          password: hashedPassword,
          name: 'Test User',
          role: 'USER',
          isActive: true,
          isVerified: true
        }
      })
      
      console.log('✅ Default user created')
      console.log('📧 Email: user@sarayshazada.com')
      console.log('🔑 Password: User@2024!')
    } else {
      console.log('✅ Regular user already exists')
    }
    
    // Add some basic system configuration
    const configs = [
      { key: 'SYSTEM_NAME', value: 'سرای شهزاده', description: 'System name' },
      { key: 'SYSTEM_VERSION', value: '1.0.0', description: 'System version' },
      { key: 'MAINTENANCE_MODE', value: 'false', description: 'Maintenance mode flag' },
      { key: 'REGISTRATION_ENABLED', value: 'true', description: 'User registration enabled' },
      { key: 'SARAF_REGISTRATION_ENABLED', value: 'true', description: 'Saraf registration enabled' }
    ]
    
    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: {},
        create: config
      })
    }
    
    console.log('✅ System configuration initialized')
    
    // Add some sample market data
    const marketData = [
      {
        symbol: 'BTCUSD',
        type: 'crypto',
        name: 'Bitcoin',
        price: 45000,
        change24h: 1200,
        changePercent24h: 2.74,
        volume24h: 28000000000,
        marketCap: 880000000000
      },
      {
        symbol: 'ETHUSD',
        type: 'crypto',
        name: 'Ethereum',
        price: 3200,
        change24h: -50,
        changePercent24h: -1.54,
        volume24h: 15000000000,
        marketCap: 380000000000
      },
      {
        symbol: 'USDAFN',
        type: 'forex',
        name: 'USD to AFN',
        price: 72.5,
        change24h: 0.2,
        changePercent24h: 0.28,
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
        update: {
          price: data.price,
          change24h: data.change24h,
          changePercent24h: data.changePercent24h,
          volume24h: data.volume24h,
          marketCap: data.marketCap,
          lastUpdate: new Date()
        },
        create: data
      })
    }
    
    console.log('✅ Sample market data added')
    
    console.log('🎉 Database initialization completed successfully!')
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

// Run if called directly
if (require.main === module) {
  initializeDatabase()
}

export { initializeDatabase }