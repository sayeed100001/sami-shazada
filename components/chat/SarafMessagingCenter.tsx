'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  MessageCircle, 
  Send, 
  User, 
  Building, 
  Crown, 
  Phone, 
  Mail, 
  Clock,
  Search,
  Filter,
  MoreVertical,
  Archive,
  Star,
  Paperclip,
  Image,
  FileText,
  Download,
  Check,
  CheckCheck
} from 'lucide-react'
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
  userEmail?: string
  sarafId?: string
  sarafName?: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isActive: boolean
  priority?: 'high' | 'normal' | 'low'
  tags?: string[]
}

export function SarafMessagingCenter() {
  const { data: session } = useSession()
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'active'>('all')
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
    }
  }

  const fetchMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/saraf-chat/messages/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
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

  const filteredSessions = chatSessions.filter(session => {
    const matchesSearch = isSaraf 
      ? session.userName?.toLowerCase().includes(searchTerm.toLowerCase())
      : session.sarafName?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesFilter = filterStatus === 'all' || 
      (filterStatus === 'unread' && session.unreadCount > 0) ||
      (filterStatus === 'active' && session.isActive)
    
    return matchesSearch && matchesFilter
  })

  const totalUnread = chatSessions.reduce((sum, session) => sum + session.unreadCount, 0)

  if (!session?.user) return null

  return (
    <div className="h-[700px] flex flex-col rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 backdrop-blur-2xl bg-white/70 dark:bg-gray-900/70">
      
      {/* Header */}
      <div className="relative p-6 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-b border-white/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20 shadow-lg">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {isSaraf ? 'مرکز پیامرسانی صرافی' : 'گفتگو با صرافان'}
              </h2>
              <p className="text-sm text-muted-foreground">
                {isSaraf ? 'مدیریت گفتگوها با مشتریان' : 'آنلاین و آماده پاسخگویی'}
              </p>
            </div>
          </div>
          {totalUnread > 0 && (
            <Badge className="backdrop-blur-xl bg-red-500/90 text-white text-lg px-3 py-1 border border-white/20 shadow-lg">
              {totalUnread}
            </Badge>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div className="w-[380px] border-l border-white/20 flex flex-col backdrop-blur-xl bg-white/30 dark:bg-gray-800/30">
          
          {/* Search and Filters */}
          <div className="p-4 border-b border-white/20 backdrop-blur-xl bg-white/20 dark:bg-gray-800/20">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="جستجوی گفتگو..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pr-10 rounded-full border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 focus:bg-white/60 dark:focus:bg-gray-800/60"
                />
              </div>
              
              <Tabs value={filterStatus} onValueChange={(v) => setFilterStatus(v as any)} className="w-full">
                <TabsList className="grid w-full grid-cols-3 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border border-white/20">
                  <TabsTrigger value="all" className="text-xs rounded-full">همه</TabsTrigger>
                  <TabsTrigger value="unread" className="text-xs rounded-full">خوانده نشده</TabsTrigger>
                  <TabsTrigger value="active" className="text-xs rounded-full">فعال</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Sessions List */}
          <ScrollArea className="flex-1">
            {filteredSessions.length > 0 ? (
              <div className="p-3 space-y-2">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    onClick={() => setActiveSession(session)}
                    className={`p-4 rounded-xl cursor-pointer transition-all duration-300 backdrop-blur-xl border border-white/20 shadow-lg ${
                      activeSession?.id === session.id 
                        ? 'bg-white/60 dark:bg-gray-800/60 shadow-xl scale-[1.02]' 
                        : 'bg-white/40 dark:bg-gray-800/40 hover:bg-white/50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                          <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground">
                            {isSaraf ? <User className="h-6 w-6" /> : <Building className="h-6 w-6" />}
                          </AvatarFallback>
                        </Avatar>
                        {session.isActive && (
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-semibold text-sm truncate flex items-center gap-2">
                            {isSaraf ? session.userName : session.sarafName}
                            {session.priority === 'high' && (
                              <Star className="h-3 w-3 text-yellow-500 fill-current" />
                            )}
                          </h4>
                          {session.unreadCount > 0 && (
                            <Badge className="backdrop-blur-xl bg-red-500/90 text-white text-xs h-5 min-w-[20px] border border-white/20">
                              {session.unreadCount}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-xs text-muted-foreground truncate mb-2">
                          {session.lastMessage}
                        </p>
                        
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>
                            {new Date(session.lastMessageTime).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full p-8">
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20">
                    <MessageCircle className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">هیچ گفتگویی یافت نشد</p>
                </div>
              </div>
            )}
          </ScrollArea>

          {/* Footer Stats */}
          <div className="p-4 border-t border-white/20 backdrop-blur-xl bg-white/20 dark:bg-gray-800/20">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                {chatSessions.filter(s => s.isActive).length} آنلاین
              </span>
              <span>{chatSessions.length} گفتگو</span>
            </div>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {activeSession ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border border-white/20 shadow-lg">
                      <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground">
                        {isSaraf ? <User className="h-5 w-5" /> : <Building className="h-5 w-5" />}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div>
                      <h3 className="font-semibold">
                        {isSaraf ? activeSession.userName : activeSession.sarafName}
                      </h3>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        {activeSession.isActive && (
                          <>
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            آنلاین
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isSaraf && activeSession.userEmail && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="rounded-full w-9 h-9 p-0 hover:bg-white/20 backdrop-blur-xl bg-white/10 border border-white/20"
                        title="ایمیل"
                      >
                        <Mail className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="rounded-full w-9 h-9 p-0 hover:bg-white/20 backdrop-blur-xl bg-white/10 border border-white/20"
                      title="بیشتر"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${
                        (isSaraf && message.senderRole === 'SARAF') || 
                        (!isSaraf && message.senderRole !== 'SARAF')
                          ? 'justify-end' 
                          : 'justify-start'
                      }`}
                    >
                      <div
                        className={`max-w-[75%] p-4 rounded-2xl shadow-lg backdrop-blur-xl border border-white/20 transition-all duration-300 ${
                          (isSaraf && message.senderRole === 'SARAF') || 
                          (!isSaraf && message.senderRole !== 'SARAF')
                            ? 'bg-primary text-white dark:text-white rounded-tr-sm'
                            : 'bg-white/60 dark:bg-gray-800/60 text-slate-900 dark:text-slate-100 rounded-tl-sm'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-2 text-xs opacity-75">
                          <span className="font-medium">{message.senderName}</span>
                          {message.senderRole === 'SARAF' && (
                            <Crown className="h-3 w-3 text-yellow-400" />
                          )}
                        </div>
                        
                        {message.message && (
                          <p className="leading-relaxed mb-2">{message.message}</p>
                        )}
                        
                        {message.fileUrl && (
                          <div className="mt-2 p-2 backdrop-blur-xl bg-black/10 rounded-xl border border-white/20">
                            {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                              <img 
                                src={message.fileUrl} 
                                alt={message.fileName || 'تصویر'}
                                className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => window.open(message.fileUrl, '_blank')}
                              />
                            ) : (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  <span className="text-xs">{message.fileName || 'فایل'}</span>
                                </div>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-6 px-2"
                                  onClick={() => window.open(message.fileUrl, '_blank')}
                                >
                                  <Download className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-2 text-xs opacity-70">
                          <span>
                            {new Date(message.timestamp).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                          {((isSaraf && message.senderRole === 'SARAF') || 
                            (!isSaraf && message.senderRole !== 'SARAF')) && (
                            message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <div className="p-4 border-t border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40">
                <form onSubmit={sendMessage} className="flex gap-3">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-full w-10 h-10 p-0 hover:bg-white/20 backdrop-blur-xl bg-white/10 border border-white/20"
                  >
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="پیام خود را بنویسید..."
                    disabled={loading}
                    className="flex-1 rounded-full border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 focus:bg-white/60 dark:focus:bg-gray-800/60"
                  />
                  
                  <Button 
                    type="submit" 
                    size="sm" 
                    disabled={loading || !newMessage.trim()}
                    className="rounded-full w-10 h-10 p-0 backdrop-blur-xl bg-primary/90 hover:bg-primary shadow-lg disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center max-w-md px-6">
                <div className="w-24 h-24 mx-auto mb-6 rounded-3xl backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20 shadow-lg">
                  <MessageCircle className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">گفتگویی را انتخاب کنید</h3>
                <p className="text-muted-foreground mb-6">
                  {isSaraf 
                    ? 'برای شروع گفتگو با مشتری، یکی از گفتگوها را از لیست سمت راست انتخاب کنید'
                    : 'برای شروع گفتگو با صرافی، یکی از گفتگوها را از لیست سمت راست انتخاب کنید'
                  }
                </p>
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>آنلاین</span>
                  </div>
                  <div className="w-1 h-1 bg-muted-foreground/30 rounded-full"></div>
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>پاسخگویی سریع</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
