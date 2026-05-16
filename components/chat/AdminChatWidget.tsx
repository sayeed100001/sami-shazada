'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageCircle, Send, X, User, Crown, Download, Image, FileText, Paperclip } from 'lucide-react'
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
  userId: string
  userName: string
  userRole: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isActive: boolean
}

export function AdminChatWidget() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([])
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session?.user?.role === 'ADMIN' && isOpen) {
      void fetchChatSessions()
    }
  }, [session, isOpen])

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
      const response = await fetch('/api/admin/chat/sessions?limit=20')
      if (!response.ok) throw new Error('Failed to fetch chat sessions')
      const data = await response.json()
      
      const formattedSessions = (data.sessions || []).map((session: any) => ({
        id: session.id,
        userId: session.user.id,
        userName: session.user.name,
        userRole: session.user.role,
        lastMessage: session.messages[0]?.message || 'بدون پیام',
        lastMessageTime: session.messages[0]?.timestamp || session.createdAt,
        unreadCount: session.unreadCount ?? session.messages.filter((m: any) => !m.isRead && m.senderRole !== 'ADMIN').length,
        isActive: session.isActive
      }))
      
      setChatSessions(formattedSessions)
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error)
      setChatSessions([])
    }
  }

  const fetchMessages = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/chat/messages/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      setMessages(data || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setMessages([])
    }
  }

  useAdaptivePolling(fetchChatSessions, {
    enabled: session?.user?.role === 'ADMIN' && isOpen,
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
      enabled: session?.user?.role === 'ADMIN' && isOpen && !!activeSession,
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
      const response = await fetch('/api/admin/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: activeSession.id,
          message: newMessage.trim()
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      setNewMessage('')
      fetchMessages(activeSession.id)
      fetchChatSessions()
    } catch (error) {
      toast.error('خطا در ارسال پیام')
    } finally {
      setLoading(false)
    }
  }

  const totalUnread = chatSessions.reduce((sum, session) => sum + session.unreadCount, 0)

  if (session?.user?.role !== 'ADMIN') return null

  return (
    <>
      <div className="fixed bottom-6 left-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="rounded-full w-14 h-14 shadow-lg relative"
          size="lg"
        >
          <MessageCircle className="h-6 w-6" />
          {totalUnread > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[20px] h-5 text-xs">
              {totalUnread > 99 ? '99+' : totalUnread}
            </Badge>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 left-6 w-[380px] h-[480px] bg-background border rounded-lg shadow-xl z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-yellow-500" />
              <h3 className="font-semibold">چت مدیریت</h3>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-1 overflow-hidden">
            <div className="w-32 border-r overflow-y-auto">
              <div className="p-2">
                <h4 className="text-xs font-medium mb-2 px-1">گفتگوها ({chatSessions.length})</h4>
                <div className="space-y-1">
                  {chatSessions.map((session) => (
                    <div
                      key={session.id}
                      onClick={() => setActiveSession(session)}
                      className={`p-1.5 rounded cursor-pointer hover:bg-muted transition-colors ${
                        activeSession?.id === session.id ? 'bg-muted' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-medium truncate flex-1">
                          {session.userName.split(' ')[0]}
                        </span>
                        {session.unreadCount > 0 && (
                          <Badge className="bg-red-500 text-white text-[10px] h-3.5 min-w-[14px] px-1">
                            {session.unreadCount}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {session.lastMessage.substring(0, 15)}...
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex-1 flex flex-col">
              {activeSession ? (
                <>
                  <div className="p-3 border-b">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span className="font-medium">{activeSession.userName}</span>
                      <Badge variant="outline" className="text-xs">
                        {activeSession.userRole === 'SARAF' ? 'صراف' : 'کاربر'}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${
                          message.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <div
                          className={`max-w-[80%] p-3 rounded-lg text-sm ${
                            message.senderRole === 'ADMIN'
                              ? 'bg-primary text-white dark:text-white'
                              : 'bg-muted text-slate-900 dark:text-slate-100'
                          }`}
                        >
                          {message.senderRole !== 'ADMIN' && (
                            <p className="text-xs font-medium mb-1 opacity-70">
                              {message.senderName}
                            </p>
                          )}
                          {message.message && <p className="mb-2">{message.message}</p>}
                          {message.fileUrl && (
                            <div className="mt-2 p-2 bg-white/10 rounded border">
                              {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                                <div className="space-y-2">
                                  <img 
                                    src={message.fileUrl} 
                                    alt={message.fileName || 'تصویر'}
                                    className="max-w-full h-auto rounded cursor-pointer"
                                    onClick={() => window.open(message.fileUrl, '_blank')}
                                  />
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs opacity-70">{message.fileName}</span>
                                    <Button 
                                      size="sm" 
                                      variant="ghost" 
                                      className="h-6 px-2"
                                      onClick={() => {
                                        const a = document.createElement('a')
                                        a.href = message.fileUrl!
                                        a.download = message.fileName || 'image'
                                        a.click()
                                      }}
                                    >
                                      <Download className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
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
                          <p className="text-xs opacity-70 mt-1">
                            {new Date(message.timestamp).toLocaleTimeString('fa-IR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <form onSubmit={sendMessage} className="p-3 border-t">
                    <div className="flex gap-2">
                      <Input
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="پیام خود را بنویسید..."
                        disabled={loading}
                        className="text-sm"
                      />
                      <Button type="submit" size="sm" disabled={loading || !newMessage.trim()}>
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">گفتگویی را انتخاب کنید</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
