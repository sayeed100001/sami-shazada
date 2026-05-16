import type { Metadata } from 'next'
import Link from 'next/link'
import { LifeBuoy, MessageSquareText } from 'lucide-react'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ContactInfo } from '@/components/ContactInfo'

export const metadata: Metadata = {
  title: 'پشتیبانی | Saray Shahzada',
  description:
    'مرکز پشتیبانی سرای شهزاده: راهنمایی، ارتباط مستقیم با تیم پشتیبانی، و پاسخ به سوالات متداول.',
}

export default function SupportPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20">
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-white/85 p-6 shadow-[0_22px_60px_-48px_rgba(15,23,42,0.45)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70 sm:p-8">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.14),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.10),transparent_38%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 dark:border-indigo-400/15 dark:bg-indigo-500/10 dark:text-indigo-200">
                <LifeBuoy className="h-4 w-4" />
                پشتیبانی
              </div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white sm:text-3xl">
                مرکز پشتیبانی سرای شهزاده
              </h1>
              <p className="max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
                اگر سوال دارید یا مشکلی در سیستم دارید، از چت پشتیبانی (دکمه پایین صفحه) استفاده کنید. همچنین می‌توانید از
                راه‌های زیر با ما در تماس باشید.
              </p>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild className="rounded-2xl bg-indigo-600 text-white hover:bg-indigo-700">
                  <Link href="/auth/signup">ثبت نام</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href="/auth/signin">ورود</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-2xl">
                  <Link href="/sarafs">فهرست صرافان</Link>
                </Button>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-5 shadow-sm dark:border-white/10 dark:bg-white/5">
              <div className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                <MessageSquareText className="h-4 w-4" />
                راه‌های تماس
              </div>
              <div className="mt-4">
                <ContactInfo />
              </div>
              <div className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">
                برای چت مستقیم با پشتیبانی، از دکمه چت پایین صفحه استفاده کنید.
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="text-sm font-black text-slate-900 dark:text-white">چرا حساب بسازم؟</div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              با حساب کاربری می‌توانید به پیام‌رسان داخلی، پیگیری حواله‌ها، و امکانات شخصی‌سازی دسترسی داشته باشید.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="text-sm font-black text-slate-900 dark:text-white">چگونه صراف پیدا کنم؟</div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              به صفحه صرافان بروید و با فیلتر شهر و جستجو، صرافان و شعبه‌های همان شهر را ببینید.
            </p>
          </div>
          <div className="rounded-3xl border border-slate-200/70 bg-white/85 p-5 shadow-sm dark:border-white/10 dark:bg-slate-950/70">
            <div className="text-sm font-black text-slate-900 dark:text-white">خطا یا مشکل فنی</div>
            <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
              مشکل را همراه با اسکرین‌شات و زمان تقریبی وقوع، در چت پشتیبانی ارسال کنید تا سریع‌تر بررسی شود.
            </p>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}

