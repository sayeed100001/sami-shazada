import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { listUserSessions, revokeOtherUserSessions } from '@/lib/session-registry'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessions = await listUserSessions(session.user.id)

  return NextResponse.json({
    success: true,
    sessions: sessions.map((activeSession) => ({
      ...activeSession,
      isCurrent: activeSession.id === session.user.sessionId
    }))
  })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const scope = request.nextUrl.searchParams.get('scope') || 'others'

  if (scope !== 'others') {
    return NextResponse.json({ error: 'Unsupported scope' }, { status: 400 })
  }

  await revokeOtherUserSessions(session.user.id, session.user.sessionId)

  return NextResponse.json({ success: true })
}
