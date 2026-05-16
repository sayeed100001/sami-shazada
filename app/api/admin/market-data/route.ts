import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidatePattern } from '@/lib/enterprise-cache'
import type { MarketData } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const marketData = await prisma.marketData.findMany({
      orderBy: [
        { type: 'asc' },
        { symbol: 'asc' }
      ]
    })

    return NextResponse.json({ marketData })

  } catch (error) {
    console.error('Market data fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch market data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { symbol, type, name, price, change24h, changePercent24h, volume24h, marketCap } = body

    if (!symbol || !type || !name || price === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    if (!['CURRENCY', 'CRYPTO', 'COMMODITY'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    const marketData = await prisma.marketData.upsert({
      where: {
        symbol_type: {
          symbol,
          type
        }
      },
      update: {
        name,
        price,
        change24h: change24h || 0,
        changePercent24h: changePercent24h || 0,
        volume24h: volume24h || 0,
        marketCap: marketCap || 0,
        lastUpdate: new Date()
      },
      create: {
        symbol,
        type,
        name,
        price,
        change24h: change24h || 0,
        changePercent24h: changePercent24h || 0,
        volume24h: volume24h || 0,
        marketCap: marketCap || 0
      }
    })

    invalidatePattern('market:.*')

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MARKET_DATA_UPDATED',
        resource: 'MARKET_DATA',
        resourceId: marketData.id,
        details: JSON.stringify({ symbol, type, price })
      }
    })

    return NextResponse.json({
      success: true,
      marketData
    })

  } catch (error) {
    console.error('Market data update error:', error)
    return NextResponse.json(
      { error: 'Failed to update market data' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { updates } = body

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'Invalid updates array' },
        { status: 400 }
      )
    }

    const results: MarketData[] = []

    for (const update of updates) {
      const { symbol, type, price, change24h, changePercent24h } = update

      if (!symbol || !type || price === undefined) continue

      const marketData = await prisma.marketData.upsert({
        where: {
          symbol_type: {
            symbol,
            type
          }
        },
        update: {
          price,
          change24h: change24h || 0,
          changePercent24h: changePercent24h || 0,
          lastUpdate: new Date()
        },
        create: {
          symbol,
          type,
          name: symbol,
          price,
          change24h: change24h || 0,
          changePercent24h: changePercent24h || 0
        }
      })

      results.push(marketData)
    }

    invalidatePattern('market:.*')

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MARKET_DATA_BULK_UPDATE',
        resource: 'MARKET_DATA',
        details: JSON.stringify({ count: results.length })
      }
    })

    return NextResponse.json({
      success: true,
      updated: results.length
    })

  } catch (error) {
    console.error('Market data bulk update error:', error)
    return NextResponse.json(
      { error: 'Failed to update market data' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing id parameter' },
        { status: 400 }
      )
    }

    await prisma.marketData.delete({
      where: { id }
    })

    invalidatePattern('market:.*')

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'MARKET_DATA_DELETED',
        resource: 'MARKET_DATA',
        resourceId: id
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Market data deleted'
    })

  } catch (error) {
    console.error('Market data deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete market data' },
      { status: 500 }
    )
  }
}
