'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Send, X, Building, Paperclip, Phone, Star, Check, CheckCheck } from 'lucide-react'
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

interface SarafChatWidgetProps {
  sarafId: string
  sarafName: string
  sarafPhone?: string
  onClose?: () => void
}

export function SarafChatWidget({ sarafId, sarafName, sarafPhone, onClose }: SarafChatWidgetProps) {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(true)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session?.user && sarafId) {
      void initializeChat()
    }
  }, [session, sarafId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    setLoadingMessages(true)
    try {
      const response = await fetch('/api/saraf-chat/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sarafId })
      })
      
      if (!response.ok) throw new Error('Failed to initialize chat')
      
      const data = await response.json()
      setSessionId(data.sessionId)
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to initialize saraf chat:', error)
      toast.error('خطا در اتصال به صراف')
    } finally {
      setLoadingMessages(false)
    }
  }

  const fetchMessages = async () => {
    if (!sessionId || loadingMessages) return
    
    try {
      const response = await fetch(`/api/saraf-chat/messages?sessionId=${sessionId}`)
      if (!response.ok) return
      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  useAdaptivePolling(fetchMessages, {
    enabled: !!session?.user && !!sarafId && !!sessionId && !loadingMessages,
    activeIntervalMs: POLLING_INTERVALS.chatMessagesActiveMs,
    idleIntervalMs: POLLING_INTERVALS.chatMessagesIdleMs,
    hiddenIntervalMs: false,
    runImmediately: false,
  })

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !sessionId || loading) return

    setLoading(true)
    let fileUrl = null

    try {
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        
        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            fileUrl = uploadData.url
          }
        } catch (uploadError) {
          console.warn('File upload failed:', uploadError)
        }
      }

      const response = await fetch('/api/saraf-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: newMessage.trim(),
          fileUrl,
          sarafId: sarafId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send message')
      }

      const result = await response.json()
      setMessages(prev => [...prev, result.message])
      setNewMessage('')
      setSelectedFile(null)
      toast.success('پیام ارسال شد')
      
    } catch (error) {
      toast.error('خطا در ارسال پیام')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  if (!session?.user || !isOpen) return null

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl h-[700px] flex flex-col rounded-3xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 backdrop-blur-2xl bg-white/70 dark:bg-gray-900/70">
        
        <div className="relative p-6 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-b border-white/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-2 border-white/30 shadow-xl">
                  <AvatarImage src="/saraf-avatar.png" />
                  <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground font-bold text-xl">
                    <Building className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-background"></div>
              </div>
              <div>
                <h3 className="font-bold text-xl mb-1">{sarafName}</h3>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
                    <span className="font-medium">4.8</span>
                  </div>
                  {sarafPhone && (
                    <div className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      <span>{sarafPhone}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  آنلاین
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {sarafPhone && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => window.open(`tel:${sarafPhone}`)}
                  className="hover:bg-white/20 rounded-full w-11 h-11 p-0 backdrop-blur-xl bg-white/10 border border-white/20"
                  title="تماس تلفنی"
                >
                  <Phone className="h-5 w-5" />
                </Button>
              )}
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleClose}
                className="hover:bg-white/20 rounded-full w-11 h-11 p-0 backdrop-blur-xl bg-white/10 border border-white/20"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-5">
          {loadingMessages ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                <p className="text-sm text-muted-foreground">در حال اتصال به صراف...</p>
              </div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 p-8 rounded-3xl backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border border-white/20 shadow-lg max-w-md">
                <div className="w-20 h-20 mx-auto rounded-full backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20 shadow-lg">
                  <Building className="h-10 w-10 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold mb-2">سلام! به {sarafName} خوش آمدید</p>
                  <p className="text-sm text-muted-foreground">
                    برای دریافت نرخ ارز و خدمات حواله، پیام خود را ارسال کنید
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.senderRole === 'SARAF' ? 'justify-start' : 'justify-end'}`}
                >
                  <div className={`max-w-[85%] ${message.senderRole === 'SARAF' ? 'flex gap-3' : ''}`}>
                    {message.senderRole === 'SARAF' && (
                      <Avatar className="h-9 w-9 border border-white/20 shadow-lg mt-1">
                        <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground text-xs font-bold">
                          {message.senderName[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`p-4 rounded-2xl shadow-lg backdrop-blur-xl border border-white/20 transition-all duration-300 ${
                        message.senderRole === 'SARAF'
                          ? 'bg-white/60 dark:bg-gray-800/60 text-slate-900 dark:text-slate-100 rounded-tl-sm'
                          : 'bg-primary text-white dark:text-white rounded-tr-sm'
                      }`}
                    >
                      {message.senderRole === 'SARAF' && (
                        <p className="text-xs font-bold mb-2 opacity-70 flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {message.senderName}
                        </p>
                      )}
                      {message.message && <p className="leading-relaxed">{message.message}</p>}
                      {message.fileUrl && (
                        <div className="mt-3 p-2 backdrop-blur-xl bg-black/10 rounded-xl border border-white/20">
                          {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <img 
                              src={message.fileUrl} 
                              alt={message.fileName || 'تصویر'}
                              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(message.fileUrl, '_blank')}
                            />
                          ) : (
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4" />
                                <span className="text-xs">{message.fileName || 'فایل'}</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => window.open(message.fileUrl, '_blank')}
                                className="text-xs h-7"
                              >
                                دانلود
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
                        {message.senderRole !== 'SARAF' && (
                          message.isRead ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        <form onSubmit={sendMessage} className="p-5 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-t border-white/20">
          {selectedFile && (
            <div className="mb-3 p-3 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-xl flex items-center justify-between border border-white/20 shadow-lg">
              <span className="text-sm flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                {selectedFile.name}
              </span>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedFile(null)} 
                className="hover:bg-white/20 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full w-12 h-12 p-0 hover:bg-white/20 backdrop-blur-xl bg-white/10 border border-white/20"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="hidden"
            />
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              disabled={loading}
              className="flex-1 rounded-full border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 focus:bg-white/60 dark:focus:bg-gray-800/60 transition-all duration-300 text-base px-6 h-12"
            />
            <Button 
              type="submit" 
              size="sm" 
              disabled={loading || (!newMessage.trim() && !selectedFile)}
              className="rounded-full w-12 h-12 p-0 backdrop-blur-xl bg-primary/90 hover:bg-primary shadow-lg transition-all duration-300 disabled:opacity-50"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
