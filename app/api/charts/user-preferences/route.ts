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

    // Try to get user preferences from database
    const preferences = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: [`user_${session.user.id}_chart_symbol`, `user_${session.user.id}_chart_interval`, `user_${session.user.id}_chart_type`]
        }
      }
    })

    const result = {
      lastSymbol: preferences.find(p => p.key === `user_${session.user.id}_chart_symbol`)?.value || 'BTCUSD',
      lastInterval: preferences.find(p => p.key === `user_${session.user.id}_chart_interval`)?.value || '1H',
      chartType: preferences.find(p => p.key === `user_${session.user.id}_chart_type`)?.value || 'candlestick'
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error loading chart preferences:', error)
    return NextResponse.json(
      { 
        lastSymbol: 'BTCUSD',
        lastInterval: '1H', 
        chartType: 'candlestick'
      }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { lastSymbol, lastInterval, chartType } = await request.json()

    // Save preferences to database
    const updates: Array<Promise<unknown>> = []
    
    if (lastSymbol) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: `user_${session.user.id}_chart_symbol` },
          update: { value: lastSymbol },
          create: { key: `user_${session.user.id}_chart_symbol`, value: lastSymbol }
        })
      )
    }
    
    if (lastInterval) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: `user_${session.user.id}_chart_interval` },
          update: { value: lastInterval },
          create: { key: `user_${session.user.id}_chart_interval`, value: lastInterval }
        })
      )
    }
    
    if (chartType) {
      updates.push(
        prisma.systemConfig.upsert({
          where: { key: `user_${session.user.id}_chart_type` },
          update: { value: chartType },
          create: { key: `user_${session.user.id}_chart_type`, value: chartType }
        })
      )
    }

    await Promise.all(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving chart preferences:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }
}
