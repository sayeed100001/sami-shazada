import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sanitizeInput, validateNumericInput } from '@/lib/security';

export const dynamic = 'force-dynamic'

// GET /api/admin/free-trial - Get all sarafs with free trial info
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'expired', 'all'

    const now = new Date();
    let where: any = {};

    if (status === 'active') {
      where = {
        isOnFreeTrial: true,
        freeTrialEndDate: { gte: now }
      };
    } else if (status === 'expired') {
      where = {
        OR: [
          { isOnFreeTrial: false },
          { freeTrialEndDate: { lt: now } }
        ]
      };
    }

    const sarafs = await prisma.saraf.findMany({
      where,
      select: {
        id: true,
        businessName: true,
        isOnFreeTrial: true,
        freeTrialStartDate: true,
        freeTrialEndDate: true,
        creditBalance: true,
        totalTransactions: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            email: true,
            name: true,
            phone: true
          }
        }
      },
      orderBy: {
        freeTrialEndDate: 'asc'
      }
    });

    // Calculate remaining days for each
    const sarafsWithInfo = sarafs.map(saraf => {
      const remainingDays = saraf.freeTrialEndDate 
        ? Math.ceil((saraf.freeTrialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;
      
      return {
        ...saraf,
        remainingDays,
        isExpired: remainingDays <= 0
      };
    });

    return NextResponse.json({
      success: true,
      sarafs: sarafsWithInfo,
      total: sarafsWithInfo.length
    });
  } catch (error: any) {
    console.error('Get free trial info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch free trial info' },
      { status: 500 }
    );
  }
}

// POST /api/admin/free-trial - Activate, extend, or modify free trial
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sarafId, durationDays, action } = body; // action: 'activate', 'extend', 'set'

    if (!sarafId || !durationDays) {
      return NextResponse.json(
        { error: 'Missing required fields: sarafId and durationDays' },
        { status: 400 }
      );
    }

    const days = Math.floor(validateNumericInput(durationDays));
    if (days <= 0 || days > 365) {
      return NextResponse.json(
        { error: 'Duration must be between 1 and 365 days' },
        { status: 400 }
      );
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: sanitizeInput(sarafId) },
    });

    if (!saraf) {
      return NextResponse.json(
        { error: 'Saraf not found' },
        { status: 404 }
      );
    }

    const now = new Date();
    let freeTrialEndDate: Date;
    let actionMessage: string;

    if (action === 'extend' && saraf.freeTrialEndDate) {
      // Extend from current end date
      freeTrialEndDate = new Date(saraf.freeTrialEndDate.getTime() + days * 24 * 60 * 60 * 1000);
      actionMessage = `Extended by ${days} days`;
    } else if (action === 'set' && saraf.freeTrialEndDate) {
      // Set specific duration from now
      freeTrialEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      actionMessage = `Set to ${days} days from now`;
    } else {
      // Activate new trial
      freeTrialEndDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
      actionMessage = `Activated for ${days} days`;
    }

    const updatedSaraf = await prisma.saraf.update({
      where: { id: saraf.id },
      data: {
        isOnFreeTrial: true,
        freeTrialStartDate: saraf.freeTrialStartDate || now,
        freeTrialEndDate,
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: saraf.userId,
        title: '🎉 دوره رایگان بروزرسانی شد',
        message: `دوره رایگان شما تا ${freeTrialEndDate.toLocaleDateString('fa-IR')} تمدید شد`,
        type: 'success',
        action: 'FREE_TRIAL_UPDATED',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FREE_TRIAL_MODIFIED',
        resource: 'SARAF',
        resourceId: saraf.id,
        details: JSON.stringify({ 
          action: action || 'activate',
          durationDays: days, 
          endDate: freeTrialEndDate,
          previousEndDate: saraf.freeTrialEndDate
        }),
      },
    });

    return NextResponse.json({
      success: true,
      saraf: updatedSaraf,
      message: actionMessage,
      remainingDays: Math.ceil((freeTrialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    });
  } catch (error: any) {
    console.error('Free trial modification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to modify free trial' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/free-trial - Toggle free trial on/off
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sarafId, isActive } = body;

    if (!sarafId || isActive === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: sarafId and isActive' },
        { status: 400 }
      );
    }

    const saraf = await prisma.saraf.findUnique({
      where: { id: sanitizeInput(sarafId) }
    });

    if (!saraf) {
      return NextResponse.json(
        { error: 'Saraf not found' },
        { status: 404 }
      );
    }

    const updatedSaraf = await prisma.saraf.update({
      where: { id: saraf.id },
      data: {
        isOnFreeTrial: isActive,
        freeTrialEndDate: isActive ? saraf.freeTrialEndDate : new Date()
      },
    });

    // Create notification
    await prisma.notification.create({
      data: {
        userId: saraf.userId,
        title: isActive ? '✅ دوره رایگان فعال شد' : '⚠️ دوره رایگان غیرفعال شد',
        message: isActive 
          ? 'دوره رایگان شما مجدداً فعال شد'
          : 'دوره رایگان شما غیرفعال شد. برای ادامه استفاده، پکیج خریداری کنید',
        type: isActive ? 'success' : 'warning',
        action: isActive ? 'FREE_TRIAL_ENABLED' : 'FREE_TRIAL_DISABLED',
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isActive ? 'FREE_TRIAL_ENABLED' : 'FREE_TRIAL_DISABLED',
        resource: 'SARAF',
        resourceId: saraf.id,
        details: JSON.stringify({ isActive }),
      },
    });

    return NextResponse.json({
      success: true,
      saraf: updatedSaraf,
      message: isActive ? 'Free trial enabled' : 'Free trial disabled'
    });
  } catch (error: any) {
    console.error('Free trial toggle error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to toggle free trial' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/free-trial - Permanently deactivate free trial
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sarafId = searchParams.get('sarafId');

    if (!sarafId) {
      return NextResponse.json(
        { error: 'Saraf ID required' },
        { status: 400 }
      );
    }

    const updatedSaraf = await prisma.saraf.update({
      where: { id: sanitizeInput(sarafId) },
      data: {
        isOnFreeTrial: false,
        freeTrialEndDate: new Date(), // Set to now (expired)
      },
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'FREE_TRIAL_TERMINATED',
        resource: 'SARAF',
        resourceId: sarafId,
        details: JSON.stringify({ terminatedAt: new Date() }),
      },
    });

    return NextResponse.json({
      success: true,
      saraf: updatedSaraf,
      message: 'Free trial permanently deactivated',
    });
  } catch (error: any) {
    console.error('Free trial termination error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to terminate free trial' },
      { status: 500 }
    );
  }
}
