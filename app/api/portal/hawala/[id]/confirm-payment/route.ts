import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { hasRequiredBranchAccess, resolvePortalAccessContext } from '@/lib/saraf-access'
import { grantHawalaUsageReward } from '@/lib/user-reward-service'

export const dynamic = 'force-dynamic'

function mergeInternalNotes(
  existingNotes: string | null,
  notes: string | null,
  paymentProof: string | null
): string | null {
  const parts = [existingNotes, notes]

  if (paymentProof) {
    parts.push(`payment-proof:${paymentProof}`)
  }

  const merged = parts
    .map((value) => value?.trim())
    .filter((value): value is string => !!value)
    .join('\n')

  return merged || null
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)

    if (
      !session?.user?.id ||
      !['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'].includes(session.user.role)
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access not found' }, { status: 403 })
    }

    const rawBody = await request.text()
    let parsedBody: any = null
    if (rawBody) {
      try {
        parsedBody = JSON.parse(rawBody)
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
      }
    }
    const notes = parsedBody?.notes ? sanitizeInput(parsedBody.notes) : null
    const paymentProof = parsedBody?.paymentProof ? sanitizeInput(parsedBody.paymentProof) : null

    const transaction = await prisma.transaction.findUnique({
      where: { id: params.id },
      include: {
        saraf: true,
        originBranch: true,
        destinationBranch: true,
        sender: true,
      },
    })

    if (!transaction || transaction.type !== 'HAWALA') {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    if (
      !transaction.originBranchId ||
      !transaction.destinationBranchId ||
      !transaction.originBranch ||
      !transaction.destinationBranch
    ) {
      return NextResponse.json(
        { error: 'Transaction branch information is missing' },
        { status: 400 }
      )
    }

    if (!['PENDING', 'WITHDRAWN'].includes(transaction.status)) {
      return NextResponse.json(
        { error: 'Transaction cannot be completed from its current status' },
        { status: 400 }
      )
    }

    // Destination saraf/branch must be able to confirm payment for cross-saraf partnerships.
    if (!hasRequiredBranchAccess(accessContext, transaction.destinationBranchId)) {
      return NextResponse.json(
        { error: 'You do not have access to confirm payment for this branch' },
        { status: 403 }
      )
    }

    const now = new Date()
    const updateResult = await prisma.$transaction(async (tx) => {
      const updated = await tx.transaction.updateMany({
        where: {
          id: params.id,
          type: 'HAWALA',
          status: { in: ['PENDING', 'WITHDRAWN'] },
          completedAt: null,
        },
        data: {
          status: 'COMPLETED',
          paidBy: transaction.paidBy || session.user.id,
          paidAt: transaction.paidAt || now,
          completedAt: now,
          internalNotes: mergeInternalNotes(transaction.internalNotes, notes, paymentProof),
        },
      })

      if (updated.count !== 1) {
        return null
      }

      await tx.saraf.update({
        where: { id: transaction.sarafId },
        data: { totalTransactions: { increment: 1 } },
      })

      // Auto-reward: grant a small next-transfer discount to simple users after completing a hawala.
      // This is capped in config + service to avoid runaway liability.
      if (transaction.senderId && transaction.sender?.role === 'USER') {
        await grantHawalaUsageReward(tx, transaction.senderId)
      }

      return tx.transaction.findUnique({
        where: { id: params.id },
        include: {
          saraf: true,
          originBranch: true,
          destinationBranch: true,
          sender: true,
        },
      })
    })

    if (!updateResult) {
      return NextResponse.json(
        { error: 'Transaction is already completed or cannot be completed from its current status' },
        { status: 400 }
      )
    }

    const originStaff = await prisma.branchStaff.findMany({
      where: {
        branchId: transaction.originBranchId,
        isActive: true,
      },
      include: { user: true },
    })

    for (const staff of originStaff) {
      await prisma.notification.create({
        data: {
          userId: staff.userId,
          title: 'Hawala completed',
          message: `Hawala ${transaction.referenceCode} was completed by ${transaction.destinationBranch.name}.`,
          type: 'success',
          action: 'HAWALA_PAID',
          resource: 'TRANSACTION',
          resourceId: transaction.id,
        },
      })
    }

    if (transaction.senderId) {
      await prisma.notification.create({
        data: {
          userId: transaction.senderId,
          title: 'Your hawala was completed',
          message: `Hawala ${transaction.referenceCode} was completed successfully for ${transaction.receiverName}.`,
          type: 'success',
          action: 'HAWALA_PAID',
          resource: 'TRANSACTION',
          resourceId: transaction.id,
        },
      })
    }

    const chat = await prisma.internalChat.findFirst({
      where: {
        sarafId: transaction.sarafId,
        type: 'BRANCH_TO_BRANCH',
      },
    })

    if (chat) {
      await prisma.internalChatMessage.create({
        data: {
          chatId: chat.id,
          senderId: session.user.id,
          senderName: session.user.name || 'Unknown',
          message: `Payment confirmed for ${transaction.referenceCode}\nAmount: ${transaction.toAmount} ${transaction.toCurrency}\nReceiver: ${transaction.receiverName}`,
        },
      })
    }

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'HAWALA_PAYMENT_CONFIRMED',
        resource: 'TRANSACTION',
        resourceId: transaction.id,
        details: JSON.stringify({
          referenceCode: transaction.referenceCode,
          amount: transaction.toAmount,
          currency: transaction.toCurrency,
          originBranch: transaction.originBranch.name,
          destinationBranch: transaction.destinationBranch.name,
          previousStatus: transaction.status,
        }),
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      transaction: updateResult,
    })
  } catch (error) {
    console.error('Payment confirmation error:', error)
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    )
  }
}
