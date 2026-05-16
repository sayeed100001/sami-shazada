import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getMessengerContext, getAllAccessibleChats, canAccessUnifiedMessenger } from '@/lib/unified-messenger-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !session?.user?.role) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canAccess = await canAccessUnifiedMessenger(session.user.id, session.user.role as any)
    if (!canAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const context = await getMessengerContext(session.user.id, session.user.role as any)
    if (!context) {
      return NextResponse.json({ error: 'Failed to get messenger context' }, { status: 500 })
    }

    const chats = await getAllAccessibleChats(context)

    return NextResponse.json({
      success: true,
      context,
      chats,
      features: {
        voiceRecording: true,
        fileUpload: true,
        stories: context.accessMode !== 'USER',
        friendRequests: true,
        groups: context.accessMode === 'OWNER' || context.accessMode === 'ADMIN',
        broadcast: context.accessMode === 'ADMIN',
      },
    })
  } catch (error) {
    console.error('Unified messenger error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load messenger' },
      { status: 500 }
    )
  }
}
