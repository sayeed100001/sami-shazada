'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Webhook, Plus, Trash2, RefreshCw, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'

interface WebhookConfig {
  id: string
  url: string
  events: string[]
  isActive: boolean
  secret: string
  lastTriggered: string | null
  successCount: number
  failureCount: number
  createdAt: string
}

const AVAILABLE_EVENTS = [
  { value: 'user.created', label: 'کاربر جدید' },
  { value: 'user.updated', label: 'بروزرسانی کاربر' },
  { value: 'saraf.approved', label: 'تایید صراف' },
  { value: 'saraf.rejected', label: 'رد صراف' },
  { value: 'transaction.created', label: 'تراکنش جدید' },
  { value: 'transaction.completed', label: 'تکمیل تراکنش' },
  { value: 'transaction.cancelled', label: 'لغو تراکنش' },
  { value: 'payment.received', label: 'دریافت پرداخت' },
  { value: 'rate.updated', label: 'بروزرسانی نرخ' }
]

export default function WebhooksPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showDialog, setShowDialog] = useState(false)
  const [newWebhook, setNewWebhook] = useState({
    url: '',
    events: [] as string[]
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchWebhooks()
  }, [session, status, router])

  const fetchWebhooks = async () => {
    try {
      const response = await fetch('/api/admin/webhooks')
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch webhooks')
      }
      setWebhooks(Array.isArray(data) ? data : data?.webhooks || [])
    } catch (error) {
      console.error('Failed to fetch webhooks:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در بارگذاری webhooks')
    } finally {
      setIsLoading(false)
    }
  }

  const createWebhook = async () => {
    if (!newWebhook.url.trim()) {
      toast.error('URL را وارد کنید')
      return
    }
    if (newWebhook.events.length === 0) {
      toast.error('حداقل یک رویداد انتخاب کنید')
      return
    }

    try {
      const response = await fetch('/api/admin/webhooks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newWebhook)
      })

      const data = await response.json().catch(() => null)
      if (response.ok) {
        toast.success('Webhook ایجاد شد')
        setNewWebhook({ url: '', events: [] })
        setShowDialog(false)
        fetchWebhooks()
      } else {
        toast.error(data?.error || 'خطا در ایجاد webhook')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ایجاد webhook')
    }
  }

  const deleteWebhook = async (id: string) => {
    if (!confirm('آیا از حذف این webhook اطمینان دارید؟')) return

    try {
      const response = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json().catch(() => null)
      if (response.ok) {
        toast.success('Webhook حذف شد')
        fetchWebhooks()
      } else {
        toast.error(data?.error || 'خطا در حذف webhook')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در حذف webhook')
    }
  }

  const toggleWebhook = async (id: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive })
      })

      const data = await response.json().catch(() => null)
      if (response.ok) {
        toast.success(`Webhook ${isActive ? 'فعال' : 'غیرفعال'} شد`)
        fetchWebhooks()
      } else {
        toast.error(data?.error || 'خطا در تغییر وضعیت')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در تغییر وضعیت')
    }
  }

  const testWebhook = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/webhooks/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      })

      const data = await response.json().catch(() => null)
      if (response.ok) {
        toast.success('درخواست تست ارسال شد')
        fetchWebhooks()
      } else {
        toast.error(data?.error || data?.message || 'خطا در ارسال تست')
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ارسال تست')
    }
  }

  if (status === 'loading' || !session) {
    return <DashboardLayout><div className="flex justify-center py-12">در حال بارگذاری...</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 p-8 text-white rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Webhook className="h-8 w-8" />
            <h1 className="text-4xl font-bold">مدیریت Webhooks</h1>
          </div>
          <p className="text-violet-50 text-lg">اعلان رویدادهای سیستم</p>
        </div>

        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>{webhooks.length} webhook فعال</CardDescription>
              </div>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Webhook جدید
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>ایجاد Webhook جدید</DialogTitle>
                    <DialogDescription>
                      رویدادهای سیستم را به URL خود ارسال کنید
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>URL Endpoint</Label>
                      <Input
                        value={newWebhook.url}
                        onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
                        placeholder="https://your-domain.com/webhook"
                      />
                    </div>
                    <div>
                      <Label>رویدادها</Label>
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        {AVAILABLE_EVENTS.map((event) => (
                          <div key={event.value} className="flex items-center space-x-2 space-x-reverse">
                            <Checkbox
                              id={event.value}
                              checked={newWebhook.events.includes(event.value)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setNewWebhook({
                                    ...newWebhook,
                                    events: [...newWebhook.events, event.value]
                                  })
                                } else {
                                  setNewWebhook({
                                    ...newWebhook,
                                    events: newWebhook.events.filter(e => e !== event.value)
                                  })
                                }
                              }}
                            />
                            <Label htmlFor={event.value} className="cursor-pointer">
                              {event.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <Button onClick={createWebhook} className="w-full">
                      ایجاد Webhook
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">در حال بارگذاری...</div>
              ) : webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>هیچ webhook وجود ندارد</p>
                </div>
              ) : (
                webhooks.map((webhook) => (
                  <Card key={webhook.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                              {webhook.isActive ? 'فعال' : 'غیرفعال'}
                            </Badge>
                            <code className="text-sm">{webhook.url}</code>
                          </div>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            {webhook.events.map((event) => (
                              <Badge key={event} variant="outline" className="text-xs">
                                {AVAILABLE_EVENTS.find(e => e.value === event)?.label || event}
                              </Badge>
                            ))}
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <CheckCircle className="h-3 w-3 text-green-500" />
                              <span>{webhook.successCount} موفق</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <XCircle className="h-3 w-3 text-red-500" />
                              <span>{webhook.failureCount} ناموفق</span>
                            </div>
                            {webhook.lastTriggered && (
                              <span>آخرین: {new Date(webhook.lastTriggered).toLocaleString('fa-IR')}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Switch
                            checked={webhook.isActive}
                            onCheckedChange={(checked) => toggleWebhook(webhook.id, checked)}
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => testWebhook(webhook.id)}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteWebhook(webhook.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
