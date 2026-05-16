import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const watchlist = await prisma.userWatchlist.findMany({
      where: { userId: session.user.id },
      include: { asset: true },
      orderBy: { order: 'asc' }
    })

    const watchlistWithPrices = await Promise.all(
      watchlist.map(async (item) => {
        // Get latest market data for the asset
        const marketData = await prisma.marketData.findFirst({
          where: { 
            symbol: item.asset.symbol,
            type: item.asset.type
          },
          orderBy: { lastUpdate: 'desc' }
        })

        return {
          symbol: item.asset.symbol,
          name: item.asset.name,
          type: item.asset.type,
          price: marketData?.price,
          change24h: marketData?.changePercent24h
        }
      })
    )

    return NextResponse.json({ watchlist: watchlistWithPrices })
  } catch (error) {
    console.error('Error loading watchlist:', error)
    
    // Return default watchlist if error
    const defaultWatchlist = [
      { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto', price: 45000, change24h: 2.5 },
      { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto', price: 3200, change24h: -1.2 },
      { symbol: 'EURUSD', name: 'Euro/US Dollar', type: 'forex', price: 1.0850, change24h: 0.3 },
      { symbol: 'XAUUSD', name: 'Gold', type: 'commodity', price: 2050, change24h: 1.1 }
    ]
    
    return NextResponse.json({ watchlist: defaultWatchlist })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol } = await request.json()

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
    }

    // Find or create asset
    let asset = await prisma.asset.findUnique({
      where: { symbol }
    })

    if (!asset) {
      // Create asset if it doesn't exist
      const assetType = symbol.includes('USD') ? 
        (symbol.startsWith('BTC') || symbol.startsWith('ETH') ? 'crypto' : 'forex') : 
        'commodity'
      
      asset = await prisma.asset.create({
        data: {
          symbol,
          name: symbol,
          type: assetType
        }
      })
    }

    // Check if already in watchlist
    const existing = await prisma.userWatchlist.findUnique({
      where: {
        userId_assetId: {
          userId: session.user.id,
          assetId: asset.id
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Asset already in watchlist' }, { status: 400 })
    }

    // Get next order number
    const lastItem = await prisma.userWatchlist.findFirst({
      where: { userId: session.user.id },
      orderBy: { order: 'desc' }
    })

    const nextOrder = (lastItem?.order || 0) + 1

    // Add to watchlist
    await prisma.userWatchlist.create({
      data: {
        userId: session.user.id,
        assetId: asset.id,
        order: nextOrder
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error adding to watchlist:', error)
    return NextResponse.json({ error: 'Failed to add to watchlist' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')

    if (!symbol) {
      return NextResponse.json({ error: 'Symbol is required' }, { status: 400 })
    }

    // Find asset
    const asset = await prisma.asset.findUnique({
      where: { symbol }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Remove from watchlist
    await prisma.userWatchlist.deleteMany({
      where: {
        userId: session.user.id,
        assetId: asset.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from watchlist:', error)
    return NextResponse.json({ error: 'Failed to remove from watchlist' }, { status: 500 })
  }
}
