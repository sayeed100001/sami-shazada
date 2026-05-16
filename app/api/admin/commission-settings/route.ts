import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')

    const where: any = {}
    if (type) {
      where.type = type
    }

    const settings = await prisma.commissionSetting.findMany({
      where,
      orderBy: [
        { type: 'asc' },
        { minAmount: 'asc' }
      ]
    })

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching commission settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { type, minAmount, maxAmount, systemRate, suggestedSarafRate, isActive } = body

    if (!type || minAmount === undefined || systemRate === undefined) {
      return NextResponse.json(
        { error: 'Type, minAmount, and systemRate are required' },
        { status: 400 }
      )
    }

    // Validate rates
    if (systemRate < 0 || systemRate > 100) {
      return NextResponse.json(
        { error: 'System rate must be between 0 and 100' },
        { status: 400 }
      )
    }

    if (suggestedSarafRate !== undefined && (suggestedSarafRate < 0 || suggestedSarafRate > 100)) {
      return NextResponse.json(
        { error: 'Suggested saraf rate must be between 0 and 100' },
        { status: 400 }
      )
    }

    const setting = await prisma.commissionSetting.create({
      data: {
        type,
        minAmount,
        maxAmount,
        systemRate,
        suggestedSarafRate,
        isActive: isActive !== undefined ? isActive : true
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMMISSION_SETTING_CREATED',
        resource: 'COMMISSION_SETTING',
        resourceId: setting.id,
        details: JSON.stringify({
          type,
          minAmount,
          maxAmount,
          systemRate,
          suggestedSarafRate
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, setting })
  } catch (error: any) {
    console.error('Error creating commission setting:', error)
    
    // Handle unique constraint violation
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A commission setting with this type and minAmount already exists' },
        { status: 409 }
      )
    }
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
