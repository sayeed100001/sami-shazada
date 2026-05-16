import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Try to get assets from database
    let assets = await prisma.asset.findMany({
      where: { isActive: true },
      orderBy: { symbol: 'asc' }
    })

    // If no assets in database, create default ones
    if (assets.length === 0) {
      const defaultAssets = [
        // Crypto
        { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto', category: 'major', exchange: 'Binance' },
        { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto', category: 'major', exchange: 'Binance' },
        { symbol: 'ADAUSD', name: 'Cardano', type: 'crypto', category: 'major', exchange: 'Binance' },
        { symbol: 'SOLUSD', name: 'Solana', type: 'crypto', category: 'major', exchange: 'Binance' },
        { symbol: 'DOTUSD', name: 'Polkadot', type: 'crypto', category: 'major', exchange: 'Binance' },
        
        // Forex
        { symbol: 'EURUSD', name: 'Euro/US Dollar', type: 'forex', category: 'major', exchange: 'FX' },
        { symbol: 'GBPUSD', name: 'British Pound/US Dollar', type: 'forex', category: 'major', exchange: 'FX' },
        { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', type: 'forex', category: 'major', exchange: 'FX' },
        { symbol: 'USDCHF', name: 'US Dollar/Swiss Franc', type: 'forex', category: 'major', exchange: 'FX' },
        { symbol: 'AUDUSD', name: 'Australian Dollar/US Dollar', type: 'forex', category: 'major', exchange: 'FX' },
        { symbol: 'USDCAD', name: 'US Dollar/Canadian Dollar', type: 'forex', category: 'major', exchange: 'FX' },
        { symbol: 'NZDUSD', name: 'New Zealand Dollar/US Dollar', type: 'forex', category: 'major', exchange: 'FX' },
        
        // Commodities
        { symbol: 'XAUUSD', name: 'Gold', type: 'commodity', category: 'precious', exchange: 'TVC' },
        { symbol: 'XAGUSD', name: 'Silver', type: 'commodity', category: 'precious', exchange: 'TVC' },
        { symbol: 'USOIL', name: 'Crude Oil', type: 'commodity', category: 'energy', exchange: 'TVC' },
        { symbol: 'UKOIL', name: 'Brent Oil', type: 'commodity', category: 'energy', exchange: 'TVC' },
        { symbol: 'NATGAS', name: 'Natural Gas', type: 'commodity', category: 'energy', exchange: 'TVC' },
        
        // Indices
        { symbol: 'SPX500', name: 'S&P 500', type: 'index', category: 'major', exchange: 'TVC' },
        { symbol: 'NAS100', name: 'NASDAQ 100', type: 'index', category: 'major', exchange: 'TVC' },
        { symbol: 'DJI', name: 'Dow Jones', type: 'index', category: 'major', exchange: 'TVC' },
        { symbol: 'UK100', name: 'FTSE 100', type: 'index', category: 'major', exchange: 'TVC' },
        { symbol: 'GER40', name: 'DAX', type: 'index', category: 'major', exchange: 'TVC' },
        { symbol: 'JPN225', name: 'Nikkei 225', type: 'index', category: 'major', exchange: 'TVC' }
      ]

      // Create assets in database
      for (const asset of defaultAssets) {
        await prisma.asset.upsert({
          where: { symbol: asset.symbol },
          update: {},
          create: {
            ...asset,
            isActive: true
          }
        })
      }

      // Fetch the created assets
      assets = await prisma.asset.findMany({
        where: { isActive: true },
        orderBy: { symbol: 'asc' }
      })
    }

    // Get latest market data for assets
    const assetsWithPrices = await Promise.all(
      assets.map(async (asset) => {
        const marketData = await prisma.marketData.findFirst({
          where: { 
            symbol: asset.symbol,
            type: asset.type
          },
          orderBy: { lastUpdate: 'desc' }
        })

        return {
          symbol: asset.symbol,
          name: asset.name,
          type: asset.type as 'crypto' | 'forex' | 'commodity' | 'stock' | 'index',
          category: asset.category || 'major',
          exchange: asset.exchange || 'Unknown',
          price: marketData?.price,
          change24h: marketData?.changePercent24h,
          volume24h: marketData?.volume24h
        }
      })
    )

    return NextResponse.json({ assets: assetsWithPrices })
  } catch (error) {
    console.error('Error loading assets:', error)
    
    // Return a safe fallback asset list (no fake prices) if database is unavailable
    const defaultAssets = [
      { symbol: 'BTCUSD', name: 'Bitcoin', type: 'crypto' as const, category: 'major', exchange: 'Binance' },
      { symbol: 'ETHUSD', name: 'Ethereum', type: 'crypto' as const, category: 'major', exchange: 'Binance' },
      { symbol: 'EURUSD', name: 'Euro/US Dollar', type: 'forex' as const, category: 'major', exchange: 'FX' },
      { symbol: 'GBPUSD', name: 'British Pound/US Dollar', type: 'forex' as const, category: 'major', exchange: 'FX' },
      { symbol: 'XAUUSD', name: 'Gold', type: 'commodity' as const, category: 'precious', exchange: 'TVC' },
      { symbol: 'SPX500', name: 'S&P 500', type: 'index' as const, category: 'major', exchange: 'TVC' }
    ]
    
    return NextResponse.json({ assets: defaultAssets, fallback: true })
  }
}
