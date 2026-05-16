'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Bell, MessageCircle, X, Check, Building, User } from 'lucide-react'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface ChatNotification {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  resourceId?: string
}

export function SarafChatNotifications() {
  const { data: session } = useSession()
  const [notifications, setNotifications] = useState<ChatNotification[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (session?.user) {
      void fetchNotifications()
    }
  }, [session])

  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/saraf-chat/notifications')
      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: ChatNotification) => !n.read).length)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  useAdaptivePolling(fetchNotifications, {
    enabled: !!session?.user,
    activeIntervalMs: POLLING_INTERVALS.quickBadgeActiveMs,
    idleIntervalMs: POLLING_INTERVALS.quickBadgeIdleMs,
    hiddenIntervalMs: false,
    runImmediately: false,
  })

  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch('/api/saraf-chat/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      })

      if (response.ok) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error)
    }
  }

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read)
    
    for (const notification of unreadNotifications) {
      await markAsRead(notification.id)
    }
  }

  if (!session?.user) return null

  return (
    <>
      <div className="relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="relative"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-2 -right-2 bg-red-500 text-white min-w-[18px] h-4 text-xs">
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>

        {isOpen && (
          <Card className="absolute top-12 right-0 w-80 max-h-96 shadow-xl z-50 border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  اعلانات پیام
                </CardTitle>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={markAllAsRead}
                      className="text-xs"
                    >
                      <Check className="h-3 w-3 mr-1" />
                      همه را خوانده شده
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-0 max-h-64 overflow-y-auto">
              {notifications.length > 0 ? (
                <div className="divide-y">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${
                        !notification.read ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                      onClick={() => !notification.read && markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-full ${
                          session.user.role === 'SARAF' ? 'bg-green-100' : 'bg-blue-100'
                        }`}>
                          {session.user.role === 'SARAF' ? (
                            <User className="h-4 w-4 text-green-600" />
                          ) : (
                            <Building className="h-4 w-4 text-blue-600" />
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm mb-1">
                            {notification.title}
                          </h4>
                          <p className="text-xs text-gray-600 mb-2">
                            {notification.message}
                          </p>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-gray-500">
                              {new Date(notification.createdAt).toLocaleString('fa-IR', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-blue-500 rounded-full" />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">هیچ اعلانی موجود نیست</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
