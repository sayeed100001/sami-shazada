import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const techNews = await prisma.techNews.findMany({
      orderBy: { publishedAt: 'desc' },
      take: 200
    })

    return NextResponse.json(techNews, {
      headers: { 'Cache-Control': 'no-store' }
    })

  } catch (error) {
    console.error('Admin tech news fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tech news' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, isActive } = body

    if (!id) {
      return NextResponse.json({ error: 'Missing news ID' }, { status: 400 })
    }

    const updatedNews = await prisma.techNews.update({
      where: { id },
      data: { isActive: Boolean(isActive) }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'NEWS_STATUS_UPDATED',
        resource: 'EDUCATION',
        resourceId: id,
        details: JSON.stringify({
          isActive: Boolean(isActive)
        })
      }
    })

    return NextResponse.json(updatedNews)

  } catch (error) {
    console.error('Tech news update error:', error)
    return NextResponse.json(
      { error: 'Failed to update tech news' },
      { status: 500 }
    )
  }
}
