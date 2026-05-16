import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { parsePaginationParams, createPaginationResult, createPaginatedResponse } from '@/lib/pagination'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const sessionId = params.id

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const { skip, take, page, limit } = parsePaginationParams(searchParams)

    try {
      const chatSession = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        select: { id: true, type: true },
      })

      if (!chatSession) {
        return NextResponse.json({ error: 'Chat session not found' }, { status: 404 })
      }

      if (chatSession.type !== 'SUPPORT') {
        return NextResponse.json({ error: 'Invalid chat session type' }, { status: 400 })
      }

      const [messages, total] = await Promise.all([
        prisma.chatMessage.findMany({
          where: { sessionId },
          orderBy: { timestamp: 'asc' },
          skip,
          take
        }),
        prisma.chatMessage.count({
          where: { sessionId }
        })
      ])

      const pagination = createPaginationResult(page, limit, total)
      return NextResponse.json(createPaginatedResponse(messages, pagination))

    } catch (dbError) {
      console.error('Database error in get messages:', dbError)
      return NextResponse.json({ 
        success: true,
        data: [],
        pagination: createPaginationResult(1, 10, 0)
      })
    }

  } catch (error) {
    console.error('Get messages error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
