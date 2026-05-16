import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import nodemailer from 'nodemailer'
import { normalizePhoneToE164 } from '@/lib/phone'
import { hashOtpCode, normalizeOtpIdentifier } from '@/lib/otp-security'
import { ConfigService } from '@/lib/config-service'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { ExternalAPIService } from '@/lib/external-api-service'
import { SMSService } from '@/lib/sms-service'

export const dynamic = 'force-dynamic'

export const runtime = 'nodejs'

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const MAX_OTPS_PER_WINDOW = 3

function generateOTP(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, '0')
}

let cachedTransport: nodemailer.Transporter | null = null
let cachedTransportKey = ''

async function getEmailTransport(): Promise<{ transport: nodemailer.Transporter; from: string }> {
  const smtpConfig = await ConfigService.getSmtpConfig()
  const host = smtpConfig.host?.trim()
  const port = Number.isFinite(smtpConfig.port) ? smtpConfig.port : 587
  const user = smtpConfig.user?.trim()
  const pass = smtpConfig.password?.trim()
  const fromEmail = smtpConfig.fromEmail?.trim()
  const fromName = smtpConfig.fromName?.trim()

  if (!host || !user || !pass || !fromEmail) {
    throw new Error('SMTP configuration is incomplete')
  }

  const transportKey = `${host}:${port}:${user}:${fromEmail}:${fromName || ''}`
  if (!cachedTransport || cachedTransportKey !== transportKey) {
    cachedTransport = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    })
    cachedTransportKey = transportKey
  }

  const from = fromName ? `${fromName} <${fromEmail}>` : fromEmail
  return { transport: cachedTransport, from }
}

async function sendEmail(email: string, code: string) {
  try {
    const { transport, from } = await getEmailTransport()
    await transport.sendMail({
      from,
      to: email,
      subject: 'Your verification code',
      text: `Your verification code is ${code}. It expires in 5 minutes.`,
      html: `<p>Your verification code is <b>${code}</b>.</p><p>This code expires in 5 minutes.</p>`
    })
  } catch (error) {
    cachedTransport = null
    cachedTransportKey = ''
    throw error
  }
}

async function sendTwilioMessage(to: string, from: string, body: string) {
  const twilioConfig = await ExternalAPIService.getTwilioConfig()
  const accountSid = twilioConfig.accountSid
  const authToken = twilioConfig.authToken
  const baseUrl = twilioConfig.baseUrl

  if (!accountSid || !authToken) {
    throw new Error('Twilio not configured (set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)')
  }

  const response = await fetch(ExternalAPIService.buildUrl(baseUrl, `/Accounts/${accountSid}/Messages.json`), {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({
      From: from,
      To: to,
      Body: body.slice(0, 1600)
    }),
    signal: AbortSignal.timeout(8000)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Twilio request failed: ${response.status} ${text}`)
  }
}

async function sendSMS(phone: string, code: string) {
  const result = await SMSService.sendOTP(normalizePhoneToE164(phone), code)
  if (!result.success) {
    const failureMessage =
      ('error' in result && result.error) ||
      ('message' in result && result.message) ||
      'SMS delivery failed'
    throw new Error(failureMessage)
  }
}

async function sendWhatsApp(phone: string, code: string) {
  const twilioConfig = await ExternalAPIService.getTwilioConfig()
  const fromWhatsApp = twilioConfig.whatsappFrom
  if (!fromWhatsApp) {
    throw new Error('TWILIO_WHATSAPP_FROM not configured')
  }

  const to = `whatsapp:${normalizePhoneToE164(phone)}`
  const from = fromWhatsApp.startsWith('whatsapp:')
    ? fromWhatsApp
    : `whatsapp:${normalizePhoneToE164(fromWhatsApp)}`
  await sendTwilioMessage(to, from, `Your verification code is ${code}. It expires in 5 minutes.`)
}

async function sendOtpByChannel(type: string, identifier: string, code: string) {
  if (type === 'EMAIL') {
    await sendEmail(identifier, code)
    return
  }

  if (type === 'SMS') {
    try {
      await sendSMS(identifier, code)
      return
    } catch (error) {
      const twilioConfig = await ExternalAPIService.getTwilioConfig()
      if (twilioConfig.whatsappFrom) {
        await sendWhatsApp(identifier, code)
        return
      }
      throw error
    }
  }

  if (type === 'WHATSAPP') {
    await sendWhatsApp(identifier, code)
    return
  }

  throw new Error('Unsupported OTP channel')
}

function purposeRequiresEmailChannel(purpose: string) {
  return purpose === 'VERIFY_EMAIL'
}

function purposeRequiresPhoneChannel(purpose: string) {
  return purpose === 'VERIFY_PHONE'
}

async function validateOtpChannelAccess(type: string, purpose: string) {
  const channelSettings = await ConfigEnforcer.getOtpChannelAvailability()

  if (!channelSettings.otpEnabled) {
    throw new Error('OTP is currently disabled')
  }

  if (purposeRequiresEmailChannel(purpose) && type !== 'EMAIL') {
    throw new Error('This verification flow requires email delivery')
  }

  if (purposeRequiresPhoneChannel(purpose) && !['SMS', 'WHATSAPP'].includes(type)) {
    throw new Error('This verification flow requires phone delivery')
  }

  if (!channelSettings.availableChannels.includes(type as 'EMAIL' | 'SMS' | 'WHATSAPP')) {
    switch (type) {
      case 'EMAIL':
        throw new Error('Email OTP delivery is disabled')
      case 'SMS':
        throw new Error('SMS OTP delivery is disabled')
      case 'WHATSAPP':
        throw new Error('WhatsApp OTP delivery is disabled')
      default:
        throw new Error('Unsupported OTP channel')
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { identifier, type, purpose } = body

    if (!identifier || !type || !purpose) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const normalizedType = String(type).trim().toUpperCase()
    const normalizedPurpose = String(purpose).trim().toUpperCase()

    if (normalizedPurpose === 'RESET_PASSWORD') {
      const forgotPasswordEnabled = (await ConfigService.get('forgot_password_enabled', 'true')) === 'true'
      if (!forgotPasswordEnabled) {
        return NextResponse.json(
          { error: 'Password reset is currently disabled' },
          { status: 403 }
        )
      }
    }

    if (!['EMAIL', 'SMS', 'WHATSAPP'].includes(normalizedType)) {
      return NextResponse.json(
        { error: 'Invalid type' },
        { status: 400 }
      )
    }

    const allowedPurposes = ['SIGNUP', 'LOGIN', 'RESET_PASSWORD', 'VERIFY_EMAIL', 'VERIFY_PHONE']
    if (!allowedPurposes.includes(normalizedPurpose)) {
      return NextResponse.json(
        { error: 'Invalid purpose' },
        { status: 400 }
      )
    }

    try {
      await validateOtpChannelAccess(normalizedType, normalizedPurpose)
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'OTP delivery is unavailable' },
        { status: 403 }
      )
    }

    let normalizedIdentifier: string
    try {
      normalizedIdentifier = normalizeOtpIdentifier(String(identifier), normalizedType)
    } catch {
      return NextResponse.json(
        { error: 'Invalid identifier' },
        { status: 400 }
      )
    }

    if (normalizedPurpose === 'RESET_PASSWORD') {
      const existingUser = await prisma.user.findFirst({
        where:
          normalizedType === 'EMAIL'
            ? { email: normalizedIdentifier }
            : { phone: normalizedIdentifier },
        select: { id: true },
      })

      // Avoid account enumeration for forgot password flows.
      if (!existingUser) {
        return NextResponse.json({
          success: true,
          message: `OTP sent to ${normalizedIdentifier}`,
        })
      }
    }

    // Delete old OTPs for this identifier
    await prisma.oTP.deleteMany({
      where: {
        identifier: normalizedIdentifier,
        OR: [
          { isUsed: true },
          { expiresAt: { lt: new Date() } }
        ]
      }
    })

    // Check rate limiting
    const recentOTPs = await prisma.oTP.count({
      where: {
        identifier: normalizedIdentifier,
        createdAt: {
          gte: new Date(Date.now() - RATE_LIMIT_WINDOW_MS)
        }
      }
    })

    if (recentOTPs >= MAX_OTPS_PER_WINDOW) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    const otpConfig = await ConfigService.getOtpConfig()
    const otpExpiryMinutes = Math.max(1, otpConfig.expiryMinutes || 5)

    const code = generateOTP()
    const hashedCode = hashOtpCode({
      identifier: normalizedIdentifier,
      purpose: normalizedPurpose,
      code
    })
    const expiresAt = new Date(Date.now() + otpExpiryMinutes * 60 * 1000)

    const otp = await prisma.oTP.create({
      data: {
        identifier: normalizedIdentifier,
        code: hashedCode,
        type: normalizedType,
        purpose: normalizedPurpose,
        expiresAt
      }
    })

    // Send OTP based on type
    try {
      await sendOtpByChannel(normalizedType, normalizedIdentifier, code)
    } catch (error) {
      console.error('Failed to send OTP:', error)
      await prisma.oTP.delete({ where: { id: otp.id } }).catch(() => null)
      return NextResponse.json(
        { error: 'Failed to send OTP' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `OTP sent to ${normalizedIdentifier}`,
      expiresAt: otp.expiresAt
    })

  } catch (error) {
    console.error('OTP send error:', error)
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    )
  }
}
