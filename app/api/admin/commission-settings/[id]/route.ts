import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { minAmount, maxAmount, systemRate, suggestedSarafRate, isActive } = body

    const updateData: any = {}
    if (minAmount !== undefined) updateData.minAmount = minAmount
    if (maxAmount !== undefined) updateData.maxAmount = maxAmount
    if (systemRate !== undefined) {
      if (systemRate < 0 || systemRate > 100) {
        return NextResponse.json(
          { error: 'System rate must be between 0 and 100' },
          { status: 400 }
        )
      }
      updateData.systemRate = systemRate
    }
    if (suggestedSarafRate !== undefined) {
      if (suggestedSarafRate < 0 || suggestedSarafRate > 100) {
        return NextResponse.json(
          { error: 'Suggested saraf rate must be between 0 and 100' },
          { status: 400 }
        )
      }
      updateData.suggestedSarafRate = suggestedSarafRate
    }
    if (isActive !== undefined) updateData.isActive = isActive

    const setting = await prisma.commissionSetting.update({
      where: { id: params.id },
      data: updateData
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMMISSION_SETTING_UPDATED',
        resource: 'COMMISSION_SETTING',
        resourceId: params.id,
        details: JSON.stringify({
          changes: updateData,
          type: setting.type
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, setting })
  } catch (error) {
    console.error('Error updating commission setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.commissionSetting.findUnique({
      where: { id: params.id }
    })

    if (!setting) {
      return NextResponse.json({ error: 'Commission setting not found' }, { status: 404 })
    }

    await prisma.commissionSetting.delete({
      where: { id: params.id }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'COMMISSION_SETTING_DELETED',
        resource: 'COMMISSION_SETTING',
        resourceId: params.id,
        details: JSON.stringify({
          type: setting.type,
          minAmount: setting.minAmount,
          maxAmount: setting.maxAmount,
          systemRate: setting.systemRate
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, message: 'Commission setting deleted successfully' })
  } catch (error) {
    console.error('Error deleting commission setting:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
