'use client'

import { ArrowRightLeft, Building2, ShieldCheck, Sparkles, Workflow } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { UserExchangeRequestForm } from '@/components/exchange/UserExchangeRequestForm'
import { useLanguage } from '@/hooks/useLanguage'

type Language = 'fa' | 'en' | 'ps'

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export default function UserExchangePage() {
  const { language } = useLanguage()
  const activeLanguage = language as Language

  const heroStats = [
    {
      label: pick(activeLanguage, 'مسیر روشن', 'Guided flow', 'روښانه بهير'),
      value: pick(activeLanguage, '۳ قدم', '3 steps', '۳ ګامه'),
    },
    {
      label: pick(activeLanguage, 'نهایی‌سازی', 'Finalized by saraf', 'وروستۍ تایید'),
      value: pick(activeLanguage, 'حضوری', 'In branch', 'حضوري'),
    },
    {
      label: pick(activeLanguage, 'پیگیری', 'Tracking', 'تعقيب'),
      value: pick(activeLanguage, 'زنده', 'Live', 'ژوندی'),
    },
  ]

  const guidance = [
    pick(activeLanguage, 'صراف مناسب را انتخاب کنید و درخواست را به شعبه درست بفرستید.', 'Choose the right saraf and send the request to the right branch.', 'سم صراف و سمه څانګه وټاکئ او غوښتنه هلته ولېږئ.'),
    pick(activeLanguage, 'مبلغ، ارز و شماره تماس را ثبت کنید تا صراف شما را سریع پیدا کند.', 'Submit amount, currency, and contact details so the saraf can reach you fast.', 'مقدار، اسعار او د اړيکې شمېره ثبت کړئ څو صراف مو ژر پيدا کړي.'),
    pick(activeLanguage, 'پس از مراجعه حضوری، صراف معامله را در سیستم کامل می‌کند و در تاریخچه شما ثبت می‌شود.', 'After the branch visit, the saraf completes the deal and it appears in your history.', 'له حضوري مراجعې وروسته صراف معامله بشپړوي او ستاسو په تاريخچه کې ښکاري.'),
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <section className="relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(135deg,#0f172a_0%,#172554_38%,#0f766e_100%)] px-6 py-8 text-white shadow-[0_45px_120px_-55px_rgba(15,118,110,0.8)] md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.2),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />

          <div className="relative grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                {pick(activeLanguage, 'پرتال تبادله', 'Exchange command lane', 'د تبادلې کاري لاره')}
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  {pick(activeLanguage, 'درخواست تبادله ارز', 'Currency exchange request', 'د اسعارو د تبادلې غوښتنه')}
                  <span className="mt-2 block text-cyan-200">
                    {pick(activeLanguage, 'ثبت شفاف، پیگیری ساده، نهایی‌سازی توسط صراف انتخابی شما', 'Transparent submission, simple tracking, completed by your chosen saraf', 'روښانه ثبت، ساده تعقيب، او ستاسو د ټاکلي صراف له خوا بشپړېدل')}
                  </span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  {pick(
                    activeLanguage,
                    'این صفحه فقط یک فرم نیست؛ مسیر عملیاتی شما برای ثبت درخواست، وصل شدن به شعبه درست، و حرکت سریع از درخواست تا معامله نهایی است.',
                    'This is not just a form. It is the operational lane that connects your request to the right branch and moves it cleanly toward final execution.',
                    'دا يوازې فورم نه دی؛ دا هغه عملياتي لاره ده چې ستاسو غوښتنه سمې څانګې ته نښلوي او معامله تر بشپړېدو پورې په روښانه ډول پر مخ بيايي.'
                  )}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {heroStats.map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                    <div className="text-xs text-slate-300">{item.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-400/12 text-cyan-100">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black">{pick(activeLanguage, 'شعبه درست، پاسخ سریع‌تر', 'Right branch, faster response', 'سمه څانګه، چټک ځواب')}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-200">
                      {pick(activeLanguage, 'درخواست مستقیم به شعبه فعال همان صراف می‌رسد تا مسیر شما از همان ابتدا دقیق باشد.', 'Your request lands with an active branch so the path starts clean from the first step.', 'غوښتنه مو د هماغه صراف فعالې څانګې ته رسېږي څو بهير مو له پيله سم وي.')}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-[28px] border border-white/10 bg-white/10 p-5 backdrop-blur-2xl">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-400/12 text-emerald-100">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-lg font-black">{pick(activeLanguage, 'ثبت امن و قابل پیگیری', 'Secure and traceable', 'خوندي او د تعقيب وړ')}</div>
                    <div className="mt-2 text-sm leading-7 text-slate-200">
                      {pick(activeLanguage, 'پس از ثبت، معامله در تاریخچه شما قابل پیگیری می‌شود و صراف آن را در همان سیستم نهایی می‌کند.', 'After submission, the request becomes trackable in your history and the saraf completes it in the same system.', 'له ثبت وروسته غوښتنه ستاسو په تاريخچه کې تعقيبېږي او صراف يې په همدې سيستم کې بشپړوي.')}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-3 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            <UserExchangeRequestForm />
          </div>

          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(9,12,24,0.98),rgba(35,28,54,0.96))] p-6 text-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.72)]">
              <div className="relative space-y-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">
                  <Workflow className="h-4 w-4" />
                  {pick(activeLanguage, 'جریان درخواست', 'Request flow', 'د غوښتنې بهير')}
                </div>
                <h2 className="text-2xl font-black">
                  {pick(activeLanguage, 'از فرم تا تأیید نهایی', 'From form to final confirmation', 'له فورم څخه تر وروستۍ تاييد پورې')}
                </h2>
                <div className="space-y-3">
                  {guidance.map((item, index) => (
                    <div key={item} className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-white/5 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-black text-cyan-100">
                        0{index + 1}
                      </div>
                      <div className="text-sm leading-7 text-slate-200">{item}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200/70 bg-white/85 p-6 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600 dark:text-violet-300">
                  <ArrowRightLeft className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    {pick(activeLanguage, 'چرا این تجربه بهتر است؟', 'Why this experience works better', 'ولې دا تجربه غوره ده؟')}
                  </h2>
                  <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {pick(
                      activeLanguage,
                      'صفحه به‌جای شلوغی، روی تصمیم‌های اصلی تمرکز می‌کند: انتخاب صراف، انتخاب شعبه، ثبت اطلاعات کلیدی و شروع پیگیری.',
                      'Instead of clutter, the page focuses on the decisions that matter most: saraf, branch, key request data, and immediate follow-up.',
                      'پاڼه د ګډوډۍ پر ځای پر اصلي پرېکړو تمرکز کوي: صراف، څانګه، مهم معلومات، او سمدستي تعقيب.'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
