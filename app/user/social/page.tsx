'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRightLeft,
  Copy,
  Heart,
  History,
  Share2,
  Sparkles,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AchievementStrip } from '@/components/social/AchievementStrip'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import { formatLocalizedNumber, formatLocalizedRelativeTime } from '@/lib/locale'
import type { Language } from '@/lib/i18n'
import type { SocialAchievement } from '@/lib/social-features'

type SocialSummaryResponse = {
  profile: {
    id: string
    publicProfileUrl: string
  }
  visibility: {
    profileVisible: boolean
    activityVisible: boolean
    dataSharing: boolean
  }
  referral: {
    code: string
    signupUrl: string
    totalReferrals: number
    recentReferrals: Array<{
      id: string
      name: string
      createdAt: string
      totalTransactions: number
    }>
  }
  achievements: SocialAchievement[]
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export default function UserSocialPage() {
  const { data: session, status } = useSession()
  const { language } = useLanguage()

  const { data: social } = useQuery<SocialSummaryResponse>({
    queryKey: ['user-social-hub'],
    queryFn: async () => {
      const response = await fetch('/api/user/social')
      if (!response.ok) throw new Error('Failed to load social data')
      return response.json()
    },
    enabled: !!session,
  })

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center text-muted-foreground">
          {pick(language, 'برای مشاهده این بخش وارد شوید.', 'Please sign in to view this section.', 'د دې برخې د ليدو لپاره ننوزئ.')}
        </div>
      </DashboardLayout>
    )
  }

  const visibilityCards = [
    {
      label: pick(language, 'پروفایل عمومی', 'Public profile', 'عامه پروفايل'),
      value: social?.visibility.profileVisible ? pick(language, 'روشن', 'On', 'فعال') : pick(language, 'خاموش', 'Off', 'بند'),
    },
    {
      label: pick(language, 'فید فعالیت', 'Activity feed', 'د فعاليت فيډ'),
      value: social?.visibility.activityVisible ? pick(language, 'روشن', 'On', 'فعال') : pick(language, 'خاموش', 'Off', 'بند'),
    },
    {
      label: pick(language, 'اشتراک داده', 'Data sharing', 'د معلوماتو شريکول'),
      value: social?.visibility.dataSharing ? pick(language, 'روشن', 'On', 'فعال') : pick(language, 'خاموش', 'Off', 'بند'),
    },
  ]

  const quickLinks = [
    {
      href: '/profile',
      icon: User,
      label: pick(language, 'پروفایل و فعالیت‌ها', 'Profile & activity', 'پروفايل او فعاليتونه'),
      detail: pick(language, 'نمای عمومی و حساب شما', 'Your account and public presence', 'ستاسو حساب او عامه حضور'),
    },
    {
      href: '/user/favorites',
      icon: Heart,
      label: pick(language, 'صرافان مورد علاقه', 'Favorite sarafs', 'خوښې صرافۍ'),
      detail: pick(language, 'شبکه ذخیره‌شده شما', 'Your saved saraf network', 'ستاسو خوندي شبکه'),
    },
    {
      href: '/community/leaderboard',
      icon: Trophy,
      label: pick(language, 'جدول رتبه‌بندی', 'Leaderboard', 'درجه بندي'),
      detail: pick(language, 'جایگاه شما در جامعه', 'Your standing in the community', 'په ټولنه کې ستاسو ځای'),
    },
    {
      href: '/user/transactions',
      icon: History,
      label: pick(language, 'اشتراک تراکنش‌ها', 'Share transactions', 'راکړې ورکړې شريکول'),
      detail: pick(language, 'ارسال امن به دیگران', 'Share secure transaction snapshots', 'خوندي لنډيزونه شريکول'),
    },
    {
      href: '/hawala/track',
      icon: ArrowRightLeft,
      label: pick(language, 'پیگیری حواله', 'Track hawala', 'حواله تعقيب'),
      detail: pick(language, 'وضعیت و اشتراک کد', 'Status and code sharing', 'حالت او د کوډ شريکول'),
    },
  ]

  if (social?.visibility.profileVisible) {
    quickLinks.push({
      href: social.profile.publicProfileUrl,
      icon: Share2,
      label: pick(language, 'پروفایل عمومی', 'Public profile', 'عامه پروفايل'),
      detail: pick(language, 'نمای بیرونی حساب شما', 'Your public-facing profile', 'ستاسو بهرنۍ پروفايل'),
    })
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <section className="relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(135deg,#04111f_0%,#0f172a_34%,#2563eb_100%)] px-6 py-8 text-white shadow-[0_45px_120px_-55px_rgba(37,99,235,0.75)] md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(96,165,250,0.2),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />

          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                {pick(language, 'مرکز اجتماعی', 'Social command center', 'ټولنيز مرکز')}
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  {pick(language, 'پروفایل، معرفی و اعتبار اجتماعی', 'Profile, referrals, and social credibility', 'پروفايل، معرفي او ټولنيز اعتبار')}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  {pick(
                    language,
                    'این hub اجتماعی همه چیز را یک‌جا جمع می‌کند: لینک عمومی، کد معرفی، badgeها، حریم خصوصی و میانبرهای سریع برای حرکت در شبکه شما.',
                    'This hub brings together your public link, referral engine, badges, privacy state, and the fastest routes through your network.',
                    'دا hub ستاسو عامه لېنک، د معرفۍ سيستم، نښانونه، محرمیت او چټکې لارې ټولې په يو ځای کې راټولوي.'
                  )}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {visibilityCards.map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                    <div className="text-xs text-slate-300">{item.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
              <div className="space-y-4">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100">
                  {pick(language, 'رشد شما', 'Your growth', 'ستاسو وده')}
                </div>
                <div className="text-3xl font-black text-white">
                  {formatLocalizedNumber(social?.referral.totalReferrals || 0, language)}
                </div>
                <div className="text-sm leading-7 text-slate-200">
                  {pick(language, 'تعداد معرفی‌های موفق و ظرفیت رشد اجتماعی شما از همین‌جا دیده می‌شود.', 'This gives you a live read on successful referrals and your social reach.', 'دا ستاسو بریالۍ معرفۍ او ټولنيز لاسرسی په ژوندۍ بڼه ښيي.')}
                </div>
                <div className="rounded-[24px] border border-white/10 bg-black/10 p-4">
                  <div className="text-xs text-slate-300">{pick(language, 'کد معرفی شما', 'Your referral code', 'ستاسو د معرفۍ کوډ')}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-lg font-black text-white">
                      {social?.referral.code || '...'}
                    </span>
                    {social?.referral.code ? (
                      <Button
                        size="sm"
                        type="button"
                        variant="outline"
                        className="rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15"
                        onClick={async () => {
                          await navigator.clipboard.writeText(social.referral.code)
                        }}
                      >
                        <Copy className="mr-2 h-4 w-4" />
                        {pick(language, 'کپی', 'Copy', 'کاپي')}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
          <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
            <CardContent className="space-y-6 p-4 md:p-6">
              <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'مسیرهای سریع', 'Quick routes', 'چټکې لارې')}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {pick(language, 'ورود به تمام قابلیت‌های اجتماعی', 'Everything social, one clean entry point', 'ټولې ټولنيزې ځانګړنې، يو روښانه ځای')}
                  </h2>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                  {pick(language, 'دسترسی سریع', 'Fast access', 'چټکه لاسرسی')}
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {quickLinks.map((item) => {
                  const Icon = item.icon
                  return (
                    <Link
                      key={`${item.href}-${item.label}`}
                      href={item.href}
                      className="group rounded-[26px] border border-slate-200/70 bg-slate-50/80 p-4 transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                    >
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500/15 to-blue-600/15 text-cyan-700 dark:text-cyan-200">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="mt-4 text-base font-black text-slate-900 dark:text-white">{item.label}</div>
                      <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.detail}</div>
                    </Link>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(9,12,24,0.98),rgba(35,28,54,0.96))] text-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.72)] dark:border-white/10">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    {pick(language, 'برنامه معرفی', 'Referral engine', 'د معرفۍ سيستم')}
                  </div>
                  <h2 className="mt-2 text-2xl font-black">
                    {pick(language, 'رشد قابل اشتراک', 'Shareable growth loop', 'د شريکولو وړ وده')}
                  </h2>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-300">{pick(language, 'لینک ثبت‌نام شما', 'Your signup link', 'ستاسو د نوم‌ليکنې لېنک')}</div>
                  <div className="mt-2 break-all text-sm leading-7 text-white">{social?.referral.signupUrl || '...'}</div>
                </div>

                <div className="rounded-[26px] border border-white/10 bg-white/5 p-4">
                  <div className="text-xs text-slate-300">{pick(language, 'تعداد معرفی‌ها', 'Referral count', 'د معرفيو شمېر')}</div>
                  <div className="mt-2 text-3xl font-black text-white">
                    {formatLocalizedNumber(social?.referral.totalReferrals || 0, language)}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'اعتبار اجتماعی', 'Social credibility', 'ټولنيز اعتبار')}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {pick(language, 'نشان‌ها و دستاوردها', 'Badges and achievements', 'نښانونه او لاسته راوړنې')}
                  </h2>
                </div>
                <AchievementStrip achievements={social?.achievements || []} />
              </CardContent>
            </Card>

            <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'معرفی‌های اخیر', 'Recent referrals', 'وروستۍ معرفۍ')}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {pick(language, 'شبکه‌ای که ساخته‌اید', 'The network you have built', 'هغه شبکه چې تاسو جوړه کړې')}
                  </h2>
                </div>
                {social?.referral.recentReferrals?.length ? (
                  <div className="space-y-3">
                    {social.referral.recentReferrals.map((referral) => (
                      <div key={referral.id} className="flex items-center justify-between rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <div>
                          <div className="font-semibold text-slate-900 dark:text-white">{referral.name}</div>
                          <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                            {formatLocalizedRelativeTime(referral.createdAt, language)}
                          </div>
                        </div>
                        <Badge variant="outline" className="rounded-full">
                          {formatLocalizedNumber(referral.totalTransactions, language)}{' '}
                          {pick(language, 'انتقال', 'transfers', 'لېږدونه')}
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300/80 bg-slate-50/80 px-5 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {pick(language, 'هنوز معرفی ثبت نشده است.', 'No referrals yet.', 'تر اوسه کومه معرفي نشته.')}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </DashboardLayout>
  )
}
