'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { MessageSquare, Send, ShieldCheck, User, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

type GuestMessage = {
  id: string
  senderName: string
  senderRole: string
  message: string
  timestamp: string
  isRead: boolean
}

type StoredGuestChat = {
  accessToken: string
  visitorName: string
  visitorEmail: string
  visitorPhone: string
}

const STORAGE_KEY = 'guest-support-chat'

function loadStoredChat(): StoredGuestChat | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredGuestChat>
    if (!parsed.accessToken || !parsed.visitorName) return null
    return {
      accessToken: parsed.accessToken,
      visitorName: parsed.visitorName,
      visitorEmail: parsed.visitorEmail || '',
      visitorPhone: parsed.visitorPhone || '',
    }
  } catch {
    return null
  }
}

function saveStoredChat(value: StoredGuestChat) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}

export function PublicSupportChatWidget() {
  const { status } = useSession()
  const [isOpen, setIsOpen] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [accessToken, setAccessToken] = useState('')
  const [visitorName, setVisitorName] = useState('')
  const [visitorEmail, setVisitorEmail] = useState('')
  const [visitorPhone, setVisitorPhone] = useState('')
  const [messages, setMessages] = useState<GuestMessage[]>([])
  const [draft, setDraft] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const hasContact = visitorEmail.trim().length > 0 || visitorPhone.trim().length > 0
  const isReadyToStart = visitorName.trim().length > 1 && hasContact

  const storedChat = useMemo(() => loadStoredChat(), [])

  useEffect(() => {
    if (!storedChat) return
    setAccessToken(storedChat.accessToken)
    setVisitorName(storedChat.visitorName)
    setVisitorEmail(storedChat.visitorEmail)
    setVisitorPhone(storedChat.visitorPhone)
  }, [storedChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!isOpen || !accessToken || sessionId) return
    void initializeSession(accessToken)
  }, [accessToken, isOpen, sessionId])

  useEffect(() => {
    if (!isOpen || !sessionId || !accessToken) return

    void fetchMessages(sessionId, accessToken)
  }, [accessToken, isOpen, sessionId])

  useAdaptivePolling(
    async () => {
      if (sessionId && accessToken) {
        await fetchMessages(sessionId, accessToken)
      }
    },
    {
      enabled: isOpen && !!sessionId && !!accessToken,
      activeIntervalMs: POLLING_INTERVALS.chatMessagesActiveMs,
      idleIntervalMs: POLLING_INTERVALS.chatMessagesIdleMs,
      hiddenIntervalMs: false,
      runImmediately: false,
    }
  )

  async function initializeSession(existingAccessToken?: string) {
    const token = existingAccessToken || accessToken
    setIsInitializing(true)

    try {
      const response = await fetch('/api/guest-chat/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'VISITOR_TO_ADMIN',
          visitorName,
          visitorEmail,
          visitorPhone,
          accessToken: token || undefined,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to start support chat')
      }

      setSessionId(data.sessionId)
      setAccessToken(data.accessToken)
      setMessages(data.messages || [])

      saveStoredChat({
        accessToken: data.accessToken,
        visitorName,
        visitorEmail,
        visitorPhone,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start support chat'
      toast.error(message)
    } finally {
      setIsInitializing(false)
    }
  }

  async function fetchMessages(currentSessionId: string, token: string) {
    try {
      const response = await fetch(
        `/api/guest-chat/messages/${currentSessionId}?token=${encodeURIComponent(token)}`,
        { cache: 'no-store' }
      )

      if (!response.ok) {
        return
      }

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Guest support messages fetch error:', error)
    }
  }

  async function sendMessage(event: React.FormEvent) {
    event.preventDefault()

    if (!draft.trim() || !sessionId || !accessToken || isSending) {
      return
    }

    setIsSending(true)
    try {
      const response = await fetch('/api/guest-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          accessToken,
          message: draft.trim(),
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to send message')
      }

      setMessages((previous) => [...previous, data.message])
      setDraft('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send message'
      toast.error(message)
    } finally {
      setIsSending(false)
    }
  }

  if (status === 'authenticated') {
    return null
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen((previous) => !previous)}
          className="h-14 w-14 rounded-full shadow-lg"
          title="Visitor support chat"
        >
          {isOpen ? <X className="h-5 w-5" /> : <MessageSquare className="h-5 w-5" />}
        </Button>
      </div>

      {isOpen ? (
        <Card className="fixed bottom-24 right-6 z-50 flex h-[560px] w-[360px] max-w-[calc(100vw-2rem)] flex-col shadow-2xl">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Visitor support
            </CardTitle>
          </CardHeader>

          {!sessionId ? (
            <CardContent className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                Start a direct conversation with admin support. Add your name and at least one contact method.
              </p>
              <div className="space-y-3">
                <Input
                  placeholder="Your name"
                  value={visitorName}
                  onChange={(event) => setVisitorName(event.target.value)}
                />
                <Input
                  placeholder="Email"
                  type="email"
                  value={visitorEmail}
                  onChange={(event) => setVisitorEmail(event.target.value)}
                />
                <Input
                  placeholder="Phone"
                  value={visitorPhone}
                  onChange={(event) => setVisitorPhone(event.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!isReadyToStart || isInitializing}
                onClick={() => void initializeSession()}
              >
                {isInitializing ? 'Starting...' : 'Start support chat'}
              </Button>
            </CardContent>
          ) : (
            <>
              <CardContent className="flex-1 space-y-4 overflow-y-auto pt-4">
                {messages.map((message) => {
                  const isVisitor = message.senderRole === 'VISITOR'
                  return (
                    <div
                      key={message.id}
                      className={`flex ${isVisitor ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm ${
                          isVisitor ? 'bg-primary text-white dark:text-white' : 'bg-muted text-slate-900 dark:text-slate-100'
                        }`}
                      >
                        {!isVisitor ? (
                          <div className="mb-1 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span>{message.senderName}</span>
                          </div>
                        ) : null}
                        <p className="whitespace-pre-wrap break-words">{message.message}</p>
                        <p className="mt-2 text-[11px] opacity-70">
                          {new Date(message.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                  )
                })}
                <div ref={messagesEndRef} />
              </CardContent>

              <form onSubmit={sendMessage} className="border-t p-4">
                <div className="flex gap-2">
                  <Input
                    value={draft}
                    onChange={(event) => setDraft(event.target.value)}
                    placeholder="Write your message..."
                    disabled={isSending}
                  />
                  <Button type="submit" disabled={isSending || !draft.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </form>
            </>
          )}
        </Card>
      ) : null}
    </>
  )
}
