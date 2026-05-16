'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { toast } from 'sonner'

type PasswordConfigResponse = {
  enabled: boolean
  otpEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  whatsappEnabled: boolean
  otpMethod: 'sms' | 'email' | 'both'
  availableChannels: Array<'EMAIL' | 'SMS' | 'WHATSAPP'>
  availablePhoneChannels: Array<'SMS' | 'WHATSAPP'>
  preferredPhoneChannel: 'SMS' | 'WHATSAPP' | null
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export default function ForgotPasswordPage() {
  const router = useRouter()
  const { language } = useLanguage()
  const [identifier, setIdentifier] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [passwordConfig, setPasswordConfig] = useState<PasswordConfigResponse>({
    enabled: true,
    otpEnabled: false,
    emailEnabled: false,
    smsEnabled: false,
    whatsappEnabled: false,
    otpMethod: 'sms',
    availableChannels: [],
    availablePhoneChannels: [],
    preferredPhoneChannel: null,
  })

  const isEmail = identifier.includes('@')
  const selectedChannel = useMemo<'EMAIL' | 'SMS' | 'WHATSAPP' | null>(() => {
    if (isEmail) {
      return passwordConfig.availableChannels.includes('EMAIL') ? 'EMAIL' : null
    }

    if (passwordConfig.preferredPhoneChannel && passwordConfig.availablePhoneChannels.includes(passwordConfig.preferredPhoneChannel)) {
      return passwordConfig.preferredPhoneChannel
    }

    return passwordConfig.availablePhoneChannels[0] || null
  }, [identifier, isEmail, passwordConfig])

  useEffect(() => {
    let active = true

    fetch('/api/auth/password/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setPasswordConfig({
          enabled: Boolean(data?.enabled),
          otpEnabled: Boolean(data?.otpEnabled),
          emailEnabled: Boolean(data?.emailEnabled),
          smsEnabled: Boolean(data?.smsEnabled),
          whatsappEnabled: Boolean(data?.whatsappEnabled),
          otpMethod: ['sms', 'email', 'both'].includes(String(data?.otpMethod)) ? data.otpMethod : 'sms',
          availableChannels: Array.isArray(data?.availableChannels) ? data.availableChannels : [],
          availablePhoneChannels: Array.isArray(data?.availablePhoneChannels) ? data.availablePhoneChannels : [],
          preferredPhoneChannel: data?.preferredPhoneChannel === 'WHATSAPP' ? 'WHATSAPP' : data?.preferredPhoneChannel === 'SMS' ? 'SMS' : null,
        })
      })
      .catch(() => {
        if (!active) return
      })

    return () => {
      active = false
    }
  }, [])

  const handleRequest = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      if (!passwordConfig.enabled) {
        throw new Error(pick(language, 'بازیابی رمز عبور در حال حاضر غیرفعال است', 'Password reset is currently disabled', 'د پټنوم بیا تنظیم اوس مهال غیر فعال دی'))
      }

      if (!passwordConfig.otpEnabled) {
        throw new Error(pick(language, 'بازیابی با OTP در حال حاضر غیرفعال است', 'OTP recovery is currently disabled', 'د OTP بیا رغونه اوس مهال غیر فعاله ده'))
      }

      if (!selectedChannel) {
        throw new Error(
          isEmail
            ? pick(language, 'بازیابی از طریق ایمیل در حال حاضر در دسترس نیست', 'Email recovery is currently unavailable', 'د برېښنالیک له لارې بیا رغونه اوس شتون نه لري')
            : pick(language, 'بازیابی از طریق تلفن در حال حاضر در دسترس نیست', 'Phone recovery is currently unavailable', 'د ټیلیفون له لارې بیا رغونه اوس شتون نه لري')
        )
      }

      const response = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          type: selectedChannel,
          purpose: 'RESET_PASSWORD',
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || pick(language, 'ارسال OTP ناموفق بود', 'Failed to send OTP', 'د OTP لېږل ناکام شول'))
      }

      toast.success(pick(language, 'کد تایید ارسال شد', 'Verification code sent', 'د تایید کوډ ولېږل شو'))
      setStep('reset')
    } catch (err) {
      const message = err instanceof Error ? err.message : pick(language, 'درخواست ناموفق بود', 'Request failed', 'غوښتنه ناکامه شوه')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/auth/password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier,
          code,
          newPassword,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || pick(language, 'بازیابی رمز عبور ناموفق بود', 'Failed to reset password', 'د پټنوم بیا تنظیم ناکام شو'))
      }

      toast.success(pick(language, 'رمز عبور به‌روزرسانی شد. لطفاً وارد شوید.', 'Password updated. Please sign in.', 'پټنوم تازه شو. مهرباني وکړئ ننوزئ.'))
      router.push('/auth/signin')
    } catch (err) {
      const message = err instanceof Error ? err.message : pick(language, 'بازیابی ناموفق بود', 'Reset failed', 'بیا تنظیم ناکام شو')
      setError(message)
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{pick(language, 'فراموشی رمز عبور', 'Forgot Password', 'پټنوم هېر شوی')}</CardTitle>
          <CardDescription>{pick(language, 'رمز عبور خود را با تایید OTP بازیابی کنید', 'Reset your password with OTP verification', 'خپل پټنوم د OTP تایید له لارې بیا تنظیم کړئ')}</CardDescription>
        </CardHeader>
        <CardContent>
          {!passwordConfig.enabled && (
            <Alert className="mb-4">
              <AlertDescription>{pick(language, 'بازیابی رمز عبور توسط تنظیمات سیستم غیرفعال شده است.', 'Password reset is currently disabled by system settings.', 'د پټنوم بیا تنظیم د سیسټم له تنظیماتو غیر فعال شوی دی.')}</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {step === 'request' ? (
            <form onSubmit={handleRequest} className="space-y-4">
              <div className="space-y-2">
                <Label>{pick(language, 'ایمیل یا تلفن', 'Email or phone', 'برېښنالیک یا ټیلیفون')}</Label>
                <Input
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder={pick(language, 'email@example.com یا +93...', 'email@example.com or +93...', 'email@example.com یا +93...')}
                  required
                  disabled={loading || !passwordConfig.enabled}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                {isEmail
                  ? passwordConfig.availableChannels.includes('EMAIL')
                    ? pick(language, 'کد بازیابی از طریق ایمیل ارسال می‌شود.', 'Recovery code will be sent by email.', 'د بیا رغونې کوډ به د برېښنالیک له لارې ولېږل شي.')
                    : pick(language, 'بازیابی ایمیلی در تنظیمات سیستم غیرفعال است.', 'Email recovery is disabled in system settings.', 'د برېښنالیک بیا رغونه د سیسټم په تنظیماتو کې غیر فعاله ده.')
                  : passwordConfig.availablePhoneChannels.length > 0
                    ? pick(
                        language,
                        `بازیابی تلفنی از طریق ${selectedChannel === 'WHATSAPP' ? 'واتساپ' : 'SMS'} انجام می‌شود.`,
                        `Phone recovery will use ${selectedChannel === 'WHATSAPP' ? 'WhatsApp' : 'SMS'}.`,
                        `د ټیلیفون بیا رغونه به د ${selectedChannel === 'WHATSAPP' ? 'واتساپ' : 'SMS'} له لارې وشي.`
                      )
                    : pick(language, 'بازیابی تلفنی در تنظیمات سیستم غیرفعال است.', 'Phone recovery is disabled in system settings.', 'د ټیلیفون بیا رغونه د سیسټم په تنظیماتو کې غیر فعاله ده.')}
              </p>
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !passwordConfig.enabled || !passwordConfig.otpEnabled || !selectedChannel}
              >
                {loading ? pick(language, 'در حال ارسال...', 'Sending...', 'لېږل کېږي...') : pick(language, 'ارسال کد تایید', 'Send verification code', 'د تایید کوډ ولېږئ')}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleReset} className="space-y-4">
              <div className="space-y-2">
                <Label>{pick(language, 'کد تایید', 'Verification code', 'د تایید کوډ')}</Label>
                <Input value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>{pick(language, 'رمز عبور جدید', 'New password', 'نوی پټنوم')}</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? pick(language, 'در حال به‌روزرسانی...', 'Updating...', 'تازه کېږي...') : pick(language, 'به‌روزرسانی رمز عبور', 'Update password', 'پټنوم تازه کړئ')}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            <Link href="/auth/signin" className="underline">
              {pick(language, 'بازگشت به ورود', 'Back to sign in', 'ننوتلو ته ستنیدل')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
