import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getStoredUserSettings } from '@/lib/user-settings'
import { generateTransactionShareToken } from '@/lib/transaction-sharing'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const shares = await prisma.transactionShare.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        transaction: {
          select: {
            referenceCode: true,
            type: true,
            status: true,
            fromCurrency: true,
            toCurrency: true,
            createdAt: true,
          },
        },
      },
      take: 20,
    })

    return NextResponse.json({
      shares: shares.map((share) => ({
        id: share.id,
        shareToken: share.shareToken,
        title: share.title,
        note: share.note,
        isActive: share.isActive,
        allowAmounts: share.allowAmounts,
        allowParticipants: share.allowParticipants,
        allowSaraf: share.allowSaraf,
        views: share.views,
        expiresAt: share.expiresAt?.toISOString() || null,
        createdAt: share.createdAt.toISOString(),
        transaction: {
          referenceCode: share.transaction.referenceCode,
          type: share.transaction.type,
          status: share.transaction.status,
          fromCurrency: share.transaction.fromCurrency,
          toCurrency: share.transaction.toCurrency,
          createdAt: share.transaction.createdAt.toISOString(),
        },
      })),
    })
  } catch (error) {
    console.error('Transaction share list error:', error)
    return NextResponse.json({ error: 'Failed to load shares' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const settings = await getStoredUserSettings(session.user.id)
    if (!settings.privacy.dataSharing) {
      return NextResponse.json(
        { error: 'Enable data sharing in settings before creating public share links.' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const transactionId = typeof body.transactionId === 'string' ? body.transactionId.trim() : ''
    const title = typeof body.title === 'string' ? body.title.trim().slice(0, 120) : ''
    const note = typeof body.note === 'string' ? body.note.trim().slice(0, 300) : ''
    const allowAmounts = body.allowAmounts === true
    const allowParticipants = body.allowParticipants === true
    const allowSaraf = body.allowSaraf !== false

    if (!transactionId) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        senderId: session.user.id,
      },
      select: {
        id: true,
        type: true,
        referenceCode: true,
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const shareToken = generateTransactionShareToken()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    const share = await prisma.transactionShare.create({
      data: {
        userId: session.user.id,
        transactionId: transaction.id,
        shareToken,
        title: title || `${transaction.type} share`,
        note: note || null,
        allowAmounts,
        allowParticipants,
        allowSaraf,
        expiresAt,
      },
    })

    return NextResponse.json({
      success: true,
      share: {
        id: share.id,
        shareToken: share.shareToken,
        shareUrl: `/shared/transactions/${share.shareToken}`,
        expiresAt: share.expiresAt?.toISOString() || null,
      },
    })
  } catch (error) {
    console.error('Transaction share create error:', error)
    return NextResponse.json({ error: 'Failed to create share' }, { status: 500 })
  }
}
