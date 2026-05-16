import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

function maskPhone(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length < 4) return '***'
  return `${digits.slice(0, 2)}***${digits.slice(-2)}`
}

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const trackingCode = sanitizeInput(params.code)

    if (!trackingCode) {
      return NextResponse.json(
        { error: 'Invalid tracking code' },
        { status: 400 }
      )
    }

    const transaction = await prisma.transaction.findFirst({
      where: {
        referenceCode: trackingCode,
        type: { in: ['HAWALA', 'HAWALA_REQUEST'] },
      },
      include: {
        saraf: {
          select: {
            id: true,
            businessName: true,
            businessPhone: true,
            businessAddress: true,
            rating: true,
            isActive: true,
            isPremium: true,
          },
        },
      },
    })

    if (!transaction) {
      return NextResponse.json(
        { error: 'Transaction not found' },
        { status: 404 }
      )
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

    const isSensitiveAllowed = isAdmin || isSarafOwner || isBranchStaff || isSender

    const response = {
      id: transaction.id,
      referenceCode: transaction.referenceCode,
      status: transaction.status,
      type: transaction.type,
      fromAmount: transaction.fromAmount,
      toAmount: transaction.toAmount,
      fromCurrency: transaction.fromCurrency,
      toCurrency: transaction.toCurrency,
      rate: transaction.rate,
      fee: transaction.totalCommission || transaction.systemCommission || 0,
      senderName: transaction.senderName,
      senderPhone: isSensitiveAllowed
        ? transaction.senderPhone
        : maskPhone(transaction.senderPhone),
      senderCountry: transaction.senderCountry,
      receiverName: transaction.receiverName,
      receiverPhone: isSensitiveAllowed
        ? transaction.receiverPhone
        : maskPhone(transaction.receiverPhone),
      receiverCity: transaction.receiverCity,
      receiverCountry: transaction.receiverCountry || 'Afghanistan',
      notes: isSensitiveAllowed ? transaction.notes : null,
      createdAt: transaction.createdAt.toISOString(),
      completedAt: transaction.completedAt?.toISOString(),
      saraf: transaction.saraf,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Hawala tracking error:', error)
    return NextResponse.json(
      { error: 'Failed to track transaction' },
      { status: 500 }
    )
  }
}
