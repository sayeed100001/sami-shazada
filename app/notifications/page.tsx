'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Bell, Check, Trash2, CheckCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/notifications')
      .then(res => res.json())
      .then(data => {
        setNotifications(data.notifications || [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: id })
      })
      setNotifications(prev => prev.map(n => n.id === id ? {...n, read: true} : n))
    } catch (error) {
      toast.error('خطا در بهروزرسانی')
    }
  }

  const markAllAsRead = async () => {
    try {
      await fetch(`/api/notifications/mark-read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ all: true })
      })
      setNotifications(prev => prev.map(n => ({...n, read: true})))
      toast.success('همه اعلانها خوانده شد')
    } catch (error) {
      toast.error('خطا')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20 max-w-4xl mx-auto">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-600 via-pink-600 to-purple-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
                  <Bell className="h-4 w-4" />
                  <span className="text-sm font-semibold">اعلانها</span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black mb-3">اعلانها</h1>
                <p className="text-lg text-white/90">مدیریت اعلانها و پیامها</p>
              </div>
              {notifications.some(n => !n.read) && (
                <Button onClick={markAllAsRead} className="bg-white text-rose-600 hover:bg-white/90 font-bold">
                  <CheckCheck className="h-5 w-5 mr-2" />
                  خواندن همه
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-2 w-3/4" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
              </div>
            ))
          ) : notifications.length === 0 ? (
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 p-12 text-center">
              <Bell className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">اعلانی موجود نیست</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border shadow-lg hover:shadow-xl transition-all duration-300 ${
                  notif.read ? 'border-gray-200 dark:border-gray-800' : 'border-rose-200 dark:border-rose-800'
                }`}
              >
                <div className={`absolute inset-0 ${notif.read ? 'bg-gradient-to-br from-gray-50/50 to-transparent dark:from-gray-950/20' : 'bg-gradient-to-br from-rose-50/50 to-transparent dark:from-rose-950/20'}`} />
                
                <div className="relative z-10 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {!notif.read && (
                          <div className="w-2 h-2 rounded-full bg-rose-500" />
                        )}
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                          {notif.title}
                        </h3>
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-2">
                        {notif.message}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(notif.createdAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {!notif.read && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => markAsRead(notif.id)}
                          className="hover:bg-green-50 dark:hover:bg-green-950"
                        >
                          <Check className="h-4 w-4 text-green-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
