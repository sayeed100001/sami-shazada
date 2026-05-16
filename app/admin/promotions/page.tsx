'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Crown, Star, Sparkles, RefreshCw, Save, Search } from 'lucide-react'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useLanguage } from '@/hooks/useLanguage'

type PromotionType = string
type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'HAWALA'
type Lang = 'fa' | 'en' | 'ps'

type PromotionRequest = {
  id: string
  sarafId: string
  type: PromotionType
  duration: number
  amount: number
  paymentMethod: PaymentMethod
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  expiresAt?: string | null
  saraf: { businessName: string; businessPhone: string; user: { name: string; email: string } }
}

type PromotionConfig = {
  id: string
  type: PromotionType
  name: string
  description: string | null
  nameI18n?: { fa?: string; en?: string; ps?: string } | null
  descriptionI18n?: { fa?: string; en?: string; ps?: string } | null
  features: string[]
  featuresI18n?: { fa?: string[]; en?: string[]; ps?: string[] } | null
  effects?: {
    directoryWeight?: number
    maxRatePairs?: number | null
    prioritySupport?: boolean
    detailedReports?: boolean
  } | null
  pricing: { duration: number; amount: number }[]
  isActive: boolean
  displayOrder: number
}

type SarafListItem = {
  id: string
  businessName: string
  businessPhone: string
  isPremium: boolean
  isFeatured: boolean
}

const toLines = (value: string) =>
  value
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 100)

const fromLines = (lines?: string[]) => (Array.isArray(lines) ? lines.join('\n') : '')

const iconForType = (type: PromotionType) => (type === 'PREMIUM' ? Crown : type === 'FEATURED' ? Star : Sparkles)

export default function AdminPromotionsPage() {
  const { language } = useLanguage()
  const tr = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const fmt = useMemo(() => new Intl.NumberFormat(language === 'en' ? 'en-US' : 'fa-AF'), [language])

  const [tab, setTab] = useState<'requests' | 'packages' | 'pricing'>('requests')

  const [requests, setRequests] = useState<PromotionRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestActionLoading, setRequestActionLoading] = useState<Set<string>>(new Set())
  const [extendDaysByRequestId, setExtendDaysByRequestId] = useState<Record<string, string>>({})

  const [configs, setConfigs] = useState<PromotionConfig[]>([])
  const [configsLoading, setConfigsLoading] = useState(true)
  const [configSaving, setConfigSaving] = useState(false)

  const [selectedType, setSelectedType] = useState<PromotionType>('PREMIUM')
  const [selectedLang, setSelectedLang] = useState<Lang>('fa')
  const [newPackageType, setNewPackageType] = useState('')
  const [creatingPackage, setCreatingPackage] = useState(false)

  const [editIsActive, setEditIsActive] = useState(true)
  const [editDisplayOrder, setEditDisplayOrder] = useState(10)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editFeatures, setEditFeatures] = useState('')
  const [editPricing, setEditPricing] = useState<{ duration: number; amount: number }[]>([])
  const [editDirectoryWeight, setEditDirectoryWeight] = useState(0)
  const [editMaxRatePairs, setEditMaxRatePairs] = useState<string>('')
  const [editPrioritySupport, setEditPrioritySupport] = useState(false)
  const [editDetailedReports, setEditDetailedReports] = useState(false)

  const [sarafSearch, setSarafSearch] = useState('')
  const [sarafResults, setSarafResults] = useState<SarafListItem[]>([])
  const [sarafSearchLoading, setSarafSearchLoading] = useState(false)

  const [pricingDialogOpen, setPricingDialogOpen] = useState(false)
  const [pricingSaraf, setPricingSaraf] = useState<{ id: string; businessName: string } | null>(null)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingOverrides, setPricingOverrides] = useState<Record<string, Record<string, string>>>({})

  const typeLabel = (type: PromotionType) =>
    type === 'PREMIUM' ? tr('پریمیوم', 'Premium', 'پریمیوم') : tr('ویژه', 'Featured', 'ځانګړی')

  const statusBadge = (status: PromotionRequest['status']) => {
    if (status === 'PENDING') return <Badge variant="secondary">{tr('در انتظار', 'Pending', 'په تمه')}</Badge>
    if (status === 'APPROVED') return <Badge className="bg-emerald-600 text-white">{tr('تایید', 'Approved', 'تایید')}</Badge>
    return <Badge variant="destructive">{tr('رد', 'Rejected', 'رد')}</Badge>
  }

  const typeBadge = (type: PromotionType) => {
    const Icon = iconForType(type)
    const cls =
      type === 'PREMIUM' ? 'bg-amber-600 text-white' : type === 'FEATURED' ? 'bg-sky-600 text-white' : 'bg-violet-600 text-white'
    const label = type === 'PREMIUM' || type === 'FEATURED' ? typeLabel(type) : String(type || '').toUpperCase()
    return (
      <Badge className={cls}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    )
  }

  const fetchRequests = async () => {
    setRequestsLoading(true)
    try {
      const res = await fetch('/api/admin/promotions', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed')
      setRequests(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا در دریافت درخواست‌ها', 'Failed to load requests', 'د غوښتنو ترلاسه کولو کې تېروتنه'))
      setRequests([])
    } finally {
      setRequestsLoading(false)
    }
  }

  const fetchConfigs = async () => {
    setConfigsLoading(true)
    try {
      const res = await fetch('/api/admin/promotion-configs', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      setConfigs(Array.isArray(data.configs) ? data.configs : [])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا در دریافت تنظیمات', 'Failed to load configs', 'د تنظیماتو ترلاسه کولو کې تېروتنه'))
      setConfigs([])
    } finally {
      setConfigsLoading(false)
    }
  }

  const refreshAll = async () => {
    await Promise.all([fetchRequests(), fetchConfigs()])
  }

  useEffect(() => {
    void refreshAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (configsLoading) return
    if (configs.length === 0) return
    if (configs.some((c) => c.type === selectedType)) return
    setSelectedType(configs[0]!.type)
  }, [configs, configsLoading, selectedType])

  useEffect(() => {
    const cfg = configs.find((c) => c.type === selectedType) || null
    setEditIsActive(cfg?.isActive ?? true)
    setEditDisplayOrder(cfg?.displayOrder ?? (selectedType === 'PREMIUM' ? 10 : 20))
    setEditName(((cfg?.nameI18n as any)?.[selectedLang] ?? cfg?.name ?? '') as string)
    setEditDescription(((cfg?.descriptionI18n as any)?.[selectedLang] ?? cfg?.description ?? '') as string)
    setEditFeatures(fromLines(((cfg?.featuresI18n as any)?.[selectedLang] ?? cfg?.features ?? []) as string[]))
    setEditPricing(Array.isArray(cfg?.pricing) ? cfg!.pricing : [])
    const eff = (cfg as any)?.effects || {}
    const dw = Number(eff?.directoryWeight)
    setEditDirectoryWeight(Number.isFinite(dw) ? Math.trunc(dw) : 0)
    const mr = eff?.maxRatePairs
    setEditMaxRatePairs(mr === undefined || mr === null ? '' : String(mr))
    setEditPrioritySupport(Boolean(eff?.prioritySupport))
    setEditDetailedReports(Boolean(eff?.detailedReports))
  }, [configs, selectedLang, selectedType])

  const updateRequestStatus = async (
    id: string,
    status: PromotionRequest['status'],
    opts?: { expireNow?: boolean; extendDays?: number }
  ) => {
    setRequestActionLoading((prev) => new Set(prev).add(id))
    try {
      const res = await fetch(`/api/admin/promotions/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, ...(opts || {}) }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed')
      toast.success(tr('بروزرسانی شد', 'Updated', 'تازه شو'))
      await fetchRequests()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا', 'Failed', 'تېروتنه'))
    } finally {
      setRequestActionLoading((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const seedDefaults = async () => {
    setConfigSaving(true)
    try {
      const res = await fetch('/api/admin/promotion-configs/seed', { method: 'POST' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      toast.success(tr('پیش‌فرض‌ها ایجاد شد', 'Defaults seeded', 'پیش‌فرضونه جوړ شول'))
      await fetchConfigs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا', 'Failed', 'تېروتنه'))
    } finally {
      setConfigSaving(false)
    }
  }

  const createPackage = async () => {
    const type = newPackageType.trim().toUpperCase()
    if (!type) return
    setCreatingPackage(true)
    try {
      const payload = {
        type,
        name: type,
        description: null,
        isActive: true,
        displayOrder: configs.length > 0 ? Math.max(...configs.map((c) => c.displayOrder || 0)) + 10 : 30,
        features: [],
        pricing: [{ duration: 30, amount: 0 }],
        nameI18n: { fa: type, en: type, ps: type },
        descriptionI18n: { fa: '', en: '', ps: '' },
        featuresI18n: { fa: [], en: [], ps: [] },
      }
      const res = await fetch('/api/admin/promotion-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      toast.success(tr('ایجاد شد', 'Created', 'جوړ شو'))
      setNewPackageType('')
      await fetchConfigs()
      setSelectedType(type)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا', 'Failed', 'تېروتنه'))
    } finally {
      setCreatingPackage(false)
    }
  }

  const saveCurrentConfig = async () => {
    setConfigSaving(true)
    try {
      const existing = configs.find((c) => c.type === selectedType) || null
      const nameI18n = { ...(existing?.nameI18n || {}) } as any
      const descriptionI18n = { ...(existing?.descriptionI18n || {}) } as any
      const featuresI18n = { ...(existing?.featuresI18n || {}) } as any
      nameI18n[selectedLang] = editName
      descriptionI18n[selectedLang] = editDescription
      featuresI18n[selectedLang] = toLines(editFeatures)

      const payload = {
        type: selectedType,
        name: existing?.name || editName || (selectedType === 'PREMIUM' ? 'Premium Account' : 'Featured Listing'),
        description: existing?.description || editDescription || null,
        isActive: editIsActive,
        displayOrder: Math.trunc(Number(editDisplayOrder) || 0),
        features: existing?.features || [],
        pricing: editPricing,
        effects: {
          directoryWeight: Math.trunc(Number(editDirectoryWeight) || 0),
          maxRatePairs: editMaxRatePairs.trim() === '' ? null : Math.trunc(Number(editMaxRatePairs) || 0),
          prioritySupport: Boolean(editPrioritySupport),
          detailedReports: Boolean(editDetailedReports),
        },
        nameI18n,
        descriptionI18n,
        featuresI18n,
      }

      const res = await fetch('/api/admin/promotion-configs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      toast.success(tr('ذخیره شد', 'Saved', 'ذخیره شو'))
      await fetchConfigs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا', 'Failed', 'تېروتنه'))
    } finally {
      setConfigSaving(false)
    }
  }

  const addPricingRow = () => setEditPricing((p) => [...p, { duration: 30, amount: 0 }])
  const removePricingRow = (idx: number) => setEditPricing((p) => p.filter((_, i) => i !== idx))
  const updatePricing = (idx: number, key: 'duration' | 'amount', value: string) => {
    const n = Math.trunc(Number(value))
    setEditPricing((prev) => prev.map((row, i) => (i === idx ? { ...row, [key]: Number.isFinite(n) ? n : 0 } : row)))
  }

  const searchSarafs = async () => {
    setSarafSearchLoading(true)
    try {
      const params = new URLSearchParams({ search: sarafSearch, page: '1', limit: '10' })
      const res = await fetch(`/api/admin/sarafs?${params}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed')
      const list = Array.isArray(data?.sarafs) ? data.sarafs : []
      setSarafResults(
        list.map((s: any) => ({
          id: s.id,
          businessName: s.businessName,
          businessPhone: s.businessPhone,
          isPremium: Boolean(s.isPremium),
          isFeatured: Boolean(s.isFeatured),
        }))
      )
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا', 'Failed', 'تېروتنه'))
      setSarafResults([])
    } finally {
      setSarafSearchLoading(false)
    }
  }

  const openSarafPricing = async (sarafId: string, businessName: string) => {
    setPricingDialogOpen(true)
    setPricingSaraf({ id: sarafId, businessName })
    setPricingLoading(true)
    try {
      const res = await fetch(`/api/admin/sarafs/${sarafId}`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error('Failed')
      const map = data?.promotionPriceOverrides || null
      const next: Record<string, Record<string, string>> = {}
      for (const cfg of configs) {
        const type = String(cfg.type || '').trim().toUpperCase()
        if (!type) continue
        const typeMap = map?.[type] && typeof map[type] === 'object' ? map[type] : {}
        next[type] = {}
        for (const tier of cfg?.pricing || []) {
          const key = String(tier.duration)
          next[type][key] = typeMap?.[key] ? String(typeMap[key]) : ''
        }
      }
      setPricingOverrides(next)
    } catch {
      setPricingOverrides({})
    } finally {
      setPricingLoading(false)
    }
  }

  const saveSarafPricing = async () => {
    if (!pricingSaraf) return
    setPricingSaving(true)
    try {
      const overrides: any = {}
      for (const [type, map] of Object.entries(pricingOverrides || {})) {
        const cleaned: Record<string, number> = {}
        for (const [dur, val] of Object.entries(map || {})) {
          if (val.trim() === '') continue
          const n = Number(val)
          if (!Number.isFinite(n) || n < 0) continue
          cleaned[String(Math.trunc(Number(dur)))] = Math.trunc(n)
        }
        if (Object.keys(cleaned).length > 0) overrides[type] = cleaned
      }
      const res = await fetch(`/api/admin/sarafs/${pricingSaraf.id}/promotion-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      toast.success(tr('ذخیره شد', 'Saved', 'ذخیره شو'))
      setPricingDialogOpen(false)
      setPricingSaraf(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tr('خطا', 'Failed', 'تېروتنه'))
    } finally {
      setPricingSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-3 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-black">{tr('مدیریت پروموشن', 'Promotions', 'پروموشن')}</h1>
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => void refreshAll()} disabled={requestsLoading || configsLoading}>
            <RefreshCw className="mr-2 h-4 w-4" />
            {tr('بروزرسانی', 'Refresh', 'تازه')}
          </Button>
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="requests">{tr('درخواست‌ها', 'Requests', 'غوښتنې')}</TabsTrigger>
            <TabsTrigger value="packages">{tr('بسته‌ها', 'Packages', 'پکیجونه')}</TabsTrigger>
            <TabsTrigger value="pricing">{tr('قیمت اختصاصی', 'Pricing', 'بیه')}</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="mt-4">
            <Card className="border-border/70 bg-background/90">
              <CardHeader>
                <CardTitle>{tr('درخواست‌ها', 'Requests', 'غوښتنې')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {requestsLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">{tr('بارگذاری...', 'Loading...', 'بارېږي...')}</div>
                ) : requests.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">{tr('چیزی نیست', 'No requests', 'هیڅ نشته')}</div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {requests.map((r) => {
                      const now = Date.now()
                      const active =
                        r.status === 'APPROVED' && (!r.expiresAt || new Date(r.expiresAt).getTime() >= now)

                      return (
                        <Card key={r.id} className="border-border/70 bg-background/80">
                        <CardHeader className="pb-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="truncate text-sm font-semibold">{r.saraf.businessName}</div>
                              <div className="truncate text-xs text-muted-foreground">{r.saraf.user.email}</div>
                            </div>
                            {typeBadge(r.type)}
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{tr('مدت', 'Duration', 'موده')}</span>
                            <span className="font-semibold">
                              {fmt.format(r.duration)} {tr('روز', 'days', 'ورځې')}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{tr('مبلغ', 'Amount', 'بیه')}</span>
                            <span className="font-semibold">{fmt.format(r.amount)} AFN</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{tr('وضعیت', 'Status', 'حالت')}</span>
                            {statusBadge(r.status)}
                          </div>
                          {r.expiresAt ? (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground">{tr('انقضا', 'Expiry', 'پای')}</span>
                              <span className="text-xs font-semibold">
                                {new Date(r.expiresAt).toLocaleString(language === 'en' ? 'en-US' : 'fa-AF')}
                              </span>
                            </div>
                          ) : null}
                          {r.status === 'PENDING' ? (
                            <div className="flex justify-end gap-2 pt-2">
                              <Button
                                size="sm"
                                className="bg-emerald-600 text-white hover:bg-emerald-700"
                                onClick={() => void updateRequestStatus(r.id, 'APPROVED')}
                                disabled={requestActionLoading.has(r.id)}
                              >
                                {tr('تایید', 'Approve', 'تایید')}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void updateRequestStatus(r.id, 'REJECTED')}
                                disabled={requestActionLoading.has(r.id)}
                              >
                                {tr('رد', 'Reject', 'رد')}
                              </Button>
                            </div>
                          ) : active ? (
                            <div className="flex flex-wrap justify-end gap-2 pt-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  className="h-9 w-24"
                                  placeholder={tr('روز', 'days', 'ورځې')}
                                  value={extendDaysByRequestId[r.id] ?? ''}
                                  onChange={(e) =>
                                    setExtendDaysByRequestId((prev) => ({ ...prev, [r.id]: e.target.value }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    void updateRequestStatus(r.id, 'APPROVED', {
                                      extendDays: Number(extendDaysByRequestId[r.id] || 0),
                                    })
                                  }
                                  disabled={requestActionLoading.has(r.id) || !extendDaysByRequestId[r.id]}
                                >
                                  {tr('تمدید', 'Extend', 'غځول')}
                                </Button>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void updateRequestStatus(r.id, 'APPROVED', { expireNow: true })}
                                disabled={requestActionLoading.has(r.id)}
                              >
                                {tr('غیرفعال', 'Deactivate', 'غیرفعال')}
                              </Button>
                            </div>
                          ) : null}
                        </CardContent>
                      </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="packages" className="mt-4">
            <Card className="border-border/70 bg-background/90">
              <CardHeader>
                <CardTitle>{tr('بسته‌ها', 'Packages', 'پکیجونه')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {configsLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">{tr('بارگذاری...', 'Loading...', 'بارېږي...')}</div>
                ) : (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-1 flex-col gap-3">
                        <div className="flex flex-wrap items-center gap-2">
                          {configs
                            .slice()
                            .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                            .map((cfg) => (
                              <Button
                                key={cfg.type}
                                variant={selectedType === cfg.type ? 'default' : 'outline'}
                                onClick={() => setSelectedType(cfg.type)}
                                title={cfg.type}
                              >
                                {(((cfg.nameI18n as any)?.[selectedLang] ?? cfg.name ?? cfg.type) as string) || cfg.type}
                              </Button>
                            ))}
                        </div>

                        <div className="flex flex-wrap items-end gap-2">
                          <div className="min-w-[220px] flex-1">
                            <Label>{tr('پکیج جدید', 'New package', 'نوی پکیج')}</Label>
                            <Input
                              className="mt-2"
                              placeholder="VIP_PLUS"
                              value={newPackageType}
                              onChange={(e) => setNewPackageType(e.target.value)}
                            />
                          </div>
                          <Button onClick={() => void createPackage()} disabled={creatingPackage || !newPackageType.trim()}>
                            {creatingPackage ? tr('...', '...', '...') : tr('ایجاد', 'Create', 'جوړ')}
                          </Button>

                          <div className="mx-2 hidden h-8 w-px bg-border md:block" />
                          {(['fa', 'en', 'ps'] as const).map((lng) => (
                            <Button key={lng} variant={selectedLang === lng ? 'default' : 'outline'} onClick={() => setSelectedLang(lng)}>
                              {lng.toUpperCase()}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => void seedDefaults()} disabled={configSaving}>
                          {tr('Seed', 'Seed', 'Seed')}
                        </Button>
                        <Button onClick={() => void saveCurrentConfig()} disabled={configSaving}>
                          <Save className="mr-2 h-4 w-4" />
                          {configSaving ? tr('ذخیره...', 'Saving...', 'ذخیره...') : tr('ذخیره', 'Save', 'ذخیره')}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                        <div className="text-sm font-semibold">{tr('فعال', 'Active', 'فعال')}</div>
                        <Switch checked={editIsActive} onCheckedChange={setEditIsActive} />
                      </div>
                      <div className="space-y-2">
                        <Label>{tr('ترتیب', 'Order', 'ترتیب')}</Label>
                        <Input value={String(editDisplayOrder)} onChange={(e) => setEditDisplayOrder(Math.trunc(Number(e.target.value) || 0))} />
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{tr('نام', 'Name', 'نوم')}</Label>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
                      </div>
                      <div className="space-y-2">
                        <Label>{tr('توضیح', 'Description', 'تشریح')}</Label>
                        <Input value={editDescription} onChange={(e) => setEditDescription(e.target.value)} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{tr('ویژگی‌ها', 'Features', 'امکانات')}</Label>
                      <Textarea value={editFeatures} rows={6} onChange={(e) => setEditFeatures(e.target.value)} />
                    </div>

                    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                      <div className="mb-4 space-y-1">
                        <div className="text-sm font-semibold">{tr('ویژگی‌های اجرایی', 'Enforced features', 'عملي امکانات')}</div>
                        <div className="text-xs leading-6 text-muted-foreground">
                          {tr(
                            'این گزینه‌ها واقعاً در سیستم اجرا می‌شوند (فقط متن نیست).',
                            'These options are actually enforced by the system (not just text).',
                            'دا اختيارونه په سيستم کې رښتيا پلي کېږي (يوازې متن نه دی).'
                          )}
                        </div>
                      </div>

                      <div className="grid gap-4 lg:grid-cols-2">
                        <div className="space-y-2">
                          <Label>{tr('امتیاز نمایش در لیست', 'Directory boost', 'د لېست امتياز')}</Label>
                          <Input
                            type="number"
                            value={String(editDirectoryWeight)}
                            onChange={(e) => setEditDirectoryWeight(Math.trunc(Number(e.target.value) || 0))}
                          />
                          <div className="text-xs leading-6 text-muted-foreground">
                            {tr(
                              'عدد بزرگ‌تر یعنی نمایش بالاتر در لیست صرافان (جستجو و فهرست).',
                              'Higher number means higher placement in saraf directory (search and listing).',
                              'لوړ شمېر د صرافانو په لېست کې لوړه درجه ورکوي.'
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>{tr('حداکثر تعداد نرخ‌ها', 'Max rate pairs', 'د نرخونو اعظمي شمېر')}</Label>
                          <Input
                            type="number"
                            placeholder={tr('مثلا 50', 'e.g. 50', 'لکه 50')}
                            value={editMaxRatePairs}
                            onChange={(e) => setEditMaxRatePairs(e.target.value)}
                          />
                          <div className="text-xs leading-6 text-muted-foreground">
                            {tr('اگر خالی باشد محدودیت اعمال نمی‌شود.', 'Leave empty to disable the limit.', 'که خالي وي، محدوديت نه پلي کېږي.')}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{tr('پشتیبانی اولویت‌دار', 'Priority support', 'لومړيتوب ملاتړ')}</div>
                            <div className="mt-1 text-xs leading-6 text-muted-foreground">
                              {tr(
                                'در بخش‌های پشتیبانی/ادمین برای اولویت‌بندی استفاده می‌شود.',
                                'Used by support/admin areas for prioritization.',
                                'د ملاتړ/ادمین لپاره د لومړيتوب ټاکلو کې کارېږي.'
                              )}
                            </div>
                          </div>
                          <Switch checked={editPrioritySupport} onCheckedChange={setEditPrioritySupport} />
                        </div>

                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{tr('گزارش‌های تفصیلی', 'Detailed reports', 'تفصيلي راپورونه')}</div>
                            <div className="mt-1 text-xs leading-6 text-muted-foreground">
                              {tr(
                                'در گزارش‌ها/داشبورد برای نمایش جزئیات بیشتر استفاده می‌شود.',
                                'Used by reports/dashboard to unlock extra details.',
                                'په راپورونو/ډاشبورډ کې د زياتو جزيياتو لپاره کارېږي.'
                              )}
                            </div>
                          </div>
                          <Switch checked={editDetailedReports} onCheckedChange={setEditDetailedReports} />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <Label>{tr('قیمت‌ها', 'Pricing', 'بیې')}</Label>
                        <Button size="sm" variant="outline" onClick={addPricingRow}>
                          {tr('افزودن', 'Add', 'زیات')}
                        </Button>
                      </div>
                      {editPricing.length === 0 ? (
                        <div className="text-sm text-muted-foreground">{tr('هیچ موردی نیست', 'No tiers', 'هیڅ نشته')}</div>
                      ) : (
                        <div className="space-y-2">
                          {editPricing.map((row, idx) => (
                            <div key={idx} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/70 p-3">
                              <Input className="w-28" value={String(row.duration)} onChange={(e) => updatePricing(idx, 'duration', e.target.value)} />
                              <span className="text-xs text-muted-foreground">{tr('روز', 'days', 'ورځې')}</span>
                              <Input className="w-32" value={String(row.amount)} onChange={(e) => updatePricing(idx, 'amount', e.target.value)} />
                              <span className="text-xs text-muted-foreground">AFN</span>
                              <Button size="sm" variant="destructive" onClick={() => removePricingRow(idx)}>
                                {tr('حذف', 'Remove', 'حذف')}
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pricing" className="mt-4">
            <Card className="border-border/70 bg-background/90">
              <CardHeader>
                <CardTitle>{tr('قیمت اختصاصی', 'Custom pricing', 'ځانګړې بیه')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px] flex-1">
                    <Label>{tr('جستجو صراف', 'Search saraf', 'صراف ولټوئ')}</Label>
                    <Input className="mt-2" value={sarafSearch} onChange={(e) => setSarafSearch(e.target.value)} />
                  </div>
                  <Button onClick={() => void searchSarafs()} disabled={sarafSearchLoading}>
                    <Search className="mr-2 h-4 w-4" />
                    {sarafSearchLoading ? tr('...', '...', '...') : tr('جستجو', 'Search', 'لټون')}
                  </Button>
                </div>

                {sarafResults.length === 0 ? (
                  <div className="py-6 text-center text-sm text-muted-foreground">{tr('نتیجه‌ای نیست', 'No results', 'پایله نشته')}</div>
                ) : (
                  <div className="grid gap-2 md:grid-cols-2">
                    {sarafResults.map((s) => (
                      <div key={s.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 p-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">{s.businessName}</div>
                          <div className="truncate text-xs text-muted-foreground">{s.businessPhone}</div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {s.isPremium ? <Badge className="bg-amber-600 text-white">{typeLabel('PREMIUM')}</Badge> : null}
                            {s.isFeatured ? <Badge className="bg-sky-600 text-white">{typeLabel('FEATURED')}</Badge> : null}
                          </div>
                        </div>
                        <Button variant="outline" onClick={() => void openSarafPricing(s.id, s.businessName)}>
                          {tr('Override', 'Override', 'Override')}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
              <DialogContent className="max-h-[90vh] w-[95vw] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{tr('قیمت اختصاصی', 'Custom pricing', 'ځانګړې بیه')}</DialogTitle>
                  <DialogDescription>{pricingSaraf ? `${pricingSaraf.businessName} (${pricingSaraf.id})` : '—'}</DialogDescription>
                </DialogHeader>

                {pricingLoading ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">{tr('بارگذاری...', 'Loading...', 'بارېږي...')}</div>
                ) : (
                  <div className="space-y-4">
                    {configs
                      .slice()
                      .sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0))
                      .map((cfg) => {
                      const type = String(cfg.type || '').trim().toUpperCase()
                      const tiers = cfg?.pricing || []
                      return (
                        <Card key={type} className="border-border/70 bg-background/80">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-base">
                              {(((cfg.nameI18n as any)?.[selectedLang] ?? cfg.name ?? cfg.type) as string) || cfg.type}
                            </CardTitle>
                            <CardContent className="space-y-2">
                              {tiers.length === 0 ? (
                                <div className="text-sm text-muted-foreground">{tr('بدون tier', 'No tiers', 'تییر نشته')}</div>
                              ) : (
                                tiers.map((tier) => {
                                  const key = String(tier.duration)
                                  return (
                                    <div key={key} className="flex flex-wrap items-center gap-2 rounded-2xl border border-border/70 bg-background/70 p-3">
                                      <span className="text-sm font-semibold">{fmt.format(tier.duration)} {tr('روز', 'days', 'ورځې')}</span>
                                      <span className="text-xs text-muted-foreground">{fmt.format(tier.amount)} AFN</span>
                                      <Input
                                        className="w-32"
                                        placeholder="Override"
                                        value={pricingOverrides[type]?.[key] ?? ''}
                                        onChange={(e) =>
                                          setPricingOverrides((prev) => ({
                                            ...prev,
                                            [type]: { ...(prev[type] || {}), [key]: e.target.value },
                                          }))
                                        }
                                      />
                                    </div>
                                  )
                                })
                              )}
                            </CardContent>
                          </CardHeader>
                        </Card>
                      )
                    })}

                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setPricingDialogOpen(false)} disabled={pricingSaving}>
                        {tr('انصراف', 'Cancel', 'لغوه')}
                      </Button>
                      <Button onClick={() => void saveSarafPricing()} disabled={pricingSaving || !pricingSaraf}>
                        {pricingSaving ? tr('ذخیره...', 'Saving...', 'ذخیره...') : tr('ذخیره', 'Save', 'ذخیره')}
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
