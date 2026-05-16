import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if users already exist
    const existingUsers = await prisma.user.count()
    if (existingUsers > 0) {
      return NextResponse.json({ message: 'Database already seeded', users: existingUsers })
    }

    // Create default users including fake sarafs
    const users = [
      {
        email: 'admin@saray.af',
        password: await bcrypt.hash('Admin@123456', 12),
        name: 'System Administrator',
        role: 'ADMIN' as const,
        isActive: true,
        isVerified: true
      },
      {
        email: 'saraf@test.af',
        password: await bcrypt.hash('Saraf@123456', 12),
        name: 'Test Saraf',
        role: 'SARAF' as const,
        isActive: true,
        isVerified: true
      },
      {
        email: 'user@test.af',
        password: await bcrypt.hash('User@123456', 12),
        name: 'Test User',
        role: 'USER' as const,
        isActive: true,
        isVerified: true
      },
      {
        email: 'ahmad.saraf@kabul.af',
        password: await bcrypt.hash('Ahmad@2024', 12),
        name: 'احمد صرافی',
        role: 'SARAF' as const,
        isActive: true,
        isVerified: true
      },
      {
        email: 'hassan.exchange@herat.af',
        password: await bcrypt.hash('Hassan@2024', 12),
        name: 'حسن صرافی هرات',
        role: 'SARAF' as const,
        isActive: true,
        isVerified: true
      },
      {
        email: 'omar.money@mazar.af',
        password: await bcrypt.hash('Omar@2024', 12),
        name: 'عمر صرافی مزار',
        role: 'SARAF' as const,
        isActive: true,
        isVerified: true
      },
      {
        email: 'ali.hawala@kandahar.af',
        password: await bcrypt.hash('Ali@2024', 12),
        name: 'علی حواله دار کندهار',
        role: 'SARAF' as const,
        isActive: true,
        isVerified: true
      }
    ]

    // Create users
    for (const userData of users) {
      await prisma.user.create({ data: userData })
    }

    return NextResponse.json({ 
      message: 'Database seeded successfully',
      users: users.map(u => ({ email: u.email, role: u.role }))
    })

  } catch (error) {
    console.error('Seed error:', error)
    return NextResponse.json(
      { error: 'Failed to seed database', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check database connection and user count
    const userCount = await prisma.user.count()
    const users = await prisma.user.findMany({
      select: { email: true, role: true, isActive: true }
    })

    return NextResponse.json({
      connected: true,
      userCount,
      users
    })

  } catch (error) {
    return NextResponse.json(
      { connected: false, error: error instanceof Error ? error.message : 'Database connection failed' },
      { status: 500 }
    )
  }
}
