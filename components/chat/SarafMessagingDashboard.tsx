'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircle, Send, User, Building, Crown, Phone, Mail, Search, MoreVertical, Star, Clock, Check, CheckCheck, Smile } from 'lucide-react'
import { toast } from 'sonner'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface ChatMessage {
  id: string
  senderId: string
  senderName: string
  senderRole: string
  message: string
  fileUrl?: string
  fileName?: string
  timestamp: string
  isRead: boolean
}

interface ChatSession {
  id: string
  userId?: string
  userName?: string
  userRole?: string
  sarafId?: string
  sarafName?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isActive: boolean
}

interface SarafMessagingDashboardProps {
  initialSessionId?: string | null
}

export function SarafMessagingDashboard({
  initialSessionId = null,
}: SarafMessagingDashboardProps) {
  const { data: session } = useSession()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const isSaraf = session?.user?.role === 'SARAF'

  useEffect(() => {
    if (session?.user) {
      void fetchChatSessions()
    }
  }, [session])

  useEffect(() => {
    if (activeSession) {
      void fetchMessages(activeSession.id)
    }
  }, [activeSession])

  useEffect(() => {
    if (!chatSessions.length) return

    if (initialSessionId) {
      const requestedSession = chatSessions.find((item) => item.id === initialSessionId)
      if (requestedSession && activeSession?.id !== requestedSession.id) {
        setActiveSession(requestedSession)
        return
      }
    }

    if (!activeSession) {
      setActiveSession(chatSessions[0] || null)
    }
  }, [activeSession, chatSessions, initialSessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchChatSessions = async () => {
    try {
      const response = await fetch('/api/saraf-chat/sessions')
      if (!response.ok) throw new Error('Failed to fetch chat sessions')
      const data = await response.json()
      setChatSessions(data)
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error)
      setChatSessions([])
    }
  }

  const fetchMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/saraf-chat/messages/${sessionId}`)
      if (!response.ok) {
        setMessages([])
        return
      }
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([])
    }
  }

  useAdaptivePolling(fetchChatSessions, {
    enabled: !!session?.user,
    activeIntervalMs: POLLING_INTERVALS.chatSessionsActiveMs,
    idleIntervalMs: POLLING_INTERVALS.chatSessionsIdleMs,
    hiddenIntervalMs: false,
    runImmediately: false,
  })

  useAdaptivePolling(
    async () => {
      if (activeSession) {
        await fetchMessages(activeSession.id)
      }
    },
    {
      enabled: !!activeSession,
      activeIntervalMs: POLLING_INTERVALS.chatMessagesActiveMs,
      idleIntervalMs: POLLING_INTERVALS.chatMessagesIdleMs,
      hiddenIntervalMs: false,
      runImmediately: false,
    }
  )

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !activeSession || loading) return

    setLoading(true)
    try {
      const response = await fetch('/api/saraf-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: newMessage.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const result = await response.json()
      setMessages(prev => [...prev, result.message])
      setNewMessage('')
      fetchChatSessions()
      toast.success('پیام ارسال شد')
    } catch (error) {
      toast.error('خطا در ارسال پیام')
    } finally {
      setLoading(false)
    }
  }

  const totalUnread = chatSessions.reduce((sum, session) => sum + session.unreadCount, 0)
  const filteredSessions = chatSessions.filter(s => 
    (isSaraf ? s.userName : s.sarafName)?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!session?.user) return null

  return (
    <Card className="h-[700px] flex flex-col overflow-hidden border-0 shadow-2xl bg-gradient-to-br from-background via-background to-muted/20">
      <CardHeader className="border-b bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 backdrop-blur-sm">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
              <div className="relative bg-primary/10 p-3 rounded-xl">
                <MessageCircle className="h-6 w-6 text-primary" />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {isSaraf ? 'پیامهای مشتریان' : 'گفتگو با صرافان'}
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                آنلاین و آماده پاسخگویی
              </p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white border-0 shadow-lg shadow-red-500/50 animate-pulse">
              {totalUnread} پیام جدید
            </Badge>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 flex overflow-hidden p-0">
        {/* Sessions List */}
        <div className="w-[380px] border-l flex flex-col bg-muted/30 backdrop-blur-sm">
          {/* Search */}
          <div className="p-4 border-b bg-background/50">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="جستجوی گفتگو..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 bg-background/80 border-primary/20 focus:border-primary/50 transition-all"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-3 space-y-2">
              {filteredSessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => setActiveSession(session)}
                  className={`
                    group relative p-4 rounded-xl cursor-pointer transition-all duration-300
                    ${activeSession?.id === session.id 
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 shadow-lg shadow-primary/20 scale-[1.02]' 
                      : 'bg-background/60 hover:bg-background hover:shadow-md'
                    }
                  `}
                >
                  {/* Online Indicator */}
                  <div className="absolute top-2 left-2">
                    <div className="relative">
                      <div className="absolute inset-0 bg-green-500 blur-sm rounded-full animate-pulse" />
                      <div className="relative w-2 h-2 bg-green-500 rounded-full" />
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="relative">
                      <Avatar className="h-12 w-12 border-2 border-primary/20 shadow-lg">
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                          {isSaraf ? (
                            <User className="h-6 w-6 text-primary" />
                          ) : (
                            <Building className="h-6 w-6 text-primary" />
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-sm truncate flex items-center gap-2">
                          {isSaraf ? (session.userName || 'کاربر ناشناس') : (session.sarafName || 'صرافی')}
                          <div className="flex items-center gap-1 text-xs text-yellow-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span>4.8</span>
                          </div>
                        </h4>
                        {session.unreadCount > 0 && (
                          <Badge className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-xs h-5 min-w-[20px] border-0 shadow-lg shadow-red-500/30">
                            {session.unreadCount}
                          </Badge>
                        )}
                      </div>
                      
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {session.lastMessage}
                      </p>
                      
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        <span>{new Date(session.lastMessageTime).toLocaleString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>

                  {/* Hover Effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-primary/0 via-primary/5 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              ))}
              
              {filteredSessions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">هیچ گفتگویی موجود نیست</p>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Stats Footer */}
          <div className="p-4 border-t bg-background/50 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                {chatSessions.length} آنلاین
              </span>
              <span>{chatSessions.length} گفتگو</span>
            </div>
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b bg-gradient-to-r from-background via-muted/20 to-background backdrop-blur-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12 border-2 border-primary/30 shadow-lg">
                      <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10">
                        {isSaraf ? (
                          <User className="h-6 w-6 text-primary" />
                        ) : (
                          <Building className="h-6 w-6 text-primary" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h4 className="font-bold text-lg flex items-center gap-2">
                        {isSaraf ? activeSession.userName : activeSession.sarafName}
                        <Badge variant="outline" className="text-xs border-green-500/50 text-green-600">
                          <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />
                          آنلاین
                        </Badge>
                      </h4>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span>4.8 از 5</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="rounded-full hover:bg-primary/10">
                      <Phone className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full hover:bg-primary/10">
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" className="rounded-full hover:bg-primary/10">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-6 bg-gradient-to-b from-muted/10 to-background">
                <div className="space-y-4">
                  {messages.map((message) => {
                    const isOwn = (isSaraf && message.senderRole === 'SARAF') || (!isSaraf && message.senderRole !== 'SARAF')
                    return (
                      <div key={message.id} className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[70%] group">
                          <div className={`
                            ${isOwn 
                              ? 'bg-gradient-to-br from-primary to-primary/80 text-white dark:text-white rounded-2xl rounded-tl-sm shadow-lg shadow-primary/20' 
                              : 'bg-muted/80 text-slate-900 dark:text-slate-100 backdrop-blur-sm rounded-2xl rounded-tr-sm shadow-lg'
                            } p-4
                          `}>
                            {!isOwn && (
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs font-medium opacity-70">{message.senderName}</span>
                                {message.senderRole === 'SARAF' && <Crown className="h-3 w-3 text-yellow-500" />}
                              </div>
                            )}
                            {message.message && <p className="text-sm">{message.message}</p>}
                            {message.fileUrl && (
                              <div className="mt-2 p-2 bg-white/10 rounded border">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs">{message.fileName || 'فایل'}</span>
                                  <Button size="sm" variant="ghost" className="h-6 px-2" onClick={() => window.open(message.fileUrl, '_blank')}>
                                    دانلود
                                  </Button>
                                </div>
                              </div>
                            )}
                            <div className={`flex items-center gap-2 mt-2 text-xs ${isOwn ? 'opacity-90' : 'text-muted-foreground'}`}>
                              <span>{new Date(message.timestamp).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}</span>
                              {isOwn && <CheckCheck className="h-3 w-3 text-blue-300" />}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <form onSubmit={sendMessage} className="p-4 border-t bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="پیام خود را بنویسید..."
                      disabled={loading}
                      className="pr-4 pl-12 h-12 rounded-full border-primary/20 focus:border-primary/50 bg-muted/50 transition-all"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full h-8 w-8 p-0"
                    >
                      <Smile className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button 
                    type="submit"
                    size="lg" 
                    disabled={loading || !newMessage.trim()}
                    className="rounded-full h-12 w-12 p-0 bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all"
                  >
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center bg-gradient-to-b from-muted/10 to-background">
              <div className="text-center max-w-md px-6">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-primary/10 blur-3xl rounded-full" />
                  <div className="relative bg-gradient-to-br from-primary/20 to-primary/5 p-8 rounded-3xl">
                    <MessageCircle className="h-20 w-20 mx-auto text-primary/60" />
                  </div>
                </div>
                
                <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
                  گفتگویی را انتخاب کنید
                </h3>
                
                <p className="text-muted-foreground mb-6">
                  {isSaraf 
                    ? 'برای شروع گفتگو با مشتری، یکی از گفتگوها را از لیست سمت راست انتخاب کنید'
                    : 'برای شروع گفتگو با صرافی، یکی از گفتگوها را از لیست سمت راست انتخاب کنید'
                  }
                </p>

                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>آنلاین</span>
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground/30 rounded-full" />
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>پاسخگویی سریع</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
