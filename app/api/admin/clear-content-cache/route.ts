import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear global content cache
    if (global.contentStorage) {
      delete global.contentStorage
    }

    console.log('Content cache cleared by admin:', session.user.email)

    return NextResponse.json({ 
      success: true, 
      message: 'Content cache cleared successfully' 
    })
  } catch (error) {
    console.error('Clear cache error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
