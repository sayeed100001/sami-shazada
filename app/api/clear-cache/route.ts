import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import cache from '@/lib/enterprise-cache'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Clear app-level caches (safe outside Vercel/Next revalidation environment)
    cache.clear()
    const hasContentStorage = Boolean((globalThis as any).contentStorage)
    if (hasContentStorage) {
      delete (globalThis as any).contentStorage
    }
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cache cleared successfully',
      cleared: {
        enterpriseCache: true,
        contentStorage: hasContentStorage
      }
    })
  } catch (error) {
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to clear cache' 
    }, { status: 500 })
  }
}

export async function GET() {
  return POST()
}
