'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff, UserPlus, ArrowRight, Sparkles, Shield, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { TermsConsentPanel } from '@/components/auth/terms-consent-panel'
import { executeRecaptcha } from '@/lib/client-recaptcha'
import { useSystemConfigContext } from '@/contexts/SystemConfigContext'

export default function SignUpPage() {
  const { config, loading: configLoading } = useSystemConfigContext()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    role: 'USER',
    referralCode: '',
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [recaptchaConfig, setRecaptchaConfig] = useState({ enabled: false, siteKey: '', scriptUrl: '' })
  const router = useRouter()
  const registrationEnabled = config.registration_enabled !== 'false'
  const termsEnabled = config.terms_enabled !== 'false'

  useEffect(() => {
    let isMounted = true

    fetch('/api/auth/recaptcha/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!isMounted) return
        setRecaptchaConfig({
          enabled: Boolean(data.enabled && data.siteKey),
          siteKey: String(data.siteKey || ''),
          scriptUrl: String(data.scriptUrl || ''),
        })
      })
      .catch(() => {
        if (!isMounted) return
        setRecaptchaConfig({ enabled: false, siteKey: '', scriptUrl: '' })
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const refCode = searchParams.get('ref')
    if (refCode) {
      setFormData((prev) => ({ ...prev, referralCode: refCode.toUpperCase() }))
    }
  }, [searchParams])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!registrationEnabled) {
      setError('ثبت نام در حال حاضر غیرفعال است')
      toast.error('ثبت نام غیرفعال است')
      return
    }
    setIsLoading(true)
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('رمز عبور و تکرار آن یکسان نیستند')
      setIsLoading(false)
      return
    }

    if (termsEnabled && !acceptTerms) {
      setError('لطفاً شرایط و قوانین را بپذیرید')
      setIsLoading(false)
      return
    }

    try {
      let captchaToken: string | undefined
      if (recaptchaConfig.enabled) {
        try {
          captchaToken = await executeRecaptcha(recaptchaConfig.siteKey, 'signup', recaptchaConfig.scriptUrl)
        } catch {
          setError('تایید امنیتی انجام نشد. دوباره تلاش کنید')
          toast.error('تایید امنیتی ناموفق بود')
          return
        }
      }

      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          acceptTerms,
          captchaToken,
          captchaAction: 'signup',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'خطا در ثبت نام')
        toast.error('خطا در ثبت نام')
      } else {
        toast.success('ثبت نام با موفقیت انجام شد')
        router.push('/auth/signin?message=registered')
      }
    } catch {
      setError('خطا در اتصال به سرور')
      toast.error('خطا در ثبت نام')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10 w-full max-w-2xl space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl mb-4">
            <span className="text-white font-black text-3xl">س</span>
          </div>
          <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200">
            سرای شهزاده
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">ایجاد حساب کاربری جدید</p>

          <div className="flex items-center justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">رایگان</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">امن</span>
            </div>
          </div>
        </div>

        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20" />

          <div className="relative z-10 p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <UserPlus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ثبت نام</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">فرم زیر را تکمیل کنید</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/60 dark:bg-blue-950/20">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-600/10 p-2 dark:bg-blue-400/10">
                  <Building2 className="h-5 w-5 text-blue-700 dark:text-blue-300" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-blue-900 dark:text-blue-100">ثبت‌نام این صفحه فقط برای کاربر عادی است</p>
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    اگر می‌خواهید حساب صراف ایجاد کنید، از فرم اختصاصی صراف استفاده کنید.
                  </p>
                  <Link
                    href="/auth/saraf-signup"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-200"
                  >
                    رفتن به ثبت‌نام صراف
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {!configLoading && !registrationEnabled && (
              <Alert className="bg-yellow-50 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-900 mb-4">
                <AlertDescription className="text-yellow-900 dark:text-yellow-100">
                  ثبت نام در حال حاضر توسط مدیریت غیرفعال شده است.
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900">
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-gray-700 dark:text-gray-300 font-semibold">نام کامل</Label>
                  <Input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="نام و نام خانوادگی"
                    required
                    disabled={isLoading}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-semibold">ایمیل</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="example@email.com"
                    required
                    disabled={isLoading}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-gray-700 dark:text-gray-300 font-semibold">شماره تلفن</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="+93700000000"
                  disabled={isLoading}
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="referralCode" className="text-gray-700 dark:text-gray-300 font-semibold">کد معرف (اختیاری)</Label>
                <Input
                  id="referralCode"
                  type="text"
                  value={formData.referralCode}
                  onChange={(e) => handleInputChange('referralCode', e.target.value.toUpperCase())}
                  placeholder="مثال: SHAHZD-AB12"
                  disabled={isLoading}
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-semibold">رمز عبور</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => handleInputChange('password', e.target.value)}
                      placeholder="رمز عبور قوی"
                      required
                      disabled={isLoading}
                      className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-gray-700 dark:text-gray-300 font-semibold">تکرار رمز عبور</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      placeholder="تکرار رمز عبور"
                      required
                      disabled={isLoading}
                      className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 pr-12"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>

              {termsEnabled ? (
                <TermsConsentPanel
                  id="terms"
                  checked={acceptTerms}
                  onCheckedChange={setAcceptTerms}
                />
              ) : null}

              <Button
                type="submit"
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-lg"
                disabled={isLoading || (termsEnabled && !acceptTerms) || (!configLoading && !registrationEnabled)}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    در حال ثبت نام...
                  </div>
                ) : (
                  <>
                    ثبت نام
                    <ArrowRight className="h-5 w-5 mr-2" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                قبلاً ثبت نام کرده‌اید؟{' '}
                <Link href="/auth/signin" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline transition-colors">
                  وارد شوید
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
