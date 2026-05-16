import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  return await seedDatabase()
}

export async function GET(request: NextRequest) {
  return await seedDatabase()
}

async function seedDatabase() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

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
      ],
    })

    // Create users for sarafs
    const users = await Promise.all([
      prisma.user.upsert({
        where: { email: 'shahzada@saraf.af' },
        update: {},
        create: {
          email: 'shahzada@saraf.af',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'صرافی شهزاده',
          phone: '+93701234567',
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'pamir@saraf.af' },
        update: {},
        create: {
          email: 'pamir@saraf.af',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'صرافی پامیر',
          phone: '+93702345678',
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'hindukush@saraf.af' },
        update: {},
        create: {
          email: 'hindukush@saraf.af',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'صرافی هندوکش',
          phone: '+93703456789',
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'salam@saraf.af' },
        update: {},
        create: {
          email: 'salam@saraf.af',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'صرافی سلام',
          phone: '+93704567890',
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      }),
      prisma.user.upsert({
        where: { email: 'aman@saraf.af' },
        update: {},
        create: {
          email: 'aman@saraf.af',
          password: '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',
          name: 'صرافی امان',
          phone: '+93705678901',
          role: 'SARAF',
          isActive: true,
          isVerified: true
        }
      })
    ])

    // Create sarafs
    await Promise.all([
      prisma.saraf.upsert({
        where: { userId: users[0].id },
        update: {},
        create: {
          userId: users[0].id,
          businessName: 'صرافی شهزاده',
          businessAddress: 'کابل، شهر نو',
          businessPhone: '+93701234567',
          status: 'APPROVED',
          isActive: true,
          isPremium: true,
          rating: 4.8
        }
      }),
      prisma.saraf.upsert({
        where: { userId: users[1].id },
        update: {},
        create: {
          userId: users[1].id,
          businessName: 'صرافی پامیر',
          businessAddress: 'هرات، شهر کهنه',
          businessPhone: '+93702345678',
          status: 'APPROVED',
          isActive: true,
          isPremium: false,
          rating: 4.5
        }
      }),
      prisma.saraf.upsert({
        where: { userId: users[2].id },
        update: {},
        create: {
          userId: users[2].id,
          businessName: 'صرافی هندوکش',
          businessAddress: 'مزار شریف، بالاحصار',
          businessPhone: '+93703456789',
          status: 'APPROVED',
          isActive: true,
          isPremium: true,
          rating: 4.6
        }
      }),
      prisma.saraf.upsert({
        where: { userId: users[3].id },
        update: {},
        create: {
          userId: users[3].id,
          businessName: 'صرافی سلام',
          businessAddress: 'جلال آباد، مرکز شهر',
          businessPhone: '+93704567890',
          status: 'APPROVED',
          isActive: true,
          isPremium: false,
          rating: 4.3
        }
      }),
      prisma.saraf.upsert({
        where: { userId: users[4].id },
        update: {},
        create: {
          userId: users[4].id,
          businessName: 'صرافی امان',
          businessAddress: 'قندهار، چهارراهی حیدری',
          businessPhone: '+93705678901',
          status: 'APPROVED',
          isActive: true,
          isPremium: true,
          rating: 4.4
        }
      })
    ])

    return NextResponse.json({ 
      success: true, 
      message: 'Production database seeded successfully!' 
    })
  } catch (error) {
    console.error('Seeding error:', error)
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to seed database',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}
