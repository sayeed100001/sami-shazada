import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { normalizeOtpIdentifier, verifyOtpCode } from '@/lib/otp-security'
import { ConfigService } from '@/lib/config-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const forgotPasswordEnabled = (await ConfigService.get('forgot_password_enabled', 'true')) === 'true'
    if (!forgotPasswordEnabled) {
      return NextResponse.json({ error: 'Password reset is currently disabled' }, { status: 403 })
    }

    if (!(await ConfigEnforcer.isOtpEnabled())) {
      return NextResponse.json({ error: 'OTP recovery is currently disabled' }, { status: 403 })
    }

    const body = await request.json()
    const identifier = typeof body.identifier === 'string' ? body.identifier : ''
    const code = typeof body.code === 'string' ? body.code : ''
    const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''

    if (!identifier || !code || !newPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const normalizedIdentifier = normalizeOtpIdentifier(identifier)
    const passwordValidation = await ConfigEnforcer.validatePassword(newPassword)
    if (!passwordValidation.valid) {
      return NextResponse.json({ error: passwordValidation.errors[0] || 'Invalid password' }, { status: 400 })
    }

    const candidates = await prisma.oTP.findMany({
      where: {
        identifier: normalizedIdentifier,
        purpose: 'RESET_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    })

    if (!candidates.length) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const otpRecord = candidates.find((candidate) =>
      verifyOtpCode({
        storedCode: candidate.code,
        identifier: normalizedIdentifier,
        purpose: 'RESET_PASSWORD',
        code,
      })
    )

    if (!otpRecord) {
      await prisma.oTP.updateMany({
        where: {
          id: { in: candidates.map((candidate) => candidate.id) },
          isUsed: false,
        },
        data: { attempts: { increment: 1 } },
      })
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 })
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: normalizedIdentifier }, { phone: normalizedIdentifier }],
      },
      select: { id: true, email: true },
    })

    if (!user) {
      return NextResponse.json({ success: true, message: 'Password updated' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      }),
      prisma.oTP.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
      prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PASSWORD_RESET',
          resource: 'AUTH',
          details: JSON.stringify({ identifier: user.email || normalizedIdentifier }),
        },
      }),
    ])

    return NextResponse.json({ success: true, message: 'Password updated successfully' })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}
