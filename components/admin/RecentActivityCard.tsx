'use client'

import { useEffect, useMemo, useState } from 'react'
import { Building, DollarSign, RefreshCw, Settings, Shield, Star, User } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface ActivityItem {
  id: string
  action: string
  resource: string
  details: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  user?: {
    name: string
    email?: string
  } | null
}

const copy = {
  fa: {
    title: 'فعالیت‌های اخیر',
    description: 'آخرین رویدادهای ثبت‌شده سیستم',
    noActivity: 'فعالیت اخیری یافت نشد',
    justNow: 'همین الان',
    minuteAgo: 'دقیقه پیش',
    hourAgo: 'ساعت پیش',
    dayAgo: 'روز پیش',
    bullet: '•',
    role: 'نقش',
    reason: 'علت',
    email: 'ایمیل',
    referenceCode: 'کد مرجع',
    resource: {
      AUTH: 'احراز هویت',
      USER: 'کاربر',
      SARAF: 'صراف',
      TRANSACTION: 'تراکنش',
      SYSTEM: 'سیستم',
      SYSTEM_CONFIG: 'تنظیمات سیستم',
      CHAT: 'پیام‌رسانی',
      WEBHOOK: 'وبهوک',
      BACKUP: 'پشتیبان‌گیری',
      CREDIT: 'کریدیت',
      API_KEY: 'API Key',
      EXTERNAL_API: 'API خارجی',
      BLACKLIST: 'لیست سیاه',
    },
    actions: {
      LOGIN: 'ورود موفق',
      LOGOUT: 'خروج از سیستم',
      LOGIN_FAILED: 'تلاش ناموفق برای ورود',
      LOGIN_BLOCKED: 'ورود مسدود شد',
      USER_REGISTERED: 'کاربر جدید ثبت شد',
      USER_UPDATED: 'اطلاعات کاربر بروزرسانی شد',
      USER_REWARD_GRANTED: 'پاداش کاربر ثبت شد',
      SARAF_CREATED: 'درخواست صرافی ثبت شد',
      SARAF_APPROVED: 'صراف تایید شد',
      TRANSACTION_CREATED: 'تراکنش جدید ایجاد شد',
      TRANSACTION_COMPLETED: 'تراکنش تکمیل شد',
      TRANSACTION_CANCELLED: 'تراکنش لغو شد',
      SYSTEM_CONFIG_UPDATED: 'تنظیمات سیستم بروزرسانی شد',
      DISCOUNT_CODE_CREATED: 'پرومو کد ایجاد شد',
      DISCOUNT_CODE_UPDATED: 'پرومو کد بروزرسانی شد',
      DISCOUNT_CODE_DELETED: 'پرومو کد حذف شد',
      BLACKLIST_CREATED: 'موردی به لیست سیاه افزوده شد',
      BLACKLIST_UPDATED: 'لیست سیاه بروزرسانی شد',
      BLACKLIST_DELETED: 'موردی از لیست سیاه حذف شد',
    },
    reasons: {
      MISSING_CREDENTIALS: 'اطلاعات ورود ناقص بود',
      INVALID_EMAIL: 'ایمیل نامعتبر بود',
      USER_NOT_FOUND: 'کاربر پیدا نشد',
      INVALID_PASSWORD: 'رمز عبور نادرست بود',
      ACCOUNT_INACTIVE: 'حساب غیرفعال است',
      RATE_LIMIT: 'محدودیت تعداد تلاش فعال شد',
    },
  },
  en: {
    title: 'Recent Activity',
    description: 'Latest recorded system events',
    noActivity: 'No recent activity found',
    justNow: 'Just now',
    minuteAgo: 'minutes ago',
    hourAgo: 'hours ago',
    dayAgo: 'days ago',
    bullet: '•',
    role: 'Role',
    reason: 'Reason',
    email: 'Email',
    referenceCode: 'Reference',
    resource: {
      AUTH: 'Authentication',
      USER: 'User',
      SARAF: 'Saraf',
      TRANSACTION: 'Transaction',
      SYSTEM: 'System',
      SYSTEM_CONFIG: 'System Config',
      CHAT: 'Messaging',
      WEBHOOK: 'Webhook',
      BACKUP: 'Backup',
      CREDIT: 'Credit',
      API_KEY: 'API Key',
      EXTERNAL_API: 'External API',
      BLACKLIST: 'Blacklist',
    },
    actions: {
      LOGIN: 'Successful login',
      LOGOUT: 'User signed out',
      LOGIN_FAILED: 'Failed login attempt',
      LOGIN_BLOCKED: 'Login blocked',
      USER_REGISTERED: 'User registered',
      USER_UPDATED: 'User updated',
      USER_REWARD_GRANTED: 'User reward granted',
      SARAF_CREATED: 'Saraf request created',
      SARAF_APPROVED: 'Saraf approved',
      TRANSACTION_CREATED: 'Transaction created',
      TRANSACTION_COMPLETED: 'Transaction completed',
      TRANSACTION_CANCELLED: 'Transaction cancelled',
      SYSTEM_CONFIG_UPDATED: 'System settings updated',
      DISCOUNT_CODE_CREATED: 'Discount code created',
      DISCOUNT_CODE_UPDATED: 'Discount code updated',
      DISCOUNT_CODE_DELETED: 'Discount code deleted',
      BLACKLIST_CREATED: 'Blacklist entry added',
      BLACKLIST_UPDATED: 'Blacklist entry updated',
      BLACKLIST_DELETED: 'Blacklist entry deleted',
    },
    reasons: {
      MISSING_CREDENTIALS: 'Credentials were missing',
      INVALID_EMAIL: 'Email address was invalid',
      USER_NOT_FOUND: 'User was not found',
      INVALID_PASSWORD: 'Password was invalid',
      ACCOUNT_INACTIVE: 'Account is inactive',
      RATE_LIMIT: 'Too many attempts',
    },
  },
  ps: {
    title: 'وروستي فعالیتونه',
    description: 'د سیسټم وروستي ثبت شوي رویدادونه',
    noActivity: 'وروستی فعالیت ونه موندل شو',
    justNow: 'همدا اوس',
    minuteAgo: 'دقیقې مخکې',
    hourAgo: 'ساعتونه مخکې',
    dayAgo: 'ورځې مخکې',
    bullet: '•',
    role: 'رول',
    reason: 'لامل',
    email: 'ایمیل',
    referenceCode: 'مرجع',
    resource: {
      AUTH: 'تصدیق',
      USER: 'کاروونکی',
      SARAF: 'صراف',
      TRANSACTION: 'لېږد',
      SYSTEM: 'سیسټم',
      SYSTEM_CONFIG: 'سیسټم تنظیمات',
      CHAT: 'پیغام رسونه',
      WEBHOOK: 'ویبهوک',
      BACKUP: 'بیک اپ',
      CREDIT: 'کریدیټ',
      API_KEY: 'API Key',
      EXTERNAL_API: 'بهرنی API',
      BLACKLIST: 'تور لست',
    },
    actions: {
      LOGIN: 'بریالی ننوتل',
      LOGOUT: 'له سیسټم څخه ووتل',
      LOGIN_FAILED: 'د ننوتلو ناکامه هڅه',
      LOGIN_BLOCKED: 'ننوتل بند شول',
      USER_REGISTERED: 'نوی کاروونکی ثبت شو',
      USER_UPDATED: 'د کاروونکي معلومات نوي شول',
      USER_REWARD_GRANTED: 'د کاروونکي انعام ثبت شو',
      SARAF_CREATED: 'د صراف غوښتنه ثبت شوه',
      SARAF_APPROVED: 'صراف تایید شو',
      TRANSACTION_CREATED: 'نوې معامله جوړه شوه',
      TRANSACTION_COMPLETED: 'معامله بشپړه شوه',
      TRANSACTION_CANCELLED: 'معامله لغوه شوه',
      SYSTEM_CONFIG_UPDATED: 'د سیسټم تنظیمات نوي شول',
      DISCOUNT_CODE_CREATED: 'د تخفیف کوډ جوړ شو',
      DISCOUNT_CODE_UPDATED: 'د تخفیف کوډ نوي شو',
      DISCOUNT_CODE_DELETED: 'د تخفیف کوډ حذف شو',
      BLACKLIST_CREATED: 'تور لست ته نوې ماده زیاته شوه',
      BLACKLIST_UPDATED: 'تور لست نوي شو',
      BLACKLIST_DELETED: 'له تور لست څخه ماده لرې شوه',
    },
    reasons: {
      MISSING_CREDENTIALS: 'د ننوتلو معلومات نیمګړي وو',
      INVALID_EMAIL: 'بریښنالیک ناسم و',
      USER_NOT_FOUND: 'کاروونکی ونه موندل شو',
      INVALID_PASSWORD: 'پټ نوم ناسم و',
      ACCOUNT_INACTIVE: 'حساب غیر فعال دی',
      RATE_LIMIT: 'د هڅو محدودیت فعال شو',
    },
  },
} as const

type ActivityLanguage = keyof typeof copy

export function RecentActivityCard() {
  const { language } = useLanguage()
  const activeLanguage = ((language as ActivityLanguage) || 'fa')
  const labels = copy[activeLanguage] ?? copy.fa

  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  const relativeTimeFormatter = useMemo(
    () => new Intl.NumberFormat(activeLanguage === 'en' ? 'en-US' : activeLanguage === 'ps' ? 'ps-AF' : 'fa-IR'),
    [activeLanguage]
  )

  useEffect(() => {
    fetchRecentActivity()
  }, [])

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch('/api/admin/activity')
      if (!response.ok) throw new Error('Failed to fetch activity')
      const data = await response.json()
      setActivities(data)
    } catch (error) {
      console.error('Failed to fetch recent activity:', error)
      setActivities([])
    } finally {
      setLoading(false)
    }
  }

  const getActivityIcon = (action: string) => {
    switch (action) {
      case 'SARAF_APPROVED':
      case 'SARAF_CREATED':
        return <Building className="h-4 w-4" />
      case 'TRANSACTION_CREATED':
      case 'TRANSACTION_COMPLETED':
      case 'TRANSACTION_CANCELLED':
        return <DollarSign className="h-4 w-4" />
      case 'USER_REGISTERED':
      case 'USER_UPDATED':
      case 'USER_REWARD_GRANTED':
        return <User className="h-4 w-4" />
      case 'PROMOTION_APPROVED':
        return <Star className="h-4 w-4" />
      case 'SYSTEM_CONFIG_UPDATED':
        return <Settings className="h-4 w-4" />
      case 'LOGIN':
      case 'LOGIN_FAILED':
      case 'LOGIN_BLOCKED':
      case 'LOGOUT':
        return <Shield className="h-4 w-4" />
      default:
        return <div className="h-4 w-4 rounded-full bg-gray-400" />
    }
  }

  const getActivityColor = (action: string) => {
    switch (action) {
      case 'SARAF_APPROVED':
      case 'TRANSACTION_COMPLETED':
      case 'PROMOTION_APPROVED':
      case 'LOGIN':
        return 'bg-green-500'
      case 'TRANSACTION_CREATED':
      case 'RATE_UPDATED':
        return 'bg-blue-500'
      case 'USER_REGISTERED':
      case 'USER_UPDATED':
        return 'bg-purple-500'
      case 'SYSTEM_CONFIG_UPDATED':
        return 'bg-orange-500'
      case 'LOGIN_FAILED':
      case 'LOGIN_BLOCKED':
      case 'TRANSACTION_CANCELLED':
        return 'bg-red-500'
      default:
        return 'bg-gray-500'
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return labels.justNow
    if (diffInMinutes < 60) {
      return `${relativeTimeFormatter.format(diffInMinutes)} ${labels.minuteAgo}`
    }

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) {
      return `${relativeTimeFormatter.format(diffInHours)} ${labels.hourAgo}`
    }

    const diffInDays = Math.floor(diffInHours / 24)
    return `${relativeTimeFormatter.format(diffInDays)} ${labels.dayAgo}`
  }

  const formatActionLabel = (action: string) =>
    labels.actions[action as keyof typeof labels.actions] || action.replace(/_/g, ' ')

  const formatResourceLabel = (resource: string) =>
    labels.resource[resource as keyof typeof labels.resource] || resource.replace(/_/g, ' ')

  const formatRole = (role: unknown) => {
    switch (role) {
      case 'ADMIN':
        return activeLanguage === 'en' ? 'Admin' : activeLanguage === 'ps' ? 'اډمین' : 'مدیر'
      case 'SARAF':
        return activeLanguage === 'en' ? 'Saraf' : activeLanguage === 'ps' ? 'صراف' : 'صراف'
      case 'USER':
        return activeLanguage === 'en' ? 'User' : activeLanguage === 'ps' ? 'کاروونکی' : 'کاربر'
      default:
        return String(role || '')
    }
  }

  const formatReason = (reason: unknown) => {
    if (typeof reason !== 'string') return ''

    const sanitizedReason = reason.startsWith('CAPTCHA_FAILED:') ? 'CAPTCHA_FAILED' : reason
    if (sanitizedReason === 'CAPTCHA_FAILED') {
      return activeLanguage === 'en'
        ? 'Security verification failed'
        : activeLanguage === 'ps'
          ? 'امنیتي تایید ناکام شو'
          : 'تایید امنیتی ناموفق بود'
    }

    return labels.reasons[sanitizedReason as keyof typeof labels.reasons] || reason.replace(/_/g, ' ')
  }

  const getSummary = (activity: ActivityItem) => {
    if (activity.details) {
      return activity.details
    }

    if (!activity.metadata) {
      return ''
    }

    const parts: string[] = []

    if (activity.metadata.email) {
      parts.push(`${labels.email}: ${String(activity.metadata.email)}`)
    }
    if (activity.metadata.role) {
      parts.push(`${labels.role}: ${formatRole(activity.metadata.role)}`)
    }
    if (activity.metadata.referenceCode) {
      parts.push(`${labels.referenceCode}: ${String(activity.metadata.referenceCode)}`)
    }
    if (activity.metadata.reason) {
      parts.push(`${labels.reason}: ${formatReason(activity.metadata.reason)}`)
    }

    return parts.join(` ${labels.bullet} `)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>{labels.title}</CardTitle>
            <CardDescription>{labels.description}</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchRecentActivity} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, 5).map((activity) => {
              const summary = getSummary(activity)

              return (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full ${getActivityColor(activity.action)} text-white`}
                  >
                    {getActivityIcon(activity.action)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{formatActionLabel(activity.action)}</p>
                    {summary ? (
                      <p className="mt-1 truncate text-xs text-muted-foreground">{summary}</p>
                    ) : null}
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-xs text-muted-foreground">{formatTimeAgo(activity.createdAt)}</p>
                      {activity.user?.name ? (
                        <>
                          <span className="text-xs text-muted-foreground">{labels.bullet}</span>
                          <p className="text-xs text-muted-foreground">{activity.user.name}</p>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {formatResourceLabel(activity.resource)}
                  </Badge>
                </div>
              )
            })}

            {activities.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <p>{labels.noActivity}</p>
              </div>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
