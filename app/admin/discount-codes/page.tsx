'use client'

import { useEffect, useMemo, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Gift, Percent, Plus, Pencil, Trash2, CalendarClock, TicketPercent, Users, Sparkles } from 'lucide-react'

type DiscountCodeUsage = {
  id: string
  userId: string
  transactionId?: string | null
  discountAmount: number
  usedAt: string
}

type DiscountCodeRecord = {
  id: string
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: number
  maxDiscount?: number | null
  maxUses?: number | null
  usedCount: number
  validFrom: string
  validUntil: string
  isActive: boolean
  specificSarafId?: string | null
  vipLevelOnly?: 'NONE' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' | null
  usages: DiscountCodeUsage[]
}

type SarafOption = {
  id: string
  businessName: string
}

type DiscountCodeForm = {
  code: string
  type: 'PERCENTAGE' | 'FIXED'
  value: string
  maxDiscount: string
  maxUses: string
  validFrom: string
  validUntil: string
  specificSarafId: string
  vipLevelOnly: string
  isActive: boolean
}

type RewardActivityUser = {
  userId: string
  hawalaCount: number
  exchangeCount: number
  totalCount: number
  totalVolume: number
  totalSystemCommission: number
  lastActivityAt: string | null
  lastActivityType: 'HAWALA' | 'EXCHANGE' | null
  user: {
    id: string
    name: string | null
    email: string | null
    phone: string | null
    vipLevel: string | null
    createdAt: string
  } | null
}

const createEmptyForm = (): DiscountCodeForm => {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

  return {
    code: '',
    type: 'PERCENTAGE',
    value: '',
    maxDiscount: '',
    maxUses: '',
    validFrom: now.toISOString().slice(0, 16),
    validUntil: tomorrow.toISOString().slice(0, 16),
    specificSarafId: '',
    vipLevelOnly: 'ALL',
    isActive: true,
  }
}

const formatNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)

export default function AdminDiscountCodesPage() {
  const [codes, setCodes] = useState<DiscountCodeRecord[]>([])
  const [sarafs, setSarafs] = useState<SarafOption[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [showDialog, setShowDialog] = useState(false)
  const [editingCode, setEditingCode] = useState<DiscountCodeRecord | null>(null)
  const [formData, setFormData] = useState<DiscountCodeForm>(createEmptyForm())

  const [rewardLoading, setRewardLoading] = useState(false)
  const [rewardError, setRewardError] = useState('')
  const [rewardUsers, setRewardUsers] = useState<RewardActivityUser[]>([])
  const [rewardDays, setRewardDays] = useState('90')
  const [rewardQuery, setRewardQuery] = useState('')
  const [grantUserId, setGrantUserId] = useState('')
  const [grantType, setGrantType] = useState<'TRANSFER_DISCOUNT' | 'FREE_TRANSACTION'>('TRANSFER_DISCOUNT')
  const [grantRate, setGrantRate] = useState('0.05')
  const [grantExpiryDays, setGrantExpiryDays] = useState('14')
  const [grantTitle, setGrantTitle] = useState('')
  const [grantDescription, setGrantDescription] = useState('')

  const [rewardConfigLoading, setRewardConfigLoading] = useState(false)
  const [rewardConfigError, setRewardConfigError] = useState('')
  const [exchangeRewardEnabled, setExchangeRewardEnabled] = useState(true)
  const [exchangeRewardRate, setExchangeRewardRate] = useState('0.01')
  const [hawalaRewardEnabled, setHawalaRewardEnabled] = useState(true)
  const [hawalaRewardRate, setHawalaRewardRate] = useState('0.01')
  const [hawalaRewardExpiryDays, setHawalaRewardExpiryDays] = useState('14')

  useEffect(() => {
    void fetchCodes()
  }, [statusFilter])

  useEffect(() => {
    void fetchSarafs()
  }, [])

  useEffect(() => {
    void fetchRewardConfig()
  }, [])

  async function fetchCodes() {
    setLoading(true)
    setError('')

    try {
      const params = new URLSearchParams()
      if (search.trim()) params.set('search', search.trim())
      if (statusFilter && statusFilter !== 'ALL') params.set('status', statusFilter)

      const response = await fetch(`/api/admin/discount-codes?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load discount codes')
      }

      setCodes(data.codes || [])
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : 'Failed to load discount codes')
    } finally {
      setLoading(false)
    }
  }

  async function fetchSarafs() {
    try {
      const response = await fetch('/api/admin/sarafs?limit=100&status=APPROVED', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) return

      setSarafs(
        (data.sarafs || []).map((saraf: { id: string; businessName: string }) => ({
          id: saraf.id,
          businessName: saraf.businessName,
        }))
      )
    } catch (fetchError) {
      console.error('Failed to load saraf options:', fetchError)
    }
  }

  async function fetchRewardConfig() {
    setRewardConfigLoading(true)
    setRewardConfigError('')
    try {
      const response = await fetch('/api/admin/system-config', { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to load config')

      const configs: Array<{ key: string; value: string }> = Array.isArray(data) ? data : []
      const map = new Map(configs.map((c) => [c.key, c.value]))

      setExchangeRewardEnabled((map.get('exchange_reward_enabled') || 'true') !== 'false')
      setExchangeRewardRate(map.get('exchange_reward_discount_rate') || '0.01')
      setHawalaRewardEnabled((map.get('hawala_reward_enabled') || 'true') !== 'false')
      setHawalaRewardRate(map.get('hawala_reward_discount_rate') || '0.01')
      setHawalaRewardExpiryDays(map.get('hawala_reward_expiry_days') || '14')
    } catch (configError) {
      setRewardConfigError(configError instanceof Error ? configError.message : 'Failed to load reward config')
    } finally {
      setRewardConfigLoading(false)
    }
  }

  async function saveConfig(key: string, value: string, description?: string) {
    const response = await fetch('/api/admin/system-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value, description }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || 'Failed to update config')
    }
  }

  async function saveRewardConfig() {
    setRewardConfigLoading(true)
    setRewardConfigError('')
    try {
      await Promise.all([
        saveConfig('exchange_reward_enabled', exchangeRewardEnabled ? 'true' : 'false', 'Auto reward after exchange'),
        saveConfig('exchange_reward_discount_rate', exchangeRewardRate, 'Discount rate after exchange (max 0.05)'),
        saveConfig('hawala_reward_enabled', hawalaRewardEnabled ? 'true' : 'false', 'Auto reward after hawala completion'),
        saveConfig('hawala_reward_discount_rate', hawalaRewardRate, 'Discount rate after hawala (max 0.05)'),
        saveConfig('hawala_reward_expiry_days', hawalaRewardExpiryDays, 'Expiry days for hawala reward'),
      ])
      await fetchRewardConfig()
    } catch (saveError) {
      setRewardConfigError(saveError instanceof Error ? saveError.message : 'Failed to save reward config')
    } finally {
      setRewardConfigLoading(false)
    }
  }

  async function fetchRewardActivity() {
    setRewardLoading(true)
    setRewardError('')
    try {
      const params = new URLSearchParams()
      params.set('take', '50')
      params.set('days', rewardDays)
      if (rewardQuery.trim()) params.set('q', rewardQuery.trim())
      const response = await fetch(`/api/admin/rewards/activity?${params.toString()}`, { cache: 'no-store' })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to load activity')
      setRewardUsers(data?.users || [])
    } catch (fetchError) {
      setRewardError(fetchError instanceof Error ? fetchError.message : 'Failed to load activity')
    } finally {
      setRewardLoading(false)
    }
  }

  async function grantReward() {
    setSaving(true)
    setRewardError('')
    try {
      const payload: any = {
        userId: grantUserId.trim(),
        rewardType: grantType,
        expiryDays: Number.parseInt(grantExpiryDays || '14', 10),
        title: grantTitle,
        description: grantDescription,
      }

      if (grantType === 'TRANSFER_DISCOUNT') {
        payload.discountRate = Number.parseFloat(grantRate || '0.05')
      }

      const response = await fetch('/api/admin/rewards/grant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data?.error || 'Failed to grant reward')

      setGrantTitle('')
      setGrantDescription('')
      await fetchRewardActivity()
    } catch (grantError) {
      setRewardError(grantError instanceof Error ? grantError.message : 'Failed to grant reward')
    } finally {
      setSaving(false)
    }
  }

  const topRewardUsers = useMemo(() => rewardUsers.slice(0, 10), [rewardUsers])

  function openCreateDialog() {
    setEditingCode(null)
    setFormData(createEmptyForm())
    setShowDialog(true)
  }

  function openEditDialog(code: DiscountCodeRecord) {
    setEditingCode(code)
    setFormData({
      code: code.code,
      type: code.type,
      value: String(code.value),
      maxDiscount: code.maxDiscount ? String(code.maxDiscount) : '',
      maxUses: code.maxUses ? String(code.maxUses) : '',
      validFrom: new Date(code.validFrom).toISOString().slice(0, 16),
      validUntil: new Date(code.validUntil).toISOString().slice(0, 16),
      specificSarafId: code.specificSarafId || '',
      vipLevelOnly: code.vipLevelOnly || 'ALL',
      isActive: code.isActive,
    })
    setShowDialog(true)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')

    try {
      const payload = {
        code: formData.code,
        type: formData.type,
        value: Number.parseFloat(formData.value),
        maxDiscount: formData.maxDiscount ? Number.parseInt(formData.maxDiscount, 10) : null,
        maxUses: formData.maxUses ? Number.parseInt(formData.maxUses, 10) : null,
        validFrom: new Date(formData.validFrom).toISOString(),
        validUntil: new Date(formData.validUntil).toISOString(),
        specificSarafId: formData.specificSarafId || null,
        vipLevelOnly: formData.vipLevelOnly === 'ALL' ? null : formData.vipLevelOnly,
        isActive: formData.isActive,
      }

      const response = await fetch(
        editingCode ? `/api/admin/discount-codes/${editingCode.id}` : '/api/admin/discount-codes',
        {
          method: editingCode ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      )

      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Failed to save code')
      }

      setShowDialog(false)
      setEditingCode(null)
      setFormData(createEmptyForm())
      await fetchCodes()
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Failed to save code')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(code: DiscountCodeRecord) {
    if (!window.confirm(`Delete or disable code ${code.code}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/discount-codes/${code.id}`, {
        method: 'DELETE',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete code')
      }

      await fetchCodes()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'Failed to delete code')
    }
  }

  const activeCodes = codes.filter((code) => code.isActive && new Date(code.validUntil) > new Date())
  const totalDiscountUses = codes.reduce((total, code) => total + code.usedCount, 0)

  return (
    <DashboardLayout>
      <div className="min-h-screen space-y-6 bg-gradient-to-br from-gray-50 via-fuchsia-50 to-rose-50 p-4 sm:p-6 dark:from-gray-900 dark:via-fuchsia-950/20 dark:to-rose-950/20">
        <div className="rounded-2xl bg-gradient-to-r from-fuchsia-600 via-pink-600 to-rose-600 p-8 text-white shadow-xl">
          <div className="mb-3 flex items-center gap-3">
            <div className="rounded-2xl bg-white/20 p-3">
              <Gift className="h-8 w-8" />
            </div>
            <h1 className="text-3xl font-bold md:text-4xl">Promo Codes & Incentives</h1>
          </div>
          <p className="text-lg text-white/90">
            Control discount windows, user incentives, and saraf-targeted promotional campaigns from one place.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active codes</p>
                  <p className="text-3xl font-bold">{activeCodes.length}</p>
                </div>
                <TicketPercent className="h-8 w-8 text-fuchsia-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total codes</p>
                  <p className="text-3xl font-bold">{codes.length}</p>
                </div>
                <Percent className="h-8 w-8 text-pink-500" />
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Recorded uses</p>
                  <p className="text-3xl font-bold">{totalDiscountUses}</p>
                </div>
                <CalendarClock className="h-8 w-8 text-rose-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="codes" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="codes">Promo codes</TabsTrigger>
            <TabsTrigger value="rewards">User rewards</TabsTrigger>
          </TabsList>

          <TabsContent value="codes" className="pt-4">
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <CardTitle>Discount code registry</CardTitle>
                    <CardDescription>Target all users, only VIP tiers, or one approved saraf.</CardDescription>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search code"
                      className="sm:w-52"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="sm:w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All codes</SelectItem>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="EXPIRED">Expired</SelectItem>
                        <SelectItem value="DISABLED">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={() => void fetchCodes()}>
                      Refresh
                    </Button>
                    <Dialog open={showDialog} onOpenChange={setShowDialog}>
                      <DialogTrigger asChild>
                        <Button onClick={openCreateDialog}>
                          <Plus className="mr-2 h-4 w-4" />
                          New code
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{editingCode ? 'Edit promo code' : 'Create promo code'}</DialogTitle>
                          <DialogDescription>
                            Define who can use the code, how much it discounts, and how long it remains valid.
                          </DialogDescription>
                        </DialogHeader>

                        <form className="space-y-4" onSubmit={handleSubmit}>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                              <Label>Code</Label>
                              <Input
                                value={formData.code}
                                onChange={(event) =>
                                  setFormData((prev) => ({ ...prev, code: event.target.value.toUpperCase() }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Type</Label>
                              <Select
                                value={formData.type}
                                onValueChange={(value: 'PERCENTAGE' | 'FIXED') =>
                                  setFormData((prev) => ({ ...prev, type: value }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                                  <SelectItem value="FIXED">Fixed</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Value</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={formData.value}
                                onChange={(event) => setFormData((prev) => ({ ...prev, value: event.target.value }))}
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max discount</Label>
                              <Input
                                type="number"
                                value={formData.maxDiscount}
                                onChange={(event) =>
                                  setFormData((prev) => ({ ...prev, maxDiscount: event.target.value }))
                                }
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Max uses</Label>
                              <Input
                                type="number"
                                value={formData.maxUses}
                                onChange={(event) => setFormData((prev) => ({ ...prev, maxUses: event.target.value }))}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>VIP only</Label>
                              <Select
                                value={formData.vipLevelOnly}
                                onValueChange={(value) => setFormData((prev) => ({ ...prev, vipLevelOnly: value }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ALL">All users</SelectItem>
                                  <SelectItem value="BRONZE">Bronze</SelectItem>
                                  <SelectItem value="SILVER">Silver</SelectItem>
                                  <SelectItem value="GOLD">Gold</SelectItem>
                                  <SelectItem value="PLATINUM">Platinum</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                              <Label>Valid from</Label>
                              <Input
                                type="datetime-local"
                                value={formData.validFrom}
                                onChange={(event) =>
                                  setFormData((prev) => ({ ...prev, validFrom: event.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Valid until</Label>
                              <Input
                                type="datetime-local"
                                value={formData.validUntil}
                                onChange={(event) =>
                                  setFormData((prev) => ({ ...prev, validUntil: event.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <Label>Saraf scope</Label>
                              <Select
                                value={formData.specificSarafId || 'ALL'}
                                onValueChange={(value) =>
                                  setFormData((prev) => ({
                                    ...prev,
                                    specificSarafId: value === 'ALL' ? '' : value,
                                  }))
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ALL">All sarafs</SelectItem>
                                  {sarafs.map((saraf) => (
                                    <SelectItem key={saraf.id} value={saraf.id}>
                                      {saraf.businessName}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="flex items-center justify-between rounded-lg border border-border/60 p-3">
                            <div>
                              <p className="font-medium">Code enabled</p>
                              <p className="text-sm text-muted-foreground">
                                Disabled codes stay in history but can no longer be redeemed.
                              </p>
                            </div>
                            <Select
                              value={formData.isActive ? 'ACTIVE' : 'DISABLED'}
                              onValueChange={(value) =>
                                setFormData((prev) => ({
                                  ...prev,
                                  isActive: value === 'ACTIVE',
                                }))
                              }
                            >
                              <SelectTrigger className="w-40">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="DISABLED">Disabled</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                              Cancel
                            </Button>
                            <Button type="submit" disabled={saving}>
                              {saving ? 'Saving...' : editingCode ? 'Update code' : 'Create code'}
                            </Button>
                          </div>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {error && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {loading ? (
                  <div className="py-10 text-center text-muted-foreground">Loading discount codes...</div>
                ) : codes.length === 0 ? (
                  <div className="py-10 text-center text-muted-foreground">No promo codes found.</div>
                ) : (
                  <div className="space-y-4">
                    {codes.map((code) => {
                      const isExpired = new Date(code.validUntil) <= new Date()
                      const sarafName = sarafs.find((saraf) => saraf.id === code.specificSarafId)?.businessName

                      return (
                        <Card key={code.id} className="border border-border/60">
                          <CardContent className="space-y-4 p-5">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <h3 className="text-lg font-semibold">{code.code}</h3>
                                  <Badge variant={code.isActive && !isExpired ? 'default' : 'secondary'}>
                                    {code.isActive ? (isExpired ? 'Expired' : 'Active') : 'Disabled'}
                                  </Badge>
                                  <Badge variant="outline">
                                    {code.type === 'PERCENTAGE'
                                      ? `${code.value}%`
                                      : `${formatNumber(code.value)} AFN`}
                                  </Badge>
                                  {code.vipLevelOnly && code.vipLevelOnly !== 'NONE' && (
                                    <Badge variant="secondary">{code.vipLevelOnly}</Badge>
                                  )}
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  Scope: {sarafName || 'All sarafs'} | Uses: {code.usedCount}
                                  {code.maxUses ? ` / ${code.maxUses}` : ''} | Max discount:{' '}
                                  {code.maxDiscount ? `${formatNumber(code.maxDiscount)} AFN` : 'Unlimited'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  Valid from {new Date(code.validFrom).toLocaleString()} to{' '}
                                  {new Date(code.validUntil).toLocaleString()}
                                </p>
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Button variant="outline" size="sm" onClick={() => openEditDialog(code)}>
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Edit
                                </Button>
                                <Button variant="outline" size="sm" onClick={() => void handleDelete(code)}>
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </Button>
                              </div>
                            </div>

                            <Tabs defaultValue="summary" className="w-full">
                              <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="summary">Summary</TabsTrigger>
                                <TabsTrigger value="usage">Recent usage</TabsTrigger>
                              </TabsList>
                              <TabsContent value="summary" className="pt-3">
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                                  <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-sm text-muted-foreground">Redemptions</p>
                                    <p className="text-xl font-semibold">{code.usedCount}</p>
                                  </div>
                                  <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-sm text-muted-foreground">Value</p>
                                    <p className="text-xl font-semibold">
                                      {code.type === 'PERCENTAGE'
                                        ? `${code.value}%`
                                        : `${formatNumber(code.value)} AFN`}
                                    </p>
                                  </div>
                                  <div className="rounded-lg bg-muted/40 p-3">
                                    <p className="text-sm text-muted-foreground">Scope</p>
                                    <p className="text-xl font-semibold">{sarafName || 'Global'}</p>
                                  </div>
                                </div>
                              </TabsContent>
                              <TabsContent value="usage" className="pt-3">
                                {code.usages.length === 0 ? (
                                  <p className="text-sm text-muted-foreground">No usage recorded yet.</p>
                                ) : (
                                  <div className="space-y-2">
                                    {code.usages.map((usage) => (
                                      <div
                                        key={usage.id}
                                        className="flex flex-col justify-between gap-2 rounded-lg border border-border/60 p-3 md:flex-row md:items-center"
                                      >
                                        <div>
                                          <p className="font-medium">User {usage.userId}</p>
                                          <p className="text-sm text-muted-foreground">
                                            {new Date(usage.usedAt).toLocaleString()}
                                          </p>
                                        </div>
                                        <div className="text-right">
                                          <p className="font-semibold">{formatNumber(usage.discountAmount)} AFN</p>
                                          {usage.transactionId && (
                                            <p className="text-xs text-muted-foreground">Txn: {usage.transactionId}</p>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </TabsContent>
                            </Tabs>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="rewards" className="pt-4">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <Card className="glass-card border-0 shadow-lg lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-fuchsia-600" />
                    <CardTitle>Users activity (Hawala + Exchange)</CardTitle>
                  </div>
                  <CardDescription>Shows real usage and lets you grant per-user rewards.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rewardError && (
                    <Alert variant="destructive">
                      <AlertDescription>{rewardError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex flex-col gap-2 md:flex-row md:items-end">
                    <div className="space-y-2">
                      <Label>Days</Label>
                      <Input value={rewardDays} onChange={(e) => setRewardDays(e.target.value)} type="number" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label>Search user (name/email/phone)</Label>
                      <Input value={rewardQuery} onChange={(e) => setRewardQuery(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={() => void fetchRewardActivity()} disabled={rewardLoading}>
                      {rewardLoading ? 'Loading...' : 'Load'}
                    </Button>
                  </div>

                  {rewardUsers.length === 0 ? (
                    <div className="rounded-lg border border-border/60 p-6 text-center text-sm text-muted-foreground">
                      No activity loaded yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {topRewardUsers.map((row) => (
                        <div
                          key={row.userId}
                          className="flex flex-col gap-2 rounded-lg border border-border/60 p-3 md:flex-row md:items-center md:justify-between"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate font-medium">
                                {row.user?.name || row.user?.phone || row.user?.email || row.userId}
                              </p>
                              {row.user?.vipLevel && <Badge variant="secondary">{row.user.vipLevel}</Badge>}
                              <Badge variant="outline">Hawala: {row.hawalaCount}</Badge>
                              <Badge variant="outline">Exchange: {row.exchangeCount}</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Last: {row.lastActivityAt ? new Date(row.lastActivityAt).toLocaleString() : '—'}{' '}
                              {row.lastActivityType ? `(${row.lastActivityType})` : ''}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setGrantUserId(row.userId)
                                setGrantTitle('')
                                setGrantDescription('')
                              }}
                            >
                              Select
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="glass-card border-0 shadow-lg">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-rose-600" />
                    <CardTitle>Grant reward</CardTitle>
                  </div>
                  <CardDescription>Per-user rewards apply dynamically on next transfer system fee.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>User ID</Label>
                    <Input value={grantUserId} onChange={(e) => setGrantUserId(e.target.value)} placeholder="cuid..." />
                  </div>

                  <div className="space-y-2">
                    <Label>Reward type</Label>
                    <Select value={grantType} onValueChange={(v: any) => setGrantType(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TRANSFER_DISCOUNT">Transfer discount</SelectItem>
                        <SelectItem value="FREE_TRANSACTION">Free transaction</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {grantType === 'TRANSFER_DISCOUNT' && (
                    <div className="space-y-2">
                      <Label>Discount rate (0-0.5)</Label>
                      <Input value={grantRate} onChange={(e) => setGrantRate(e.target.value)} type="number" step="0.01" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Expiry days</Label>
                    <Input value={grantExpiryDays} onChange={(e) => setGrantExpiryDays(e.target.value)} type="number" />
                  </div>

                  <div className="space-y-2">
                    <Label>Title (optional)</Label>
                    <Input value={grantTitle} onChange={(e) => setGrantTitle(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Description (optional)</Label>
                    <Input value={grantDescription} onChange={(e) => setGrantDescription(e.target.value)} />
                  </div>

                  <Button onClick={() => void grantReward()} disabled={saving || !grantUserId.trim()}>
                    {saving ? 'Granting...' : 'Grant'}
                  </Button>

                  <div className="pt-3">
                    <p className="text-xs font-medium text-muted-foreground">Auto reward settings</p>
                  </div>

                  {rewardConfigError && (
                    <Alert variant="destructive">
                      <AlertDescription>{rewardConfigError}</AlertDescription>
                    </Alert>
                  )}

                  <div className="space-y-2">
                    <Label>Exchange reward enabled</Label>
                    <Select
                      value={exchangeRewardEnabled ? 'true' : 'false'}
                      onValueChange={(v) => setExchangeRewardEnabled(v === 'true')}
                      disabled={rewardConfigLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Enabled</SelectItem>
                        <SelectItem value="false">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Exchange reward rate (max 0.05)</Label>
                    <Input
                      value={exchangeRewardRate}
                      onChange={(e) => setExchangeRewardRate(e.target.value)}
                      type="number"
                      step="0.01"
                      disabled={rewardConfigLoading}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Hawala reward enabled</Label>
                    <Select
                      value={hawalaRewardEnabled ? 'true' : 'false'}
                      onValueChange={(v) => setHawalaRewardEnabled(v === 'true')}
                      disabled={rewardConfigLoading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Enabled</SelectItem>
                        <SelectItem value="false">Disabled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hawala reward rate (max 0.05)</Label>
                    <Input
                      value={hawalaRewardRate}
                      onChange={(e) => setHawalaRewardRate(e.target.value)}
                      type="number"
                      step="0.01"
                      disabled={rewardConfigLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hawala reward expiry days</Label>
                    <Input
                      value={hawalaRewardExpiryDays}
                      onChange={(e) => setHawalaRewardExpiryDays(e.target.value)}
                      type="number"
                      disabled={rewardConfigLoading}
                    />
                  </div>

                  <Button variant="outline" onClick={() => void saveRewardConfig()} disabled={rewardConfigLoading}>
                    {rewardConfigLoading ? 'Saving...' : 'Save auto-reward settings'}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
