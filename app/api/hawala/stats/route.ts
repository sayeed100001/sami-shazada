import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { TransactionType } from '@prisma/client'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    // If user is logged in, return their own stats
    if (session?.user?.id) {
      const userId = session.user.id
      const hawalaTypes: TransactionType[] = ['HAWALA', 'HAWALA_REQUEST']
      const [total, pending, withdrawn, completed, cancelled] = await Promise.all([
        prisma.transaction.count({ where: { type: { in: hawalaTypes }, senderId: userId } }),
        prisma.transaction.count({ where: { type: { in: hawalaTypes }, status: 'PENDING', senderId: userId } }),
        prisma.transaction.count({ where: { type: 'HAWALA', status: 'WITHDRAWN', senderId: userId } }),
        prisma.transaction.count({ where: { type: 'HAWALA', status: 'COMPLETED', senderId: userId } }),
        prisma.transaction.count({ where: { type: { in: hawalaTypes }, status: 'CANCELLED', senderId: userId } }),
      ])
      return NextResponse.json({ total, pending, withdrawn, completed, cancelled })
    }

    // Unauthenticated: return global stats (for public tracking page)
    const hawalaTypes: TransactionType[] = ['HAWALA', 'HAWALA_REQUEST']
    const [total, pending, withdrawn, completed, cancelled] = await Promise.all([
      prisma.transaction.count({ where: { type: { in: hawalaTypes } } }),
      prisma.transaction.count({ where: { type: { in: hawalaTypes }, status: 'PENDING' } }),
      prisma.transaction.count({ where: { type: 'HAWALA', status: 'WITHDRAWN' } }),
      prisma.transaction.count({ where: { type: 'HAWALA', status: 'COMPLETED' } }),
      prisma.transaction.count({ where: { type: { in: hawalaTypes }, status: 'CANCELLED' } }),
    ])
    return NextResponse.json({ total, pending, withdrawn, completed, cancelled })

  } catch (error) {
    console.error('Hawala stats error:', error)
    return NextResponse.json({ error: 'Failed to fetch hawala stats' }, { status: 500 })
  }
}
