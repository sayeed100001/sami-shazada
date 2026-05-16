import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revokeUserSession } from '@/lib/session-registry'

export const dynamic = 'force-dynamic'

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!params.id) {
    return NextResponse.json({ error: 'Session id is required' }, { status: 400 })
  }

  if (params.id === session.user.sessionId) {
    return NextResponse.json({ error: 'Cannot revoke current session from this endpoint' }, { status: 400 })
  }

  await revokeUserSession(session.user.id, params.id)

  return NextResponse.json({ success: true })
}
