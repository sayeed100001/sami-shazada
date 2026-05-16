import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const symbol = sanitizeInput(searchParams.get('symbol') || '')

    const layouts = await prisma.chartLayout.findMany({
      where: {
        userId: session.user.id,
        ...(symbol && { symbol })
      },
      orderBy: [
        { isDefault: 'desc' },
        { updatedAt: 'desc' }
      ]
    })

    return NextResponse.json({ 
      layouts: layouts.map(layout => ({
        id: layout.id,
        name: layout.name,
        symbol: layout.symbol,
        timeframe: layout.timeframe,
        chartType: layout.chartType,
        indicators: JSON.parse(layout.indicators),
        settings: JSON.parse(layout.settings),
        isDefault: layout.isDefault,
        createdAt: layout.createdAt,
        updatedAt: layout.updatedAt
      }))
    })

  } catch (error) {
    console.error('Get layouts error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, symbol, timeframe, chartType, indicators, settings, isDefault } = await request.json()
    
    if (!name || !symbol || !timeframe) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // If setting as default, unset other defaults for this user
    if (isDefault) {
      await prisma.chartLayout.updateMany({
        where: { userId: session.user.id },
        data: { isDefault: false }
      })
    }

    const layout = await prisma.chartLayout.create({
      data: {
        userId: session.user.id,
        name: sanitizeInput(name),
        symbol: sanitizeInput(symbol),
        timeframe: sanitizeInput(timeframe),
        chartType: sanitizeInput(chartType || 'candlestick'),
        indicators: JSON.stringify(indicators || []),
        settings: JSON.stringify(settings || {}),
        isDefault: Boolean(isDefault)
      }
    })

    return NextResponse.json({ 
      success: true,
      layout: {
        id: layout.id,
        name: layout.name,
        symbol: layout.symbol,
        timeframe: layout.timeframe,
        chartType: layout.chartType,
        indicators: JSON.parse(layout.indicators),
        settings: JSON.parse(layout.settings),
        isDefault: layout.isDefault,
        createdAt: layout.createdAt,
        updatedAt: layout.updatedAt
      }
    })

  } catch (error) {
    console.error('Save layout error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
