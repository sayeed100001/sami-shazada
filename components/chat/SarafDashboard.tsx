'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { useLanguage } from '@/hooks/useLanguage'
import { POLLING_INTERVALS } from '@/lib/polling'
import { cn } from '@/lib/utils'
import { Building2, ChevronLeft, Clock, MessageCircle, Search, Send, Shield, User } from 'lucide-react'

type Message = {
  id: string
  senderName: string
  senderRole: string
  message: string
  timestamp: string
  isRead: boolean
  fileUrl?: string | null
  fileName?: string | null
}

type ChatSession = {
  id: string
  kind: 'SARAF' | 'SUPPORT'
  userName?: string
  sarafName?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

interface SarafDashboardProps {
  initialSessionId?: string | null
}

export function SarafDashboard({ initialSessionId = null }: SarafDashboardProps) {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const isSaraf = session?.user?.role === 'SARAF'
  const isUser = session?.user?.role === 'USER'

  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [search, setSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  const activeSession = useMemo(
    () => sessions.find((item) => item.id === activeSessionId) || null,
    [activeSessionId, sessions]
  )

  const totalUnread = useMemo(
    () => sessions.reduce((sum, item) => sum + (item.unreadCount || 0), 0),
    [sessions]
  )

  const filteredSessions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return sessions
    return sessions.filter((item) =>
      `${item.userName || ''} ${item.sarafName || ''} ${item.lastMessage} ${item.kind}`.toLowerCase().includes(query)
    )
  }, [search, sessions])

  const sessionsPollingEnabled = isSaraf || isUser
  useAdaptivePolling(() => (sessionsPollingEnabled ? loadSessions() : undefined), {
    enabled: sessionsPollingEnabled,
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
      const nextSessions: ChatSession[] = []

      if (isUser) {
        const [supportRes, sarafRes] = await Promise.all([
          fetch('/api/chat/initialize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          }),
          fetch('/api/saraf-chat/sessions', { cache: 'no-store' }),
        ])

        if (supportRes.ok) {
          const supportData = await supportRes.json().catch(() => null)
          const supportMessages = Array.isArray(supportData?.messages) ? supportData.messages : []
          const latestSupportMessage = supportMessages[0]
          nextSessions.push({
            id: supportData?.sessionId || 'support',
            kind: 'SUPPORT',
            sarafName: pick('پشتیبانی مدیریت', 'System support', 'د سیسټم ملاتړ'),
            lastMessage: latestSupportMessage?.message || pick('گفت‌وگو با ادمین و پشتیبانی سیستم', 'Chat with admin and support', 'له اډمین او ملاتړ سره خبرې'),
            lastMessageTime: latestSupportMessage?.timestamp || new Date().toISOString(),
            unreadCount: supportMessages.filter((message: Message) => message.senderRole !== 'USER' && !message.isRead).length,
          })
        }

        if (sarafRes.ok) {
          const sarafData = await sarafRes.json().catch(() => [])
          if (Array.isArray(sarafData)) {
            nextSessions.push(
              ...sarafData.map((item) => ({
                ...item,
                kind: 'SARAF' as const,
              }))
            )
          }
        }
      } else {
        const res = await fetch('/api/saraf-chat/sessions', { cache: 'no-store' })
        if (!res.ok) return
        const data = await res.json().catch(() => [])
        if (!Array.isArray(data)) return
        nextSessions.push(
          ...data.map((item) => ({
            ...item,
            kind: 'SARAF' as const,
          }))
        )
      }

      nextSessions.sort((left, right) => new Date(right.lastMessageTime).getTime() - new Date(left.lastMessageTime).getTime())

      setSessions(nextSessions)
      setActiveSessionId((previous) => {
        if (previous && nextSessions.some((item) => item.id === previous)) {
          return previous
        }
        return nextSessions[0]?.id || null
      })
    } catch (error) {
      console.error('Failed to load saraf chat sessions:', error)
    }
  }

  async function loadMessages(sessionId: string) {
    try {
      const sessionMeta = sessions.find((item) => item.id === sessionId)
      if (sessionMeta?.kind === 'SUPPORT') {
        const response = await fetch(`/api/chat/messages?sessionId=${encodeURIComponent(sessionId)}`, { cache: 'no-store' })
        if (!response.ok) return
        const data = await response.json().catch(() => [])
        setMessages(Array.isArray(data) ? data : [])
        return
      }

      const res = await fetch(`/api/saraf-chat/messages/${sessionId}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json().catch(() => null)
      setMessages(Array.isArray(data?.messages) ? data.messages : [])
    } catch (error) {
      console.error('Failed to load saraf chat messages:', error)
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()
    if (!activeSessionId || !draft.trim() || sending) return

    setSending(true)
    try {
      const res = await fetch(activeSession?.kind === 'SUPPORT' ? '/api/chat/send' : '/api/saraf-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSessionId,
          message: draft.trim(),
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed to send message')
      setDraft('')
      setMessages((previous) => [...previous, data.message])
      void loadSessions()
      toast.success(pick('پیام ارسال شد', 'Message sent', 'پیغام ولېږل شو'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  if (!isSaraf && !isUser) {
    return (
      <Card className="border-border/70 bg-background/90">
        <CardContent className="px-6 py-12 text-center text-muted-foreground">
          {pick('این بخش فقط برای کاربران واردشده فعال است.', 'This area is only available to signed-in users.', 'دا برخه یوازې د ننوتلو کاروونکو لپاره فعاله ده.')}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[26px] border-0 bg-background/95 shadow-[0_28px_100px_-56px_rgba(15,23,42,0.45)] sm:rounded-[32px]">
        <CardHeader className="shrink-0 space-y-3 border-b border-border/70 bg-background/80 p-4 backdrop-blur sm:p-6">
          <CardTitle className="flex flex-wrap items-center gap-2 text-slate-900 dark:text-white">
            <MessageCircle className="h-5 w-5" />
            {isSaraf
              ? pick('گفت‌وگوهای مشتریان', 'Customer conversations', 'د مشتریانو خبرې')
              : pick('گفت‌وگو با صرافان', 'Saraf conversations', 'د صرافانو خبرې')}
            {totalUnread > 0 ? <Badge className="bg-rose-600 text-white">{totalUnread > 99 ? '99+' : totalUnread}</Badge> : null}
          </CardTitle>
          <div className="relative">
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={pick('جست‌وجو…', 'Search…', 'لټون…')}
              className="h-11 rounded-2xl border-border bg-background pr-10"
            />
          </div>
        </CardHeader>

        <CardContent className="flex h-full min-h-0 flex-1 overflow-hidden p-0">
          <div className="grid h-full w-full lg:grid-cols-[360px_minmax(0,1fr)]">
            <div className={cn('h-full border-r border-border/70 bg-background/70', mobileView === 'chat' ? 'hidden lg:block' : 'block')}>
              <ScrollArea className="h-full">
                <div className="space-y-2 p-3">
                  {filteredSessions.map((item) => {
                    const selected = item.id === activeSessionId
                    const counterpartName = isSaraf ? item.userName : item.sarafName || item.userName
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveSessionId(item.id)
                          setMobileView('chat')
                        }}
                        className={cn(
                          'w-full rounded-2xl border px-3 py-3 text-left transition',
                          selected ? 'border-violet-500/40 bg-violet-500/10' : 'border-border/70 bg-background hover:bg-muted/40'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {item.kind === 'SUPPORT' ? <Shield className="h-4 w-4 text-muted-foreground" /> : isSaraf ? <User className="h-4 w-4 text-muted-foreground" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                              <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                {counterpartName || pick('بدون عنوان', 'Untitled', 'بې سرليکه')}
                              </span>
                              {item.unreadCount > 0 ? <Badge className="bg-rose-600 text-white">{item.unreadCount > 99 ? '99+' : item.unreadCount}</Badge> : null}
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {item.lastMessage || pick('بدون پیام', 'No message yet', 'پیغام نشته')}
                            </p>
                          </div>
                          <span className="shrink-0 text-[11px] text-muted-foreground">
                            {new Date(item.lastMessageTime).toLocaleTimeString(language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </button>
                    )
                  })}

                  {!filteredSessions.length ? (
                    <div className="rounded-2xl border border-dashed border-border/70 p-6 text-center text-sm text-muted-foreground">
                      {pick('هنوز گفت‌وگویی وجود ندارد.', 'No conversations yet.', 'لا تر اوسه خبرې نشته.')}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </div>

            <div className={cn('flex h-full flex-col', mobileView === 'list' ? 'hidden lg:flex' : 'flex')}>
              {activeSession ? (
                <>
                  <div className="flex items-center gap-3 border-b border-border/70 bg-background/80 px-4 py-3 backdrop-blur">
                    <Button type="button" variant="ghost" size="icon" className="rounded-full lg:hidden" onClick={() => setMobileView('list')}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-900 dark:text-white">
                        {isSaraf ? activeSession.userName : activeSession.sarafName || activeSession.userName}
                      </p>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{pick('آخرین پیام', 'Last message', 'وروستی پیغام')}: {new Date(activeSession.lastMessageTime).toLocaleString(language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF')}</span>
                      </p>
                    </div>
                  </div>

                   <ScrollArea className="flex-1 bg-[radial-gradient(circle_at_top,#eef2ff_0%,#f8fafc_48%,#eef2ff_100%)] dark:bg-[radial-gradient(circle_at_top,#0b1220_0%,#0f172a_48%,#020617_100%)]">
                     <div className="space-y-3 p-3 sm:p-4">
                       {messages.map((msg) => {
                         const mine = msg.senderRole === session?.user?.role
                         return (
                           <div key={msg.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                             <div className={cn('max-w-[84%] rounded-[18px] border px-4 py-3 text-sm shadow-sm', mine ? 'border-violet-500/20 bg-gradient-to-br from-violet-600 to-indigo-600 text-white' : 'border-border/70 bg-background text-slate-900 dark:text-white')}>
                               {msg.message ? <p className="whitespace-pre-wrap break-words leading-6 sm:leading-7">{msg.message}</p> : null}
                               {msg.fileUrl ? (
                                 <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className={cn('mt-2 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold', mine ? 'bg-white/10 text-white hover:bg-white/15' : 'bg-muted/40 text-slate-700 hover:bg-muted/60 dark:text-slate-200')}>
                                   {msg.fileName || pick('پیوست', 'Attachment', 'ضمیمه')}
                                 </a>
                              ) : null}
                              <div className="mt-2 flex items-center justify-end gap-2 text-[11px] opacity-75">
                                <span>{new Date(msg.timestamp).toLocaleTimeString(language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF', { hour: '2-digit', minute: '2-digit' })}</span>
                                {mine ? <span>{msg.isRead ? '✓✓' : '✓'}</span> : null}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  </ScrollArea>

                  <form onSubmit={sendMessage} className="border-t border-border/70 bg-background/80 p-3 backdrop-blur">
                    <div className="flex items-end gap-2">
                      <Input
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder={pick('پیام…', 'Message…', 'پیغام…')}
                        disabled={sending}
                        className="h-11 flex-1 rounded-2xl"
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && !event.shiftKey) {
                            event.preventDefault()
                            event.currentTarget.form?.requestSubmit()
                          }
                        }}
                      />
                      <Button type="submit" disabled={sending || !draft.trim()} className="h-11 w-11 rounded-2xl p-0">
                        {sending ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex flex-1 items-center justify-center px-6 text-center text-muted-foreground">
                  <div>
                    <MessageCircle className="mx-auto mb-3 h-10 w-10 opacity-40" />
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{pick('یک گفت‌وگو را انتخاب کنید', 'Select a conversation', 'یوه خبره وټاکئ')}</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {isSaraf
                        ? pick('از لیست، یکی از مشتریان را انتخاب کنید.', 'Choose a customer from the list.', 'له لېست څخه یو مشتری وټاکئ.')
                        : pick('از لیست، یکی از صرافان را انتخاب کنید.', 'Choose a saraf from the list.', 'له لېست څخه یو صراف وټاکئ.')}
                    </p>
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
