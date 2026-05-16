import { NextRequest, NextResponse } from 'next/server'
import { getPublicUserProfile } from '@/lib/social-features'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const profile = await getPublicUserProfile(id)

    if (!profile) {
      return NextResponse.json({ error: 'Profile not available' }, { status: 404 })
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error('Public community profile error:', error)
    return NextResponse.json({ error: 'Failed to load profile' }, { status: 500 })
  }
}
