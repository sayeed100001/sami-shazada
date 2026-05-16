import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getRequestAppOrigin } from '@/lib/app-url'

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

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (user.isEmailVerified) {
      return NextResponse.json({ 
        success: true, 
        message: 'Email already verified' 
      })
    }

    const otpResponse = await fetch(`${getRequestAppOrigin(request)}/api/auth/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: user.email,
        type: 'EMAIL',
        purpose: 'VERIFY_EMAIL'
      })
    })

    if (!otpResponse.ok) {
      const otpData = await otpResponse.json().catch(() => null)
      return NextResponse.json(
        { error: otpData?.error || 'Failed to send verification email' },
        { status: otpResponse.status >= 400 && otpResponse.status < 500 ? otpResponse.status : 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification code sent to your email'
    })
  } catch (error) {
    console.error('Email verification request error:', error)
    return NextResponse.json(
      { error: 'Failed to send verification email' },
      { status: 500 }
    )
  }
}
