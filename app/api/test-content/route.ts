import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { devEndpointDisabledResponse, isDevAdminEndpointEnabled } from '@/lib/dev-endpoints'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (!isDevAdminEndpointEnabled()) {
      return devEndpointDisabledResponse()
    }

    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const count = await prisma.contentItem.count()
    const items = await prisma.contentItem.findMany({
      select: { id: true, title: true, isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    })
    
    return NextResponse.json({
      success: true,
      count,
      items,
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, {
      status: 500,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0'
      }
    })
  }
}
