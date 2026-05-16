'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Building, MessageSquare, Phone, Send, User, X } from 'lucide-react'
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

type StoredGuestSarafChat = {
  accessToken: string
  visitorName: string
  visitorEmail: string
  visitorPhone: string
}

type GuestSarafChatWidgetProps = {
  sarafId: string
  sarafInfo: {
    businessName: string
    businessPhone?: string
    businessAddress?: string
  }
  onClose?: () => void
}

function storageKeyForSaraf(sarafId: string) {
  return `guest-saraf-chat:${sarafId}`
}

function loadStoredChat(sarafId: string): StoredGuestSarafChat | null {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(storageKeyForSaraf(sarafId))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredGuestSarafChat>
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

function saveStoredChat(sarafId: string, value: StoredGuestSarafChat) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(storageKeyForSaraf(sarafId), JSON.stringify(value))
}

export function GuestSarafChatWidget({ sarafId, sarafInfo, onClose }: GuestSarafChatWidgetProps) {
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
  const storedChat = useMemo(() => loadStoredChat(sarafId), [sarafId])

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
    if (!accessToken || sessionId) return
    void initializeSession(accessToken)
  }, [accessToken, sessionId])

  useEffect(() => {
    if (!sessionId || !accessToken) return

    void fetchMessages(sessionId, accessToken)
  }, [accessToken, sessionId])

  useAdaptivePolling(
    async () => {
      if (sessionId && accessToken) {
        await fetchMessages(sessionId, accessToken)
      }
    },
    {
      enabled: !!sessionId && !!accessToken,
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
          type: 'VISITOR_TO_SARAF',
          sarafId,
          visitorName,
          visitorEmail,
          visitorPhone,
          accessToken: token || undefined,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to start chat with saraf')
      }

      setSessionId(data.sessionId)
      setAccessToken(data.accessToken)
      setMessages(data.messages || [])

      saveStoredChat(sarafId, {
        accessToken: data.accessToken,
        visitorName,
        visitorEmail,
        visitorPhone,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start chat with saraf'
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

      if (!response.ok) return

      const data = await response.json()
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Guest saraf chat messages fetch error:', error)
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="flex h-[80vh] w-full max-w-2xl flex-col shadow-2xl">
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5 text-primary" />
                {sarafInfo.businessName}
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Visitor chat with this saraf
              </p>
              {sarafInfo.businessPhone ? (
                <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{sarafInfo.businessPhone}</span>
                </div>
              ) : null}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        {!sessionId ? (
          <CardContent className="space-y-4 pt-6">
            <p className="text-sm text-muted-foreground">
              Start a direct conversation with this saraf. Add your name and at least one contact method.
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
              {isInitializing ? 'Starting...' : 'Start chat'}
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
    </div>
  )
}
