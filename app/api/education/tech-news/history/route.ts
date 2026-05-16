import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const category = searchParams.get('category')
    const source = searchParams.get('source')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    const skip = (page - 1) * limit

    // Build where clause
    const whereClause: any = {}
    
    if (category && category !== 'all') {
      whereClause.category = category
    }
    
    if (source && source !== 'all') {
      whereClause.source = source
    }
    
    if (dateFrom || dateTo) {
      whereClause.publishedAt = {}
      if (dateFrom) {
        whereClause.publishedAt.gte = new Date(dateFrom)
      }
      if (dateTo) {
        whereClause.publishedAt.lte = new Date(dateTo)
      }
    }

    const [techNews, totalCount] = await Promise.all([
      prisma.techNews.findMany({
        where: whereClause,
        orderBy: { publishedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          title: true,
          description: true,
          url: true,
          source: true,
          category: true,
          imageUrl: true,
          publishedAt: true,
          isActive: true,
          views: true,
          createdAt: true
        }
      }),
      prisma.techNews.count({ where: whereClause })
    ])

    const totalPages = Math.ceil(totalCount / limit)

    return NextResponse.json({
      news: techNews,
      pagination: {
        currentPage: page,
        totalPages,
        totalCount,
        hasNext: page < totalPages,
        hasPrev: page > 1
      },
      filters: {
        categories: await prisma.techNews.groupBy({
          by: ['category'],
          _count: { category: true }
        }),
        sources: await prisma.techNews.groupBy({
          by: ['source'],
          _count: { source: true }
        })
      }
    })

  } catch (error) {
    console.error('Tech news history fetch error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      news: [],
      pagination: {
        currentPage: 1,
        totalPages: 0,
        totalCount: 0,
        hasNext: false,
        hasPrev: false
      }
    }, { status: 500 })
  }
}
