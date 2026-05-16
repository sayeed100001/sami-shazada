'use client'

import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Building, Loader2, MessageSquare, RefreshCw, X } from 'lucide-react'

interface SarafInfo {
  id: string
  businessName: string
  businessPhone?: string
  businessAddress?: string
  rating: number
  isActive: boolean
  isPremium: boolean
}

interface EnhancedSarafChatWidgetProps {
  sarafId: string
  sarafInfo: SarafInfo
  onClose?: () => void
  isMinimized?: boolean
  onMinimize?: () => void
}

export function EnhancedSarafChatWidget({
  sarafId,
  sarafInfo,
  onClose,
}: EnhancedSarafChatWidgetProps) {
  const { data: session, status } = useSession()
  const router = useRouter()
  const startedRef = useRef(false)
  const [opening, setOpening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated' || startedRef.current) {
      return
    }

    startedRef.current = true

    const openUnifiedMessenger = async () => {
      setOpening(true)
      setError(null)

      try {
        const response = await fetch('/api/saraf-chat/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sarafId }),
        })

        const data = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(data?.error || 'Failed to open messenger')
        }

        const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : ''
        const destination = sessionId
          ? `/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(sessionId)}`
          : '/portal/internal-chat?tab=customers'

        onClose?.()
        router.push(destination)
      } catch (openError) {
        const message = openError instanceof Error ? openError.message : 'Failed to open messenger'
        setError(message)
        setOpening(false)
        toast.error(message)
      }
    }

    void openUnifiedMessenger()
  }, [onClose, router, sarafId, status])

  const retry = async () => {
    startedRef.current = true
    setOpening(true)
    setError(null)

    try {
      const response = await fetch('/api/saraf-chat/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sarafId }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to open messenger')
      }

      const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : ''
      const destination = sessionId
        ? `/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(sessionId)}`
        : '/portal/internal-chat?tab=customers'

      onClose?.()
      router.push(destination)
    } catch (retryError) {
      const message = retryError instanceof Error ? retryError.message : 'Failed to open messenger'
      setError(message)
      setOpening(false)
      toast.error(message)
    }
  }

  if (status === 'loading') {
    return null
  }

  if (!session?.user) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <Card className="w-full max-w-md border-0 bg-white/95 shadow-2xl dark:bg-slate-950/95">
        <CardHeader className="border-b border-border/70">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Building className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-lg">Opening messenger</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">{sarafInfo.businessName}</p>
              </div>
            </div>
            <Button type="button" variant="ghost" size="icon" className="rounded-full" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-6">
          {error ? (
            <>
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">
                {error}
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  Close
                </Button>
                <Button type="button" onClick={() => void retry()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </>
          ) : (
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}
                <span>Routing this saraf conversation into the unified portal messenger.</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
