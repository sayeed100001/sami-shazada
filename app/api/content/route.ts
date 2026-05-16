import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const contentItems = await prisma.contentItem.findMany({
      where: {
        isActive: true,
        position: 'DASHBOARD'
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(contentItems, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
        'X-Content-Type-Options': 'nosniff'
      }
    })
  } catch (error) {
    console.error('Content fetch error:', error)
    return NextResponse.json([], {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        'X-Content-Fallback': 'true'
      }
    })
  }
}
