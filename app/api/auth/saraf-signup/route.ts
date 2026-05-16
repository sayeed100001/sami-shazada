import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { ApiResponse } from '@/lib/api-response'
import {
  normalizeOptionalRegistrationPhone,
  normalizeRegistrationEmail,
  normalizeRegistrationName,
} from '@/lib/auth-registration'
import { verifyRecaptchaToken } from '@/lib/recaptcha'
import { sanitizeInput } from '@/lib/security'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import { ConfigService } from '@/lib/config-service'

function getClientIp(headers: Headers): string | undefined {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || undefined
}

export const dynamic = 'force-dynamic'

const sarafSignupSchema = z.object({
  name: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد'),
  email: z.string().email('ایمیل معتبر وارد کنید'),
  phone: z.string().optional(),
  password: z
    .string()
    .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
    .max(128, 'رمز عبور نباید بیشتر از ۱۲۸ کاراکتر باشد')
    .regex(/[a-z]/, 'رمز عبور باید حداقل یک حرف کوچک داشته باشد')
    .regex(/[A-Z]/, 'رمز عبور باید حداقل یک حرف بزرگ داشته باشد')
    .regex(/[0-9]/, 'رمز عبور باید حداقل یک عدد داشته باشد')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'رمز عبور باید حداقل یک کاراکتر خاص داشته باشد'),
  businessName: z.string().min(3, 'نام صرافی باید حداقل ۳ کاراکتر باشد'),
  businessAddress: z.string().min(10, 'آدرس صرافی باید حداقل ۱۰ کاراکتر باشد'),
  businessPhone: z.string().optional(),
  businessCity: z.string().optional(),
  licenseNumber: z.string().optional(),
  acceptTerms: z.boolean().optional(),
  captchaToken: z.string().optional(),
  captchaAction: z.string().optional(),
})

export async function POST(request: NextRequest) {
  try {
    // Check if registration is enabled
    const registrationEnabled = await ConfigEnforcer.isRegistrationEnabled()
    if (!registrationEnabled) {
      return ApiResponse.error('ثبت نام در حال حاضر غیرفعال است', 403, 'REGISTRATION_DISABLED')
    }

    const body = await request.json()
    const validatedData = sarafSignupSchema.parse(body)

    const termsEnabled = (await ConfigService.get('terms_enabled', 'true')) !== 'false'
    if (termsEnabled && validatedData.acceptTerms !== true) {
      return ApiResponse.error('پذیرش قوانین الزامی است', 400, 'TERMS_NOT_ACCEPTED')
    }

    // Validate password against system requirements
    const passwordValidation = await ConfigEnforcer.validatePassword(validatedData.password)
    if (!passwordValidation.valid) {
      return ApiResponse.error(passwordValidation.errors[0], 400, 'PASSWORD_REQUIREMENTS_NOT_MET')
    }

    const name = normalizeRegistrationName(validatedData.name)
    const email = normalizeRegistrationEmail(validatedData.email)
    const phone = normalizeOptionalRegistrationPhone(validatedData.phone)
    const businessName = normalizeRegistrationName(validatedData.businessName, 'businessName')
    const businessAddress = sanitizeInput(validatedData.businessAddress).replace(/\s+/g, ' ').trim()
    const businessPhone = normalizeOptionalRegistrationPhone(validatedData.businessPhone)
    const licenseNumber = validatedData.licenseNumber ? sanitizeInput(validatedData.licenseNumber).trim() : null

    const recaptchaCheck = await verifyRecaptchaToken({
      token: validatedData.captchaToken || null,
      action: validatedData.captchaAction || 'saraf_signup',
      remoteIp: getClientIp(request.headers),
    })

    if (recaptchaCheck.enabled && !recaptchaCheck.success) {
      return ApiResponse.error('تایید امنیتی ناموفق بود. دوباره تلاش کنید', 400, 'CAPTCHA_FAILED')
    }

    if (businessAddress.length < 10) {
      return ApiResponse.error('آدرس صرافی معتبر نیست', 400, 'VALIDATION_ERROR')
    }

    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          ...(phone ? [{ phone }] : []),
          ...(businessPhone ? [{ phone: businessPhone }] : [])
        ]
      }
    })

    if (existingUser) {
      const duplicateCode = existingUser.email === email ? 'USER_EXISTS' : 'PHONE_EXISTS'
      const duplicateMessage =
        duplicateCode === 'PHONE_EXISTS'
          ? 'کاربری با این شماره تلفن قبلاً ثبت نام کرده است'
          : 'کاربری با این ایمیل قبلاً ثبت نام کرده است'

      return ApiResponse.error(duplicateMessage, 400, duplicateCode)
    }

    const hashedPassword = await bcrypt.hash(validatedData.password, 12)
    const [sarafApprovalRequired, notificationsEnabled] = await Promise.all([
      ConfigEnforcer.isSarafApprovalRequired(),
      ConfigEnforcer.areNotificationsEnabled(),
    ])

    let freeTrialDays = 90
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: 'FREE_TRIAL_DAYS' }
      })
      if (config?.value) {
        freeTrialDays = Number.parseInt(config.value, 10) || 90
      }
    } catch {
      freeTrialDays = 90
    }

    const now = new Date()
    const freeTrialEndDate = new Date(now.getTime() + freeTrialDays * 24 * 60 * 60 * 1000)
    const resolvedBusinessPhone = businessPhone || phone

    if (!resolvedBusinessPhone) {
      return ApiResponse.error('شماره تماس صرافی الزامی است', 400, 'VALIDATION_ERROR')
    }

    const saraf = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          password: hashedPassword,
          name,
          phone,
          role: 'SARAF',
          isActive: true,
          isVerified: !sarafApprovalRequired
        }
      })

      if (termsEnabled) {
        const documentKey = (await ConfigService.get('terms_current_key', 'terms_v1')) || 'terms_v1'
        await tx.termsAcceptance.create({
          data: {
            userId: user.id,
            documentKey,
            ipAddress: getClientIp(request.headers),
            userAgent: request.headers.get('user-agent') || null,
          },
        })
      }

      return tx.saraf.create({
        data: {
          userId: user.id,
          businessName,
          businessAddress,
          businessPhone: resolvedBusinessPhone,
          licenseNumber,
          status: sarafApprovalRequired ? 'PENDING' : 'APPROVED',
          isActive: !sarafApprovalRequired,
          isPremium: false,
          rating: 0,
          totalTransactions: 0,
          isOnFreeTrial: true,
          freeTrialStartDate: now,
          freeTrialEndDate
        }
      })
    })

    const adminUsers = await prisma.user.findMany({
      where: { role: 'ADMIN' },
      select: { id: true }
    })

    if (notificationsEnabled && adminUsers.length > 0) {
      await prisma.notification.createMany({
        data: adminUsers.map((admin) => ({
          userId: admin.id,
          title: 'درخواست عضویت صراف جدید',
          message: `${businessName} درخواست عضویت در سیستم داده است`,
          type: 'info',
          action: 'NEW_SARAF_REQUEST',
          resource: 'SARAF',
          resourceId: saraf.id
        }))
      })
    }

    return ApiResponse.ok({
      message: 'ثبت نام با موفقیت انجام شد. درخواست شما در انتظار بررسی است.'
    })
  } catch (error) {
    console.error('Saraf signup error:', error)
    if (error instanceof z.ZodError) {
      return ApiResponse.error(error.errors[0]?.message || 'اطلاعات نامعتبر است', 400, 'VALIDATION_ERROR')
    }
    if (error instanceof Error && error.message.includes('Invalid')) {
      return ApiResponse.error('اطلاعات ثبت نام معتبر نیست', 400, 'VALIDATION_ERROR')
    }
    return ApiResponse.error('خطا در ثبت نام', 500, 'INTERNAL_ERROR')
  }
}
