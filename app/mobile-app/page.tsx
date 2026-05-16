'use client'

import { useEffect, useState } from 'react'
import { Download, Globe, Shield, Smartphone, Zap, Sparkles, CheckCircle2 } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'

// Served from `public/apk/shazada.apk`
const ANDROID_DOWNLOAD_PATH = '/apk/shazada.apk'
// Always show the production URL as the written link on the page.
const ANDROID_DOWNLOAD_PUBLIC_URL = 'https://www.shazada.org/apk/shazada.apk'

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return null
  const mb = bytes / (1024 * 1024)
  if (mb >= 1) return `${mb.toFixed(mb >= 10 ? 0 : 1)} MB`
  const kb = bytes / 1024
  return `${kb.toFixed(kb >= 10 ? 0 : 1)} KB`
}

export default function MobileAppPage() {
  const { language } = useLanguage()
  const [apkSize, setApkSize] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch(ANDROID_DOWNLOAD_PATH, { method: 'HEAD' })
        const len = res.headers.get('content-length')
        const n = len ? Number(len) : NaN
        const pretty = formatBytes(n)
        if (pretty) setApkSize(pretty)
      } catch {
        // Ignore sizing failures; download still works.
      }
    })()
  }, [])

  const features = [
    {
      icon: Zap,
      title: pick(language, 'دسترسی سریع', 'Fast access', 'چټک لاسرسی'),
      description: pick(language, 'صفحات اصلی نرخ‌ها، پیگیری و حساب را سریع از موبایل باز کنید.', 'Open core rates, tracking, and account pages quickly from mobile.', 'د نرخونو، تعقیب او حساب اصلي پاڼې له موبایل څخه ژر پرانیزئ.'),
    },
    {
      icon: Shield,
      title: pick(language, 'امنیت حساب وب', 'Web account security', 'د وېب حساب امنیت'),
      description: pick(language, 'از همان حساب و کنترل‌های ورود پلتفرم وب استفاده می‌کند.', 'Uses the same account and sign-in controls that power the web platform.', 'هماغه حساب او د ننوتلو کنټرولونه کاروي چې وېب پلېټفارم یې کاروي.'),
    },
    {
      icon: Globe,
      title: pick(language, 'دسترسی به فهرست صرافان', 'Saraf directory access', 'د صرافانو لېست ته لاسرسی'),
      description: pick(language, 'صرافان، شعب و اطلاعات مالی عمومی را در موبایل مرور کنید.', 'Browse sarafs, branches, and public financial information while mobile.', 'صرافان، څانګې او عامه مالي معلومات له موبایل څخه وڅېړئ.'),
    },
  ]

  const bullets = [
    pick(language, 'دانلود مستقیم APK از همین صفحه', 'Direct APK download from this page', 'له همدې پاڼې څخه مستقیم APK ډاونلوډ'),
    pick(language, 'هماهنگ با تم روشن و تیره', 'Matches light and dark theme', 'له روښانه او تیاره تم سره برابر'),
    pick(language, 'طراحی ساده و سریع برای کاربران عادی', 'Simple and fast for normal users', 'د عادي کاروونکو لپاره ساده او چټک'),
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <section className="relative overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(135deg,#0b1220_0%,#2e1065_45%,#4f46e5_100%)] px-6 py-8 text-white shadow-[0_40px_120px_-60px_rgba(79,70,229,0.7)] sm:px-10 sm:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.22),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.18),transparent_40%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.10)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:26px_26px] opacity-25" />

          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold backdrop-blur-xl">
                <Sparkles className="h-4 w-4 text-cyan-200" />
                {pick(language, 'دانلود اپ اندروید', 'Android app download', 'د انډرایډ اپ ډاونلوډ')}
                <Badge className="ml-2 bg-emerald-400/15 text-emerald-100 border border-emerald-300/20">
                  {pick(language, 'فعال', 'Live', 'ژوندی')}
                </Badge>
              </div>

              <div className="space-y-3">
                <h1 className="text-3xl font-black leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {pick(language, 'اپلیکیشن موبایل سرای شهزاده', 'Saray Shahzada Mobile App', 'د سرای شهزاده موبایل اپ')}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/85 sm:text-base">
                  {pick(
                    language,
                    'این صفحه وضعیت واقعی پروژه را نشان می‌دهد. دانلود اندروید اکنون در دسترس است و نسخه iOS هنوز منتشر نشده است.',
                    'This page reflects the real state of the project. Android download is available now. iOS store release is not published yet.',
                    'دا پاڼه د پروژې ریښتینی حالت ښيي. د انډرایډ ډاونلوډ اوس شته او د iOS نسخه لا نه ده خپره شوې.'
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="h-11 rounded-full bg-white px-6 font-bold text-indigo-700 shadow-lg shadow-black/25 hover:bg-white/90 dark:text-indigo-700">
                  <a href={ANDROID_DOWNLOAD_PATH} download rel="noreferrer">
                    <Download className="mr-2 h-5 w-5" />
                    {pick(language, 'دانلود برای اندروید', 'Download for Android', 'د انډرایډ لپاره ډاونلوډ')}
                  </a>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  disabled
                  className="h-11 rounded-full border-white/25 bg-white/10 px-6 font-bold text-white backdrop-blur-xl hover:bg-white/15"
                >
                  {pick(language, 'iOS به‌زودی', 'iOS Coming Soon', 'iOS ژر راځي')}
                </Button>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {bullets.map((b) => (
                  <div key={b} className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur-xl">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-200" />
                    <div className="text-xs leading-6 text-white/85">{b}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_60%)]" />
              <div className="relative space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-5 w-5 text-cyan-200" />
                    <span className="text-sm font-bold">{pick(language, 'جزئیات دانلود', 'Download details', 'د ډاونلوډ جزئیات')}</span>
                  </div>
                  {apkSize ? (
                    <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs text-white/85">
                      {pick(language, `اندازه: ${apkSize}`, `Size: ${apkSize}`, `کچه: ${apkSize}`)}
                    </span>
                  ) : null}
                </div>

                <div id="download" className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                  <div className="text-xs text-white/80">{pick(language, 'لینک دانلود', 'Download link', 'د ډاونلوډ لینک')}</div>
                  <a className="mt-1 block break-all text-sm font-semibold text-white underline underline-offset-4" href={ANDROID_DOWNLOAD_PATH} download rel="noreferrer">
                    {ANDROID_DOWNLOAD_PUBLIC_URL}
                  </a>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/10 px-4 py-4">
                  <div className="text-sm font-bold text-white">{pick(language, 'راهنمای نصب', 'Install steps', 'د نصب لارښوونې')}</div>
                  <div className="mt-2 text-xs leading-6 text-white/80">
                    {pick(
                      language,
                      '1) دانلود کنید. 2) در صورت نیاز Unknown sources را فعال کنید. 3) فایل را باز کرده و نصب کنید.',
                      '1) Download. 2) If needed, enable Unknown sources. 3) Open the file and install.',
                      '1) ډاونلوډ. 2) که اړتیا وي Unknown sources فعال کړئ. 3) فایل پرانیزئ او نصب یې کړئ.'
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="glass-card hover-lift border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-[0_18px_48px_-30px_rgba(79,70,229,0.55)]">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-base font-black text-slate-900 dark:text-white">{feature.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-lg">{pick(language, 'دسترس‌پذیری', 'Availability', 'شتون')}</CardTitle>
            <CardDescription>
              {pick(language, 'فقط چیزهایی را نمایش می‌دهد که اکنون برای این پروژه واقعی هستند.', 'Only claim what is currently real for this project.', 'یوازې هغه څه وښایئ چې اوس د دې پروژې لپاره رښتیا دي.')}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur">
              <p className="font-bold">Android</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{pick(language, 'دانلود مستقیم از همین صفحه در دسترس است.', 'Direct download is available from this page.', 'مستقیم ډاونلوډ له همدې پاڼې څخه شته.')}</p>
            </div>
            <div className="rounded-2xl border border-border/70 bg-background/70 p-4 backdrop-blur">
              <p className="font-bold">iOS</p>
              <p className="mt-2 text-sm leading-7 text-muted-foreground">{pick(language, 'فعلا نسخه App Store منتشر نشده است.', 'No App Store release is published yet.', 'تر اوسه د App Store نسخه نه ده خپره شوې.')}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
