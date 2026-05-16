'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { MessageSquare, Send, X, Headphones, Paperclip, Image as ImageIcon, Check, CheckCheck } from 'lucide-react'
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

export function UserChatWidget() {
  const { data: session } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (session?.user && isOpen) {
      void initializeChat()
    }
  }, [session, isOpen])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const initializeChat = async () => {
    setLoadingMessages(true)
    try {
      const response = await fetch('/api/chat/initialize', {
        method: 'POST'
      })
      if (!response.ok) throw new Error('Failed to initialize chat')
      const data = await response.json()
      setSessionId(data.sessionId)
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Chat initialization error:', error)
      toast.error('خطا در اتصال به سیستم پشتیبانی')
    } finally {
      setLoadingMessages(false)
    }
  }

  const fetchMessages = async () => {
    if (!sessionId || loadingMessages) return
    
    try {
      const response = await fetch(`/api/chat/messages?sessionId=${sessionId}`)
      if (!response.ok) return
      const data = await response.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  useAdaptivePolling(fetchMessages, {
    enabled: !!session?.user && isOpen && !!sessionId && !loadingMessages,
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

      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          message: newMessage.trim(),
          fileUrl
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

  if (!session?.user) return null

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 group">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className="relative w-16 h-16 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/20 shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] transition-all duration-300 hover:scale-110"
          title="چت با مدیریت"
        >
          {isOpen ? (
            <X className="h-6 w-6 text-foreground" />
          ) : (
            <>
              <Headphones className="h-6 w-6 text-foreground" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-background animate-pulse"></div>
            </>
          )}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-96 h-[600px] z-50 flex flex-col rounded-2xl overflow-hidden shadow-[0_8px_32px_0_rgba(0,0,0,0.37)] border border-white/20 backdrop-blur-2xl bg-white/70 dark:bg-gray-900/70">
          
          <div className="relative p-5 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-b border-white/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Avatar className="h-12 w-12 border-2 border-white/30 shadow-lg">
                    <AvatarImage src="/admin-avatar.png" />
                    <AvatarFallback className="bg-white/20 backdrop-blur-sm text-foreground font-bold">پ</AvatarFallback>
                  </Avatar>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
                </div>
                <div>
                  <h3 className="font-bold text-lg">پشتیبانی آنلاین</h3>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    آنلاین
                  </p>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setIsOpen(false)} 
                className="hover:bg-white/20 rounded-full w-9 h-9 p-0 transition-all duration-300"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            {loadingMessages ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 mx-auto border-4 border-primary/30 border-t-primary rounded-full animate-spin"></div>
                  <p className="text-sm text-muted-foreground">بارگذاری پیامها...</p>
                </div>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center space-y-4 p-6 rounded-2xl backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border border-white/20 shadow-lg">
                  <div className="w-16 h-16 mx-auto rounded-full backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 flex items-center justify-center border border-white/20">
                    <MessageSquare className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold mb-2">سلام! چطور میتونم کمکتون کنم؟</p>
                    <p className="text-sm text-muted-foreground">پیام خود را ارسال کنید</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.senderRole === 'ADMIN' ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[85%] ${message.senderRole === 'ADMIN' ? 'flex gap-2' : ''}`}>
                      {message.senderRole === 'ADMIN' && (
                        <Avatar className="h-8 w-8 border border-white/20 shadow-lg mt-1">
                          <AvatarFallback className="backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 text-foreground text-xs">
                            {message.senderName[0]}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div
                        className={`p-4 rounded-2xl shadow-lg backdrop-blur-xl border border-white/20 transition-all duration-300 ${
                          message.senderRole === 'ADMIN'
                            ? 'bg-white/60 dark:bg-gray-800/60 text-slate-900 dark:text-slate-100 rounded-tl-sm'
                            : 'bg-primary text-white dark:text-white rounded-tr-sm'
                        }`}
                      >
                        {message.senderRole === 'ADMIN' && (
                          <p className="text-xs font-bold mb-2 opacity-70">
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
                          {message.senderRole !== 'ADMIN' && (
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

          <form onSubmit={sendMessage} className="p-4 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 border-t border-white/20">
            {selectedFile && (
              <div className="mb-3 p-3 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 rounded-xl flex items-center justify-between border border-white/20">
                <span className="text-sm flex items-center gap-2">
                  <Paperclip className="h-4 w-4" />
                  {selectedFile.name}
                </span>
                <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)} className="hover:bg-white/20 rounded-full">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full w-10 h-10 p-0 hover:bg-white/20 backdrop-blur-xl bg-white/10 border border-white/20"
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
                className="flex-1 rounded-full border-white/20 backdrop-blur-xl bg-white/40 dark:bg-gray-800/40 focus:bg-white/60 dark:focus:bg-gray-800/60 transition-all duration-300"
              />
              <Button 
                type="submit" 
                size="sm" 
                disabled={loading || (!newMessage.trim() && !selectedFile)}
                className="rounded-full w-10 h-10 p-0 backdrop-blur-xl bg-primary/90 hover:bg-primary shadow-lg transition-all duration-300 disabled:opacity-50"
              >
                <Send className="h-5 w-5" />
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
