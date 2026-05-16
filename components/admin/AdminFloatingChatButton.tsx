'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { MessageSquare, X, Send, Users, Building, User as UserIcon, Crown, Clock, Search } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'
import { cn } from '@/lib/utils'

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
  isActive: boolean
  updatedAt: string
}

interface QuickMessage {
  id: string
  message: string
  timestamp: string
  senderName: string
  senderRole: string
  sessionId: string
  isRead: boolean
}

export function AdminFloatingChatButton() {
  const { data: session } = useSession()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'messages' | 'sessions'>('messages')
  const [unreadCount, setUnreadCount] = useState(0)
  const [recentMessages, setRecentMessages] = useState<QuickMessage[]>([])
  const [activeSessions, setActiveSessions] = useState<ChatSession[]>([])
  const [quickReply, setQuickReply] = useState('')
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      setLoading(true)
      void Promise.all([
        fetchUnreadCount(),
        fetchRecentMessages(),
        fetchActiveSessions()
      ]).finally(() => setLoading(false))
    }
  }, [session, activeTab])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [recentMessages])

  useEffect(() => {
    if (!isOpen || session?.user?.role !== 'ADMIN') {
      return
    }

    void Promise.all([
      fetchUnreadCount(),
      fetchRecentMessages(),
      activeTab === 'sessions' ? fetchActiveSessions() : Promise.resolve(),
    ])
  }, [activeTab, isOpen, session?.user?.role])

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch('/api/admin/chat/unread-count')
      if (response.ok) {
        const data = await response.json()
        setUnreadCount(data.count || 0)
      }
    } catch (error) {
      console.error('Failed to fetch unread count:', error)
    }
  }

  const fetchRecentMessages = async () => {
    try {
      const response = await fetch('/api/admin/chat/recent-messages?limit=15')
      if (response.ok) {
        const data = await response.json()
        const realMessages = (data.messages || []).filter((msg: QuickMessage) => 
          msg.senderName && !msg.senderName.includes('تست') && !msg.senderName.includes('test')
        )
        setRecentMessages(realMessages)
      }
    } catch (error) {
      console.error('Failed to fetch recent messages:', error)
    }
  }

  const fetchActiveSessions = async () => {
    try {
      const response = await fetch('/api/admin/chat/sessions?status=ACTIVE&limit=8')
      if (response.ok) {
        const data = await response.json()
        const realSessions = (data.sessions || []).filter((session: ChatSession) => 
          session.user.name && !session.user.name.includes('تست')
        )
        setActiveSessions(realSessions)
      }
    } catch (error) {
      console.error('Failed to fetch active sessions:', error)
    }
  }

  const sendQuickReply = async () => {
    if (!quickReply.trim() || !selectedSession) return

    try {
      const response = await fetch('/api/admin/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession,
          message: quickReply.trim()
        })
      })

      if (response.ok) {
        setQuickReply('')
        fetchRecentMessages()
        fetchUnreadCount()
        toast.success('پیام ارسال شد')
      }
    } catch (error) {
      console.error('Quick reply failed:', error)
      toast.error('خطا در ارسال پیام')
    }
  }

  const markAsRead = async (sessionId: string) => {
    try {
      await fetch(`/api/admin/chat/sessions/${sessionId}/mark-read`, {
        method: 'POST'
      })
      fetchUnreadCount()
      fetchRecentMessages()
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
    
    if (diffInMinutes < 1) return 'الان'
    if (diffInMinutes < 60) return `${diffInMinutes}د`
    
    const diffInHours = Math.floor(diffInMinutes / 60)
    if (diffInHours < 24) return `${diffInHours}س`
    
    const diffInDays = Math.floor(diffInHours / 24)
    return `${diffInDays}ر`
  }

  const filteredMessages = recentMessages.filter(msg =>
    msg.senderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    msg.message.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredSessions = activeSessions.filter(session =>
    session.user.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  useAdaptivePolling(
    async () => {
      await fetchUnreadCount()

      if (isOpen) {
        await fetchRecentMessages()
        if (activeTab === 'sessions') {
          await fetchActiveSessions()
        }
      }
    },
    {
      enabled: session?.user?.role === 'ADMIN',
      activeIntervalMs: isOpen ? POLLING_INTERVALS.chatSessionsActiveMs : POLLING_INTERVALS.quickBadgeActiveMs,
      idleIntervalMs: isOpen ? POLLING_INTERVALS.chatSessionsIdleMs : POLLING_INTERVALS.quickBadgeIdleMs,
      hiddenIntervalMs: false,
      runImmediately: false,
    }
  )

  if (session?.user?.role !== 'ADMIN') return null

  const renderMessages = () => {
    if (filteredMessages.length === 0) {
      return (
        <div className="flex items-center justify-center h-full py-12">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20 shadow-lg">
              <MessageSquare className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold mb-2">هیچ پیامی یافت نشد</p>
              <p className="text-sm text-muted-foreground">پیامهای جدید اینجا نمایش داده میشوند</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="p-3 space-y-2">
        {filteredMessages.map((message, index) => (
          <button
            key={message.id}
            type="button"
            onClick={() => {
              setSelectedSession(message.sessionId)
              if (!message.isRead) markAsRead(message.sessionId)
              router.push(`/portal/internal-chat?tab=customers&sessionId=${message.sessionId}`)
            }}
            className={cn(
              "w-full p-4 rounded-2xl text-right transition-all duration-300 backdrop-blur-xl border border-white/20 shadow-lg hover:shadow-xl hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2 flex items-start gap-3",
              message.isRead 
                ? 'bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60'
                : 'bg-primary/10 border-primary/30'
            )}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="relative shrink-0">
              <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground font-bold">
                  {message.senderRole === 'SARAF' ? <Building className="h-6 w-6" /> : <UserIcon className="h-6 w-6" />}
                </AvatarFallback>
              </Avatar>
              {!message.isRead && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-background animate-pulse" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-sm truncate">{message.senderName}</h4>
                  {message.senderRole === 'SARAF' && <Crown className="h-3 w-3 text-yellow-500" />}
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTimeAgo(message.timestamp)}
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                {message.message}
              </p>
              
              {!message.isRead && (
                <Badge className="backdrop-blur-xl bg-red-500/90 text-white text-xs border border-white/20 animate-pulse">
                  جدید
                </Badge>
              )}
            </div>
          </button>
        ))}
        <div ref={messagesEndRef} />
      </div>
    )
  }

  const renderSessions = () => {
    if (filteredSessions.length === 0) {
      return (
        <div className="flex items-center justify-center h-full py-12">
          <div className="text-center space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20 shadow-lg">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <div>
              <p className="font-bold mb-2">هیچ جلسه فعالی یافت نشد</p>
              <p className="text-sm text-muted-foreground">جلسات فعال اینجا نمایش داده میشوند</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="p-3 space-y-2">
        {filteredSessions.map((session, index) => {
          const hasUnread = session.messages.some(m => !m.isRead && m.senderRole !== 'ADMIN')
          return (
            <button
              key={session.id}
              type="button"
              onClick={() => router.push(`/portal/internal-chat?tab=customers&sessionId=${session.id}`)}
              className="w-full p-4 rounded-2xl flex items-center justify-between transition-all duration-300 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 hover:bg-white/60 dark:hover:bg-gray-800/60 border border-white/20 shadow-lg hover:shadow-xl hover:scale-[1.02] animate-in fade-in slide-in-from-bottom-2"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                    <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground font-bold">
                      {session.user.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  {session.isActive && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0 text-right">
                  <h4 className="font-semibold text-sm truncate mb-1">{session.user.name}</h4>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTimeAgo(session.updatedAt)}</span>
                  </div>
                </div>
              </div>
              
              {hasUnread && (
                <Badge className="backdrop-blur-xl bg-red-500/90 text-white border border-white/20 shrink-0">
                  {session.messages.filter(m => !m.isRead && m.senderRole !== 'ADMIN').length}
                </Badge>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-3">
            <div className="w-12 h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">بارگذاری...</p>
          </div>
        </div>
      )
    }

    if (activeTab === 'messages') {
      return renderMessages()
    }

    return renderSessions()
  }

  return (
    <>
      {/* Floating Button */}
      <div className="fixed bottom-6 inset-inline-start-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-16 h-16 rounded-full backdrop-blur-2xl bg-white/10 hover:bg-white/20 border-2 border-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-500 hover:scale-110 hover:shadow-[0_12px_48px_0_rgba(0,0,0,0.5)] group"
          title="مدیریت پیامها"
        >
          <MessageSquare className="h-7 w-7 text-foreground transition-transform duration-500 group-hover:scale-110" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 min-w-[28px] h-7 rounded-full backdrop-blur-xl bg-red-500/90 border-2 border-white/30 flex items-center justify-center shadow-lg animate-in zoom-in duration-300">
              <span className="text-white text-xs font-bold px-1.5">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            </div>
          )}
        </Button>
      </div>

      {/* Chat Panel */}
      {isOpen && (
        <div className="fixed bottom-24 inset-inline-start-4 sm:inset-inline-start-6 w-[calc(100%-2rem)] sm:w-[420px] max-w-md h-[500px] sm:h-[600px] z-50 rounded-3xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 backdrop-blur-2xl bg-white/80 dark:bg-gray-900/80 animate-in fade-in slide-in-from-bottom-8 duration-500">
          
          {/* Header */}
          <div className="relative p-5 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20 shadow-lg">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">مدیریت پیامها</h3>
                  <p className="text-xs text-muted-foreground">
                    {unreadCount > 0 ? `${unreadCount} پیام خوانده نشده` : 'همه پیامها خوانده شده'}
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/20 rounded-full w-9 h-9 p-0 transition-all duration-300 hover:rotate-90"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex p-2 gap-2 backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border-b border-white/20">
            <Button
              variant={activeTab === 'messages' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('messages')}
              className={`flex-1 rounded-full transition-all duration-300 ${
                activeTab === 'messages' 
                  ? 'backdrop-blur-xl bg-primary/90 shadow-lg' 
                  : 'hover:bg-white/20'
              }`}
            >
              <MessageSquare className="h-4 w-4 ml-2" />
              پیامها
              {unreadCount > 0 && activeTab !== 'messages' && (
                <Badge className="mr-2 backdrop-blur-xl bg-red-500/90 border border-white/20">
                  {unreadCount}
                </Badge>
              )}
            </Button>
            <Button
              variant={activeTab === 'sessions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 rounded-full transition-all duration-300 ${
                activeTab === 'sessions' 
                  ? 'backdrop-blur-xl bg-primary/90 shadow-lg' 
                  : 'hover:bg-white/20'
              }`}
            >
              <Users className="h-4 w-4 ml-2" />
              جلسات
              <Badge className="mr-2 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border border-white/20">
                {activeSessions.length}
              </Badge>
            </Button>
          </div>

          {/* Search */}
          <div className="p-3 backdrop-blur-xl bg-white/20 dark:bg-gray-800/20 border-b border-white/20">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجو..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pr-10 rounded-full border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 focus:bg-white/60 dark:focus:bg-gray-800/60 transition-all duration-300"
              />
            </div>
          </div>

          {/* Content */}
          <ScrollArea className="h-[calc(600px-240px)]">
            {renderMainContent()}
          </ScrollArea>

          {/* Quick Reply */}
          {selectedSession && activeTab === 'messages' && (
            <div className="p-3 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-t border-white/20">
              <div className="flex gap-2">
                <Input
                  value={quickReply}
                  onChange={(e) => setQuickReply(e.target.value)}
                  placeholder="پاسخ سریع..."
                  onKeyDown={(e) => e.key === 'Enter' && sendQuickReply()}
                  className="flex-1 rounded-full border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 focus:bg-white/60 dark:focus:bg-gray-800/60"
                />
                <Button 
                  size="sm" 
                  onClick={sendQuickReply} 
                  disabled={!quickReply.trim()}
                  className="rounded-full w-10 h-10 p-0 backdrop-blur-xl bg-primary/90 hover:bg-primary shadow-lg"
                >
                  <Send className="h-5 w-5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
