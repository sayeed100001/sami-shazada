import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const symbol = searchParams.get('symbol')
    const timeframe = searchParams.get('timeframe')

    if (!symbol || !timeframe) {
      return NextResponse.json({ error: 'Symbol and timeframe are required' }, { status: 400 })
    }

    const drawings = await prisma.chartDrawing.findMany({
      where: {
        userId: session.user.id,
        symbol,
        timeframe
      },
      orderBy: { createdAt: 'desc' }
    })

    const parsedDrawings = drawings.map(drawing => ({
      id: drawing.id,
      type: drawing.drawingType,
      data: JSON.parse(drawing.drawingData),
      name: drawing.name,
      createdAt: drawing.createdAt
    }))

    return NextResponse.json({ drawings: parsedDrawings })
  } catch (error) {
    console.error('Error loading drawings:', error)
    return NextResponse.json({ drawings: [] })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { symbol, timeframe, drawings } = await request.json()

    if (!symbol || !timeframe || !Array.isArray(drawings)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 })
    }

    // Delete existing drawings for this symbol/timeframe
    await prisma.chartDrawing.deleteMany({
      where: {
        userId: session.user.id,
        symbol,
        timeframe
      }
    })

    // Save new drawings
    if (drawings.length > 0) {
      await prisma.chartDrawing.createMany({
        data: drawings.map((drawing: any, index: number) => ({
          userId: session.user.id,
          symbol,
          timeframe,
          drawingType: drawing.type || 'line',
          drawingData: JSON.stringify(drawing.data || drawing),
          name: drawing.name || `Drawing ${index + 1}`
        }))
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error saving drawings:', error)
    return NextResponse.json({ error: 'Failed to save drawings' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const drawingId = searchParams.get('id')

    if (!drawingId) {
      return NextResponse.json({ error: 'Drawing ID is required' }, { status: 400 })
    }

    await prisma.chartDrawing.deleteMany({
      where: {
        id: drawingId,
        userId: session.user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting drawing:', error)
    return NextResponse.json({ error: 'Failed to delete drawing' }, { status: 500 })
  }
}
