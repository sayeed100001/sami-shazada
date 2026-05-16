import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  CREDIT_PURCHASE_DISCOUNT_TIERS,
  quoteCreditPurchase,
  roundUsdAmount,
} from '@/lib/credit-pricing'

export const dynamic = 'force-dynamic'

async function getAuthenticatedSaraf() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.role !== 'SARAF') {
    return { session: null, saraf: null }
  }

  const saraf = await prisma.saraf.findUnique({
    where: { userId: session.user.id },
  })

  return { session, saraf }
}

function normalizeDiscountCode(code: unknown): string | null {
  if (typeof code !== 'string') return null
  const trimmed = code.trim()
  return trimmed.length ? trimmed.toUpperCase() : null
}

export async function GET(request: NextRequest) {
  try {
    const { session, saraf } = await getAuthenticatedSaraf()

    if (!session?.user || !saraf) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const amountRaw = Number.parseInt(
      new URL(request.url).searchParams.get('amount') || '0',
      10
    )
    const amount = Number.isFinite(amountRaw) && amountRaw > 0 ? amountRaw : 0
    const creditPriceUsd = await ConfigEnforcer.getCreditPriceUsd()
    const quote =
      amount > 0 ? quoteCreditPurchase({ amount, unitPriceUsd: creditPriceUsd }) : null

    return NextResponse.json({
      creditPriceUsd,
      currency: 'USD',
      discountTiers: CREDIT_PURCHASE_DISCOUNT_TIERS.map((tier) => ({
        amount: tier.amount,
        discountPercent: tier.discount,
      })),
      quote,
    })
  } catch (error) {
    console.error('Credit pricing fetch error:', error)
    return NextResponse.json({ error: 'Failed to fetch credit pricing' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { session, saraf } = await getAuthenticatedSaraf()

    if (!session?.user || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const recentPendingRequests = await prisma.creditTransaction.findMany({
      where: {
        sarafId: saraf.id,
        type: 'PURCHASE',
        status: 'PENDING',
        createdAt: { gte: yesterday },
      },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    if (recentPendingRequests.length > 0) {
      return NextResponse.json(
        {
          error: 'You already have a pending credit purchase request',
          pendingRequestId: recentPendingRequests[0].id,
          createdAt: recentPendingRequests[0].createdAt,
        },
        { status: 400 }
      )
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const purchasesToday = await prisma.creditTransaction.count({
      where: {
        sarafId: saraf.id,
        type: 'PURCHASE',
        createdAt: { gte: startOfDay },
      },
    })

    if (purchasesToday >= 5) {
      return NextResponse.json(
        { error: 'Daily credit purchase limit exceeded (max 5 requests per day)' },
        { status: 429 }
      )
    }

    // Rate limiting check
    const recentRequests = await prisma.creditTransaction.count({
      where: {
        sarafId: saraf.id,
        type: 'PURCHASE',
        status: 'PENDING',
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    })

    if (recentRequests >= 3) {
      return NextResponse.json(
        { error: 'Too many purchase requests. Please wait before trying again.' },
        { status: 429 }
      )
    }

    const body = await request.json()
    const amount = Number(body?.amount)
    const paymentMethod = body?.paymentMethod
    const notes = body?.notes
    const normalizedDiscountCode = normalizeDiscountCode(body?.discountCode)

    // Validate input
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    if (!Number.isInteger(amount)) {
      return NextResponse.json({ error: 'Amount must be a whole number' }, { status: 400 })
    }

    if (amount > 10000) {
      return NextResponse.json({ error: 'Maximum amount is 10,000 credits' }, { status: 400 })
    }

    const creditPriceUsd = await ConfigEnforcer.getCreditPriceUsd()
    const baseQuote = quoteCreditPurchase({ amount, unitPriceUsd: creditPriceUsd })
    const basePriceUsd = baseQuote.basePriceUsd

    const created = await prisma.$transaction(async (tx) => {
      let promoDiscountAmountUsd = 0
      let appliedDiscountCode: string | null = null
      let appliedDiscountCodeId: string | null = null

      const now = new Date()

      const [user, code] = await Promise.all([
        tx.user.findUnique({
          where: { id: session.user.id },
          select: { vipLevel: true },
        }),
        normalizedDiscountCode
          ? tx.discountCode.findUnique({
              where: { code: normalizedDiscountCode },
              select: {
                id: true,
                code: true,
                type: true,
                value: true,
                maxDiscount: true,
                maxUses: true,
                usedCount: true,
                validFrom: true,
                validUntil: true,
                isActive: true,
                specificSarafId: true,
                vipLevelOnly: true,
              },
            })
          : Promise.resolve(null),
      ])

      const isEligible =
        Boolean(code?.isActive) &&
        Boolean(code && now >= code.validFrom && now <= code.validUntil) &&
        Boolean(!code?.specificSarafId || code?.specificSarafId === saraf.id) &&
        Boolean(!code?.vipLevelOnly || (user?.vipLevel && code.vipLevelOnly === user.vipLevel))

      if (code && isEligible) {
        let codeDiscount = 0
        if (code.type === 'PERCENTAGE') {
          const percentDiscount = (basePriceUsd * code.value) / 100
          codeDiscount = code.maxDiscount
            ? Math.min(percentDiscount, code.maxDiscount)
            : percentDiscount
        } else if (code.type === 'FIXED') {
          codeDiscount = code.value
        }

        if (Number.isFinite(codeDiscount) && codeDiscount > 0) {
          // Prevent maxUses race: only increment if still under limit.
          const updated = await tx.discountCode.updateMany({
            where: {
              id: code.id,
              isActive: true,
              validFrom: { lte: now },
              validUntil: { gte: now },
              ...(code.maxUses ? { usedCount: { lt: code.maxUses } } : {}),
              ...(code.specificSarafId ? { specificSarafId: saraf.id } : {}),
              ...(code.vipLevelOnly ? { vipLevelOnly: user?.vipLevel ?? 'NONE' } : {}),
            },
            data: { usedCount: { increment: 1 } },
          })

          if (updated.count === 1) {
            promoDiscountAmountUsd = roundUsdAmount(codeDiscount)
            appliedDiscountCode = code.code
            appliedDiscountCodeId = code.id
          }
        }
      }

      const finalQuote = quoteCreditPurchase({
        amount,
        unitPriceUsd: creditPriceUsd,
        promoDiscountAmountUsd,
      })

      const price = finalQuote.finalPriceUsd
      const discountAmount = roundUsdAmount(
        finalQuote.bulkDiscountAmountUsd + finalQuote.promoDiscountAmountUsd
      )

      const creditTransaction = await tx.creditTransaction.create({
        data: {
          sarafId: saraf.id,
          type: 'PURCHASE',
          amount,
          balance: saraf.creditBalance,
          price,
          description:
            typeof notes === 'string' && notes.trim().length > 0
              ? notes.trim()
              : `Purchase ${amount} credits`,
          status: 'PENDING',
          paymentMethod,
          discountCode: appliedDiscountCode,
          discountAmount,
        },
      })

      if (appliedDiscountCodeId && finalQuote.promoDiscountAmountUsd > 0) {
        await tx.discountCodeUsage.create({
          data: {
            codeId: appliedDiscountCodeId,
            userId: session.user.id,
            transactionId: creditTransaction.id,
            discountAmount: finalQuote.promoDiscountAmountUsd,
          },
        })
      }

      return { creditTransaction, price, discountAmount }
    })

    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'Credit purchase request submitted',
        message: `Your request to purchase ${amount} credits for $${created.price.toFixed(2)} has been submitted and is pending approval.`,
        type: 'info',
        action: 'CREDIT_PURCHASE_REQUESTED',
        resource: 'CREDIT',
        resourceId: created.creditTransaction.id,
      },
    })

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true },
    })

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          title: 'New credit purchase request',
          message: `${saraf.businessName} requested to purchase ${amount} credits for $${created.price.toFixed(2)}.`,
          type: 'info',
          action: 'CREDIT_PURCHASE_REQUESTED',
          resource: 'CREDIT',
          resourceId: created.creditTransaction.id,
        },
      })
    }

    clearAdminStatsCache()

    return NextResponse.json({
      success: true,
      transaction: {
        id: created.creditTransaction.id,
        amount,
        price: created.price,
        discountAmount: created.discountAmount,
        creditPriceUsd,
        status: created.creditTransaction.status,
      },
    })
  } catch (error) {
    console.error('Credit purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to create credit purchase request' },
      { status: 500 }
    )
  }
}

