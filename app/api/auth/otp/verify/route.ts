import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { normalizeOtpIdentifier, verifyOtpCode } from '@/lib/otp-security'
import { ConfigService } from '@/lib/config-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, code, purpose } = body

    if (!identifier || !code || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const normalizedPurpose = String(purpose).trim().toUpperCase()
    const otpSettings = await ConfigEnforcer.getOtpChannelAvailability()
    if (!otpSettings.otpEnabled) {
      return NextResponse.json(
        { error: 'OTP verification is currently disabled' },
        { status: 403 }
      )
    }

    const otpConfig = await ConfigService.getOtpConfig()
    const maxOtpAttempts = Math.max(1, otpConfig.maxAttempts || 5)

    let normalizedIdentifier: string
    try {
      normalizedIdentifier = normalizeOtpIdentifier(String(identifier))
    } catch {
      return NextResponse.json(
        { error: 'Invalid identifier' },
        { status: 400 }
      )
    }

    const activeOtps = await prisma.oTP.findMany({
      where: {
        identifier: normalizedIdentifier,
        purpose: normalizedPurpose,
        isUsed: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' },
      take: 5
    })

    if (!activeOtps.length) {
      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    const remainingCandidates = activeOtps.filter(candidate => candidate.attempts < maxOtpAttempts)

    if (!remainingCandidates.length) {
      return NextResponse.json(
        { error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 400 }
      )
    }

    const otp = remainingCandidates.find(candidate =>
      verifyOtpCode({
        storedCode: candidate.code,
        identifier: normalizedIdentifier,
        purpose: normalizedPurpose,
        code: String(code)
      })
    )

    if (!otp) {
      // Increment attempts
      await prisma.oTP.updateMany({
        where: {
          id: { in: remainingCandidates.map(candidate => candidate.id) },
          isUsed: false,
          expiresAt: { gt: new Date() }
        },
        data: {
          attempts: { increment: 1 }
        }
      })

      return NextResponse.json(
        { error: 'Invalid or expired OTP' },
        { status: 400 }
      )
    }

    if (!otpSettings.availableChannels.includes(otp.type as 'EMAIL' | 'SMS' | 'WHATSAPP')) {
      return NextResponse.json(
        { error: 'OTP verification channel is currently disabled' },
        { status: 403 }
      )
    }

    // Mark OTP as used
    await prisma.oTP.update({
      where: { id: otp.id },
      data: { isUsed: true }
    })

    // Update user verification status if applicable
    if (normalizedPurpose === 'SIGNUP' || normalizedPurpose === 'VERIFY_EMAIL' || normalizedPurpose === 'VERIFY_PHONE') {
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedIdentifier },
            { phone: normalizedIdentifier }
          ]
        }
      })

      if (user) {
        const updateData: any = { isVerified: true }
        
        if (otp.type === 'EMAIL') {
          updateData.isEmailVerified = true
        } else if (otp.type === 'SMS' || otp.type === 'WHATSAPP') {
          updateData.isPhoneVerified = true
        }

        await prisma.user.update({
          where: { id: user.id },
          data: updateData
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully'
    })

  } catch (error) {
    console.error('OTP verify error:', error)
    return NextResponse.json(
      { error: 'Failed to verify OTP' },
      { status: 500 }
    )
  }
}
