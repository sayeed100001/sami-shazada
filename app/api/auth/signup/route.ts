import { NextRequest } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { ApiResponse } from '@/lib/api-response'
import {
  normalizeOptionalRegistrationPhone,
  normalizeRegistrationEmail,
  normalizeRegistrationName,
} from '@/lib/auth-registration'
import { verifyRecaptchaToken } from '@/lib/recaptcha'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { grantReferralReward, grantSignupWelcomeReward } from '@/lib/user-reward-service'
import { assertNotBlacklisted, normalizeBlacklistValue } from '@/lib/blacklist-service'
import { clearAdminStatsCache } from '@/lib/admin-stats-cache'
import { withRateLimit } from '@/lib/rate-limit-middleware'
import { ConfigService } from '@/lib/config-service'
import { generateUniqueReferralCode } from '@/lib/social-features'

function getClientIp(headers: Headers): string | undefined {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || undefined
}

export const dynamic = 'force-dynamic'

const signupSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  email: z.string().email('ایمیل معتبر وارد کنید'),
  phone: z.string().optional(),
  acceptTerms: z.boolean().optional(),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(128, 'رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد')
    .regex(/[a-z]/, 'رمز عبور باید حداقل یک حرف کوچک داشته باشد')
    .regex(/[A-Z]/, 'رمز عبور باید حداقل یک حرف بزرگ داشته باشد')
    .regex(/[0-9]/, 'رمز عبور باید حداقل یک عدد داشته باشد')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'رمز عبور باید حداقل یک کاراکتر خاص داشته باشد'),
  role: z.enum(['USER', 'SARAF']).default('USER'),
  referralCode: z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value
      const normalized = value.trim()
      return normalized.length > 0 ? normalized : undefined
    },
    z.string().min(3, 'Referral code must contain at least 3 characters').max(32).optional()
  ),
  captchaToken: z.string().optional(),
  captchaAction: z.string().optional()
})

async function signupHandler(request: NextRequest) {
  try {
    // Check if registration is enabled
    const registrationEnabled = await ConfigEnforcer.isRegistrationEnabled()
    if (!registrationEnabled) {
      return ApiResponse.error('ثبت نام در حال حاضر غیرفعال است', 403, 'REGISTRATION_DISABLED')
    }

    const body = await request.json()
    const validatedData = signupSchema.parse(body)

    const termsEnabled = (await ConfigService.get('terms_enabled', 'true')) !== 'false'
    if (termsEnabled && validatedData.acceptTerms !== true) {
      return ApiResponse.error('پذیرش قوانین الزامی است', 400, 'TERMS_NOT_ACCEPTED')
    }

    if (validatedData.role === 'SARAF') {
      return ApiResponse.error('برای ثبت صراف از فرم اختصاصی صراف استفاده کنید', 400, 'SARAF_SIGNUP_FLOW_REQUIRED')
    }

    // Validate password against system requirements
    const passwordValidation = await ConfigEnforcer.validatePassword(validatedData.password)
    if (!passwordValidation.valid) {
      return ApiResponse.error(passwordValidation.errors[0], 400, 'PASSWORD_REQUIREMENTS_NOT_MET')
    }

    const normalizedName = normalizeRegistrationName(validatedData.name)
    const normalizedEmail = normalizeRegistrationEmail(validatedData.email)
    const normalizedPhone = normalizeOptionalRegistrationPhone(validatedData.phone)
    const normalizedReferralCode = validatedData.referralCode?.trim().toUpperCase() || null

    await assertNotBlacklisted({
      candidates: [
        { type: 'EMAIL', value: normalizeBlacklistValue('EMAIL', normalizedEmail) },
        normalizedPhone ? { type: 'PHONE', value: normalizeBlacklistValue('PHONE', normalizedPhone) } : null,
      ],
    })

    const recaptchaCheck = await verifyRecaptchaToken({
      token: validatedData.captchaToken || null,
      action: validatedData.captchaAction || 'signup',
      remoteIp: getClientIp(request.headers),
    })

    if (recaptchaCheck.enabled && !recaptchaCheck.success) {
      return ApiResponse.error('تایید امنیتی ناموفق بود. دوباره تلاش کنید', 400, 'CAPTCHA_FAILED')
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          ...(normalizedPhone ? [{ phone: normalizedPhone }] : [])
        ]
      }
    })

    if (existingUser) {
      const duplicateCode = existingUser.email === normalizedEmail ? 'USER_EXISTS' : 'PHONE_EXISTS'
      const duplicateMessage =
        duplicateCode === 'PHONE_EXISTS'
          ? 'کاربری با این شماره تلفن قبلاً ثبت نام کرده است'
          : 'کاربری با این ایمیل قبلاً ثبت نام کرده است'

      return ApiResponse.error(duplicateMessage, 400, duplicateCode)
    }

    const referrer = normalizedReferralCode
      ? await prisma.user.findFirst({
          where: { referralCode: normalizedReferralCode },
          orderBy: { createdAt: 'asc' },
          select: { id: true, name: true, isActive: true },
        })
      : null

    if (normalizedReferralCode && (!referrer || !referrer.isActive)) {
      return ApiResponse.error('Referral code is invalid or inactive.', 400, 'INVALID_REFERRAL_CODE')
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const referralCode = await generateUniqueReferralCode(tx as any, normalizedName)
      const createdUser = await tx.user.create({
        data: {
          name: normalizedName,
          email: normalizedEmail,
          phone: normalizedPhone,
          password: hashedPassword,
          role: 'USER',
          referralCode,
          referredById: referrer?.id || null,
        }
      })

      if (termsEnabled) {
        const documentKey = (await ConfigService.get('terms_current_key', 'terms_v1')) || 'terms_v1'
        await tx.termsAcceptance.create({
          data: {
            userId: createdUser.id,
            documentKey,
            ipAddress: getClientIp(request.headers),
            userAgent: request.headers.get('user-agent') || null,
          },
        })
      }

      await grantSignupWelcomeReward(tx, createdUser.id)

      if (referrer?.id) {
        await grantReferralReward(tx, referrer.id, createdUser.name)
      }

      return createdUser
    })

    clearAdminStatsCache()

    return ApiResponse.ok({
      message: 'ثبت نام با موفقیت انجام شد',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    })
  } catch (error) {
    console.error('Signup error:', error)

    if (error instanceof Error && error.message.startsWith('BLACKLISTED:')) {
      return ApiResponse.error(
        'Registration is blocked because this email or phone number is blacklisted.',
        403,
        'BLACKLISTED'
      )
    }

    if (error instanceof z.ZodError) {
      return ApiResponse.error(error.errors[0]?.message || 'اطلاعات نامعتبر است', 400, 'VALIDATION_ERROR')
    }

    if (error instanceof Error && error.message.includes('Invalid')) {
      return ApiResponse.error('اطلاعات ثبت نام معتبر نیست', 400, 'VALIDATION_ERROR')
    }

    return ApiResponse.error('خطا در ثبت نام', 500, 'INTERNAL_ERROR')
  }
}

export const POST = withRateLimit(signupHandler, {
  windowMs: 15 * 60 * 1000,
  maxRequests: 8,
  message: 'Too many signup attempts, please try again later.',
})
