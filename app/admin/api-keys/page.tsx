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
import { Key, Plus, Copy, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/hooks/useLanguage'

interface ApiKey {
  id: string
  name: string
  maskedKey?: string | null
  keyPreview?: string | null
  permissions: string[]
  lastUsed: string | null
  createdAt: string
  expiresAt: string | null
  isActive: boolean
}

export default function ApiKeysPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showKey, setShowKey] = useState<string | null>(null)
  const [newKeyName, setNewKeyName] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [createdApiKey, setCreatedApiKey] = useState<{ id: string; name: string; key: string } | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchApiKeys()
  }, [session, status, router])

  const fetchApiKeys = async () => {
    try {
      const response = await fetch('/api/admin/api-keys')
      if (response.ok) {
        const data = await response.json()
        setApiKeys(Array.isArray(data) ? data : (data.keys || []))
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
      toast.error('خطا در بارگذاری کلیدها')
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string, successMessage = 'کپی شد') => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(successMessage)
    } catch (error) {
      toast.error('کپی خودکار ممکن نشد')
    }
  }

  const createApiKey = async () => {
    if (!newKeyName.trim()) {
      toast.error('نام کلید را وارد کنید')
      return
    }

    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName })
      })

      if (response.ok) {
        const data = await response.json()
        const rawKey = data?.apiKey?.key || data?.key

        toast.success('کلید API ایجاد شد')
        setNewKeyName('')
        setShowDialog(false)

        if (data?.apiKey?.id && rawKey) {
          setCreatedApiKey({
            id: data.apiKey.id,
            name: data.apiKey.name || newKeyName,
            key: rawKey
          })
          await copyToClipboard(rawKey, 'کلید جدید کپی شد')
        } else {
          setCreatedApiKey(null)
        }

        fetchApiKeys()
      } else {
        toast.error('خطا در ایجاد کلید')
      }
    } catch (error) {
      toast.error('خطا در ایجاد کلید')
    }
  }

  const deleteApiKey = async (id: string) => {
    if (!confirm('آیا از حذف این کلید اطمینان دارید؟')) return

    try {
      const response = await fetch(`/api/admin/api-keys/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        toast.success('کلید حذف شد')
        if (createdApiKey?.id === id) {
          setCreatedApiKey(null)
        }
        fetchApiKeys()
      } else {
        toast.error('خطا در حذف کلید')
      }
    } catch (error) {
      toast.error('خطا در حذف کلید')
    }
  }

  const copyAvailableKey = async (apiKey: ApiKey) => {
    if (createdApiKey?.id === apiKey.id) {
      await copyToClipboard(createdApiKey.key)
      return
    }

    toast.error('کلید خام فقط هنگام ایجاد در دسترس است')
  }

  if (status === 'loading' || !session) {
    return <DashboardLayout><div className="flex justify-center py-12">{t('common.loading')}</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Key className="h-8 w-8" />
            <h1 className="text-4xl font-bold">{t('admin.apiKeys')}</h1>
          </div>
          <p className="text-indigo-50 text-lg">{t('admin.apiKeys.subtitle')}</p>
        </div>

        {createdApiKey && (
          <Card className="glass-card border-amber-200/80">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div>
                  <p className="font-medium">کلید جدید ایجاد شد</p>
                  <p className="text-sm text-muted-foreground">کلید خام فقط همین حالا قابل مشاهده و کپی است.</p>
                </div>
                <code className="block overflow-x-auto rounded bg-muted px-3 py-2 text-sm">
                  {createdApiKey.key}
                </code>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => copyToClipboard(createdApiKey.key)}>
                    <Copy className="h-4 w-4 mr-2" />
                    کپی
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setCreatedApiKey(null)}>
                    بستن
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>کلیدهای API</CardTitle>
                <CardDescription>{apiKeys.length} کلید فعال</CardDescription>
              </div>
              <Dialog open={showDialog} onOpenChange={setShowDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    کلید جدید
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>ایجاد کلید API جدید</DialogTitle>
                    <DialogDescription>
                      این کلید فقط یک‌بار نمایش داده می‌شود
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>نام کلید</Label>
                      <Input
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="مثال: Production API"
                      />
                    </div>
                    <Button onClick={createApiKey} className="w-full">
                      ایجاد کلید
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
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>هیچ کلید API وجود ندارد</p>
                </div>
              ) : (
                apiKeys.map((apiKey) => (
                  <Card key={apiKey.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{apiKey.name}</h3>
                            <Badge variant={apiKey.isActive ? 'default' : 'secondary'}>
                              {apiKey.isActive ? 'فعال' : 'غیرفعال'}
                            </Badge>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            <code className="text-sm bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {showKey === apiKey.id
                                ? (apiKey.maskedKey || `${apiKey.keyPreview || 'sk'}...`)
                                : '••••••••••••••••'}
                            </code>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowKey(showKey === apiKey.id ? null : apiKey.id)}
                            >
                              {showKey === apiKey.id ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyAvailableKey(apiKey)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>

                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>ایجاد: {new Date(apiKey.createdAt).toLocaleDateString('fa-IR')}</span>
                            {apiKey.lastUsed && (
                              <>
                                <span>•</span>
                                <span>آخرین استفاده: {new Date(apiKey.lastUsed).toLocaleDateString('fa-IR')}</span>
                              </>
                            )}
                            {apiKey.expiresAt && (
                              <>
                                <span>•</span>
                                <span>انقضا: {new Date(apiKey.expiresAt).toLocaleDateString('fa-IR')}</span>
                              </>
                            )}
                          </div>
                        </div>

                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteApiKey(apiKey.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>مستندات API</CardTitle>
            <CardDescription>راهنمای استفاده از API</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">احراز هویت</h4>
                <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm">
                  Authorization: Bearer YOUR_API_KEY
                </code>
              </div>
              <div>
                <h4 className="font-medium mb-2">نمونه درخواست</h4>
                <code className="block bg-gray-100 dark:bg-gray-800 p-3 rounded text-sm whitespace-pre">
{`curl -X GET https://api.shahzada.com/v1/rates \\
  -H "Authorization: Bearer YOUR_API_KEY"`}
                </code>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
