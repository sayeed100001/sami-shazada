import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

function parseOptionalInt(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number.parseInt(String(value), 10)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

function parseOptionalFloat(value: unknown) {
  if (value === undefined || value === null || value === '') return null
  const parsed = Number.parseFloat(String(value))
  return Number.isFinite(parsed) ? parsed : null
}

async function ensureAdmin() {
  const session = await getServerSession(authOptions)
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  return { session }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolved = await ensureAdmin()
    if ('error' in resolved) return resolved.error

    const existing = await prisma.discountCode.findUnique({
      where: { id: params.id },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 })
    }

    const body = await request.json()
    const updateData: Record<string, unknown> = {}

    if (body.code !== undefined) updateData.code = sanitizeInput(body.code).trim().toUpperCase()
    if (body.type !== undefined) updateData.type = sanitizeInput(body.type).trim().toUpperCase()
    if (body.value !== undefined) updateData.value = parseOptionalFloat(body.value)
    if (body.maxDiscount !== undefined) updateData.maxDiscount = parseOptionalInt(body.maxDiscount)
    if (body.maxUses !== undefined) updateData.maxUses = parseOptionalInt(body.maxUses)
    if (body.validFrom !== undefined) updateData.validFrom = new Date(body.validFrom)
    if (body.validUntil !== undefined) updateData.validUntil = new Date(body.validUntil)
    if (body.specificSarafId !== undefined) {
      updateData.specificSarafId = body.specificSarafId ? sanitizeInput(body.specificSarafId) : null
    }
    if (body.vipLevelOnly !== undefined) {
      updateData.vipLevelOnly = body.vipLevelOnly ? sanitizeInput(body.vipLevelOnly).toUpperCase() : null
    }
    if (body.isActive !== undefined) updateData.isActive = Boolean(body.isActive)

    const updated = await prisma.discountCode.update({
      where: { id: params.id },
      data: updateData,
    })

    await prisma.auditLog.create({
      data: {
        userId: resolved.session.user.id,
        action: 'DISCOUNT_CODE_UPDATED',
        resource: 'DISCOUNT_CODE',
        resourceId: updated.id,
        details: JSON.stringify({
          updatedFields: Object.keys(updateData),
          code: updated.code,
        }),
      },
    })

    return NextResponse.json({ success: true, code: updated })
  } catch (error) {
    console.error('Discount code update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const resolved = await ensureAdmin()
    if ('error' in resolved) return resolved.error

    const existing = await prisma.discountCode.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        code: true,
        usedCount: true,
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Discount code not found' }, { status: 404 })
    }

    if (existing.usedCount > 0) {
      const disabled = await prisma.discountCode.update({
        where: { id: params.id },
        data: { isActive: false },
      })

      await prisma.auditLog.create({
        data: {
          userId: resolved.session.user.id,
          action: 'DISCOUNT_CODE_DISABLED',
          resource: 'DISCOUNT_CODE',
          resourceId: disabled.id,
          details: JSON.stringify({ code: disabled.code }),
        },
      })

      return NextResponse.json({
        success: true,
        disabled: true,
        code: disabled,
        message: 'Code has usage history, so it was disabled instead of deleted.',
      })
    }

    await prisma.discountCode.delete({ where: { id: params.id } })
    await prisma.auditLog.create({
      data: {
        userId: resolved.session.user.id,
        action: 'DISCOUNT_CODE_DELETED',
        resource: 'DISCOUNT_CODE',
        resourceId: existing.id,
        details: JSON.stringify({ code: existing.code }),
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Discount code delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
