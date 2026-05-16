import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import { withRateLimit } from '@/lib/rate-limit-middleware'

export const dynamic = 'force-dynamic'

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function phoneMatches(inputPhone: string, storedPhone: string): boolean {
  const input = normalizePhone(inputPhone)
  const stored = normalizePhone(storedPhone)
  if (!input || !stored) return false
  if (input === stored) return true
  const lastDigits = 7
  return input.slice(-lastDigits) === stored.slice(-lastDigits)
}

// GET /api/public/track?token=xxx&phone=xxx - Track transaction without login
async function handler(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const token = sanitizeInput(searchParams.get('token'))
    const phone = sanitizeInput(searchParams.get('phone'))
    const referenceCode = sanitizeInput(searchParams.get('ref'))

    if (!token && !referenceCode) {
      return NextResponse.json(
        { success: false, error: 'Tracking token or reference code required' },
        { status: 400 }
      )
    }

    if (!phone) {
      return NextResponse.json(
        { success: false, error: 'Phone number required for tracking' },
        { status: 400 }
      )
    }

    let transaction

    // Track by token (for guest transactions)
    if (token) {
      const guestTransaction = await prisma.guestTransaction.findUnique({
        where: { trackingToken: token },
        select: {
          transactionId: true,
          senderPhone: true,
        }
      })

      if (!guestTransaction) {
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
          { status: 404 }
        )
      }

      // Verify phone number
      if (!phoneMatches(phone, guestTransaction.senderPhone)) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number' },
          { status: 403 }
        )
      }

      transaction = await prisma.transaction.findUnique({
        where: { id: guestTransaction.transactionId },
        include: {
          originBranch: {
            select: {
              name: true,
              address: true,
              city: true,
              country: true,
              phone: true,
            },
          },
          destinationBranch: {
            select: {
              name: true,
              address: true,
              city: true,
              country: true,
              phone: true,
            },
          },
          saraf: {
            select: {
              businessName: true,
              businessPhone: true,
            },
          },
        },
      })

      if (!transaction) {
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
          { status: 404 }
        )
      }
    }
    // Track by reference code
    else if (referenceCode) {
      transaction = await prisma.transaction.findUnique({
        where: { referenceCode },
        include: {
          originBranch: {
            select: {
              name: true,
              address: true,
              city: true,
              country: true,
              phone: true,
            },
          },
          destinationBranch: {
            select: {
              name: true,
              address: true,
              city: true,
              country: true,
              phone: true,
            },
          },
          saraf: {
            select: {
              businessName: true,
              businessPhone: true,
            },
          },
        },
      })

      if (!transaction) {
        return NextResponse.json(
          { success: false, error: 'Transaction not found' },
          { status: 404 }
        )
      }

      // Verify phone number
      if (
        !phoneMatches(phone, transaction.senderPhone) &&
        !phoneMatches(phone, transaction.receiverPhone)
      ) {
        return NextResponse.json(
          { success: false, error: 'Invalid phone number' },
          { status: 403 }
        )
      }
    }

    // Return safe transaction data (hide sensitive info)
    return NextResponse.json({
      success: true,
      data: {
        referenceCode: transaction.referenceCode,
        status: transaction.status,
        type: transaction.type,
        fromCurrency: transaction.fromCurrency,
        toCurrency: transaction.toCurrency,
        fromAmount: transaction.fromAmount,
        toAmount: transaction.toAmount,
        senderName: transaction.senderName,
        receiverName: transaction.receiverName,
        receiverCity: transaction.receiverCity,
        receiverCountry: transaction.receiverCountry,
        createdAt: transaction.createdAt,
        completedAt: transaction.completedAt,
        originBranch: transaction.originBranch,
        destinationBranch: transaction.destinationBranch,
        saraf: transaction.saraf,
      },
    })
  } catch (error: any) {
    console.error('Public track error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to track transaction' },
      { status: 500 }
    )
  }
}

export const GET = withRateLimit(handler, {
  windowMs: 5 * 60 * 1000,
  maxRequests: 30,
  message: 'Too many tracking requests, please try again later.'
})
