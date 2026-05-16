'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { useLanguage } from '@/hooks/useLanguage'
import { POLLING_INTERVALS } from '@/lib/polling'
import { cn } from '@/lib/utils'
import { BellRing, CheckCheck, ChevronLeft, MessageCircle, MoreVertical, Search, Send, Shield, Settings, Trash2, User, XCircle, MousePointerClick, Loader2, Info, LayoutDashboard, Zap } from 'lucide-react'

type AdminSession = {
  id: string
  isActive: boolean
  kind: 'SUPPORT' | 'VISITOR'
  unreadCount: number
  updatedAt: string
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
}

type AdminMessage = {
  id: string
  senderName: string
  senderRole: string
  message: string
  timestamp: string
  isRead: boolean
  fileUrl?: string | null
}

interface AdminSupportDashboardProps {
  initialSessionId?: string | null
}

export function AdminSupportDashboard({ initialSessionId = null }: AdminSupportDashboardProps) {
  const router = useRouter()
  const { language } = useLanguage()
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  const [sessions, setSessions] = useState<AdminSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<AdminMessage[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'support' | 'visitor'>('all')
  const [showUserDetails, setShowUserDetails] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [activeSessionId, sessions]
  )

  const filteredSessions = useMemo(() => {
    let result = sessions
    
    // Filter by Tab
    if (filter === 'unread') result = result.filter(s => s.unreadCount > 0)
    else if (filter === 'support') result = result.filter(s => s.kind === 'SUPPORT')
    else if (filter === 'visitor') result = result.filter(s => s.kind === 'VISITOR')

    // Filter by Search
    const normalized = search.trim().toLowerCase()
    if (normalized) {
      result = result.filter((item) =>
        `${item.user.name} ${item.user.email} ${item.messages[0]?.message || ''}`.toLowerCase().includes(normalized)
      )
    }
    return result
  }, [search, sessions, filter])

  const totalUnread = useMemo(
    () => sessions.reduce((sum, item) => sum + item.unreadCount, 0),
    [sessions]
  )

  useAdaptivePolling(() => loadSessions(), {
    enabled: true,
    activeIntervalMs: POLLING_INTERVALS.chatSessionsActiveMs,
    idleIntervalMs: POLLING_INTERVALS.chatSessionsIdleMs,
    hiddenIntervalMs: false,
    runImmediately: true,
  })

  useEffect(() => {
    if (!initialSessionId || !sessions.length) return
    if (activeSessionId === initialSessionId) return
    if (sessions.some((item) => item.id === initialSessionId)) {
      setActiveSessionId(initialSessionId)
      setMobileView('chat')
    }
  }, [activeSessionId, initialSessionId, sessions])

  useAdaptivePolling(() => (activeSessionId ? loadMessages(activeSessionId) : undefined), {
    enabled: Boolean(activeSessionId),
    activeIntervalMs: POLLING_INTERVALS.chatMessagesActiveMs,
    idleIntervalMs: POLLING_INTERVALS.chatMessagesIdleMs,
    hiddenIntervalMs: false,
    runImmediately: true,
  })

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function loadSessions() {
    try {
      const response = await fetch('/api/admin/chat/sessions?status=ALL&limit=100', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json().catch(() => null)
      const nextSessions = Array.isArray(data?.sessions) ? data.sessions : []
      setSessions(nextSessions)
      setActiveSessionId((previous) => {
        if (previous && nextSessions.some((item: AdminSession) => item.id === previous)) {
          return previous
        }
        return nextSessions[0]?.id || null
      })
    } catch (error) {
      console.error('Failed to load admin support sessions:', error)
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const response = await fetch(`/api/admin/chat/messages/${sessionId}`, { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json().catch(() => [])
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to load admin support messages:', error)
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!activeSessionId || !draft.trim() || sending) return

    setSending(true)
    try {
      const response = await fetch('/api/admin/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: draft.trim(),
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send message')
      }
      setDraft('')
      setMessages((previous) => [...previous, data.message])
      void loadSessions()
      toast.success(pick('پاسخ ارسال شد', 'Reply sent', 'ځواب ولېږل شو'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  async function deleteSession(sessionId: string) {
    if (!confirm(pick('آیا از حذف این گفتگو مطمئنید؟', 'Delete this conversation?', 'ایا تاسو ډاډه یاست؟'))) return
    try {
      const response = await fetch(`/api/admin/chat/sessions/${sessionId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed')
      toast.success(pick('گفتگو حذف شد', 'Conversation deleted', 'خبرې حذف شوې'))
      setSessions((prev) => prev.filter((s) => s.id !== sessionId))
      if (activeSessionId === sessionId) {
        setActiveSessionId(null)
        setMobileView('list')
      }
    } catch { toast.error(pick('خطا در حذف', 'Delete failed', 'حذف ناکام شو')) }
  }

  async function closeSession(sessionId: string) {
    try {
      const response = await fetch(`/api/admin/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (!response.ok) throw new Error('Failed')
      toast.success(pick('گفتگو بسته شد', 'Session closed', 'خبرې وتړل شوې'))
      void loadSessions()
    } catch { toast.error(pick('خطا', 'Failed', 'ناکام')) }
  }

  async function markSessionRead(sessionId: string) {
    try {
      await fetch(`/api/admin/chat/messages/${sessionId}?markRead=1`)
      toast.success(pick('خوانده شد', 'Marked as read', 'لوستل شوي'))
      void loadSessions()
    } catch { /* silent */ }
  }

  async function bulkMarkAllRead() {
    const sessionsToMark = sessions.filter(s => s.unreadCount > 0)
    if (!sessionsToMark.length) return
    toast.info(pick('در حال بروزرسانی...', 'Updating...', 'د اوسمهالولو په حال کې...'))
    try {
      await Promise.all(sessionsToMark.map(s => fetch(`/api/admin/chat/messages/${s.id}?markRead=1`)))
      void loadSessions()
      toast.success(pick('تمام پیام‌ها خوانده شد', 'All marked as read', 'ټول پیغامونه ولوستل شول'))
    } catch { toast.error('Failed') }
  }

  async function bulkDeleteInactive() {
    if (!confirm(pick('تمام گفتگوهای غیرفعال حذف شوند؟', 'Delete all inactive sessions?', 'ایا غواړئ غیرفعال خبرې حذف کړئ؟'))) return
    const inactive = sessions.filter(s => !s.isActive)
    if (!inactive.length) return
    try {
      await Promise.all(inactive.map(s => fetch(`/api/admin/chat/sessions/${s.id}`, { method: 'DELETE' })))
      void loadSessions()
      toast.success(pick('پاکسازی انجام شد', 'Cleanup done', 'پاکول ترسره شول'))
    } catch { toast.error('Failed') }
  }

  return (
    <div className="flex h-full w-full flex-1 flex-col overflow-hidden min-h-0 text-[0.78rem] sm:text-[0.84rem]">
      <Card className="grid w-full flex-1 grid-rows-[auto_1fr] overflow-hidden rounded-2xl border border-white/10 bg-white/70 shadow-[0_28px_90px_-50px_rgba(0,0,0,0.45)] backdrop-blur-3xl dark:border-white/5 dark:bg-slate-950/80 sm:rounded-[28px]">
        {/* Header Management Bar */}
        <CardHeader className="shrink-0 space-y-2 border-b border-white/10 bg-white/40 p-2 backdrop-blur-2xl dark:bg-black/20 sm:p-3">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-3 text-sm font-black tracking-tight text-slate-900 dark:text-white sm:text-base">
              <div className="group relative flex h-9 w-9 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#6366f1,#3b82f6)] text-white shadow-[0_10px_20px_-10px_rgba(99,102,241,0.6)] transition-transform hover:scale-105 active:scale-95 sm:h-10 sm:w-10 sm:rounded-[18px]">
                <Shield className="h-5 w-5" />
                <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[0.62rem] font-black text-white ring-2 ring-white dark:ring-slate-900 sm:min-w-[22px] sm:px-1.5">
                  {totalUnread > 99 ? '99+' : totalUnread}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-sm sm:text-base">{pick('مدیریت زنده', 'Command Center', 'ژوندۍ مدیریت')}</span>
                <div className="flex items-center gap-2">
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-slate-400 dark:text-slate-500">
                    {pick(`${sessions.length} گفتگو فعال`, `${sessions.length} Live Sessions`, `${sessions.length} ژوندۍ مرکې`)}
                  </span>
                </div>
              </div>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="h-9 rounded-xl border-white/20 bg-white/50 px-3 text-slate-700 shadow-sm backdrop-blur-md transition-colors hover:bg-white dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 sm:h-10 sm:px-4">
                    <Zap className="mr-2 h-4 w-4 text-amber-500" />
                    {pick('عملیات گروهی', 'Bulk Actions', 'ډله ایز عملیات')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 rounded-2xl border-white/10 bg-white/90 backdrop-blur-2xl dark:bg-slate-950/90">
                  <DropdownMenuItem onClick={bulkMarkAllRead} className="rounded-xl py-2.5">
                    <CheckCheck className="mr-3 h-4 w-4 text-green-500" />
                    {pick('همه خوانده شد', 'Mark all as read', 'ټول لوستل شوي')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkDeleteInactive} className="rounded-xl py-2.5 text-rose-500 focus:text-rose-500">
                    <Trash2 className="mr-3 h-4 w-4" />
                    {pick('پاکسازی غیرفعال‌ها', 'Cleanup Inactive', 'غیرفعال پاک کړئ')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                type="button"
                variant="outline"
                className="group h-9 rounded-xl border-white/20 bg-indigo-500/10 px-3 text-indigo-600 shadow-sm backdrop-blur-md transition-colors hover:bg-indigo-600 hover:text-white dark:border-white/5 dark:bg-indigo-500/15 dark:text-indigo-400 dark:hover:bg-indigo-600 dark:hover:text-white sm:h-10 sm:px-4"
                onClick={() => router.push('/admin/chat?tab=settings')}
              >
                <Settings className="mr-2 h-4 w-4 transition-transform group-hover:rotate-90" />
                {pick('تنظیمات', 'Settings', 'تنظیمات')}
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder={pick('جست‌وجو در لیست...', 'Search intelligence...', 'په لېست کې لټون...')}
                className="h-9 rounded-xl border-white/20 bg-white/40 pr-10 text-slate-900 shadow-inner backdrop-blur-xl transition-colors focus:bg-white/80 focus:ring-2 focus:ring-indigo-500/20 dark:border-white/5 dark:bg-black/20 dark:text-white dark:focus:bg-black/40 sm:h-10"
              />
            </div>
            
            <div className="flex items-center gap-1 overflow-x-auto rounded-[18px] bg-slate-100/50 p-1 dark:bg-black/30 no-scrollbar">
              {[
                { id: 'all', label: pick('همه', 'All', 'ټول'), icon: LayoutDashboard },
                { id: 'unread', label: pick('نخوانده', 'Unread', 'نه لوستل شوي'), icon: BellRing },
                { id: 'support', label: pick('پشتیبانی', 'Support', 'ملاتړ'), icon: Shield },
                { id: 'visitor', label: pick('بازدیدکننده', 'Visitors', 'لیدونکي'), icon: User }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilter(tab.id as any)}
                  className={cn(
                    'flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-1.5 text-[0.7rem] font-semibold tracking-tight transition-colors sm:text-xs',
                    filter === tab.id
                      ? 'bg-white text-indigo-600 shadow-sm dark:bg-indigo-500 dark:text-white'
                      : 'text-slate-500 hover:bg-white/50 dark:hover:bg-white/5'
                  )}
                >
                  <tab.icon className="h-3.5 w-3.5" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col flex-1 overflow-hidden p-0 relative min-h-0">
          <div className="grid h-full w-full lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)] min-h-0">
            {/* Sidebar List */}
            <div className={cn('flex flex-col h-full border-r border-white/5 bg-slate-50/10 dark:bg-black/10 min-h-0', mobileView === 'chat' ? 'hidden lg:flex' : 'flex')}>
              <ScrollArea className="h-full w-full scroll-smooth" type="always">
                <div className="space-y-1 p-2">
                  {filteredSessions.map((item) => {
                    const selected = item.id === activeSessionId
                    return (
                      <div key={item.id} className="relative">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSessionId(item.id)
                            setMobileView('chat')
                          }}
                          className={cn(
                            'group relative w-full overflow-hidden rounded-2xl border px-2.5 py-2.5 text-left transition-all duration-300',
                            selected
                              ? 'border-indigo-500/30 bg-white shadow-[0_8px_20px_-8px_rgba(99,102,241,0.2)] dark:border-indigo-500/40 dark:bg-indigo-500/10'
                              : 'border-transparent hover:border-slate-300/40 hover:bg-white/50 dark:hover:border-white/5 dark:hover:bg-white/[0.02]'
                          )}
                        >
                          {selected && <div className="absolute left-0 top-0 h-full w-1 bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,1)]" />}
                          <div className="flex items-center gap-3">
                            <div className={cn(
                              'flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] text-sm font-black transition-all duration-500 sm:h-10 sm:w-10 sm:rounded-[16px]',
                              selected 
                                ? 'bg-[linear-gradient(135deg,#6366f1,#8b5cf6)] text-white shadow-lg ring-2 ring-white/20' 
                                : 'bg-white text-slate-500 shadow-inner dark:bg-slate-800 dark:text-slate-400'
                            )}>
                              {item.user.name.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-1">
                                <span className={cn('truncate text-[0.84rem] font-black tracking-tight leading-none', selected ? 'text-violet-900 dark:text-white' : 'text-slate-900 dark:text-slate-200')}>
                                  {item.user.name}
                                </span>
                                <span className={cn('shrink-0 text-[0.68rem] font-semibold tracking-tight', selected ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400')}>
                                  {new Date(item.updatedAt).toLocaleTimeString(language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center gap-2">
                                <span className={cn(
                                  'inline-flex h-4 items-center rounded-full px-1.5 text-[0.62rem] font-bold tracking-tight ring-1 ring-inset',
                                  item.kind === 'VISITOR' 
                                    ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20' 
                                    : 'bg-sky-500/10 text-sky-600 ring-sky-500/20'
                                )}>
                                  {item.kind === 'VISITOR' ? pick('مهمان', 'Guest', 'مېلمه') : pick('کاربر', 'User', 'کاروونکی')}
                                </span>
                                <p className={cn('truncate text-[0.68rem] leading-none', selected ? 'text-violet-700/70 dark:text-slate-400' : 'text-slate-400')}>
                                  {item.user.email}
                                </p>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-3">
                                <p className={cn('truncate text-xs leading-snug', selected ? 'font-medium text-violet-800 dark:text-slate-300' : 'text-slate-500 dark:text-slate-400')}>
                                  {item.messages[0]?.message || pick('بدون پیام', 'No message', 'پیغام نشته')}
                                </p>
                                {item.unreadCount > 0 ? (
                                  <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[0.7rem] font-bold text-white shadow-[0_4px_12px_-4px_rgba(244,63,94,0.6)]">
                                    {item.unreadCount > 99 ? '99+' : item.unreadCount}
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </button>
                        {/* 3-dot menu */}
                        <div className="absolute right-1.5 top-1.5 z-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="rounded-xl p-2 text-slate-400 opacity-60 transition-all hover:bg-slate-200/50 hover:text-slate-900 hover:opacity-100 group-hover:opacity-100 data-[state=open]:opacity-100 dark:hover:bg-white/10 dark:hover:text-white"
                                style={{ opacity: selected ? 1 : undefined }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => markSessionRead(item.id)}>
                                <CheckCheck className="mr-2 h-4 w-4 text-green-500" />
                                {pick('خواندن همه', 'Mark all read', 'ټول لوستل شوي')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => closeSession(item.id)}>
                                <XCircle className="mr-2 h-4 w-4 text-orange-500" />
                                {pick('بستن گفتگو', 'Close session', 'خبرې وتړئ')}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => deleteSession(item.id)} className="text-red-600 focus:text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
                                {pick('حذف گفتگو', 'Delete chat', 'خبرې حذف کړئ')}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}

                  {!filteredSessions.length ? (
                    <div className="rounded-xl border border-dashed border-slate-300/80 bg-slate-50/50 p-6 text-center dark:border-white/10 dark:bg-white/5">
                      <MessageCircle className="mx-auto mb-2 h-6 w-6 text-slate-400" />
                      <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{pick('موردی یافت نشد', 'Not found', 'ونه موندل شو')}</div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>

            {/* Main Chat Area */}
            <div className={cn('flex h-full min-h-0 flex-col bg-white/30 backdrop-blur-3xl dark:bg-slate-950/20', mobileView === 'list' ? 'hidden lg:flex' : 'flex')}>
              {activeSession ? (
                <>
                  <div className="flex items-center justify-between border-b border-white/5 bg-white/40 px-3 py-2 backdrop-blur-3xl dark:bg-black/20 sm:px-4 sm:py-3">
                    <div className="flex items-center gap-4">
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-2xl border border-white/10 bg-white/40 shadow-sm transition-colors hover:bg-white lg:hidden dark:border-white/5 dark:bg-white/5 dark:hover:bg-white/10" onClick={() => setMobileView('list')}>
                        <ChevronLeft className="h-5 w-5" />
                      </Button>
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] bg-[linear-gradient(135deg,#6366f1,#3b82f6)] font-black text-white shadow-xl ring-2 ring-white/10 sm:h-10 sm:w-10 sm:rounded-[18px] sm:ring-4">
                        {activeSession.user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h2 className="line-clamp-1 text-lg font-black tracking-tight text-slate-900 dark:text-white sm:text-xl">{activeSession.user.name}</h2>
                        <div className="mt-0.5 flex items-center gap-2 text-xs">
                          <div className={cn(
                            'flex items-center gap-1.5 rounded-full px-2 py-0.5 font-bold',
                            activeSession.isActive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-slate-500/10 text-slate-500'
                          )}>
                            <div className={cn('h-1.5 w-1.5 rounded-full', activeSession.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500')} />
                            <span>{activeSession.isActive ? pick('آنلاین', 'Active', 'آنلاین') : pick('بسته شده', 'Closed', 'بند شو')}</span>
                          </div>
                          <span className="text-slate-300 dark:text-slate-700">•</span>
                          <span className="font-bold text-slate-500">{activeSession.kind === 'VISITOR' ? pick('مهمان', 'Guest', 'مېلمه') : pick('کاربر', 'User', 'کاروونکی')}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                       <Button 
                        variant="ghost" 
                        size="icon" 
                        className={cn('rounded-2xl transition-colors', showUserDetails ? 'bg-indigo-500 text-white shadow-lg' : 'hover:bg-slate-200 dark:hover:bg-white/10')}
                        onClick={() => setShowUserDetails(!showUserDetails)}
                      >
                         <Info className="h-4 w-4" />
                       </Button>
                    </div>
                  </div>

                  <div className="flex flex-1 min-h-0 overflow-hidden relative">
                    <ScrollArea className="flex-1 bg-[radial-gradient(circle_at_top,#fcfdfe_0%,#f1f5f9_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_100%)]">
                      <div className="space-y-3 p-3 sm:p-4">
                        {messages.map((message, index) => {
                          const mine = message.senderRole === 'ADMIN'
                          return (
                            <div key={message.id} className={cn('group flex w-full animate-in fade-in slide-in-from-bottom-3 duration-700', mine ? 'justify-end' : 'justify-start')}>
                              <div className={cn(
                                'relative max-w-[92%] rounded-2xl px-3 py-2 text-[0.84rem] shadow-sm ring-1 ring-inset transition-all group-hover:shadow-xl sm:max-w-[75%]',
                                mine
                                  ? 'rounded-br-sm border-white/10 bg-[linear-gradient(135deg,#6366f1,#4f46e5)] text-white ring-white/10 shadow-[0_16px_48px_-16px_rgba(99,102,241,0.6)]'
                                  : 'rounded-bl-sm border-white/10 bg-white/90 text-slate-900 ring-slate-200 dark:bg-slate-900 dark:text-white dark:ring-white/5'
                              )}>
                                {message.message ? <p className="whitespace-pre-wrap break-words leading-relaxed">{message.message}</p> : null}
                                {message.fileUrl ? (
                                  <a href={message.fileUrl} target="_blank" rel="noopener noreferrer" className={cn('mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-xs font-bold transition-transform hover:scale-[1.02] active:scale-[0.98]', mine ? 'bg-white/15 text-white hover:bg-white/25' : 'bg-slate-100 text-slate-800 hover:bg-slate-200 dark:bg-white/10 dark:text-slate-200 dark:hover:bg-white/20')}>
                                    <MousePointerClick className="h-4 w-4" />
                                    {pick('مشاهده پیوست', 'View attachment', 'ضمیمه وګورئ')}
                                  </a>
                                ) : null}
                                <div className={cn('mt-2 flex items-center justify-end gap-2 text-[0.65rem] font-semibold tracking-tight opacity-60', mine ? 'text-indigo-100' : 'text-slate-500')}>
                                  <span>{new Date(message.timestamp).toLocaleTimeString(language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF', { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                        <div ref={messagesEndRef} className="h-2" />
                      </div>
                    </ScrollArea>

                    {/* Desktop User Info Panel */}
                    {showUserDetails && (
                      <div className="hidden xl:flex w-72 flex-col border-r border-white/5 bg-white/40 p-4 backdrop-blur-3xl animate-in slide-in-from-right duration-500 dark:bg-black/40">
                        <div className="flex flex-col items-center text-center">
                          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[26px] bg-[linear-gradient(135deg,#6366f1,#3b82f6)] text-xl font-black text-white shadow-xl ring-4 ring-white/10">
                            {activeSession.user.name.charAt(0).toUpperCase()}
                          </div>
                          <h3 className="text-lg font-black text-slate-900 dark:text-white">{activeSession.user.name}</h3>
                          <p className="mt-1 text-sm font-bold text-slate-500">{activeSession.user.email}</p>
                          <div className="mt-6 w-full space-y-3">
                             <div className="rounded-2xl bg-white/50 p-4 dark:bg-black/20 text-right">
                               <p className="text-[0.65rem] font-bold tracking-tight text-slate-400">{pick('نقش کاربر', 'User Role', 'رول')}</p>
                               <p className="mt-1 text-sm font-bold text-indigo-600">{activeSession.user.role || 'GUEST'}</p>
                             </div>
                             <div className="rounded-2xl bg-white/50 p-4 dark:bg-black/20 text-right">
                               <p className="text-[0.65rem] font-bold tracking-tight text-slate-400">{pick('نوع گفتگو', 'Session Type', 'د خبرو ډول')}</p>
                               <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{activeSession.kind}</p>
                             </div>
                             <div className="rounded-2xl bg-white/50 p-4 dark:bg-black/20 text-right">
                               <p className="text-[0.65rem] font-bold tracking-tight text-slate-400">{pick('آخرین فعالیت', 'Last Active', 'وروستی فعالیت')}</p>
                               <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">{new Date(activeSession.updatedAt).toLocaleDateString()}</p>
                             </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="sticky bottom-0 z-10 shrink-0 border-t border-white/10 bg-white/10 p-3 backdrop-blur-3xl dark:bg-black/20 sm:p-4">
                    <div className="flex w-full items-center gap-3 rounded-2xl border border-white/20 bg-white/60 p-2 shadow-[0_20px_48px_-20px_rgba(0,0,0,0.3)] ring-1 ring-white/20 transition-colors focus-within:ring-indigo-500/40 focus-within:bg-white dark:border-white/10 dark:bg-slate-900/60 dark:focus-within:bg-slate-900">
                      <Input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={pick('پاسخ شما به عنوان ادمین...', 'Type an admin reply...', 'د اډمین په توګه ځواب...')}
                        disabled={sending}
                        className="h-10 flex-1 border-0 bg-transparent px-3 text-sm font-semibold focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-50 sm:h-11 sm:px-4"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                          }
                        }}
                      />
                      <Button type="submit" disabled={sending || !draft.trim()} className="h-10 w-10 shrink-0 rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#6366f1)] p-0 text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 sm:h-11 sm:w-11">
                        {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5 rtl:-scale-x-100" />}
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center bg-[radial-gradient(circle_at_center,#f8fafc_0%,#f1f5f9_100%)] p-6 text-center dark:bg-[radial-gradient(circle_at_center,#0f172a_0%,#020617_100%)]">
                  <div className="max-w-sm">
                    <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-slate-100 shadow-inner dark:bg-slate-800/50">
                      <BellRing className="h-10 w-10 text-slate-400" />
                    </div>
                    <p className="text-lg font-black text-slate-900 dark:text-white">{pick('انتخاب گفتگو', 'Select a conversation', 'یوه خبره وټاکئ')}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">{pick('از لیست سمت راست، یک تب پشتیبانی یا سوال کاربر را انتخاب کنید تا چت را مدیریت کنید.', 'Choose a support thread or visitor question from the list to start responding.', 'له لېست څخه د ملاتړ یا لیدونکي پوښتنه غوره کړئ ترڅو ځواب ورکول پیل کړئ.')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
