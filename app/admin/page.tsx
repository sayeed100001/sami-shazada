'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  AlertTriangle,
  ArrowRightLeft,
  BarChart3,
  BookOpen,
  Building,
  Clock,
  DollarSign,
  MessageSquare,
  Package,
  Settings,
  Shield,
  ShieldAlert,
  TrendingUp,
  Users,
} from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { AdminFloatingChatButton } from '@/components/admin/AdminFloatingChatButton'
import { AdminMessagingDashboard } from '@/components/admin/AdminMessagingDashboard'
import { RecentActivityCard } from '@/components/admin/RecentActivityCard'
import { SystemHealthMonitor } from '@/components/admin/SystemHealthMonitor'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import { Switch } from '@/components/ui/switch'

interface AdminStats {
  totalUsers: number
  totalSarafs: number
  pendingSarafs: number
  totalTransactions: number
  pendingTransactions: number
  totalVolume: number
  systemHealth: 'good' | 'warning' | 'error'
  pending?: {
    sarafs?: number
    transactions?: number
    creditRequests?: number
    subscriptions?: number
    advertisements?: number
  }
  revenue?: {
    breakdown?: {
      hawalaProfit?: number
      exchangeProfit?: number
      transactionRevenue?: number
      creditRevenue?: number
      subscriptionCreditsConsumed?: number
      totalWaivedRevenue?: number
      promotionRevenue?: number
      advertisementRevenue?: number
      totalCollectedRevenue?: number
      totalSystemBenefit?: number
    }
  }
  visitors?: {
    newToday?: number
    newThisMonth?: number
  }
}

const localeMap = {
  fa: 'fa-IR',
  en: 'en-US',
  ps: 'ps-AF',
} as const

const adminCopy = {
  fa: {
    loading: 'در حال بارگذاری...',
    unauthorized: 'دسترسی غیرمجاز',
    headerTitle: 'پنل مدیریت',
    headerSubtitle: 'مدیریت کامل سیستم، کاربران، صرافان و عملیات',
    systemStatus: 'وضعیت سیستم',
    systemAdministrator: 'مدیر سیستم',
    lastLogin: 'آخرین ورود',
    justNow: 'همین الان',
    quickActionsTitle: 'دسترسی سریع',
    quickActionsDescription: 'میانبر مدیریت بخش‌های اصلی سیستم',
    messagingTitle: 'سیستم پیام‌رسانی مؤسسه‌ای',
    messagingDescription: 'مدیریت و پاسخ به پیام‌های کاربران',
    viewAllMessages: 'مشاهده همه پیام‌ها',
    stats: {
      totalUsers: 'کل کاربران',
      activeSarafs: 'صرافان فعال',
      pendingApproval: 'در انتظار تایید',
      totalTransactions: 'کل تراکنش‌ها',
      pendingTransactions: 'تراکنش‌های در انتظار',
      totalVolume: 'کل حجم',
      hawalaProfit: 'سود سیستم از حواله',
      exchangeProfit: 'سود سیستم از تبدیل ارز',
      transactionRevenue: 'جمع درآمد تراکنش‌ها',
      creditRevenue: 'درآمد فروش کریدیت',
      subscriptionCreditsConsumed: 'کریدیت مصرف‌شده برای اشتراک',
      totalWaivedRevenue: 'درآمد بخشوده‌شده',
      promotionRevenue: 'درآمد ارتقاء و پروموشن',
      advertisementRevenue: 'درآمد تبلیغات',
      totalCollectedRevenue: 'جمع کل دریافتی سیستم',
      totalSystemBenefit: 'مجموع منفعت سیستم',
      newVisitorsToday: 'بازدیدکننده/کاربر جدید امروز',
      newVisitorsMonth: 'بازدیدکننده/کاربر جدید این ماه',
    },
    health: {
      good: 'سالم',
      warning: 'هشدار',
      error: 'خطا',
      unknown: 'نامشخص',
    },
    quickActions: {
      users: {
        title: 'مدیریت کاربران',
        description: 'مدیریت کاربران و دسترسی‌ها',
      },
      sarafs: {
        title: 'مدیریت صرافان',
        description: 'تایید و مدیریت صرافان',
      },
      transactions: {
        title: 'نظارت بر تراکنش‌ها',
        description: 'مشاهده تمام تراکنش‌ها',
      },
      education: {
        title: 'مدیریت آموزش',
        description: 'دوره‌ها و اخبار فناوری',
      },
      promotions: {
        title: 'مدیریت ارتقاء',
        description: 'ارتقاء صرافان به پریمیوم',
      },
      discountCodes: {
        title: 'پرومو کدها',
        description: 'کدهای تخفیف و مشوق‌های کاربران',
      },
      blacklist: {
        title: 'لیست سیاه',
        description: 'مسدودسازی تلفن، ایمیل و شناسه‌های مشکوک',
      },
      featuredSarafs: {
        title: 'صرافان داشبورد',
        description: 'مدیریت نمایش در صفحه اصلی',
      },
      subscriptions: {
        title: 'مدیریت اشتراک‌ها',
        description: 'تایید و رد درخواست‌های اشتراک',
      },
      content: {
        title: 'مدیریت محتوا',
        description: 'محتوای داشبورد و iframe',
      },
      chat: {
        title: 'چت و پیام‌ها',
        description: 'پاسخ به پیام‌های کاربران',
      },
      reports: {
        title: 'گزارشات سیستم',
        description: 'آمار و گزارشات جامع',
      },
      system: {
        title: 'تنظیمات سیستم',
        description: 'پیکربندی کلی سیستم',
      },
      externalApis: {
        title: 'APIهای خارجی',
        description: 'CoinGecko، ExchangeRate و سرویس‌های پیام‌رسانی',
      },
      advertisements: {
        title: 'مدیریت تبلیغات',
        description: 'تایید و مدیریت تبلیغات',
      },
      commissions: {
        title: 'تنظیمات کمیسیون',
        description: 'مدیریت درصد کمیسیون‌ها',
      },
      creditRequests: {
        title: 'درخواست‌های کریدیت',
        description: 'تایید خرید کریدیت',
      },
      auditLogs: {
        title: 'لاگ فعالیت‌ها',
        description: 'ردیابی فعالیت‌های سیستم',
      },
      security: {
        title: 'داشبورد امنیت',
        description: 'مانیتورینگ تلاش‌های مشکوک و محدودیت درخواست',
      },
      apiKeys: {
        title: 'مدیریت API Keys',
        description: 'کلیدهای دسترسی API',
      },
      webhooks: {
        title: 'وبهوک‌ها',
        description: 'مدیریت رویدادها و ارسال‌ها',
      },
      backups: {
        title: 'پشتیبان‌گیری',
        description: 'مدیریت بک‌آپ‌ها',
      },
    },
  },
  en: {
    loading: 'Loading...',
    unauthorized: 'Unauthorized access',
    headerTitle: 'Admin Panel',
    headerSubtitle: 'Unified control for users, sarafs, operations, and system health',
    systemStatus: 'System Status',
    systemAdministrator: 'System Administrator',
    lastLogin: 'Last Login',
    justNow: 'Just now',
    quickActionsTitle: 'Quick Access',
    quickActionsDescription: 'Shortcuts to the main management areas',
    messagingTitle: 'Enterprise Messaging',
    messagingDescription: 'Manage and reply to user conversations',
    viewAllMessages: 'View All Messages',
    stats: {
      totalUsers: 'Total Users',
      activeSarafs: 'Active Sarafs',
      pendingApproval: 'Pending Approval',
      totalTransactions: 'Total Transactions',
      pendingTransactions: 'Pending Transactions',
      totalVolume: 'Total Volume',
      hawalaProfit: 'Hawala System Profit',
      exchangeProfit: 'Exchange System Profit',
      transactionRevenue: 'Total Transaction Revenue',
      creditRevenue: 'Credit Sales Revenue',
      subscriptionCreditsConsumed: 'Subscription Credits Consumed',
      totalWaivedRevenue: 'Waived Revenue',
      promotionRevenue: 'Promotions Revenue',
      advertisementRevenue: 'Advertisement Revenue',
      totalCollectedRevenue: 'Total System Collections',
      totalSystemBenefit: 'Total System Benefit',
      newVisitorsToday: 'New Visitors/Users Today',
      newVisitorsMonth: 'New Visitors/Users This Month',
    },
    health: {
      good: 'Healthy',
      warning: 'Warning',
      error: 'Error',
      unknown: 'Unknown',
    },
    quickActions: {
      users: { title: 'User Management', description: 'Manage users and access levels' },
      sarafs: { title: 'Saraf Management', description: 'Review and manage sarafs' },
      transactions: { title: 'Transaction Monitoring', description: 'View all transactions' },
      education: { title: 'Education Management', description: 'Courses and tech news' },
      promotions: { title: 'Upgrade Management', description: 'Upgrade sarafs to premium' },
      discountCodes: { title: 'Promo Codes', description: 'Discount codes and user incentives' },
      blacklist: { title: 'Blacklist', description: 'Block suspicious phones, emails, and IDs' },
      featuredSarafs: { title: 'Featured Sarafs', description: 'Manage homepage featured sarafs' },
      subscriptions: { title: 'Subscription Management', description: 'Approve and reject subscription requests' },
      content: { title: 'Content Management', description: 'Dashboard content and iframes' },
      chat: { title: 'Chat and Messages', description: 'Reply to user conversations' },
      reports: { title: 'System Reports', description: 'Comprehensive reporting and insights' },
      system: { title: 'System Settings', description: 'Global platform configuration' },
      externalApis: { title: 'External APIs', description: 'CoinGecko, ExchangeRate, and messaging services' },
      advertisements: { title: 'Advertisements', description: 'Review and manage advertisements' },
      commissions: { title: 'Commission Settings', description: 'Manage commission percentages' },
      creditRequests: { title: 'Credit Requests', description: 'Approve credit purchases' },
      auditLogs: { title: 'Activity Logs', description: 'Track system activity' },
      security: { title: 'Security Dashboard', description: 'Monitor suspicious activity and rate limits' },
      apiKeys: { title: 'API Key Management', description: 'Manage platform API keys' },
      webhooks: { title: 'Webhooks', description: 'Manage outgoing events' },
      backups: { title: 'Backups', description: 'Manage backups' },
    },
  },
  ps: {
    loading: 'بارېږي...',
    unauthorized: 'غیر مجاز لاسرسی',
    headerTitle: 'د اډمین پینل',
    headerSubtitle: 'د کاروونکو، صرافانو، عملیاتو او سیسټم ګډ مدیریت',
    systemStatus: 'د سیسټم حالت',
    systemAdministrator: 'د سیسټم مدیر',
    lastLogin: 'وروستی ننوتل',
    justNow: 'همدا اوس',
    quickActionsTitle: 'چټک لاسرسی',
    quickActionsDescription: 'د اصلي اداري برخو لنډلارې',
    messagingTitle: 'اداري پیغام رسونه',
    messagingDescription: 'د کاروونکو خبرو اترو اداره او ځواب ورکول',
    viewAllMessages: 'ټول پیغامونه وګورئ',
    stats: {
      totalUsers: 'ټول کاروونکي',
      activeSarafs: 'فعال صرافان',
      pendingApproval: 'د تایید په تمه',
      totalTransactions: 'ټول لېږدونه',
      pendingTransactions: 'په تمه لېږدونه',
      totalVolume: 'ټول حجم',
      hawalaProfit: 'د حوالې د سیسټم ګټه',
      exchangeProfit: 'د تبادلې د سیسټم ګټه',
      transactionRevenue: 'د ټولو لېږدونو عاید',
      creditRevenue: 'د کریډیټ پلور عاید',
      subscriptionCreditsConsumed: 'د اشتراک مصرف شوي کریډیټونه',
      totalWaivedRevenue: 'بښل شوی عاید',
      promotionRevenue: 'د پروموشن عاید',
      advertisementRevenue: 'د اعلان عاید',
      totalCollectedRevenue: 'د سیسټم ټول راټول شوي عاید',
      totalSystemBenefit: 'د سیسټم ټول منفعت',
      newVisitorsToday: 'نن نوي لیدونکي/کاروونکي',
      newVisitorsMonth: 'دې میاشت نوي لیدونکي/کاروونکي',
    },
    health: {
      good: 'سالم',
      warning: 'خبرتیا',
      error: 'ستونزه',
      unknown: 'نامعلوم',
    },
    quickActions: {
      users: { title: 'د کاروونکو مدیریت', description: 'کاروونکي او د لاسرسي کچې اداره کړئ' },
      sarafs: { title: 'د صرافانو مدیریت', description: 'صرافان تایید او اداره کړئ' },
      transactions: { title: 'د لېږدونو څارنه', description: 'ټول لېږدونه وګورئ' },
      education: { title: 'د زده کړې مدیریت', description: 'کورسونه او د ټېکنالوژۍ خبرونه' },
      promotions: { title: 'د ارتقا مدیریت', description: 'صرافان پریمیوم ته لوړ کړئ' },
      discountCodes: { title: 'پرومو کوډونه', description: 'د تخفیف کوډونه او کاروونکو هڅونې' },
      blacklist: { title: 'تور لست', description: 'مشکوک شمېرې، برېښنالیکونه او پېژندپاڼې بندول' },
      featuredSarafs: { title: 'مخکښ صرافان', description: 'په اصلي پاڼه کې د ښودلو مدیریت' },
      subscriptions: { title: 'د اشتراک مدیریت', description: 'د اشتراک غوښتنې تایید او رد کړئ' },
      content: { title: 'د محتوا مدیریت', description: 'د ډشبورډ محتوا او iframe تنظیمات' },
      chat: { title: 'چت او پیغامونه', description: 'د کاروونکو پیغامونو ته ځواب' },
      reports: { title: 'سیسټم راپورونه', description: 'جامع احصایې او راپورونه' },
      system: { title: 'سیسټم تنظیمات', description: 'د پلاتفورم عمومي تنظیمات' },
      externalApis: { title: 'بهرني API ګانې', description: 'CoinGecko، ExchangeRate او د پیغام رسونې خدمتونه' },
      advertisements: { title: 'د اعلانونو مدیریت', description: 'اعلانونه تایید او اداره کړئ' },
      commissions: { title: 'د کمیسیون تنظیمات', description: 'د کمیسیون سلنې اداره کړئ' },
      creditRequests: { title: 'د کریدیټ غوښتنې', description: 'د کریدیټ اخیستلو تایید' },
      auditLogs: { title: 'د فعالیت لاګونه', description: 'د سیسټم فعالیتونه تعقیب کړئ' },
      security: { title: 'د امنيت ډشبورډ', description: 'مشکوکې هڅې او محدودیتونه وګورئ' },
      apiKeys: { title: 'د API Keys مدیریت', description: 'د لاسرسي کیلي اداره کړئ' },
      webhooks: { title: 'ویبهوکونه', description: 'بهرنۍ پېښې او لېږل اداره کړئ' },
      backups: { title: 'بیک اپونه', description: 'بیک اپونه اداره کړئ' },
    },
  },
} as const

type DashboardLanguage = keyof typeof adminCopy

export default function AdminPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()

  const copy = adminCopy[(language as DashboardLanguage) || 'fa'] ?? adminCopy.fa
  const locale = localeMap[(language as DashboardLanguage) || 'fa'] ?? localeMap.fa

  const formatNumber = useMemo(() => new Intl.NumberFormat(locale), [locale])

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/')
    }
  }, [session, status, router])

  const [stats, setStats] = useState<AdminStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [featureConfig, setFeatureConfig] = useState<Record<string, string>>({})
  const [savingFeature, setSavingFeature] = useState<string | null>(null)
  const [resettingStats, setResettingStats] = useState(false)

  const refreshFeatureConfig = async () => {
    try {
      const res = await fetch('/api/admin/system-config', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as Array<{ key: string; value: string }>
      const map: Record<string, string> = {}
      for (const row of Array.isArray(data) ? data : []) {
        map[row.key] = row.value
      }
      setFeatureConfig(map)
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') {
      return
    }

    setIsLoading(true)
    setError(null)

    fetch('/api/admin/stats')
      .then(async (res) => {
        if (!res.ok) {
          const payload = await res.json().catch(() => null)
          if (res.status === 503) {
            throw new Error(payload?.error || 'Database connection failed. Please check system status.')
          }
          if (res.status === 500) {
            throw new Error(payload?.error || 'Server error while loading statistics.')
          }
          throw new Error(payload?.error || `Server error: ${res.status}`)
        }
        return res.json()
      })
      .then((data) => {
        if (data.error) {
          throw new Error(data.message || 'Failed to load statistics')
        }

        setStats(data)
      })
      .catch((fetchError) => {
        const errorMessage = fetchError instanceof Error ? fetchError.message : 'Unknown error occurred'
        console.error('Failed to fetch admin stats:', errorMessage)
        setStats(null)
        setError(errorMessage)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [session])

  useEffect(() => {
    if (session?.user?.role !== 'ADMIN') return
    void refreshFeatureConfig()
  }, [session])

  const updateSystemConfig = async (key: string, value: string) => {
    try {
      setSavingFeature(key)
      const res = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      })
      if (!res.ok) {
        throw new Error('Failed to update')
      }
      await Promise.all([refreshFeatureConfig(), fetch('/api/admin/stats?refresh=1').then((r) => (r.ok ? r.json() : null)).then((d) => d && setStats(d))])
    } catch (e) {
      console.error(e)
    } finally {
      setSavingFeature(null)
    }
  }

  const resetDashboardStats = async () => {
    const confirmMsg = language === 'fa'
      ? 'این عملیات فقط شمارنده‌های داشبورد را صفر می‌کند.\n\nهیچ داده‌ای حذف نمی‌شود:\n✅ کاربران حفظ می‌شوند\n✅ صرافان حفظ می‌شوند\n✅ تراکنش‌ها حفظ می‌شوند\n✅ لاگ‌ها حفظ می‌شوند\n\nفقط نمایش آمار مالی از صفر شروع می‌شود.\n\nادامه می‌دهید؟'
      : language === 'en'
        ? 'This will only reset dashboard counters to zero.\n\nNO data will be deleted:\n✅ Users are kept\n✅ Sarafs are kept\n✅ Transactions are kept\n✅ Logs are kept\n\nOnly financial stats display will start from zero.\n\nContinue?'
        : 'دا یوازې د ډشبورډ شمېرې صفر کوي.\n\nهیڅ معلومات نه ړنګېږي:\n✅ کاروونکي ساتل کېږي\n✅ صرافان ساتل کېږي\n✅ لېږدونه ساتل کېږي\n✅ لاګونه ساتل کېږي\n\nیوازې د مالي احصایو ښودنه له صفر پیلېږي.\n\nدوام ورکړئ؟'
    
    if (!confirm(confirmMsg)) return
    
    try {
      setResettingStats(true)
      const res = await fetch('/api/admin/stats/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'Admin reset' }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Reset failed')
      const refreshed = await fetch('/api/admin/stats?refresh=1', { cache: 'no-store' }).then((r) => r.json())
      setStats(refreshed)
      
      alert(language === 'fa'
        ? '✅ شمارنده‌های داشبورد صفر شدند. تمام داده‌ها سالم هستند.'
        : language === 'en'
          ? '✅ Dashboard counters reset. All data is safe.'
          : '✅ د ډشبورډ شمېرې صفر شوې. ټول معلومات خوندي دي.')
    } catch (e) {
      console.error(e)
      alert(language === 'fa' ? '❌ خطا در ریست' : language === 'en' ? '❌ Reset failed' : '❌ ریسټ ناکام شو')
    } finally {
      setResettingStats(false)
    }
  }

  if (status === 'loading' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
            <p>{copy.loading}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session) {
    return null
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-xl">{copy.unauthorized}</p>
        </div>
      </DashboardLayout>
    )
  }

  const quickActions = [
    {
      key: 'users',
      icon: Users,
      href: '/admin/users',
      color: 'bg-blue-500',
      title: copy.quickActions.users.title,
      description: copy.quickActions.users.description,
    },
    {
      key: 'sarafs',
      icon: Building,
      href: '/admin/sarafs',
      color: 'bg-emerald-500',
      badge: stats?.pendingSarafs || 0,
      title: copy.quickActions.sarafs.title,
      description: copy.quickActions.sarafs.description,
    },
    {
      key: 'transactions',
      icon: DollarSign,
      href: '/admin/transactions',
      color: 'bg-sky-500',
      badge: stats?.pendingTransactions || 0,
      title: copy.quickActions.transactions.title,
      description: copy.quickActions.transactions.description,
    },
    {
      key: 'reports',
      icon: TrendingUp,
      href: '/admin/reports',
      color: 'bg-green-500',
      title: copy.quickActions.reports.title,
      description: copy.quickActions.reports.description,
    },
    {
      key: 'statistics',
      icon: BarChart3,
      href: '/admin/statistics',
      color: 'bg-indigo-700',
      title: language === 'fa' ? 'آمار و تاریخچه' : language === 'en' ? 'Stats & History' : 'احصایې او تاریخچه',
      description:
        language === 'fa'
          ? 'مشاهده آمار کامل و اسنپ‌شات‌های قبل از ریست'
          : language === 'en'
            ? 'View full stats and snapshots before resets'
            : 'د ریست مخکې بشپړ احصایې او سناپ‌شاټونه وګورئ',
    },
    {
      key: 'exchange',
      icon: ArrowRightLeft,
      href: '/admin/exchange',
      color: 'bg-fuchsia-500',
      title: language === 'fa' ? 'مدیریت تبادله ارز' : language === 'en' ? 'Exchange Management' : 'د تبادلې مدیریت',
      description:
        language === 'fa'
          ? 'تنظیمات، آمار و سود سیستم از تبادله'
          : language === 'en'
            ? 'Settings, stats, and system exchange profit'
            : 'د تبادلې تنظیمات، احصایې او د سیسټم ګټه',
    },
    {
      key: 'chat',
      icon: MessageSquare,
      href: '/portal/internal-chat?tab=customers',
      color: 'bg-pink-500',
      title: copy.quickActions.chat.title,
      description: copy.quickActions.chat.description,
    },
    {
      key: 'networkMessenger',
      icon: MessageSquare,
      href: '/portal/internal-chat',
      color: 'bg-violet-600',
      title:
        language === 'fa'
          ? 'پیام‌رسان شبکه'
          : language === 'en'
            ? 'Network Messenger'
            : 'د شبکې پیغام رسوونکی',
      description:
        language === 'fa'
          ? 'کنترل پیام‌رسان داخلی شبکه، استوری‌ها و اعلان‌های سراسری'
          : language === 'en'
            ? 'Control the network messenger, stories, and global announcements'
            : 'د شبکې داخلي پیغام رسوونکی، سټورۍ، او سراسري اعلانونه کنټرول کړئ',
    },
    {
      key: 'education',
      icon: BookOpen,
      href: '/admin/education',
      color: 'bg-amber-500',
      title: copy.quickActions.education.title,
      description: copy.quickActions.education.description,
    },
    {
      key: 'promotions',
      icon: TrendingUp,
      href: '/admin/promotions',
      color: 'bg-yellow-500',
      title: copy.quickActions.promotions.title,
      description: copy.quickActions.promotions.description,
    },
    {
      key: 'discountCodes',
      icon: DollarSign,
      href: '/admin/discount-codes',
      color: 'bg-fuchsia-500',
      title: copy.quickActions.discountCodes.title,
      description: copy.quickActions.discountCodes.description,
    },
    {
      key: 'blacklist',
      icon: Shield,
      href: '/admin/blacklist',
      color: 'bg-rose-600',
      title: copy.quickActions.blacklist.title,
      description: copy.quickActions.blacklist.description,
    },
    {
      key: 'featuredSarafs',
      icon: Building,
      href: '/admin/featured-sarafs',
      color: 'bg-yellow-600',
      title: copy.quickActions.featuredSarafs.title,
      description: copy.quickActions.featuredSarafs.description,
    },
    {
      key: 'content',
      icon: Settings,
      href: '/admin/content',
      color: 'bg-indigo-500',
      title: copy.quickActions.content.title,
      description: copy.quickActions.content.description,
    },
    {
      key: 'homeContent',
      icon: Settings,
      href: '/admin/home-content',
      color: 'bg-violet-600',
      title: language === 'fa' ? 'محتوای صفحه اصلی' : language === 'en' ? 'Home Page Content' : 'د اصلي پاڼې محتوا',
      description: language === 'fa' ? 'مدیریت داینامیک محتوای صفحه اصلی' : language === 'en' ? 'Dynamic home page content management' : 'د اصلي پاڼې محتوا اداره',
    },
    {
      key: 'advertisements',
      icon: TrendingUp,
      href: '/admin/advertisements',
      color: 'bg-red-500',
      badge: stats?.pending?.advertisements || 0,
      title: copy.quickActions.advertisements.title,
      description: copy.quickActions.advertisements.description,
    },
    {
      key: 'system',
      icon: Settings,
      href: '/admin/system',
      color: 'bg-slate-500',
      title: copy.quickActions.system.title,
      description: copy.quickActions.system.description,
    },
    {
      key: 'commissions',
      icon: Settings,
      href: '/admin/commission-settings',
      color: 'bg-purple-500',
      title: copy.quickActions.commissions.title,
      description: copy.quickActions.commissions.description,
    },
    {
      key: 'creditRequests',
      icon: DollarSign,
      href: '/admin/credit-requests',
      color: 'bg-cyan-500',
      badge: stats?.pending?.creditRequests || 0,
      title: copy.quickActions.creditRequests.title,
      description: copy.quickActions.creditRequests.description,
    },
    {
      key: 'subscriptions',
      icon: Package,
      href: '/admin/subscriptions',
      color: 'bg-purple-500',
      badge: stats?.pending?.subscriptions || 0,
      title: copy.quickActions.subscriptions.title,
      description: copy.quickActions.subscriptions.description,
    },
    {
      key: 'externalApis',
      icon: Settings,
      href: '/admin/external-apis',
      color: 'bg-emerald-600',
      title: copy.quickActions.externalApis.title,
      description: copy.quickActions.externalApis.description,
    },
    {
      key: 'auditLogs',
      icon: Shield,
      href: '/admin/audit-logs',
      color: 'bg-slate-600',
      title: copy.quickActions.auditLogs.title,
      description: copy.quickActions.auditLogs.description,
    },
    {
      key: 'security',
      icon: ShieldAlert,
      href: '/admin/security',
      color: 'bg-rose-600',
      title: copy.quickActions.security.title,
      description: copy.quickActions.security.description,
    },
    {
      key: 'apiKeys',
      icon: Settings,
      href: '/admin/api-keys',
      color: 'bg-indigo-600',
      title: copy.quickActions.apiKeys.title,
      description: copy.quickActions.apiKeys.description,
    },
    {
      key: 'webhooks',
      icon: TrendingUp,
      href: '/admin/webhooks',
      color: 'bg-violet-500',
      title: copy.quickActions.webhooks.title,
      description: copy.quickActions.webhooks.description,
    },
    {
      key: 'backups',
      icon: Settings,
      href: '/admin/backups',
      color: 'bg-teal-500',
      title: copy.quickActions.backups.title,
      description: copy.quickActions.backups.description,
    },
  ]

  const getHealthBadge = (health: AdminStats['systemHealth']) => {
    switch (health) {
      case 'good':
        return (
          <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
            {copy.health.good}
          </Badge>
        )
      case 'warning':
        return (
          <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
            {copy.health.warning}
          </Badge>
        )
      case 'error':
        return (
          <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">
            {copy.health.error}
          </Badge>
        )
      default:
        return <Badge variant="secondary">{copy.health.unknown}</Badge>
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        <div className="relative mb-6 sm:mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-4 sm:p-6 lg:p-8 text-white shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10" />
          <div className="relative z-10 text-center">
            <div className="mb-3 sm:mb-4 inline-flex h-12 w-12 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Shield className="h-6 w-6 sm:h-8 sm:w-8" />
            </div>
            <h1 className="mb-2 text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">{copy.headerTitle}</h1>
            <p className="text-xs sm:text-sm lg:text-base text-white/90 leading-snug max-w-full">{copy.headerSubtitle}</p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4 lg:space-y-6 px-2 sm:px-3 lg:px-4 max-w-full overflow-x-hidden">
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="flex flex-col gap-2">
                <span className="text-sm sm:text-base lg:text-lg text-center">{language === 'fa' ? 'کنترل سریع سیستم' : language === 'en' ? 'Quick system controls' : 'چټک سیسټم کنټرول'}</span>
                <Button asChild variant="outline" size="sm" className="w-full max-w-[120px] mx-auto">
                  <Link href="/admin/statistics">
                    {language === 'fa' ? 'آمار کامل' : language === 'en' ? 'Full stats' : 'بشپړ احصایې'}
                  </Link>
                </Button>
              </CardTitle>
              <CardDescription className="text-xs text-center px-1">
                {language === 'fa'
                  ? 'فعال/غیرفعال ویژگی‌ها'
                  : language === 'en'
                    ? 'Enable/disable features'
                    : 'د بڼو فعالول/غیر فعالول'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
                {[
                  { key: 'features_master_enabled', label: language === 'fa' ? 'سوییچ اصلی' : language === 'en' ? 'Master switch' : 'اصلي سوییچ' },
                  { key: 'feature_hawala_enabled', label: language === 'fa' ? 'حواله' : language === 'en' ? 'Hawala' : 'حواله' },
                  { key: 'feature_exchange_enabled', label: language === 'fa' ? 'تبادله ارز' : language === 'en' ? 'Exchange' : 'تبادله' },
                  { key: 'feature_rewards_enabled', label: language === 'fa' ? 'پاداش‌ها' : language === 'en' ? 'Rewards' : 'انعامونه' },
                  { key: 'feature_ads_enabled', label: language === 'fa' ? 'تبلیغات' : language === 'en' ? 'Ads' : 'اعلانونه' },
                  { key: 'free_access_enabled', label: language === 'fa' ? 'دسترسی رایگان صراف‌ها' : language === 'en' ? 'Free access (sarafs)' : 'د صراف وړیا لاسرسی' },
                ].map((item) => (
                  <div key={item.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="text-xs sm:text-sm font-medium truncate">{item.label}</div>
                      <Badge variant={featureConfig[item.key] === 'true' ? 'default' : 'secondary'}>
                        {featureConfig[item.key] === 'true'
                          ? (language === 'fa' ? 'روشن' : language === 'en' ? 'ON' : 'ON')
                          : (language === 'fa' ? 'خاموش' : language === 'en' ? 'OFF' : 'OFF')}
                      </Badge>
                    </div>
                    <Switch
                      checked={featureConfig[item.key] === 'true'}
                      disabled={savingFeature !== null}
                      onCheckedChange={(checked) => void updateSystemConfig(item.key, checked ? 'true' : 'false')}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-2">
                <Button onClick={() => void resetDashboardStats()} variant="outline" size="sm" className="w-full sm:w-auto border-orange-500 text-orange-600 hover:bg-orange-50 text-xs sm:text-sm" disabled={resettingStats}>
                  {resettingStats
                    ? language === 'fa' ? 'در حال ریست...' : language === 'en' ? 'Resetting...' : 'ریسټ کېږي...'
                    : language === 'fa' ? '🔄 صفر کردن' : language === 'en' ? '🔄 Reset' : '🔄 صفر کول'}
                </Button>
                <Button onClick={() => void refreshFeatureConfig()} variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                  {language === 'fa' ? 'بروزرسانی' : language === 'en' ? 'Refresh' : 'تازه کول'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <div className="flex flex-col items-start justify-between gap-2 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 sm:h-5 sm:w-5" />
                  <CardTitle className="text-base sm:text-lg">{copy.systemStatus}</CardTitle>
                </div>
                {stats && getHealthBadge(stats.systemHealth)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">{copy.systemAdministrator}</p>
                  <p className="text-sm font-medium sm:text-base">{session.user.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground sm:text-sm">{copy.lastLogin}</p>
                  <p className="text-sm font-medium sm:text-base">{copy.justNow}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {stats && (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="text-center sm:text-left">
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.totalUsers}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.totalUsers)}
                      </p>
                    </div>
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/20">
                      <Users className="h-5 w-5 text-blue-600 dark:text-blue-400 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.activeSarafs}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.totalSarafs)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20">
                      <Building className="h-6 w-6 text-green-600 dark:text-green-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.pendingApproval}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.pendingSarafs)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-100 dark:bg-yellow-900/20">
                      <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.totalTransactions}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.totalTransactions)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/20">
                      <DollarSign className="h-6 w-6 text-purple-600 dark:text-purple-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.pendingTransactions}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.pendingTransactions)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-900/20">
                      <AlertTriangle className="h-6 w-6 text-orange-600 dark:text-orange-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.totalVolume} (AFN)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.totalVolume)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-900/20">
                      <TrendingUp className="h-6 w-6 text-indigo-600 dark:text-indigo-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.hawalaProfit} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.hawalaProfit || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/20">
                      <DollarSign className="h-6 w-6 text-emerald-600 dark:text-emerald-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.exchangeProfit} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.exchangeProfit || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100 dark:bg-sky-900/20">
                      <TrendingUp className="h-6 w-6 text-sky-600 dark:text-sky-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.transactionRevenue} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.transactionRevenue || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/20">
                      <ArrowRightLeft className="h-6 w-6 text-cyan-600 dark:text-cyan-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.creditRevenue} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.creditRevenue || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-lime-100 dark:bg-lime-900/20">
                      <DollarSign className="h-6 w-6 text-lime-600 dark:text-lime-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.subscriptionCreditsConsumed} (credits)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.subscriptionCreditsConsumed || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-pink-100 dark:bg-pink-900/20">
                      <Shield className="h-6 w-6 text-pink-600 dark:text-pink-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.promotionRevenue} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.promotionRevenue || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/20">
                      <Building className="h-6 w-6 text-amber-600 dark:text-amber-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.advertisementRevenue} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.advertisementRevenue || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-900/20">
                      <MessageSquare className="h-6 w-6 text-rose-600 dark:text-rose-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.totalCollectedRevenue} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.totalCollectedRevenue || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/20">
                      <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.totalSystemBenefit} (USD)</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.totalSystemBenefit || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-900/20">
                      <Shield className="h-6 w-6 text-violet-600 dark:text-violet-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.totalWaivedRevenue} (USD)</p>
                      <p className="persian-numbers text-lg font-bold text-amber-600 sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.revenue?.breakdown?.totalWaivedRevenue || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-900/20">
                      <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.newVisitorsToday}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.visitors?.newToday || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-100 dark:bg-cyan-900/20">
                      <Users className="h-6 w-6 text-cyan-600 dark:text-cyan-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg transition-all hover:shadow-xl">
                <CardContent className="p-3 sm:p-4 lg:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground sm:text-sm">{copy.stats.newVisitorsMonth}</p>
                      <p className="persian-numbers text-lg font-bold sm:text-xl lg:text-2xl">
                        {formatNumber.format(stats.visitors?.newThisMonth || 0)}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-900/20">
                      <Users className="h-6 w-6 text-teal-600 dark:text-teal-400 sm:h-7 sm:w-7 lg:h-8 lg:w-8" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <SystemHealthMonitor />

          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{copy.quickActionsTitle}</CardTitle>
              <CardDescription>{copy.quickActionsDescription}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {quickActions.map((action) => (
                  <Link key={action.key} href={action.href}>
                    <div className="group relative">
                      <div className="glass-card cursor-pointer rounded-xl border-0 p-3 sm:p-4 shadow-md transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
                        {action.badge ? (
                          <Badge className="absolute -right-2 -top-2 bg-red-500 text-white text-xs">
                            {formatNumber.format(action.badge)}
                          </Badge>
                        ) : null}
                        <div className={`mb-2 sm:mb-3 flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl ${action.color} text-white shadow-md`}>
                          <action.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div>
                          <div className="mb-1 text-xs sm:text-sm font-medium truncate">{action.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2">{action.description}</div>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>

          <RecentActivityCard />

          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    {copy.messagingTitle}
                  </CardTitle>
                  <CardDescription>{copy.messagingDescription}</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/portal/internal-chat?tab=customers">{copy.viewAllMessages}</Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <AdminMessagingDashboard />
            </CardContent>
          </Card>
        </div>
      </div>
      <AdminFloatingChatButton />
    </DashboardLayout>
  )
}
