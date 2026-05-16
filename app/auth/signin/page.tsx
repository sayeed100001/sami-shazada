'use client'

import { useEffect, useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Eye, EyeOff, LogIn, ArrowRight, Sparkles, Shield } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { executeRecaptcha } from '@/lib/client-recaptcha'
import { isPortalRole } from '@/lib/portal-access'
import { useSystemConfigContext } from '@/contexts/SystemConfigContext'

export default function SignInPage() {
  const { config } = useSystemConfigContext()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [forgotPasswordEnabled, setForgotPasswordEnabled] = useState(true)
  const [recaptchaConfig, setRecaptchaConfig] = useState({ enabled: false, siteKey: '', scriptUrl: '' })
  const router = useRouter()
  const registrationEnabled = config.registration_enabled !== 'false'

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
    let active = true
    fetch('/api/auth/password/config', { cache: 'no-store' })
      .then((response) => response.json())
      .then((data) => {
        if (!active) return
        setForgotPasswordEnabled(
          Boolean(data?.enabled && data?.otpEnabled && Array.isArray(data?.availableChannels) && data.availableChannels.length > 0)
        )
      })
      .catch(() => {
        if (!active) return
        setForgotPasswordEnabled(true)
      })
    return () => {
      active = false
    }
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      let captchaToken: string | undefined
      if (recaptchaConfig.enabled) {
        try {
          captchaToken = await executeRecaptcha(recaptchaConfig.siteKey, 'signin', recaptchaConfig.scriptUrl)
        } catch {
          setError('تایید امنیتی انجام نشد. دوباره تلاش کنید')
          toast.error('تایید امنیتی ناموفق بود')
          return
        }
      }

      const result = await signIn('credentials', {
        email,
        password,
        captchaToken,
        captchaAction: 'signin',
        redirect: false,
      })

      if (result?.error) {
        setError('ایمیل یا رمز عبور اشتباه است')
        toast.error('خطا در ورود')
      } else {
        toast.success('با موفقیت وارد شدید')
        
        await new Promise(resolve => setTimeout(resolve, 500))
        const freshSession = await getSession()
        
        if (freshSession?.user?.role === 'ADMIN') {
          router.replace('/admin')
        } else if (isPortalRole(freshSession?.user?.role)) {
          router.replace('/portal')
        } else {
          router.replace('/')
        }
      }
    } catch (error) {
      setError('خطا در اتصال به سرور')
      toast.error('خطا در ورود')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Modern Clean Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-950 dark:via-slate-900 dark:to-gray-950" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.1),transparent_50%),radial-gradient(circle_at_bottom_left,rgba(139,92,246,0.1),transparent_50%)]" />
      
      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:64px_64px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="relative z-10 w-full max-w-md space-y-8">
        {/* Logo & Title */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl mb-4">
            <span className="text-white font-black text-3xl">س</span>
          </div>
          <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-gray-900 via-blue-800 to-indigo-900 dark:from-white dark:via-blue-200 dark:to-indigo-200">
            سرای شهزاده
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400">ورود به حساب کاربری</p>
          
          {/* Trust Badges */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Shield className="h-4 w-4 text-emerald-600" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">امن</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">سریع</span>
            </div>
          </div>
        </div>

        {/* Clean Modern Card */}
        <div className="relative overflow-hidden rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 via-transparent to-indigo-50/50 dark:from-blue-950/20 dark:via-transparent dark:to-indigo-950/20" />
          
          <div className="relative z-10 p-8 space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 flex items-center justify-center shadow-lg">
                  <LogIn className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">ورود</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">به حساب خود وارد شوید</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <Alert className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900">
                  <AlertDescription className="text-red-800 dark:text-red-200">{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-gray-700 dark:text-gray-300 font-semibold">ایمیل</Label>
                <Input
                  id="email"
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="example@email.com or +93700000000"
                  required
                  disabled={isLoading}
                  className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-gray-700 dark:text-gray-300 font-semibold">رمز عبور</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="رمز عبور خود را وارد کنید"
                    required
                    disabled={isLoading}
                    className="h-12 bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:border-blue-500 focus:ring-blue-500 pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-8 w-8 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                {forgotPasswordEnabled && (
                  <div className="text-right text-sm">
                    <Link
                      href="/auth/forgot-password"
                      className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                    >
                      رمز عبور را فراموش کرده‌ام
                    </Link>
                  </div>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold shadow-lg hover:shadow-xl transition-all duration-200 text-lg" 
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    در حال ورود...
                  </div>
                ) : (
                  <>
                    ورود به سیستم
                    <ArrowRight className="h-5 w-5 mr-2" />
                  </>
                )}
              </Button>
            </form>

            {/* Links */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-800">
              {registrationEnabled ? (
                <>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    حساب کاربری ندارید؟{' '}
                    <Link href="/auth/signup" className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-semibold hover:underline transition-colors">
                      ثبت نام کنید
                    </Link>
                  </p>
                  <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                    صراف هستید؟{' '}
                    <Link href="/auth/saraf-signup" className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 font-semibold hover:underline transition-colors">
                      ثبت نام صرافی
                    </Link>
                  </p>
                </>
              ) : (
                <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                  ثبت نام در حال حاضر غیرفعال است
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-500">
          با ورود، شما با{' '}
          <Link href="/terms" className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 underline">
            شرایط و قوانین
          </Link>
          {' '}موافقت میکنید
        </p>
      </div>
    </div>
  )
}
