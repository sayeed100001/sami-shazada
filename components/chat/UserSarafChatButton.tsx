'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Building } from 'lucide-react'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface ChatSession {
  id: string
  sarafId: string
  sarafName: string
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
  isActive: boolean
}

export function UserSarafChatButton() {
  const router = useRouter()
  const { data: session } = useSession()
  const [totalUnread, setTotalUnread] = useState(0)

  useEffect(() => {
    if (session?.user?.role === 'USER') {
      void fetchChatSessions()
    }
  }, [session])

  const fetchChatSessions = async () => {
    try {
      const response = await fetch('/api/saraf-chat/sessions')
      if (!response.ok) return
      const sessions = (await response.json()) as ChatSession[]
      const unreadCount = sessions.reduce((sum, chatSession) => sum + chatSession.unreadCount, 0)
      setTotalUnread(unreadCount)
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error)
    }
  }

  useAdaptivePolling(fetchChatSessions, {
    enabled: session?.user?.role === 'USER',
    activeIntervalMs: POLLING_INTERVALS.quickBadgeActiveMs,
    idleIntervalMs: POLLING_INTERVALS.quickBadgeIdleMs,
    hiddenIntervalMs: false,
    runImmediately: false,
  })

  if (session?.user?.role !== 'USER') {
    return null
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 group">
      <Button
        type="button"
        onClick={() => router.push('/portal/internal-chat?tab=customers')}
        className="relative h-14 w-14 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-0 text-white shadow-lg transition-all duration-200 hover:scale-110 hover:from-violet-700 hover:to-indigo-700"
        title="گفت‌وگو با صرافان"
      >
        <Building className="h-6 w-6 text-white" />
        {totalUnread > 0 ? (
          <Badge className="absolute -top-2 -right-2 h-5 min-w-[20px] bg-red-500 text-xs text-white">
            {totalUnread > 99 ? '99+' : totalUnread}
          </Badge>
        ) : null}
        <div className="pointer-events-none absolute -top-12 left-0 rounded bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
          گفت‌وگو با صرافان
        </div>
      </Button>
    </div>
  )
}
