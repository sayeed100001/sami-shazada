'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Copy,
  Edit,
  Mail,
  Share2,
  User,
  Users,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber, formatLocalizedRelativeTime } from '@/lib/locale'
import { AchievementStrip } from '@/components/social/AchievementStrip'
import type { SocialAchievement } from '@/lib/social-features'

type ActivityItem = {
  id: string
  type: string
  description: string
  amount?: number
  status?: string
  timestamp: string
  referenceCode?: string
}

type UserStatsResponse = {
  totalTransactions: number
  totalVolume: number
  lifetimeDiscountSaved: number
  monthly?: {
    transactionCount: number
    discountSaved: number
  }
  rewards?: {
    activeCount: number
    freeTransfersAvailable: number
    transferDiscountRewards: number
  }
  recentActivity: ActivityItem[]
}

type UserProfileResponse = {
  id: string
  email: string
  name: string
  phone: string | null
  avatarUrl: string | null
  role: string
  isActive: boolean
  isVerified: boolean
  createdAt: string
  lastLogin: string | null
}

type SettingsResponse = {
  user?: {
    notifications?: {
      email?: boolean
      push?: boolean
      sms?: boolean
      priceAlerts?: boolean
      newsUpdates?: boolean
    }
    preferences?: {
      language?: string
      currency?: string
      timezone?: string
      dateFormat?: string
    }
  }
  security?: {
    twoFactorEnabled?: boolean
    activeSessions?: Array<{ id: string; isCurrent?: boolean }>
  }
}

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

function getInitials(name: string) {
  if (!name || typeof name !== 'string') return 'U'
  return name
    .split(' ')
    .map((word) => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getRoleLabel(role: string, language: Language) {
  switch (role) {
    case 'ADMIN':
      return pick(language, 'مدیر سیستم', 'System Admin', 'سيستم مدير')
    case 'SARAF':
      return pick(language, 'صراف', 'Saraf', 'صراف')
    default:
      return pick(language, 'کاربر', 'User', 'کارن')
  }
}

function getActivityStatusLabel(status: string | undefined, language: Language) {
  if (!status) return null
  switch (status) {
    case 'COMPLETED':
      return pick(language, 'تکمیل شده', 'Completed', 'بشپړ شوی')
    case 'PENDING':
      return pick(language, 'در انتظار', 'Pending', 'په انتظار کې')
    case 'CANCELLED':
      return pick(language, 'لغو شده', 'Cancelled', 'لغوه شوی')
    default:
      return status
  }
}

function formatMoney(value: number, language: Language) {
  return `${formatLocalizedNumber(value, language)} AFN`
}

export default function ProfilePage() {
  const { data: session } = useSession()
  const { language } = useLanguage()

  const { data: userStats } = useQuery<UserStatsResponse>({
    queryKey: ['user-stats'],
    queryFn: async () => {
      const response = await fetch('/api/user/stats')
      if (!response.ok) throw new Error('Failed to fetch user stats')
      return response.json()
    },
    enabled: !!session,
  })

  const { data: profile } = useQuery<UserProfileResponse>({
    queryKey: ['user-profile'],
    queryFn: async () => {
      const response = await fetch('/api/user/profile')
      if (!response.ok) throw new Error('Failed to fetch profile')
      return response.json()
    },
    enabled: !!session,
  })

  const { data: settings } = useQuery<SettingsResponse>({
    queryKey: ['user-settings-summary'],
    queryFn: async () => {
      const response = await fetch('/api/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')
      return response.json()
    },
    enabled: !!session,
  })

  const { data: social } = useQuery<SocialSummaryResponse>({
    queryKey: ['user-social-summary'],
    queryFn: async () => {
      const response = await fetch('/api/user/social')
      if (!response.ok) throw new Error('Failed to fetch social summary')
      return response.json()
    },
    enabled: !!session,
  })

  if (!session) {
    return (
      <DashboardLayout>
        <div className="py-12 text-center text-muted-foreground">
          {pick(language, 'برای مشاهده پروفایل خود وارد شوید.', 'Please sign in to view your profile.', 'د خپل پروفايل د ليدو لپاره ننوزئ.')}
        </div>
      </DashboardLayout>
    )
  }

  const preferences = settings?.user?.preferences
  const notifications = settings?.user?.notifications
  const activeSessions = settings?.security?.activeSessions?.length || 0
  const twoFactorEnabled = Boolean(settings?.security?.twoFactorEnabled)
  const recentActivity = userStats?.recentActivity || []
  const profilePulse = [
    { label: pick(language, 'تراکنش‌ها', 'Transactions', 'لېږدونه'), value: formatLocalizedNumber(userStats?.totalTransactions || 0, language) },
    { label: pick(language, 'حجم کل', 'Total volume', 'ټول حجم'), value: formatMoney(userStats?.totalVolume || 0, language) },
    { label: pick(language, 'جوایز فعال', 'Active rewards', 'فعال انعامونه'), value: formatLocalizedNumber(userStats?.rewards?.activeCount || 0, language) },
    { label: pick(language, 'نشست‌های فعال', 'Active sessions', 'فعالې ناستې'), value: formatLocalizedNumber(activeSessions, language) },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <section className="relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_42%,#7c3aed_100%)] px-6 py-8 text-white shadow-[0_45px_120px_-55px_rgba(59,130,246,0.75)] md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.2),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />

          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-xl">
                <User className="h-4 w-4" />
                {pick(language, 'پروفایل حساب', 'Account profile', 'د حساب پروفايل')}
              </div>

              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  {profile?.name || session.user.name}
                  <span className="mt-2 block text-blue-100">
                    {pick(language, 'هویت، امنیت و اعتبار شما در یک نمای premium', 'Identity, security, and credibility in one premium view', 'ستاسو هويت، امنيت او اعتبار په يو پريميم نما کې')}
                  </span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  {pick(
                    language,
                    'این صفحه مرکز هویت شما در سیستم است: وضعیت حساب، تنظیمات، سابقه فعالیت و لایه اجتماعی همه در یک فضای روشن و حرفه‌ای دیده می‌شوند.',
                    'This page is your identity layer in the system, bringing together account state, settings, live activity, and your social surface.',
                    'دا پاڼه په سيستم کې ستاسو د هويت مرکز دی چې د حساب حالت، خوښې، ژوندی فعاليت او ټولنيزه برخه په يو ځای کې راټولوي.'
                  )}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {profilePulse.map((item) => (
                  <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                    <div className="text-xs text-slate-300">{item.label}</div>
                    <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-white/10 p-6 backdrop-blur-2xl">
              <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
                <Avatar className="h-24 w-24 border-4 border-white/20 shadow-xl">
                  <AvatarImage
                    alt={profile?.name || session.user.name || ''}
                    src={profile?.avatarUrl || session.user.avatarUrl || undefined}
                  />
                  <AvatarFallback className="bg-white/20 text-2xl text-white">
                    {getInitials(profile?.name || session.user.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className="rounded-full border-0 bg-white text-slate-900">
                      {getRoleLabel(session.user.role, language)}
                    </Badge>
                    <Badge className="rounded-full border border-white/10 bg-white/10 text-white" variant="outline">
                      {profile?.isVerified
                        ? pick(language, 'حساب تایید شده', 'Verified account', 'تاييد شوی حساب')
                        : pick(language, 'تایید در انتظار', 'Verification pending', 'تایيد په انتظار کې')}
                    </Badge>
                  </div>

                  <div className="space-y-2 text-sm text-slate-200">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span>{profile?.email || session.user.email}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {pick(language, 'عضویت از', 'Member since', 'غړيتوب له')}:{' '}
                        {profile?.createdAt
                          ? formatLocalizedDate(profile.createdAt, language, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : pick(language, 'در دسترس نیست', 'Unavailable', 'شتون نه لري')}
                      </span>
                    </div>
                  </div>

                  <Button asChild className="rounded-full bg-white px-6 text-slate-900 hover:bg-slate-100">
                    <Link href="/settings">
                      <Edit className="mr-2 h-4 w-4" />
                      {pick(language, 'ویرایش پروفایل', 'Edit profile', 'پروفايل سمول')}
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'شاخص‌های حساب', 'Account metrics', 'د حساب شاخصونه')}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {pick(language, 'آمار سریع و کاربردی', 'Fast, useful metrics', 'چټک او ګټور ارقام')}
                  </h2>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'تراکنش‌ها', 'Transactions', 'لېږدونه')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatLocalizedNumber(userStats?.totalTransactions || 0, language)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'حجم کل', 'Total volume', 'ټول حجم')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(userStats?.totalVolume || 0, language)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'انتقالات ماهانه', 'Monthly transfers', 'مياشتني لېږدونه')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatLocalizedNumber(userStats?.monthly?.transactionCount || 0, language)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'صرفه‌جویی کل', 'Lifetime savings', 'ټوله سپما')}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{formatMoney(userStats?.lifetimeDiscountSaved || 0, language)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {social ? (
              <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(9,12,24,0.98),rgba(35,28,54,0.96))] text-white shadow-[0_30px_80px_-50px_rgba(15,23,42,0.72)] dark:border-white/10">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                      {pick(language, 'اعتبار اجتماعی', 'Social identity', 'ټولنيز اعتبار')}
                    </div>
                    <h2 className="mt-2 text-2xl font-black">
                      {pick(language, 'پروفایل بیرونی حساب', 'Your outward-facing profile', 'ستاسو بهرنۍ پروفايل')}
                    </h2>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-slate-300">{pick(language, 'کد معرفی', 'Referral code', 'د معرفۍ کوډ')}</div>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-lg font-black text-white">{social.referral.code}</span>
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
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                    <div className="text-xs text-slate-300">{pick(language, 'تعداد معرفی‌ها', 'Referral count', 'د معرفيو شمېر')}</div>
                    <div className="mt-2 text-3xl font-black text-white">
                      {formatLocalizedNumber(social.referral.totalReferrals, language)}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/10 text-white hover:bg-white/15">
                      <Link href="/community/leaderboard">
                        <Users className="mr-2 h-4 w-4" />
                        {pick(language, 'جدول رتبه‌بندی', 'Leaderboard', 'درجه بندي')}
                      </Link>
                    </Button>
                    {social.visibility.profileVisible ? (
                      <Button asChild className="rounded-full bg-white text-slate-900 hover:bg-slate-100">
                        <Link href={social.profile.publicProfileUrl}>
                          <Share2 className="mr-2 h-4 w-4" />
                          {pick(language, 'پروفایل عمومی', 'Public profile', 'عامه پروفايل')}
                        </Link>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            ) : null}
          </div>

          <div className="space-y-6">
            <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
              <CardContent className="space-y-5 p-6">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'جریان فعالیت', 'Activity flow', 'د فعاليت جريان')}
                  </div>
                  <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                    {pick(language, 'timeline زنده حساب', 'Live account timeline', 'د حساب ژوندی timeline')}
                  </h2>
                </div>

                {recentActivity.length > 0 ? (
                  <div className="space-y-3">
                    {recentActivity.map((activity) => (
                      <div key={activity.id} className="flex items-start gap-4 rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                        <div className="mt-1 h-2.5 w-2.5 rounded-full bg-blue-500" />
                        <div className="min-w-0 flex-1">
                          <div className="font-semibold text-slate-900 dark:text-white">{activity.description}</div>
                          <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                            <span>{formatLocalizedRelativeTime(activity.timestamp, language)}</span>
                            {activity.referenceCode ? (
                              <span>{pick(language, 'کد مرجع', 'Ref', 'مرجع')}: {activity.referenceCode}</span>
                            ) : null}
                            {typeof activity.amount === 'number' ? (
                              <span>{pick(language, 'مبلغ', 'Amount', 'مقدار')}: {formatLocalizedNumber(activity.amount, language)}</span>
                            ) : null}
                          </div>
                        </div>
                        {activity.status ? (
                          <Badge variant={activity.status === 'COMPLETED' ? 'default' : 'secondary'} className="rounded-full">
                            {getActivityStatusLabel(activity.status, language)}
                          </Badge>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-[24px] border border-dashed border-slate-300/80 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                    {pick(language, 'هنوز فعالیتی ثبت نشده است.', 'No activity recorded yet.', 'لا تر اوسه کوم فعاليت نه دی ثبت شوی.')}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {pick(language, 'امنیت', 'Security', 'امنیت')}
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {pick(language, 'وضعیت امنیتی حساب', 'Security posture', 'د حساب امنيتي حالت')}
                    </h2>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="font-semibold text-slate-900 dark:text-white">{pick(language, 'احراز هویت دومرحله‌ای', 'Two-factor authentication', 'دوه پړاوه تاييد')}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        {twoFactorEnabled
                          ? pick(language, 'تایید اضافه برای ورود فعال است.', 'Additional sign-in verification is enabled.', 'د ننوتلو اضافي تاييد فعال دی.')
                          : pick(language, 'تایید اضافه برای ورود غیرفعال است.', 'Additional sign-in verification is disabled.', 'د ننوتلو اضافي تاييد غيرفعال دی.')}
                      </div>
                      <Badge variant={twoFactorEnabled ? 'default' : 'outline'} className="mt-3 rounded-full">
                        {twoFactorEnabled ? pick(language, 'فعال', 'Enabled', 'فعال') : pick(language, 'غیرفعال', 'Disabled', 'غيرفعال')}
                      </Badge>
                    </div>

                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="font-semibold text-slate-900 dark:text-white">{pick(language, 'آخرین ورود', 'Last login', 'وروستی ننوتل')}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        {profile?.lastLogin
                          ? formatLocalizedRelativeTime(profile.lastLogin, language)
                          : pick(language, 'هنوز ورودی ثبت نشده است', 'No recorded login yet', 'لا تراوسه ننوتل نه دي ثبت شوي')}
                      </div>
                      <Badge variant={profile?.isActive === false ? 'outline' : 'default'} className="mt-3 rounded-full">
                        {profile?.isActive === false ? pick(language, 'غیرفعال', 'Inactive', 'غيرفعال') : pick(language, 'فعال', 'Active', 'فعال')}
                      </Badge>
                    </div>

                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="font-semibold text-slate-900 dark:text-white">{pick(language, 'هشدارهای امنیتی', 'Security alerts', 'امنيتي خبرتياوې')}</div>
                      <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                        {pick(language, 'اعلان ایمیلی برای رویدادهای حساب', 'Email notifications for account events', 'د حساب پېښو لپاره برېښناليکي خبرتياوې')}
                      </div>
                      <Badge variant={notifications?.email ? 'default' : 'outline'} className="mt-3 rounded-full">
                        {notifications?.email ? pick(language, 'فعال', 'Enabled', 'فعال') : pick(language, 'غیرفعال', 'Disabled', 'غيرفعال')}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
                <CardContent className="space-y-5 p-6">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {pick(language, 'تنظیمات', 'Preferences', 'خوښې')}
                    </div>
                    <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                      {pick(language, 'ترجیحات شخصی', 'Personal preferences', 'شخصي خوښې')}
                    </h2>
                  </div>
                  <div className="grid gap-3">
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'زبان', 'Language', 'ژبه')}</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{preferences?.language || 'fa'}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'ارز پیش‌فرض', 'Default currency', 'اصلي پيسه')}</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{preferences?.currency || 'AFN'}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'منطقه زمانی', 'Timezone', 'وخت سيمه')}</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{preferences?.timezone || 'Asia/Kabul'}</div>
                    </div>
                    <div className="rounded-[22px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                      <div className="text-sm text-slate-500 dark:text-slate-300">{pick(language, 'فرمت تاریخ', 'Date format', 'د نېټې بڼه')}</div>
                      <div className="mt-1 font-semibold text-slate-900 dark:text-white">{preferences?.dateFormat || 'persian'}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {social ? (
              <>
                <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
                  <CardContent className="space-y-5 p-6">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {pick(language, 'دستاوردها', 'Achievements', 'لاسته راوړنې')}
                      </div>
                      <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                        {pick(language, 'نشان‌ها و اعتبار اجتماعی', 'Badges and social credibility', 'نښانونه او ټولنيز اعتبار')}
                      </h2>
                    </div>
                    <AchievementStrip achievements={social.achievements} />
                  </CardContent>
                </Card>

                <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
                  <CardContent className="space-y-5 p-6">
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                        {pick(language, 'شبکه معرفی', 'Referral network', 'د معرفۍ شبکه')}
                      </div>
                      <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-white">
                        {pick(language, 'معرفی‌های اخیر شما', 'Your recent referrals', 'ستاسو وروستۍ معرفۍ')}
                      </h2>
                    </div>

                    {social.referral.recentReferrals.length > 0 ? (
                      <div className="space-y-3">
                        {social.referral.recentReferrals.map((referral) => (
                          <div key={referral.id} className="flex items-center justify-between rounded-[24px] border border-slate-200/70 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                            <div>
                              <div className="font-semibold text-slate-900 dark:text-white">{referral.name}</div>
                              <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                {pick(language, 'عضویت', 'Joined', 'يوځای شوی')} {formatLocalizedRelativeTime(referral.createdAt, language)}
                              </div>
                            </div>
                            <Badge variant="outline" className="rounded-full">
                              {formatLocalizedNumber(referral.totalTransactions, language)} {pick(language, 'انتقال', 'transfers', 'لېږدونه')}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-[24px] border border-dashed border-slate-300/80 bg-slate-50/80 px-5 py-10 text-center text-sm text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                        {pick(language, 'هنوز معرفی‌ای ثبت نشده است.', 'No referrals yet.', 'لا تراوسه هېڅ معرفي نشته.')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
