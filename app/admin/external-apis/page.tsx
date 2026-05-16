'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { CheckCircle, Globe, Plus, RefreshCw, Save, Trash2, XCircle } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

type ExternalApiCategory =
  | 'exchange'
  | 'crypto'
  | 'commodity'
  | 'sms'
  | 'email'
  | 'payment'
  | 'ai'
  | 'content'
  | 'security'
  | 'other'

type ExternalApiStatus = 'active' | 'error' | 'unconfigured' | 'disabled'
type ExternalApiAuthType = 'none' | 'x-api-key' | 'bearer' | 'basic' | 'query' | 'path'
type ExternalApiFieldType = 'text' | 'password' | 'url' | 'textarea'

interface ExternalApiFieldSchema {
  key: string
  label: string
  type: ExternalApiFieldType
  placeholder?: string
  helperText?: string
  secret?: boolean
  required?: boolean
}

interface ExternalApiRecord {
  key: string
  name: string
  description: string
  category: ExternalApiCategory
  baseUrl: string
  enabled: boolean
  authType: ExternalApiAuthType
  supportsApiKeys: boolean
  requiresCredentials: boolean
  testEndpoint?: string
  usage: string[]
  source: 'system' | 'custom'
  apiKeys: string[]
  fieldSchema: ExternalApiFieldSchema[]
  fields: Record<string, string>
  status: ExternalApiStatus
  lastChecked: string | null
}

type EditableApiState = Partial<ExternalApiRecord> & {
  fields?: Record<string, string>
  apiKeys?: string[]
}

type ExternalApiUsageSnapshot = {
  totalCalls: number
  totalErrors: number
  lastCallAt: string | null
  lastErrorAt: string | null
  lastStatus: number | null
  byDay?: Record<string, { calls: number; errors: number; sumLatencyMs: number }>
}

const CATEGORY_META: Record<ExternalApiCategory, { label: string; color: string }> = {
  exchange: { label: 'نرخ ارز', color: 'bg-blue-100 text-blue-800' },
  crypto: { label: 'رمزارز', color: 'bg-violet-100 text-violet-800' },
  commodity: { label: 'کالا و فلزات', color: 'bg-amber-100 text-amber-800' },
  sms: { label: 'پیامک', color: 'bg-emerald-100 text-emerald-800' },
  email: { label: 'ایمیل', color: 'bg-yellow-100 text-yellow-800' },
  payment: { label: 'پرداخت', color: 'bg-rose-100 text-rose-800' },
  ai: { label: 'هوش مصنوعی', color: 'bg-cyan-100 text-cyan-800' },
  content: { label: 'محتوا', color: 'bg-indigo-100 text-indigo-800' },
  security: { label: 'امنیت', color: 'bg-red-100 text-red-800' },
  other: { label: 'سایر', color: 'bg-slate-100 text-slate-800' },
}

const STATUS_META: Record<ExternalApiStatus, { label: string; className: string; icon: typeof CheckCircle }> = {
  active: { label: 'فعال', className: 'text-emerald-600', icon: CheckCircle },
  error: { label: 'خطا', className: 'text-rose-600', icon: XCircle },
  unconfigured: { label: 'پیکربندی ناقص', className: 'text-amber-600', icon: XCircle },
  disabled: { label: 'غیرفعال', className: 'text-slate-500', icon: XCircle },
}

const EMPTY_NEW_API: EditableApiState = {
  key: '',
  name: '',
  description: '',
  category: 'other',
  baseUrl: '',
  enabled: false,
  authType: 'x-api-key',
  supportsApiKeys: true,
  requiresCredentials: false,
  testEndpoint: '',
  apiKeys: [''],
  fields: {},
}

export default function ExternalAPIsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [apis, setApis] = useState<ExternalApiRecord[]>([])
  const [usageMap, setUsageMap] = useState<Record<string, ExternalApiUsageSnapshot>>({})
  const [editedApis, setEditedApis] = useState<Record<string, EditableApiState>>({})
  const [newApi, setNewApi] = useState<EditableApiState>(EMPTY_NEW_API)
  const [isLoading, setIsLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    void fetchApis()
  }, [router, session, status])

  async function fetchApis() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/external-apis', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to load APIs')
      }
      setApis(data.apis || [])

      // Load runtime usage stats (best-effort)
      const usageRes = await fetch('/api/admin/external-apis/usage', { cache: 'no-store' }).catch(() => null as any)
      if (usageRes && usageRes.ok) {
        const usageData = await usageRes.json().catch(() => null)
        setUsageMap((usageData?.usage || {}) as Record<string, ExternalApiUsageSnapshot>)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در بارگذاری APIها')
    } finally {
      setIsLoading(false)
    }
  }

  function getEffectiveApi(api: ExternalApiRecord): ExternalApiRecord {
    const patch = editedApis[api.key]
    if (!patch) return api

    return {
      ...api,
      ...patch,
      apiKeys: patch.apiKeys ?? api.apiKeys,
      fields: {
        ...api.fields,
        ...(patch.fields || {}),
      },
    }
  }

  function updateApi(key: string, patch: EditableApiState) {
    setEditedApis((current) => ({
      ...current,
      [key]: {
        ...current[key],
        ...patch,
        apiKeys: patch.apiKeys ?? current[key]?.apiKeys,
        fields: {
          ...(current[key]?.fields || {}),
          ...(patch.fields || {}),
        },
      },
    }))
  }

  function updateApiField(key: string, fieldKey: keyof ExternalApiRecord, value: string | boolean) {
    updateApi(key, { [fieldKey]: value } as EditableApiState)
  }

  function updateNestedField(key: string, fieldName: string, value: string) {
    updateApi(key, {
      fields: {
        ...(editedApis[key]?.fields || {}),
        [fieldName]: value,
      },
    })
  }

  function updateApiKeyValue(key: string, index: number, value: string) {
    const api = getEffectiveApi(apis.find((item) => item.key === key) as ExternalApiRecord)
    const apiKeys = [...api.apiKeys]
    apiKeys[index] = value
    updateApi(key, { apiKeys })
  }

  function addApiKey(key: string) {
    const api = getEffectiveApi(apis.find((item) => item.key === key) as ExternalApiRecord)
    updateApi(key, { apiKeys: [...api.apiKeys, ''] })
  }

  function removeApiKey(key: string, index: number) {
    const api = getEffectiveApi(apis.find((item) => item.key === key) as ExternalApiRecord)
    updateApi(key, { apiKeys: api.apiKeys.filter((_, itemIndex) => itemIndex !== index) })
  }

  async function saveApi(key: string) {
    const patch = editedApis[key]
    if (!patch) {
      toast.info('تغییری برای ذخیره وجود ندارد')
      return
    }

    setSavingKey(key)
    try {
      const response = await fetch('/api/admin/external-apis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, ...patch }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Save failed')
      }

      toast.success('تنظیمات API ذخیره شد')
      setEditedApis((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      await fetchApis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا در ذخیره')
    } finally {
      setSavingKey(null)
    }
  }

  async function testApi(key: string) {
    setSavingKey(key)
    try {
      const response = await fetch('/api/admin/external-apis/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Connection test failed')
      }
      toast.success(`${data.apiName}: اتصال برقرار است`)
      await fetchApis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'تست اتصال ناموفق بود')
      await fetchApis()
    } finally {
      setSavingKey(null)
    }
  }

  async function deleteApi(key: string) {
    const api = apis.find((item) => item.key === key)
    if (!api) return

    const confirmed = window.confirm(`آیا حذف API "${api.name}" قطعی است؟`)
    if (!confirmed) return

    setSavingKey(key)
    try {
      const response = await fetch('/api/admin/external-apis', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Delete failed')
      }
      toast.success('API حذف شد')
      setEditedApis((current) => {
        const next = { ...current }
        delete next[key]
        return next
      })
      await fetchApis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'حذف انجام نشد')
    } finally {
      setSavingKey(null)
    }
  }

  async function createApi() {
    if (!newApi.key || !newApi.name || !newApi.baseUrl) {
      toast.error('key، name و baseUrl الزامی هستند')
      return
    }

    setCreating(true)
    try {
      const payload = {
        ...newApi,
        apiKeys: (newApi.apiKeys || []).filter(Boolean),
      }
      const response = await fetch('/api/admin/external-apis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Create failed')
      }

      toast.success('API جدید اضافه شد')
      setNewApi(EMPTY_NEW_API)
      await fetchApis()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ایجاد API ناموفق بود')
    } finally {
      setCreating(false)
    }
  }

  const groupedApis = useMemo(() => {
    return apis.reduce((acc, api) => {
      const group = acc[api.category] || []
      group.push(api)
      acc[api.category] = group
      return acc
    }, {} as Record<ExternalApiCategory, ExternalApiRecord[]>)
  }, [apis])

  if (status === 'loading' || !session) {
    return <DashboardLayout><div className="p-6">{t('common.loading')}</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="rounded-3xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 p-8 text-white shadow-xl">
          <div className="mb-2 flex items-center gap-3">
            <Globe className="h-8 w-8" />
            <h1 className="text-3xl font-bold">{t('admin.externalApis')}</h1>
          </div>
          <p className="max-w-3xl text-emerald-50">{t('admin.externalApis.subtitle')}</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle>افزودن API جدید</CardTitle>
            <CardDescription>
              برای APIهای جدید یا custom integrationها. برای سرویس‌های داخلی سیستم، key باید یکتا باشد.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Key</Label>
                <Input
                  value={newApi.key || ''}
                  onChange={(event) => setNewApi((current) => ({ ...current, key: event.target.value }))}
                  placeholder="custom_provider"
                />
              </div>
              <div>
                <Label>Name</Label>
                <Input
                  value={newApi.name || ''}
                  onChange={(event) => setNewApi((current) => ({ ...current, name: event.target.value }))}
                  placeholder="Custom Provider"
                />
              </div>
              <div>
                <Label>Base URL</Label>
                <Input
                  value={newApi.baseUrl || ''}
                  onChange={(event) => setNewApi((current) => ({ ...current, baseUrl: event.target.value }))}
                  placeholder="https://api.example.com/v1"
                />
              </div>
              <div>
                <Label>Test Endpoint</Label>
                <Input
                  value={newApi.testEndpoint || ''}
                  onChange={(event) => setNewApi((current) => ({ ...current, testEndpoint: event.target.value }))}
                  placeholder="/health"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <Label>Category</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newApi.category || 'other'}
                  onChange={(event) =>
                    setNewApi((current) => ({ ...current, category: event.target.value as ExternalApiCategory }))
                  }
                >
                  {Object.entries(CATEGORY_META).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>Auth Type</Label>
                <select
                  className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={newApi.authType || 'x-api-key'}
                  onChange={(event) =>
                    setNewApi((current) => ({ ...current, authType: event.target.value as ExternalApiAuthType }))
                  }
                >
                  <option value="none">none</option>
                  <option value="x-api-key">x-api-key</option>
                  <option value="bearer">bearer</option>
                  <option value="basic">basic</option>
                  <option value="query">query</option>
                  <option value="path">path</option>
                </select>
              </div>
              <div className="flex items-end gap-6 pb-2">
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(newApi.supportsApiKeys)}
                    onCheckedChange={(checked) =>
                      setNewApi((current) => ({ ...current, supportsApiKeys: Boolean(checked) }))
                    }
                  />
                  Supports API Keys
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={Boolean(newApi.requiresCredentials)}
                    onCheckedChange={(checked) =>
                      setNewApi((current) => ({ ...current, requiresCredentials: Boolean(checked) }))
                    }
                  />
                  Requires Credentials
                </label>
              </div>
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={newApi.description || ''}
                onChange={(event) => setNewApi((current) => ({ ...current, description: event.target.value }))}
                placeholder="Description"
              />
            </div>

            {newApi.supportsApiKeys ? (
              <div>
                <Label>Primary API Key</Label>
                <Input
                  type="password"
                  value={newApi.apiKeys?.[0] || ''}
                  onChange={(event) =>
                    setNewApi((current) => ({ ...current, apiKeys: [event.target.value] }))
                  }
                  placeholder="Optional"
                />
              </div>
            ) : null}

            <div className="flex justify-end">
              <Button onClick={createApi} disabled={creating}>
                <Plus className="mr-2 h-4 w-4" />
                {creating ? 'در حال ایجاد...' : 'افزودن API'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <Card><CardContent className="p-8 text-center">در حال بارگذاری APIها...</CardContent></Card>
        ) : (
          Object.entries(groupedApis).map(([category, categoryApis]) => (
            <Card key={category} className="border-0 shadow-lg">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <CardTitle>{CATEGORY_META[category as ExternalApiCategory]?.label || category}</CardTitle>
                  <Badge className={CATEGORY_META[category as ExternalApiCategory]?.color}>{categoryApis.length}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {categoryApis.map((api) => {
                  const effectiveApi = getEffectiveApi(api)
                  const statusMeta = STATUS_META[effectiveApi.status]
                  const StatusIcon = statusMeta.icon
                  const hasChanges = Boolean(editedApis[api.key])
                  const usage = usageMap[api.key]
                  const todayKey = new Date().toISOString().slice(0, 10)
                  const today = usage?.byDay?.[todayKey]
                  const todayCalls = Number(today?.calls || 0)
                  const todayErrors = Number(today?.errors || 0)

                  return (
                    <Card key={api.key} className="border shadow-sm">
                      <CardContent className="space-y-5 p-5">
                        <div className="flex flex-wrap items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={effectiveApi.name}
                                onChange={(event) => updateApiField(api.key, 'name', event.target.value)}
                                className="h-9 max-w-sm font-semibold"
                              />
                              <Badge variant="outline">{effectiveApi.key}</Badge>
                              <Badge variant="outline">{effectiveApi.source === 'system' ? 'system' : 'custom'}</Badge>
                              <div className={`flex items-center gap-1 text-sm ${statusMeta.className}`}>
                                <StatusIcon className="h-4 w-4" />
                                <span>{statusMeta.label}</span>
                              </div>
                              {usage ? (
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="secondary">Calls: {usage.totalCalls || 0}</Badge>
                                  <Badge variant="secondary">Errors: {usage.totalErrors || 0}</Badge>
                                  <Badge variant="outline">Today: {todayCalls}</Badge>
                                  {todayErrors ? <Badge variant="destructive">Today errors: {todayErrors}</Badge> : null}
                                </div>
                              ) : null}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              استفاده در: {effectiveApi.usage.length ? effectiveApi.usage.join(' | ') : 'فعلا مصرف‌کننده‌ای تعریف نشده'}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-sm text-muted-foreground">Enabled</span>
                            <Switch
                              checked={effectiveApi.enabled}
                              onCheckedChange={(checked) => updateApiField(api.key, 'enabled', checked)}
                            />
                          </div>
                        </div>

                        <div>
                          <Label>Description</Label>
                          <Textarea
                            value={effectiveApi.description}
                            onChange={(event) => updateApiField(api.key, 'description', event.target.value)}
                          />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                          <div>
                            <Label>Base URL</Label>
                            <Input
                              value={effectiveApi.baseUrl}
                              onChange={(event) => updateApiField(api.key, 'baseUrl', event.target.value)}
                              placeholder="https://api.example.com/v1"
                            />
                          </div>
                          <div>
                            <Label>Test Endpoint</Label>
                            <Input
                              value={effectiveApi.testEndpoint || ''}
                              onChange={(event) => updateApiField(api.key, 'testEndpoint', event.target.value)}
                              placeholder="/health"
                            />
                          </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div>
                            <Label>Category</Label>
                            <select
                              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={effectiveApi.category}
                              onChange={(event) =>
                                updateApiField(api.key, 'category', event.target.value as ExternalApiCategory)
                              }
                            >
                              {Object.entries(CATEGORY_META).map(([key, value]) => (
                                <option key={key} value={key}>
                                  {value.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <Label>Auth Type</Label>
                            <select
                              className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                              value={effectiveApi.authType}
                              onChange={(event) =>
                                updateApiField(api.key, 'authType', event.target.value as ExternalApiAuthType)
                              }
                            >
                              <option value="none">none</option>
                              <option value="x-api-key">x-api-key</option>
                              <option value="bearer">bearer</option>
                              <option value="basic">basic</option>
                              <option value="query">query</option>
                              <option value="path">path</option>
                            </select>
                          </div>
                          <div className="flex items-end gap-6 pb-2">
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={effectiveApi.supportsApiKeys}
                                onCheckedChange={(checked) =>
                                  updateApiField(api.key, 'supportsApiKeys', Boolean(checked))
                                }
                              />
                              Supports Keys
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <Checkbox
                                checked={effectiveApi.requiresCredentials}
                                onCheckedChange={(checked) =>
                                  updateApiField(api.key, 'requiresCredentials', Boolean(checked))
                                }
                              />
                              Requires Credentials
                            </label>
                          </div>
                        </div>

                        {effectiveApi.supportsApiKeys ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              <Label>API Keys</Label>
                              <Button size="sm" variant="outline" onClick={() => addApiKey(api.key)}>
                                <Plus className="mr-2 h-4 w-4" />
                                افزودن کلید
                              </Button>
                            </div>
                            {(effectiveApi.apiKeys.length ? effectiveApi.apiKeys : ['']).map((item, index) => (
                              <div key={`${api.key}-api-key-${index}`} className="flex gap-2">
                                <Input
                                  type="password"
                                  value={item}
                                  onChange={(event) => updateApiKeyValue(api.key, index, event.target.value)}
                                  placeholder={index === 0 ? 'Primary key' : `Backup key ${index + 1}`}
                                />
                                {effectiveApi.apiKeys.length > 1 ? (
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="outline"
                                    onClick={() => removeApiKey(api.key, index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {effectiveApi.fieldSchema.length ? (
                          <div className="grid gap-4 md:grid-cols-2">
                            {effectiveApi.fieldSchema.map((field) => (
                              <div key={`${api.key}-${field.key}`} className="space-y-2">
                                <Label>{field.label}</Label>
                                {field.type === 'textarea' ? (
                                  <Textarea
                                    value={effectiveApi.fields[field.key] || ''}
                                    onChange={(event) =>
                                      updateNestedField(api.key, field.key, event.target.value)
                                    }
                                    placeholder={field.placeholder}
                                  />
                                ) : (
                                  <Input
                                    type={field.secret ? 'password' : field.type === 'url' ? 'url' : 'text'}
                                    value={effectiveApi.fields[field.key] || ''}
                                    onChange={(event) =>
                                      updateNestedField(api.key, field.key, event.target.value)
                                    }
                                    placeholder={field.placeholder}
                                  />
                                )}
                                {field.helperText ? (
                                  <p className="text-xs text-muted-foreground">{field.helperText}</p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        ) : null}

                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-xs text-muted-foreground">
                            {effectiveApi.lastChecked
                              ? `آخرین تست: ${new Date(effectiveApi.lastChecked).toLocaleString('fa-IR')}`
                              : 'هنوز تستی ثبت نشده'}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant={hasChanges ? 'default' : 'outline'}
                              disabled={!hasChanges || savingKey === api.key}
                              onClick={() => saveApi(api.key)}
                            >
                              <Save className="mr-2 h-4 w-4" />
                              ذخیره
                            </Button>
                            <Button
                              variant="outline"
                              disabled={savingKey === api.key}
                              onClick={() => testApi(api.key)}
                            >
                              <RefreshCw className="mr-2 h-4 w-4" />
                              تست اتصال
                            </Button>
                            <Button
                              variant="destructive"
                              disabled={savingKey === api.key}
                              onClick={() => deleteApi(api.key)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              حذف
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </DashboardLayout>
  )
}
