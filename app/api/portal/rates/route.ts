import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput, validateNumericInput } from '@/lib/security'
import { isPortalOwnerRole, isPortalRole } from '@/lib/portal-access'
import { resolvePortalAccessContext } from '@/lib/saraf-access'
import { getEffectivePromotionEffectsForSaraf } from '@/lib/promotion-effects'

export const dynamic = 'force-dynamic'

function validateRatePair(params: { buyRate?: number; sellRate?: number }) {
  const { buyRate, sellRate } = params

  if (buyRate !== undefined) {
    if (!Number.isFinite(buyRate) || buyRate <= 0) {
      return { ok: false as const, error: 'Buy rate must be a positive number' }
    }
  }

  if (sellRate !== undefined) {
    if (!Number.isFinite(sellRate) || sellRate <= 0) {
      return { ok: false as const, error: 'Sell rate must be a positive number' }
    }
  }

  if (buyRate !== undefined && sellRate !== undefined) {
    if (buyRate >= sellRate) {
      return { ok: false as const, error: 'Buy rate must be less than sell rate' }
    }
  }

  return { ok: true as const }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const fromCurrency = sanitizeInput(searchParams.get('from') || '')
    const toCurrency = sanitizeInput(searchParams.get('to') || '')
    const onlyActive = searchParams.get('active') === 'true'
    const now = new Date()

    const rates = await prisma.rate.findMany({
      where: {
        sarafId: accessContext.sarafId,
        ...(fromCurrency ? { fromCurrency } : {}),
        ...(toCurrency ? { toCurrency } : {}),
        ...(onlyActive
          ? {
              isActive: true,
              OR: [{ validUntil: null }, { validUntil: { gt: now } }],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' }
    })

    return NextResponse.json(rates)

  } catch (error) {
    console.error('Rates fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPortalOwnerRole(session.user.role)) {
      return NextResponse.json(
        { error: 'Only the saraf owner can create rates' },
        { status: 403 }
      )
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    // Enforce "rate slots" using active promotion effects (if configured).
    const now = new Date()
    const effects = await getEffectivePromotionEffectsForSaraf(accessContext.sarafId, now)
    if (effects.maxRatePairs !== undefined) {
      const count = await prisma.rate.count({ where: { sarafId: accessContext.sarafId } })
      if (count >= effects.maxRatePairs) {
        return NextResponse.json(
          { error: `Rate limit reached (${effects.maxRatePairs}). Upgrade or extend your package to add more rates.` },
          { status: 400 }
        )
      }
    }

    const body = await request.json()
    const fromCurrency = sanitizeInput(body.fromCurrency)
    const toCurrency = sanitizeInput(body.toCurrency)
    const buyRate = validateNumericInput(body.buyRate)
    const sellRate = validateNumericInput(body.sellRate)

    if (!fromCurrency || !toCurrency || !buyRate || !sellRate) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const validation = validateRatePair({ buyRate, sellRate })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const rate = await prisma.rate.create({
      data: {
        sarafId: accessContext.sarafId,
        fromCurrency,
        toCurrency,
        buyRate,
        sellRate,
        isActive: true
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'RATE_CREATED',
        resource: 'RATE',
        resourceId: rate.id,
        details: JSON.stringify({ fromCurrency, toCurrency, buyRate, sellRate })
      }
    })

    return NextResponse.json(rate)

  } catch (error) {
    console.error('Rate creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || !isPortalRole(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!isPortalOwnerRole(session.user.role)) {
      return NextResponse.json(
        { error: 'Only the saraf owner can update rates' },
        { status: 403 }
      )
    }

    const accessContext = await resolvePortalAccessContext({
      userId: session.user.id,
      role: session.user.role,
      sarafId: session.user.sarafId,
    })

    if (!accessContext) {
      return NextResponse.json({ error: 'Saraf access denied' }, { status: 403 })
    }

    const body = await request.json()
    const rateId = sanitizeInput(body.id)
    
    if (!rateId) {
      return NextResponse.json({ error: 'Rate ID required' }, { status: 400 })
    }

    const updateData: any = {}
    
    if (body.buyRate !== undefined) updateData.buyRate = validateNumericInput(body.buyRate)
    if (body.sellRate !== undefined) updateData.sellRate = validateNumericInput(body.sellRate)
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)
    if (body.fromCurrency) updateData.fromCurrency = sanitizeInput(body.fromCurrency)
    if (body.toCurrency) updateData.toCurrency = sanitizeInput(body.toCurrency)

    let buyRateToValidate: number | undefined = updateData.buyRate
    let sellRateToValidate: number | undefined = updateData.sellRate

    if (updateData.buyRate !== undefined || updateData.sellRate !== undefined) {
      const existing = await prisma.rate.findUnique({
        where: { id: rateId },
        select: { buyRate: true, sellRate: true, sarafId: true },
      })

      if (!existing || existing.sarafId !== accessContext.sarafId) {
        return NextResponse.json({ error: 'Rate not found' }, { status: 404 })
      }

      buyRateToValidate = updateData.buyRate ?? existing.buyRate
      sellRateToValidate = updateData.sellRate ?? existing.sellRate
    }

    const validation = validateRatePair({
      buyRate: buyRateToValidate,
      sellRate: sellRateToValidate,
    })
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const rate = await prisma.rate.update({
      where: {
        id: rateId,
        sarafId: accessContext.sarafId
      },
      data: updateData
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'RATE_UPDATED',
        resource: 'RATE',
        resourceId: rate.id,
        details: JSON.stringify(updateData)
      }
    })

    return NextResponse.json(rate)

  } catch (error) {
    console.error('Rate update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
