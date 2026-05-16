'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Building2, DollarSign, Users, TrendingUp, Clock, CheckCircle, AlertCircle, Star, CreditCard, Send, BarChart3, Settings, MessageSquare, Package, Building, Megaphone, Gift, UserPlus, ArrowRightLeft } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { isPortalOwnerRole, isPortalRole } from '@/lib/portal-access'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { usePageActivity } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

interface SarafStats {
  totalTransactions: number
  pendingTransactions: number
  completedTransactions: number
  totalVolume: number
  rating: number
  status: string
  activeRates: number
  creditBalance: number
  isPremium: boolean
  accessMode?: 'OWNER' | 'BRANCH'
  accessibleBranches?: number
}

export default function PortalPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const { isActive } = usePageActivity()

  const t = {
    loading: pick(language, 'در حال بارگذاری...', 'Loading...', 'بارېږي...'),
    portalTitle: pick(language, 'پورتال صراف', 'Saraf Portal', 'د صراف پورټل'),
    portalSubtitle: pick(language, 'مدیریت کسب و کار صرافی شما', 'Manage your exchange business', 'ستاسو د تبادلې سوداګرۍ مدیریت'),
    premium: pick(language, 'پریمیوم', 'Premium', 'پریمیم'),
    accountStatus: pick(language, 'وضعیت حساب', 'Account Status', 'د حساب حالت'),
    username: pick(language, 'نام کاربری', 'Username', 'کارن نوم'),
    email: pick(language, 'ایمیل', 'Email', 'برېښنالیک'),
    creditBalance: pick(language, 'موجودی کریدیت', 'Credit Balance', 'د کریډیټ موجودي'),
    credits: pick(language, 'کریدیت', 'Credits', 'کریډیټ'),
    pendingApproval: pick(language, 'حساب شما در انتظار تایید مدیریت است. پس از تایید میتوانید از تمام امکانات استفاده کنید.', 'Your account is pending admin approval. You can use all features after approval.', 'ستاسو حساب د مدیریت د تایید په انتظار کې دی. تایید وروسته تاسو کولی شئ له ټولو امکاناتو څخه استفاده وکړئ.'),
    totalTransactions: pick(language, 'کل تراکنشها', 'Total Transactions', 'ټولې معاملې'),
    pending: pick(language, 'در انتظار', 'Pending', 'په انتظار کې'),
    completed: pick(language, 'تکمیل شده', 'Completed', 'بشپړ شوی'),
    rating: pick(language, 'امتیاز', 'Rating', 'درجه بندي'),
    quickActions: pick(language, 'عملیات سریع', 'Quick Actions', 'ګړندۍ عملیات'),
    quickActionsDesc: pick(language, 'دسترسی سریع به تمام امکانات پنل صراف', 'Quick access to all saraf panel features', 'د صراف پینل ټولو امکاناتو ته ګړنده لاسرسی'),
    approved: pick(language, 'تایید شده', 'Approved', 'تایید شوی'),
    rejected: pick(language, 'رد شده', 'Rejected', 'رد شوی'),
    suspended: pick(language, 'تعلیق شده', 'Suspended', 'معطل شوی'),
  }

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!isPortalRole(session.user.role)) {
      router.push('/')
      return
    }
  }, [session, status, router])

  const { data: stats, isLoading } = useQuery({
    queryKey: ['saraf-stats'],
    queryFn: async (): Promise<SarafStats> => {
      const response = await fetch('/api/portal/stats')
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch stats')
      }
      return response.json()
    },
    enabled: !!session?.user && isPortalRole(session.user.role),
    retry: 1,
    staleTime: POLLING_INTERVALS.portalStatsActiveMs,
    refetchInterval: isActive ? POLLING_INTERVALS.portalStatsActiveMs : false,
  })

  const { data: hawalaRequestCount } = useQuery({
    queryKey: ['hawala-request-count'],
    queryFn: async (): Promise<number> => {
      const response = await fetch('/api/portal/hawala/requests?page=1&limit=1', { cache: 'no-store' })
      if (!response.ok) return 0
      const data = await response.json()
      const total = data?.pagination?.total
      return typeof total === 'number' ? total : 0
    },
    enabled:
      !!session?.user &&
      session.user.role === 'SARAF' &&
      stats?.status === 'APPROVED',
    retry: 0,
    staleTime: POLLING_INTERVALS.portalStatsActiveMs,
    refetchInterval: isActive ? POLLING_INTERVALS.portalStatsActiveMs : false,
  })

  const { data: exchangeConfig } = useQuery({
    queryKey: ['exchange-config'],
    queryFn: async (): Promise<{ enabled: boolean }> => {
      const response = await fetch('/api/portal/exchange/config', { cache: 'no-store' })
      if (!response.ok) return { enabled: false }
      return response.json()
    },
    enabled: !!session?.user && isPortalRole(session.user.role),
    retry: 0,
    staleTime: POLLING_INTERVALS.portalStatsActiveMs,
  })

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p>{t.loading}</p>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || !isPortalRole(session.user.role)) {
    return null
  }

  const isOwner = isPortalOwnerRole(session.user.role)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">{t.approved}</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">{t.pending}</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">{t.rejected}</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400">{t.suspended}</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const quickActions = [
    {
      title: pick(language, 'مدیریت نرخها', 'Manage Rates', 'د نرخونو مدیریت'),
      description: pick(language, 'بروزرسانی نرخهای ارز', 'Update currency rates', 'د اسعارو نرخونه تازه کول'),
      icon: DollarSign,
      href: '/portal/rates',
      color: 'bg-blue-500'
    },
    {
      title: pick(language, 'تبادله ارز', 'Currency Exchange', 'د اسعارو تبادله'),
      description: pick(language, 'تبادله ارزهای مختلف', 'Exchange different currencies', 'بېلابېل اسعار تبادله کول'),
      icon: ArrowRightLeft,
      href: '/portal/exchange',
      color: 'bg-fuchsia-500'
    },
    {
      title: pick(language, 'تراکنشها', 'Transactions', 'معاملې'),
      description: pick(language, 'مشاهده تراکنشها', 'View transactions', 'معاملې وګورئ'),
      icon: TrendingUp,
      href: '/portal/transactions',
      color: 'bg-purple-500'
    },
    {
      title: pick(language, 'حواله جدید', 'New Hawala', 'نوې حواله'),
      description: pick(language, 'ثبت حواله جدید', 'Create new hawala', 'نوې حواله جوړه کړئ'),
      icon: Send,
      href: '/portal/hawala/new',
      color: 'bg-green-500'
    },
    {
      title: pick(language, 'درخواستهای حواله', 'Hawala Requests', 'د حوالې غوښتنې'),
      description: pick(language, 'مدیریت درخواستها', 'Manage requests', 'غوښتنې مدیریت'),
      icon: UserPlus,
      href: '/portal/hawala-requests',
      color: 'bg-teal-500',
      badge: hawalaRequestCount || 0,
    },
    {
      title: pick(language, 'مدیریت شعب', 'Manage Branches', 'د ځانګو مدیریت'),
      description: pick(language, 'شعب و نقاط خدماتی', 'Branches and service points', 'ځانګې او خدمتي مرکزونه'),
      icon: Building,
      href: '/portal/branches',
      color: 'bg-indigo-500'
    },
    {
      title: pick(language, 'گزارشات', 'Reports', 'راپورونه'),
      description: pick(language, 'گزارشات مالی', 'Financial reports', 'مالي راپورونه'),
      icon: BarChart3,
      href: '/portal/reports',
      color: 'bg-orange-500'
    },
    {
      title: pick(language, 'بلک لیست', 'Blacklist', 'تور لیسټ'),
      description: pick(language, 'مسدود کردن مشتریان مشکوک', 'Block suspicious customers', 'شکمن پیرودونکي بلاک کړئ'),
      icon: AlertCircle,
      href: '/portal/blacklist',
      color: 'bg-rose-500'
    },
    {
      title: pick(language, 'خرید کریدیت', 'Buy Credits', 'کریډیټ اخستل'),
      description: pick(language, 'شارژ حساب', 'Recharge account', 'حساب شارج کړئ'),
      icon: CreditCard,
      href: '/portal/credit',
      color: 'bg-cyan-500'
    },
    {
      title: pick(language, 'ارتقاء حساب', 'Upgrade Account', 'حساب لوړ کړئ'),
      description: pick(language, 'پریمیوم شوید', 'Go premium', 'پریمیم شئ'),
      icon: Star,
      href: '/portal/promotions',
      color: 'bg-yellow-500'
    },
    {
      title: pick(language, 'تبلیغات', 'Advertisements', 'اعلانونه'),
      description: pick(language, 'مدیریت تبلیغات', 'Manage ads', 'اعلانونو مدیریت'),
      icon: Megaphone,
      href: '/portal/advertisement',
      color: 'bg-red-500'
    },
    {
      title: pick(language, 'اشتراک', 'Subscription', 'ګډون'),
      description: pick(language, 'مدیریت اشتراک', 'Manage subscription', 'ګډون مدیریت'),
      icon: Package,
      href: '/portal/subscription',
      color: 'bg-violet-500'
    },
    {
      title: pick(language, 'پیام‌رسان', 'Messenger', 'پیغام‌رسوونکی'),
      description: pick(language, 'مشتریان، کارکنان و اعلان‌ها', 'Customers, staff, and announcements', 'مشتریان، کارکوونکي او اعلانونه'),
      icon: MessageSquare,
      href: '/portal/internal-chat',
      color: 'bg-pink-500'
    },
    {
      title: pick(language, 'پروفایل', 'Profile', 'پروفایل'),
      description: pick(language, 'ویرایش اطلاعات', 'Edit information', 'معلومات سمول'),
      icon: Settings,
      href: '/portal/profile',
      color: 'bg-gray-500'
    }
  ]

  const ownerOnlyActionHrefs = new Set([
    '/portal/rates',
    '/portal/hawala-requests',
    '/portal/branches',
    '/portal/credit',
    '/portal/promotions',
    '/portal/advertisement',
    '/portal/subscription',
    '/portal/profile',
  ])

  const visibleQuickActions = quickActions
    .filter((action) => isOwner || !ownerOnlyActionHrefs.has(action.href))
    .filter((action) => {
      if (action.href !== '/portal/exchange') return true
      return Boolean(exchangeConfig?.enabled)
    })

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Building2 className="h-8 w-8" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold">{t.portalTitle}</h1>
                  <p className="text-indigo-50 text-lg">{t.portalSubtitle}</p>
                </div>
              </div>
              {stats?.isPremium && (
                <Badge className="bg-yellow-500 text-white border-0 px-4 py-2 text-base">
                  <Star className="h-4 w-4 mr-1 fill-current" />
                  {t.premium}
                </Badge>
              )}
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-pink-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Status Card */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                {t.accountStatus}
              </CardTitle>
              {stats && getStatusBadge(stats.status)}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground">{t.username}</p>
                <p className="font-medium">{session.user.name}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground">{t.email}</p>
                <p className="font-medium">{session.user.email}</p>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <p className="text-sm text-muted-foreground">{t.creditBalance}</p>
                <p className="font-medium text-lg">{stats?.creditBalance || 0} {t.credits}</p>
              </div>
            </div>
            
            {stats?.status === 'PENDING' && (
              <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="h-4 w-4" />
                  <p className="text-sm">
                    {t.pendingApproval}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && stats.status === 'APPROVED' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="glass-card hover-lift border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.totalTransactions}</p>
                    <p className="text-2xl font-bold persian-numbers">{stats.totalTransactions}</p>
                  </div>
                  <div className="p-3 bg-blue-500/10 rounded-xl">
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.pending}</p>
                    <p className="text-2xl font-bold persian-numbers">{stats.pendingTransactions}</p>
                  </div>
                  <div className="p-3 bg-yellow-500/10 rounded-xl">
                    <Clock className="h-8 w-8 text-yellow-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.completed}</p>
                    <p className="text-2xl font-bold persian-numbers">{stats.completedTransactions}</p>
                  </div>
                  <div className="p-3 bg-green-500/10 rounded-xl">
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card hover-lift border-0 shadow-lg">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{t.rating}</p>
                    <p className="text-2xl font-bold persian-numbers">{stats.rating.toFixed(1)}</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3 w-3 ${
                            star <= stats.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="p-3 bg-purple-500/10 rounded-xl">
                    <TrendingUp className="h-8 w-8 text-purple-500" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        {stats && stats.status === 'APPROVED' && (
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle>{t.quickActions}</CardTitle>
              <CardDescription>{t.quickActionsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {visibleQuickActions.map((action) => (
                  <Link key={action.href} href={action.href}>
                    <div className="relative glass-card border-0 shadow-md hover:shadow-xl p-4 rounded-xl transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      {action.badge ? (
                        <Badge className="absolute -right-2 -top-2 bg-red-500 text-white border-0">
                          {action.badge}
                        </Badge>
                      ) : null}
                      <div className={`w-12 h-12 rounded-xl ${action.color} flex items-center justify-center text-white mb-3 shadow-md`}>
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div>
                        <div className="font-medium text-sm mb-1">{action.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {action.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Getting Started */}
        {(!stats || stats.status !== 'APPROVED') && (
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader>
              <CardTitle>شروع کار</CardTitle>
              <CardDescription>مراحل راهاندازی حساب صرافی</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 border rounded-xl bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800">
                <div className="w-10 h-10 bg-green-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                  ✓
                </div>
                <div>
                  <p className="font-medium">ثبت نام</p>
                  <p className="text-sm text-muted-foreground">حساب کاربری شما ایجاد شده است</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-xl bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                <div className="w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center text-sm font-bold shadow-md">
                  2
                </div>
                <div>
                  <p className="font-medium">تایید مدیریت</p>
                  <p className="text-sm text-muted-foreground">
                    {stats?.status === 'PENDING' ? 'در انتظار بررسی مدیریت' : 'تکمیل اطلاعات پروفایل'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 border rounded-xl opacity-50">
                <div className="w-10 h-10 bg-gray-300 text-gray-600 rounded-full flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <p className="font-medium">شروع فعالیت</p>
                  <p className="text-sm text-muted-foreground">مدیریت نرخها و تراکنشها</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
