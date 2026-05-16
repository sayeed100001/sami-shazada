import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const alerts = await prisma.chartAlert.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Alerts fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { symbol, condition, targetPrice, message } = await request.json();

    const alert = await prisma.chartAlert.create({
      data: {
        userId: session.user.id,
        symbol,
        name: `Alert for ${symbol}`,
        condition,
        targetPrice: parseFloat(targetPrice),
        message: message || `Price alert for ${symbol}`,
        isActive: true
      }
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Alert create error:', error);
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const alertId = searchParams.get('id');

    if (!alertId) {
      return NextResponse.json({ error: 'Alert ID required' }, { status: 400 });
    }

    await prisma.chartAlert.delete({
      where: {
        id: alertId,
        userId: session.user.id
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Alert delete error:', error);
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id, isActive } = await request.json();

    const alert = await prisma.chartAlert.update({
      where: {
        id,
        userId: session.user.id
      },
      data: { isActive }
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Alert update error:', error);
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 });
  }
}
