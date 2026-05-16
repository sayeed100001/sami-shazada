'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Clock, Eye, MessageSquare, Reply, User } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { AdminBroadcastMessage } from './AdminBroadcastMessage'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface ChatSession {
  id: string
  user: {
    id: string
    name: string
    email: string
    role: string
  }
  messages: Array<{
    id: string
    message: string
    timestamp: string
    senderRole: string
    isRead: boolean
  }>
  _count: {
    messages: number
  }
  unreadCount?: number
  isActive: boolean
  updatedAt: string
}

const localeMap = {
  fa: 'fa-IR',
  en: 'en-US',
  ps: 'ps-AF',
} as const

const copy = {
  fa: {
    totalSessions: 'کل جلسات',
    unreadMessages: 'پیام‌های خوانده‌نشده',
    activeSessions: 'جلسات فعال',
    pendingResponses: 'نیاز به پاسخ',
    recentMessages: 'پیام‌های اخیر',
    noMessage: 'بدون پیام',
    noNewMessages: 'پیام جدیدی وجود ندارد',
    messages: 'پیام',
    reply: 'پاسخ',
    newBadge: 'جدید',
    roles: {
      ADMIN: 'مدیر',
      SARAF: 'صراف',
      USER: 'کاربر',
    },
    justNow: 'همین الان',
    minuteAgo: 'دقیقه پیش',
    hourAgo: 'ساعت پیش',
    dayAgo: 'روز پیش',
    bullet: '•',
  },
  en: {
    totalSessions: 'Total Sessions',
    unreadMessages: 'Unread Messages',
    activeSessions: 'Active Sessions',
    pendingResponses: 'Pending Responses',
    recentMessages: 'Recent Messages',
    noMessage: 'No message',
    noNewMessages: 'There are no new messages',
    messages: 'messages',
    reply: 'Reply',
    newBadge: 'New',
    roles: {
      ADMIN: 'Admin',
      SARAF: 'Saraf',
      USER: 'User',
    },
    justNow: 'Just now',
    minuteAgo: 'minutes ago',
    hourAgo: 'hours ago',
    dayAgo: 'days ago',
    bullet: '•',
  },
  ps: {
    totalSessions: 'ټولې جلسې',
    unreadMessages: 'نالول شوي پیغامونه',
    activeSessions: 'فعاله جلسې',
    pendingResponses: 'ځواب ته اړتیا',
    recentMessages: 'وروستي پیغامونه',
    noMessage: 'پیغام نشته',
    noNewMessages: 'هیڅ نوی پیغام نشته',
    messages: 'پیغامونه',
    reply: 'ځواب',
    newBadge: 'نوی',
    roles: {
      ADMIN: 'اډمین',
      SARAF: 'صراف',
      USER: 'کاروونکی',
    },
    justNow: 'همدا اوس',
    minuteAgo: 'دقیقې مخکې',
    hourAgo: 'ساعتونه مخکې',
    dayAgo: 'ورځې مخکې',
    bullet: '•',
  },
} as const

type MessagingLanguage = keyof typeof copy

export function AdminMessagingDashboard() {
  const { language } = useLanguage()
  const activeLanguage = ((language as MessagingLanguage) || 'fa')
  const labels = copy[activeLanguage] ?? copy.fa
  const locale = localeMap[activeLanguage] ?? localeMap.fa

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [loading, setLoading] = useState(true)
  const [lastFetch, setLastFetch] = useState(0)
  const [stats, setStats] = useState({
    totalSessions: 0,
    unreadMessages: 0,
    activeSessions: 0,
    pendingResponses: 0,
  })

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])

  useEffect(() => {
    void fetchRecentSessions()
    void fetchMessagingStats()
  }, [])

  const fetchRecentSessions = async () => {
    try {
      const response = await fetch('/api/admin/chat/sessions?limit=5')
      if (response.ok) {
        const data = await response.json()
        setSessions(data.sessions || [])
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setSessions([])
    } finally {
      setLoading(false)
    }
  }

  const fetchMessagingStats = async () => {
    const now = Date.now()
    if (now - lastFetch < 10000) {
      return
    }

    setLastFetch(now)

    try {
      const response = await fetch('/api/admin/chat/stats')
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      } else if (response.status === 429) {
        console.warn('Rate limit exceeded, skipping stats update')
      } else {
        setStats({
          totalSessions: 0,
          unreadMessages: 0,
          activeSessions: 0,
          pendingResponses: 0,
        })
      }
    } catch (error) {
      console.error('Failed to fetch messaging stats:', error)
      setStats({
        totalSessions: 0,
        unreadMessages: 0,
        activeSessions: 0,
        pendingResponses: 0,
      })
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))

    if (diffInMinutes < 1) return labels.justNow
    if (diffInMinutes < 60) return `${numberFormatter.format(diffInMinutes)} ${labels.minuteAgo}`

    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${numberFormatter.format(diffInHours)} ${labels.hourAgo}`

    const diffInDays = Math.floor(diffInHours / 24)
    return `${numberFormatter.format(diffInDays)} ${labels.dayAgo}`
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: 'destructive',
      SARAF: 'default',
      USER: 'secondary',
    }

    return (
      <Badge variant={variants[role as keyof typeof variants] as 'default' | 'destructive' | 'secondary'} className="text-xs">
        {labels.roles[role as keyof typeof labels.roles] || role}
      </Badge>
    )
  }

  useAdaptivePolling(
    async () => {
      await Promise.all([fetchRecentSessions(), fetchMessagingStats()])
    },
    {
      enabled: true,
      activeIntervalMs: POLLING_INTERVALS.adminStatsActiveMs,
      idleIntervalMs: POLLING_INTERVALS.adminStatsIdleMs,
      hiddenIntervalMs: false,
      runImmediately: false,
    }
  )

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <AdminBroadcastMessage />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{labels.totalSessions}</p>
                <p className="text-2xl font-bold">{numberFormatter.format(stats.totalSessions)}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{labels.unreadMessages}</p>
                <p className="text-2xl font-bold text-red-600">{numberFormatter.format(stats.unreadMessages)}</p>
              </div>
              <Eye className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{labels.activeSessions}</p>
                <p className="text-2xl font-bold text-green-600">{numberFormatter.format(stats.activeSessions)}</p>
              </div>
              <User className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{labels.pendingResponses}</p>
                <p className="text-2xl font-bold text-orange-600">{numberFormatter.format(stats.pendingResponses)}</p>
              </div>
              <Reply className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">{labels.recentMessages}</h3>
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-16 rounded-lg bg-muted" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <Card key={session.id} className="transition-shadow hover:shadow-md">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback>{session.user.name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <p className="truncate font-medium">{session.user.name}</p>
                          {getRoleBadge(session.user.role)}
                          {(session.unreadCount || 0) > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {labels.newBadge}
                            </Badge>
                          ) : null}
                        </div>
                        <p className="truncate text-sm text-muted-foreground">
                          {session.messages[0]?.message || labels.noMessage}
                        </p>
                        <div className="mt-1 flex items-center gap-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatTimeAgo(session.updatedAt)}</span>
                          <span className="text-xs text-muted-foreground">
                            {labels.bullet} {numberFormatter.format(session._count.messages)} {labels.messages}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/portal/internal-chat?tab=customers&sessionId=${session.id}`}>
                          <Reply className="mr-1 h-4 w-4" />
                          {labels.reply}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {sessions.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <MessageSquare className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">{labels.noNewMessages}</p>
                </CardContent>
              </Card>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
