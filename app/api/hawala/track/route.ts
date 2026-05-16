import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

function buildTrackingDetails(transaction: {
  type: string
  status: string
  createdAt: Date
  updatedAt: Date
  paidAt: Date | null
  completedAt: Date | null
}) {
  if (transaction.type === 'HAWALA_REQUEST') {
    const progressPercentage =
      transaction.status === 'PENDING'
        ? 20
        : transaction.status === 'COMPLETED'
          ? 100
          : 0

    const statusHistory = [
      {
        status: 'REQUEST_CREATED',
        timestamp: transaction.createdAt.toISOString(),
        description: 'Customer request was created',
      },
    ]

    if (transaction.status === 'COMPLETED' && transaction.completedAt) {
      statusHistory.push({
        status: 'APPROVED',
        timestamp: transaction.completedAt.toISOString(),
        description: 'Saraf approved and completed the request',
      })
    } else if (transaction.status === 'CANCELLED') {
      statusHistory.push({
        status: 'REJECTED',
        timestamp: transaction.updatedAt.toISOString(),
        description: 'Saraf rejected the request',
      })
    } else {
      statusHistory.push({
        status: 'UNDER_REVIEW',
        timestamp: transaction.updatedAt.toISOString(),
        description: 'Request is waiting for saraf review',
      })
    }

    return {
      progressPercentage,
      statusHistory,
      tracking: {
        canCancel: transaction.status === 'PENDING',
        canComplete: false,
        estimatedTime: transaction.status === 'PENDING' ? 'Pending saraf review' : 'Processed',
        nextStep:
          transaction.status === 'PENDING'
            ? 'Wait for saraf approval'
            : transaction.status === 'COMPLETED'
              ? 'Request completed'
              : 'Request cancelled',
      },
    }
  }

  let progressPercentage = 0
  switch (transaction.status) {
    case 'PENDING':
      progressPercentage = 25
      break
    case 'WITHDRAWN':
      progressPercentage = 75
      break
    case 'COMPLETED':
      progressPercentage = 100
      break
    case 'CANCELLED':
      progressPercentage = 0
      break
    default:
      progressPercentage = 50
  }

  const statusHistory = [
    {
      status: 'CREATED',
      timestamp: transaction.createdAt.toISOString(),
      description: 'Transaction was created',
    },
  ]

  if (transaction.status === 'WITHDRAWN' && transaction.paidAt) {
    statusHistory.push({
      status: 'WITHDRAWN',
      timestamp: transaction.paidAt.toISOString(),
      description: 'Hawala was paid or withdrawn',
    })
  }

  if (transaction.status === 'COMPLETED' && transaction.completedAt) {
    statusHistory.push({
      status: 'COMPLETED',
      timestamp: transaction.completedAt.toISOString(),
      description: 'Transaction completed successfully',
    })
  } else if (transaction.status === 'CANCELLED') {
    statusHistory.push({
      status: 'CANCELLED',
      timestamp: transaction.updatedAt.toISOString(),
      description: 'Transaction was cancelled',
    })
  } else if (transaction.status === 'PENDING') {
    statusHistory.push({
      status: 'PROCESSING',
      timestamp: transaction.updatedAt.toISOString(),
      description: 'Transaction is being reviewed',
    })
  }

  return {
    progressPercentage,
    statusHistory,
    tracking: {
      canCancel: transaction.status === 'PENDING',
      canComplete: transaction.status === 'PENDING',
      estimatedTime: transaction.status === 'PENDING' ? '2-4 hours' : 'Completed',
      nextStep:
        transaction.status === 'PENDING'
          ? 'Final approval and payment'
          : transaction.status === 'WITHDRAWN'
            ? 'Waiting for final completion'
            : transaction.status === 'COMPLETED'
              ? 'Transaction completed'
              : 'Transaction cancelled',
    },
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')

    if (!code) {
      return NextResponse.json({ error: 'Reference code is required' }, { status: 400 })
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        referenceCode: code,
        type: { in: ['HAWALA', 'HAWALA_REQUEST'] },
      },
      include: {
        saraf: {
          select: {
            businessName: true,
            businessPhone: true,
            businessAddress: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    const role = session.user.role
    const isAdmin = role === 'ADMIN'
    const isSender = role === 'USER' && transaction.senderId === session.user.id
    const isSarafOwner =
      role === 'SARAF' &&
      !!session.user.sarafId &&
      transaction.sarafId === session.user.sarafId

    let isBranchStaff = false
    if (
      !isAdmin &&
      !isSender &&
      !isSarafOwner &&
      (role === 'BRANCH_MANAGER' || role === 'BRANCH_STAFF')
    ) {
      const branchIds = [transaction.originBranchId, transaction.destinationBranchId].filter(
        Boolean
      ) as string[]
      if (branchIds.length > 0) {
        const [staffCount, managedCount] = await Promise.all([
          prisma.branchStaff.count({
            where: { userId: session.user.id, isActive: true, branchId: { in: branchIds } },
          }),
          prisma.sarafBranch.count({
            where: { id: { in: branchIds }, managerId: session.user.id, isActive: true },
          }),
        ])
        isBranchStaff = staffCount > 0 || managedCount > 0
      }
    }

    if (!isAdmin && !isSender && !isSarafOwner && !isBranchStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const trackingView = buildTrackingDetails(transaction)

    return NextResponse.json({
      transaction: {
        ...transaction,
        progressPercentage: trackingView.progressPercentage,
      },
      statusHistory: trackingView.statusHistory,
      tracking: trackingView.tracking,
    })
  } catch (error) {
    console.error('Hawala track error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
