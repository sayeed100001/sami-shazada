import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRequestAppOrigin } from '@/lib/app-url'
import { ConfigEnforcer } from '@/lib/config-enforcer'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id }
    })

    if (!user || !user.phone) {
      return NextResponse.json({ error: 'Phone number not found' }, { status: 404 })
    }

    if (user.isPhoneVerified) {
      return NextResponse.json({ 
        success: true, 
        message: 'Phone already verified' 
      })
    }

    const preferredChannel = await ConfigEnforcer.getPreferredPhoneOtpChannel()
    if (!preferredChannel) {
      return NextResponse.json({ error: 'Phone verification is currently unavailable' }, { status: 403 })
    }

    const otpResponse = await fetch(`${getRequestAppOrigin(request)}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.phone,
        type: preferredChannel,
        purpose: 'VERIFY_PHONE'
      })
    })

    if (!otpResponse.ok) {
      const otpData = await otpResponse.json().catch(() => null)
      return NextResponse.json(
        { error: otpData?.error || 'Failed to send verification code' },
        { status: otpResponse.status >= 400 && otpResponse.status < 500 ? otpResponse.status : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your phone'
    })
  } catch (error) {
    console.error('Phone verification request error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification code' },
      { status: 500 }
    )
  }
}
