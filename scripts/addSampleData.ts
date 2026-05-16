import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addSampleData() {
  try {
    // Add sample content
    await prisma.contentItem.createMany({
      data: [
        {
          title: 'نرخ ارز امروز',
          content: 'آخرین نرخهای ارز در بازار کابل و سایر شهرهای افغانستان',
          type: 'ANNOUNCEMENT',
          position: 'DASHBOARD',
          isActive: true
        },
        {
          title: 'خدمات حواله',
          content: 'ارسال و دریافت حواله به تمام نقاط افغانستان و جهان',
          type: 'ANNOUNCEMENT',
          position: 'DASHBOARD',
          isActive: true
        },
        {
          title: 'راهنمای استفاده',
          content: 'نحوه استفاده از سیستم سرای شهزاده و خدمات آن',
          type: 'ANNOUNCEMENT',
          position: 'DASHBOARD',
          isActive: true
        }
      ]
    })

    // Create users first for sarafs
    const user1 = await prisma.user.create({
      data: {
        email: 'shahzada@saraf.af',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        name: 'صرافی شهزاده',
        phone: '+93701234567',
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    const user2 = await prisma.user.create({
      data: {
        email: 'pamir@saraf.af',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        name: 'صرافی پامیر',
        phone: '+93702345678',
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    const user3 = await prisma.user.create({
      data: {
        email: 'hindukush@saraf.af',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        name: 'صرافی هندوکش',
        phone: '+93703456789',
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    const user4 = await prisma.user.create({
      data: {
        email: 'salam@saraf.af',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        name: 'صرافی سلام',
        phone: '+93704567890',
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    const user5 = await prisma.user.create({
      data: {
        email: 'aman@saraf.af',
        password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
        name: 'صرافی امان',
        phone: '+93705678901',
        role: 'SARAF',
        isActive: true,
        isVerified: true
      }
    })

    // Add sample sarafs
    await prisma.saraf.createMany({
      data: [
        {
          userId: user1.id,
          businessName: 'صرافی شهزاده',
          businessAddress: 'کابل، شهر نو',
          businessPhone: '+93701234567',
          status: 'APPROVED',
          isActive: true,
          isPremium: true,
          rating: 4.8
        },
        {
          userId: user2.id,
          businessName: 'صرافی پامیر',
          businessAddress: 'هرات، شهر کهنه',
          businessPhone: '+93702345678',
          status: 'APPROVED',
          isActive: true,
          isPremium: false,
          rating: 4.5
        },
        {
          userId: user3.id,
          businessName: 'صرافی هندوکش',
          businessAddress: 'مزار شریف، بالاحصار',
          businessPhone: '+93703456789',
          status: 'APPROVED',
          isActive: true,
          isPremium: true,
          rating: 4.6
        },
        {
          userId: user4.id,
          businessName: 'صرافی سلام',
          businessAddress: 'جلال آباد، مرکز شهر',
          businessPhone: '+93704567890',
          status: 'APPROVED',
          isActive: true,
          isPremium: false,
          rating: 4.3
        },
        {
          userId: user5.id,
          businessName: 'صرافی امان',
          businessAddress: 'قندهار، چهارراهی حیدری',
          businessPhone: '+93705678901',
          status: 'APPROVED',
          isActive: true,
          isPremium: true,
          rating: 4.4
        }
      ]
    })

    console.log('Sample data added successfully!')
  } catch (error) {
    console.error('Error adding sample data:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addSampleData()