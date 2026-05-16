'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  ArrowRight,
  ArrowRightLeft,
  Bell,
  Copy,
  DollarSign,
  Gift,
  Globe2,
  Heart,
  History,
  Radar,
  Settings as SettingsIcon,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Users,
  WalletCards,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedNumber, formatLocalizedRelativeTime } from '@/lib/locale'
import { AchievementStrip } from '@/components/social/AchievementStrip'
import type { SocialAchievement } from '@/lib/social-features'

interface UserStats {
  totalTransactions: number
  completedTransactions?: number
  pendingTransactions?: number
  totalVolume: number
  unreadNotifications: number
  accountStatus: string
  favoritesCount?: number
  lifetimeDiscountSaved: number
  monthly?: {
    transactionCount: number
    totalVolume: number
    discountSaved: number
  }
  rewards?: {
    activeCount: number
    freeTransfersAvailable: number
    transferDiscountRewards: number
  }
  recentActivity: Array<{
    id: string
    type: string
    description: string
    amount?: number
    status?: string
    timestamp: string
    referenceCode?: string
  }>
}

interface SocialSummary {
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
  }
  achievements: SocialAchievement[]
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatStatusLabel(status: string, language: Language) {
  switch (status) {
    case 'active':
      return pick(language, 'فعال', 'Active', 'فعال')
    case 'pending':
      return pick(language, 'در انتظار', 'Pending', 'په انتظار کې')
    case 'suspended':
      return pick(language, 'تعلیق شده', 'Suspended', 'ځنډول شوی')
    default:
      return status
  }
}

function formatActivityStatus(status: string, language: Language) {
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

function getStatusTone(status: string) {
  switch (status) {
    case 'active':
      return 'border-emerald-300/35 bg-emerald-400/12 text-emerald-50'
    case 'pending':
      return 'border-amber-300/35 bg-amber-400/12 text-amber-50'
    case 'suspended':
      return 'border-rose-300/35 bg-rose-400/12 text-rose-50'
    default:
      return 'border-white/20 bg-white/10 text-white'
  }
}

export default function UserPortal() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [stats, setStats] = useState<UserStats | null>(null)
  const [social, setSocial] = useState<SocialSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [router, session, status])

  useEffect(() => {
    if (!session?.user?.id) return

    Promise.all([
      fetch('/api/user/stats').then((response) => {
        if (!response.ok) throw new Error(`Stats HTTP ${response.status}`)
        return response.json()
      }),
      fetch('/api/user/social').then((response) => {
        if (!response.ok) throw new Error(`Social HTTP ${response.status}`)
        return response.json()
      }),
    ])
      .then(([statsData, socialData]) => {
        setStats(statsData)
        setSocial(socialData)
        setIsLoading(false)
      })
      .catch((error) => {
        console.error('Failed to fetch user dashboard data:', error)
        setIsLoading(false)
      })
  }, [session?.user?.id])

  const handleCopy = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value)
      toast.success(successMessage)
    } catch {
      toast.error(pick(language, 'کپی انجام نشد', 'Copy failed', 'کاپي ونه شوه'))
    }
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p>{pick(language, 'در حال بارگذاری...', 'Loading...', 'بارېږي...')}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) return null

  const firstName = session.user?.name?.trim()?.split(/\s+/)[0] || pick(language, 'دوست', 'friend', 'ملګری')
  const statusLabel = formatStatusLabel(stats?.accountStatus || 'active', language)
  const statusTone = getStatusTone(stats?.accountStatus || 'active')
  const hawalaShortcutLabel = pick(language, 'ثبت حواله جدید', 'New hawala', 'نوې حواله')

  const primaryActions = [
    {
      href: '/hawala',
      label: hawalaShortcutLabel,
      description: pick(
        language,
        'ارسال سریع حواله و پیگیری وضعیت از همین حساب',
        'Send a hawala fast and track it from this account',
        'حواله په چټکۍ سره واستوئ او له همدې حسابه یې تعقیب کړئ'
      ),
      icon: DollarSign,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      href: '/user/exchange',
      label: pick(language, 'تبادله ارز', 'Currency exchange', 'د اسعارو تبادله'),
      description: pick(
        language,
        'درخواست تبادله و بررسی نرخ‌ها',
        'Send an exchange request and review rates',
        'د تبادلې غوښتنه واستوئ او نرخونه وګورئ'
      ),
      icon: ArrowRightLeft,
      accent: 'from-sky-500 to-cyan-500',
    },
    {
      href: '/user/favorites',
      label: pick(language, 'صرافان مورد علاقه', 'Favorite sarafs', 'خوښې صرافان'),
      description: pick(
        language,
        'سریع‌ترین راه برای برگشت به شبکه ذخیره‌شده شما',
        'The fastest way back to your saved network',
        'خپلې خوندي شبکې ته د ستنېدو تر ټولو چټکه لاره'
      ),
      icon: Heart,
      accent: 'from-rose-500 to-pink-500',
    },
  ]

  const supportLinks = [
    { href: '/hawala', label: hawalaShortcutLabel, icon: DollarSign },
    { href: '/user/transactions', label: pick(language, 'تاریخچه', 'History', 'تاریخچه'), icon: History },
    { href: '/profile', label: t('profile'), icon: User },
    { href: '/settings', label: t('settings'), icon: SettingsIcon },
    { href: '/rates', label: t('rates'), icon: Radar },
    { href: '/community/leaderboard', label: pick(language, 'جدول رتبه‌بندی', 'Leaderboard', 'درجه بندي'), icon: Trophy },
    { href: '/user/social', label: pick(language, 'مرکز اجتماعی', 'Social hub', 'ټولنیز مرکز'), icon: Users },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6 pb-16">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <User className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">
                    {pick(language, `سلام ${firstName}، خوش آمدید`, `Welcome back, ${firstName}`, `سلام ${firstName}، پلې راغلاست`)}
                  </h1>
                  <p className="text-indigo-50 text-lg">
                    {pick(
                      language,
                      'مدیریت تراکنش‌ها و ارتباط با صرافان',
                      'Manage your transactions and connect with sarafs',
                      'ستاسو د معاملو مدیریت او له صرافانو سره اړیکه'
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Status Card */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card border-0 shadow-lg">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-indigo-500" />
                {pick(language, 'وضعیت حساب کاربری', 'Account Status', 'د حساب حالت')}
              </h3>
              <Badge className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusTone}`}>
                {statusLabel}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground mb-1">{pick(language, 'نام کاربری', 'Username', 'کارن نوم')}</p>
                <p className="font-bold text-lg">{session.user.name}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground mb-1">{pick(language, 'ایمیل', 'Email', 'برېښنالیک')}</p>
                <p className="font-bold text-lg">{session.user.email}</p>
              </div>
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground mb-1">{pick(language, 'عضویت', 'Membership', 'غړیتوب')}</p>
                <p className="font-bold text-lg">{pick(language, 'سطح عادی', 'Standard Level', 'معياري کچه')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card hover-lift border-0 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{pick(language, 'کل تراکنش‌ها', 'Total Transactions', 'ټولې معاملې')}</p>
                  <p className="text-2xl font-bold Persian-numbers mt-1">
                    {isLoading ? '...' : formatLocalizedNumber(stats?.totalTransactions || 0, language)}
                  </p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <WalletCards className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card hover-lift border-0 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{pick(language, 'حجم کل (AFN)', 'Total Volume', 'ټول حجم')}</p>
                  <p className="text-2xl font-bold Persian-numbers mt-1">
                    {isLoading ? '...' : formatLocalizedNumber(stats?.totalVolume || 0, language)}
                  </p>
                </div>
                <div className="p-3 bg-emerald-500/10 rounded-xl">
                  <DollarSign className="h-8 w-8 text-emerald-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card hover-lift border-0 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{pick(language, 'صرفه‌جویی کل', 'Total Savings', 'ټوله سپما')}</p>
                  <p className="text-2xl font-bold Persian-numbers mt-1">
                    {isLoading ? '...' : formatLocalizedNumber(stats?.lifetimeDiscountSaved || 0, language)}
                  </p>
                </div>
                <div className="p-3 bg-violet-500/10 rounded-xl">
                  <Gift className="h-8 w-8 text-violet-500" />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card hover-lift border-0 shadow-lg">
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{pick(language, 'اعلان‌های جدید', 'Unread Alerts', 'نا لوستل شوي خبرتیاوې')}</p>
                  <p className="text-2xl font-bold Persian-numbers mt-1">
                    {isLoading ? '...' : formatLocalizedNumber(stats?.unreadNotifications || 0, language)}
                  </p>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl">
                  <Bell className="h-8 w-8 text-amber-500" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card border-0 shadow-lg">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              {pick(language, 'عملیات سریع', 'Quick Actions', 'ګړندۍ عملیات')}
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {primaryActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <div className="relative glass-card border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-white dark:bg-gray-900/50">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${action.accent} flex items-center justify-center text-white mb-4 shadow-lg`}>
                      <action.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="font-bold text-base mb-1">{action.label}</div>
                      <div className="text-xs text-muted-foreground leading-relaxed">
                        {action.description}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
              {supportLinks.filter(l => !primaryActions.some(pa => pa.href === l.href)).map((item) => (
                <Link key={item.href} href={item.href}>
                  <div className="relative glass-card border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl p-5 rounded-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer bg-white dark:bg-gray-900/50">
                    <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 mb-4">
                      <item.icon className="h-7 w-7" />
                    </div>
                    <div>
                      <div className="font-bold text-base mb-1">{item.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {pick(language, 'مشاهده جزئیات بیشتر', 'View more details', 'نور جزییات وګورئ')}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity Section */}
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card border-0 shadow-lg">
          <div className="p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-500" />
                {pick(language, 'فعالیت‌های اخیر', 'Recent Activity', 'وروستي فعالیتونه')}
              </h3>
              <Button asChild size="sm" variant="ghost" className="justify-start rounded-full text-indigo-600 dark:text-indigo-400 font-bold">
                <Link href="/user/transactions">
                  <History className="mr-2 h-4 w-4" />
                  {pick(language, 'مشاهده همه', 'View all', 'ټول وګورئ')}
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, index) => (
                  <div key={index} className="animate-pulse h-16 rounded-xl bg-gray-100 dark:bg-gray-800" />
                ))}
              </div>
            ) : stats?.recentActivity?.length ? (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {stats.recentActivity.map((activity) => (
                  <div key={activity.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${activity.type === 'notification' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-600' : 'bg-indigo-100 dark:bg-indigo-900/20 text-indigo-600'}`}>
                          {activity.type === 'notification' ? <Bell className="h-6 w-6" /> : <Radar className="h-6 w-6" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-gray-900 dark:text-white text-lg">{activity.description}</div>
                          <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-gray-500 dark:text-gray-400">
                            {activity.referenceCode && <span>{pick(language, 'کد:', 'Code:', 'کوډ:')} {activity.referenceCode}</span>}
                            {typeof activity.amount === 'number' && <span>{pick(language, 'مبلغ:', 'Amount:', 'مقدار:') } {formatLocalizedNumber(activity.amount, language)} AFN</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 md:flex-col md:items-end">
                        {activity.status && (
                          <Badge className={`rounded-full ${activity.status === 'COMPLETED' ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-700'}`}>
                            {formatActivityStatus(activity.status, language)}
                          </Badge>
                        )}
                        <div className="text-sm text-gray-500">
                          {formatLocalizedRelativeTime(activity.timestamp, language)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center">
                <History className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-lg font-medium text-gray-500">{pick(language, 'فعالیتی یافت نشد', 'No activity found', 'فعالیت ونه موندل شو')}</p>
              </div>
            )}
          </div>
        </div>

        {/* Simplified Social Section */}
        {social && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card border-0 shadow-lg">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Users className="h-5 w-5 text-pink-500" />
                  {pick(language, 'دعوت از دوستان', 'Refer Friends', 'ملګري راوبولئ')}
                </h3>
                <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 mb-4 text-center">
                  <p className="text-sm text-muted-foreground mb-2">{pick(language, 'کد معرفی شما', 'Your Referral Code', 'ستاسو د معرفۍ کوډ')}</p>
                  <p className="text-3xl font-black tracking-widest text-indigo-600 dark:text-indigo-400">{social.referral.code}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1 rounded-xl"
                    variant="outline"
                    onClick={() => handleCopy(social.referral.code, 'Referral code copied')}
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    {pick(language, 'کپی کد', 'Copy Code', 'کوډ کاپي کړئ')}
                  </Button>
                  <Button
                    className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={() => handleCopy(social.referral.signupUrl, 'Referral link copied')}
                  >
                    <ArrowRight className="h-4 w-4 mr-2" />
                    {pick(language, 'کپی لینک', 'Copy Link', 'لینک کاپي کړئ')}
                  </Button>
                </div>
              </div>
            </div>

            <div className="rounded-xl border bg-card text-card-foreground shadow-sm glass-card border-0 shadow-lg">
              <div className="p-6">
                <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-amber-500" />
                  {pick(language, 'دستاوردها', 'Achievements', 'لاسته راوړنې')}
                </h3>
                <AchievementStrip achievements={social.achievements} />
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
