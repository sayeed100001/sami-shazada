import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
            lastLogin: true
          }
        },
        branches: true,
        documents: true,
        _count: {
          select: {
            transactions: true,
            rates: true,
            ratings: true
          }
        }
      }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    return NextResponse.json(saraf)
  } catch (error) {
    console.error('Error fetching saraf:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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
    const {
      status,
      isPremium,
      isActive,
      isFeatured,
      creditBalance,
      subscriptionType,
      isOnFreeTrial,
      freeTrialEndDate,
      freeTrialDaysExtend,
      userIsActive
    } = body

    // Build update data
    const updateData: any = {}
    if (status !== undefined) updateData.status = status
    // Safety: approving a saraf should activate it unless explicitly overridden
    if (status === 'APPROVED' && isActive === undefined) {
      updateData.isActive = true
    }
    if (isPremium !== undefined) {
      updateData.isPremium = isPremium
      if (isPremium) {
        // Set premium expiry to 1 year from now
        const premiumExpiry = new Date()
        premiumExpiry.setFullYear(premiumExpiry.getFullYear() + 1)
        updateData.premiumExpiry = premiumExpiry
      } else {
        updateData.premiumExpiry = null
      }
    }
    if (isActive !== undefined) updateData.isActive = isActive
    if (isFeatured !== undefined) updateData.isFeatured = isFeatured
    if (creditBalance !== undefined) updateData.creditBalance = creditBalance
    if (subscriptionType !== undefined) updateData.subscriptionType = subscriptionType
    if (isOnFreeTrial !== undefined) {
      updateData.isOnFreeTrial = Boolean(isOnFreeTrial)
      if (!isOnFreeTrial) {
        updateData.freeTrialEndDate = new Date()
      } else if (isOnFreeTrial && !freeTrialEndDate) {
        const end = new Date()
        end.setDate(end.getDate() + 30)
        updateData.freeTrialStartDate = new Date()
        updateData.freeTrialEndDate = end
      }
    }
    if (freeTrialEndDate !== undefined) {
      const parsed = new Date(freeTrialEndDate)
      if (!Number.isNaN(parsed.getTime())) {
        updateData.freeTrialEndDate = parsed
      }
    }
    if (freeTrialDaysExtend !== undefined) {
      const days = Number(freeTrialDaysExtend)
      if (Number.isFinite(days) && days !== 0) {
        const base = new Date()
        const fromDate = updateData.freeTrialEndDate ? new Date(updateData.freeTrialEndDate) : base
        fromDate.setDate(fromDate.getDate() + days)
        updateData.isOnFreeTrial = true
        updateData.freeTrialEndDate = fromDate
      }
    }

    const saraf = await prisma.saraf.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (userIsActive !== undefined) {
      await prisma.user.update({
        where: { id: saraf.userId },
        data: { isActive: Boolean(userIsActive) }
      })
    }

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_UPDATED',
        resource: 'SARAF',
        resourceId: params.id,
        details: JSON.stringify({
          changes: updateData,
          sarafName: saraf.businessName,
          userEmail: saraf.user.email
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Send notification to saraf user
    if (status === 'APPROVED') {
      await prisma.notification.create({
        data: {
          userId: saraf.userId,
          title: 'صراف شما تایید شد',
          message: `صرافی ${saraf.businessName} شما توسط مدیریت تایید شد و اکنون میتوانید فعالیت خود را آغاز کنید.`,
          type: 'success',
          action: 'VIEW_PORTAL',
          resource: 'SARAF',
          resourceId: saraf.id
        }
      })
    } else if (status === 'REJECTED') {
      await prisma.notification.create({
        data: {
          userId: saraf.userId,
          title: 'صراف شما رد شد',
          message: `متأسفانه درخواست صرافی ${saraf.businessName} شما رد شد. لطفاً با پشتیبانی تماس بگیرید.`,
          type: 'error',
          action: 'CONTACT_SUPPORT',
          resource: 'SARAF',
          resourceId: saraf.id
        }
      })
    } else if (status === 'SUSPENDED') {
      await prisma.notification.create({
        data: {
          userId: saraf.userId,
          title: 'صراف شما تعلیق شد',
          message: `صرافی ${saraf.businessName} شما توسط مدیریت تعلیق شد. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.`,
          type: 'warning',
          action: 'CONTACT_SUPPORT',
          resource: 'SARAF',
          resourceId: saraf.id
        }
      })
    }

    if (isPremium === true) {
      await prisma.notification.create({
        data: {
          userId: saraf.userId,
          title: 'حساب پریمیوم فعال شد',
          message: `تبریک! صرافی ${saraf.businessName} شما به حساب پریمیوم ارتقاء یافت.`,
          type: 'success',
          action: 'VIEW_FEATURES',
          resource: 'SARAF',
          resourceId: saraf.id
        }
      })
    }
    if (isOnFreeTrial === true || freeTrialDaysExtend !== undefined) {
      await prisma.notification.create({
        data: {
          userId: saraf.userId,
          title: 'دسترسی آزمایشی شما به‌روزرسانی شد',
          message: `تنظیمات دوره آزمایشی صرافی ${saraf.businessName} توسط مدیریت به‌روزرسانی شد.`,
          type: 'info',
          action: 'VIEW_PORTAL',
          resource: 'SARAF',
          resourceId: saraf.id
        }
      })
    }

    return NextResponse.json({ success: true, saraf })
  } catch (error) {
    console.error('Error updating saraf:', error)
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

    const saraf = await prisma.saraf.findUnique({
      where: { id: params.id },
      include: {
        user: true,
        _count: {
          select: {
            transactions: true
          }
        }
      }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    // Check if saraf has transactions
    if (saraf._count.transactions > 0) {
      return NextResponse.json(
        { error: 'Cannot delete saraf with existing transactions. Please suspend instead.' },
        { status: 400 }
      )
    }

    // Delete saraf (cascade will handle related records)
    await prisma.saraf.delete({
      where: { id: params.id }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_DELETED',
        resource: 'SARAF',
        resourceId: params.id,
        details: JSON.stringify({
          sarafName: saraf.businessName,
          userEmail: saraf.user.email
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, message: 'Saraf deleted successfully' })
  } catch (error) {
    console.error('Error deleting saraf:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
