'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Phone, MapPin, X, MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface Message {
  id: string
  senderId: string
  senderName: string
  senderRole: string
  message: string
  timestamp: string
  isRead: boolean
  createdAt: string
}

interface SarafInfo {
  id: string
  name: string
  address: string
  phone: string
}

interface RealSarafChatProps {
  sarafId: string
  onClose: () => void
}

export function RealSarafChat({ sarafId, onClose }: RealSarafChatProps) {
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sarafInfo, setSarafInfo] = useState<SarafInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (session?.user?.id) {
      initializeChat()
    } else {
      setLoading(false)
    }
  }, [sarafId, session])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useAdaptivePolling(() => (sessionId ? fetchMessages() : undefined), {
    enabled: Boolean(sessionId),
    activeIntervalMs: POLLING_INTERVALS.chatMessagesActiveMs,
    idleIntervalMs: POLLING_INTERVALS.chatMessagesIdleMs,
    hiddenIntervalMs: false,
    runImmediately: true,
  })

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    if (!session?.user?.id) {
      toast.error('برای شروع گفتگو باید وارد شوید')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/saraf-chat/initialize', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ sarafId })
      })

      if (response.ok) {
        const data = await response.json()
        setSessionId(data.sessionId)
        setSarafInfo(data.sarafInfo)
        setMessages(data.messages || [])
      } else {
        const errorData = await response.json()
        if (response.status === 401) {
          toast.error('برای شروع گفتگو باید وارد شوید')
        } else {
          toast.error(errorData.error || 'خطا در برقراری ارتباط')
        }
      }
    } catch (error) {
      console.error('Chat initialization error:', error)
      toast.error('خطا در اتصال')
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessages() {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/saraf-chat/messages/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !sessionId || sending) return

    setSending(true)
    try {
      const response = await fetch('/api/saraf-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: newMessage.trim(),
          sarafId
        })
      })

      if (response.ok) {
        const data = await response.json()
        setMessages(prev => [...prev, data.message])
        setNewMessage('')
        toast.success('پیام ارسال شد')
      } else {
        toast.error('خطا در ارسال پیام')
      }
    } catch (error) {
      toast.error('خطا در ارسال')
    } finally {
      setSending(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const isMyMessage = (message: Message) => {
    return message.senderId === session?.user?.id
  }

  if (loading) {
    return (
      <Card className="w-full max-w-md h-96">
        <CardContent className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p>در حال برقراری ارتباط...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md h-96 flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>
                {sarafInfo?.name?.charAt(0) || 'ص'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{sarafInfo?.name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3 w-3" />
                <span className="truncate">{sarafInfo?.address}</span>
              </div>
              {sarafInfo?.phone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  <span>{sarafInfo.phone}</span>
                </div>
              )}
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-64">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>گفتگو را شروع کنید</p>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${isMyMessage(message) ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 ${
                    isMyMessage(message)
                      ? 'bg-primary text-white dark:text-white'
                      : 'bg-muted text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm">{message.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs opacity-70">
                      {message.senderName}
                    </span>
                    <span className="text-xs opacity-70">
                      {formatTime(message.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="پیام خود را بنویسید..."
              disabled={sending}
              className="flex-1"
            />
            <Button 
              onClick={sendMessage} 
              disabled={!newMessage.trim() || sending}
              size="sm"
            >
              {sending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
