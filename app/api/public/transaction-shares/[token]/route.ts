import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildPublicTransactionShare } from '@/lib/transaction-sharing'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const share = await buildPublicTransactionShare(token)

    if (!share) {
      return NextResponse.json({ error: 'Share not found' }, { status: 404 })
    }

    await prisma.transactionShare.update({
      where: { shareToken: token },
      data: { views: { increment: 1 } },
    })

    return NextResponse.json({
      ...share,
      views: share.views + 1,
    })
  } catch (error) {
    console.error('Public transaction share error:', error)
    return NextResponse.json({ error: 'Failed to load shared transaction' }, { status: 500 })
  }
}
