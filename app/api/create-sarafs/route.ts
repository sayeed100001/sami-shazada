import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function GET() {
  return createSarafs()
}

export async function POST() {
  return createSarafs()
}

async function createSarafs() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sarafUsers = [
      {
        email: 'ahmad.saraf@kabul.af',
        password: await bcrypt.hash('Ahmad@2024', 12),
        name: 'احمد صرافی کابل',
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

    const createdUsers: Array<{ email: string; name: string }> = []
    
    for (const userData of sarafUsers) {
      const existingUser = await prisma.user.findUnique({
        where: { email: userData.email }
      })
      
      if (!existingUser) {
        const user = await prisma.user.create({ data: userData })
        
        await prisma.saraf.create({
          data: {
            userId: user.id,
            businessName: userData.name,
            businessAddress: 'Afghanistan',
            businessPhone: '+93700000000',
            status: 'APPROVED',
            isActive: true,
            rating: Math.random() * 2 + 3
          }
        })
        
        createdUsers.push({ email: user.email, name: user.name })
      }
    }

    return NextResponse.json({ 
      message: 'Saraf accounts created',
      created: createdUsers
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create sarafs' },
      { status: 500 }
    )
  }
}
