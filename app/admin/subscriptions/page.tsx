'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { useLanguage } from '@/hooks/useLanguage'
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  TrendingUp,
  DollarSign,
  Users,
  Package,
  Calendar,
  Mail,
  Phone,
  Building2,
  AlertCircle,
  CheckSquare,
  XSquare,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Eye,
  PowerOff,
  Edit3
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface Subscription {
  id: string
  packageType: string
  price: number
  status: string
  requestedAt: string
  expiryDate?: string | null
  saraf: {
    id: string
    businessName: string
    creditBalance: number
    phone?: string | null
    user: {
      name: string
      email: string
    }
  }
}

interface SubscriptionStats {
  total: number
  pending: number
  active: number
  expired: number
  revenue: {
    total: number
    thisMonth: number
    lastMonth: number
  }
}

interface PackageConfig {
  id: string
  type: 'PRO' | 'PREMIUM' | 'ENTERPRISE'
  name: string
  price: number
  isActive: boolean
}

type PricingOverrideForm = {
  PRO: string
  PREMIUM: string
  ENTERPRISE: string
}

export default function SubscriptionsPage() {
  const { language } = useLanguage()
  const isEn = language === 'en'
  const tt = (fa: string, en: string) => (isEn ? en : fa)

  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [stats, setStats] = useState<SubscriptionStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubscriptions, setSelectedSubscriptions] = useState<Set<string>>(new Set())
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set())
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())
  const [editingPrice, setEditingPrice] = useState<string | null>(null)
  const [newPrice, setNewPrice] = useState<number>(0)

  const [packageConfigs, setPackageConfigs] = useState<PackageConfig[]>([])
  const [packagePriceEdits, setPackagePriceEdits] = useState<Record<string, number>>({})
  const [packageSaving, setPackageSaving] = useState(false)

  const [pricingDialogOpen, setPricingDialogOpen] = useState(false)
  const [pricingLoading, setPricingLoading] = useState(false)
  const [pricingSaving, setPricingSaving] = useState(false)
  const [pricingSaraf, setPricingSaraf] = useState<{ id: string; businessName: string } | null>(null)
  const [pricingOverrides, setPricingOverrides] = useState<PricingOverrideForm>({
    PRO: '',
    PREMIUM: '',
    ENTERPRISE: '',
  })

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchPackageConfigs = async () => {
    try {
      const res = await fetch('/api/admin/packages')
      const data = await res.json().catch(() => null)
      const list: PackageConfig[] = Array.isArray(data?.packages) ? data.packages : []
      const filtered = list.filter((p) => ['PRO', 'PREMIUM', 'ENTERPRISE'].includes(p.type))
      setPackageConfigs(filtered)
      setPackagePriceEdits((prev) => {
        const next = { ...prev }
        for (const pkg of filtered) {
          if (typeof next[pkg.type] !== 'number') next[pkg.type] = pkg.price
        }
        return next
      })
    } catch {
      // keep silent; pricing config is optional for this page
    }
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      const [subsRes] = await Promise.all([
        fetch(`/api/admin/subscriptions?status=${filter}`),
        fetchPackageConfigs(),
      ])
      const subsData = await subsRes.json().catch(() => null)
      
      setSubscriptions(subsData?.subscriptions || [])
      setStats(null)
    } catch (error) {
      toast.error(tt('خطا در بارگذاری اشتراک‌ها', 'Error loading subscriptions'))
    } finally {
      setLoading(false)
    }
  }

  const savePackagePrice = async (type: PackageConfig['type']) => {
    const price = packagePriceEdits[type]
    if (typeof price !== 'number' || !Number.isFinite(price) || price < 0) {
      toast.error(tt('قیمت نامعتبر است', 'Invalid price'))
      return
    }

    try {
      setPackageSaving(true)
      const res = await fetch('/api/admin/packages/update-price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, price }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed')
      }
      toast.success(tt('قیمت پکیج به‌روزرسانی شد', 'Package price updated'))
      fetchPackageConfigs()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tt('خطا در ذخیره قیمت', 'Failed to save price'))
    } finally {
      setPackageSaving(false)
    }
  }

  const openSarafPricing = async (sarafId: string, businessName: string) => {
    setPricingSaraf({ id: sarafId, businessName })
    setPricingDialogOpen(true)
    setPricingLoading(true)
    try {
      const res = await fetch(`/api/admin/sarafs/${sarafId}`)
      const data = await res.json().catch(() => null)
      const map = data?.subscriptionPriceOverrides
      const next: PricingOverrideForm = {
        PRO: map?.PRO !== undefined && map?.PRO !== null ? String(map.PRO) : '',
        PREMIUM: map?.PREMIUM !== undefined && map?.PREMIUM !== null ? String(map.PREMIUM) : '',
        ENTERPRISE: map?.ENTERPRISE !== undefined && map?.ENTERPRISE !== null ? String(map.ENTERPRISE) : '',
      }
      setPricingOverrides(next)
    } catch {
      setPricingOverrides({ PRO: '', PREMIUM: '', ENTERPRISE: '' })
    } finally {
      setPricingLoading(false)
    }
  }

  const saveSarafPricing = async () => {
    if (!pricingSaraf) return
    try {
      setPricingSaving(true)
      const overrides = {
        PRO: pricingOverrides.PRO.trim() === '' ? null : Number(pricingOverrides.PRO),
        PREMIUM: pricingOverrides.PREMIUM.trim() === '' ? null : Number(pricingOverrides.PREMIUM),
        ENTERPRISE: pricingOverrides.ENTERPRISE.trim() === '' ? null : Number(pricingOverrides.ENTERPRISE),
      }
      const res = await fetch(`/api/admin/sarafs/${pricingSaraf.id}/subscription-pricing`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ overrides }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed')
      }
      toast.success(tt('قیمت اختصاصی ذخیره شد', 'Custom pricing saved'))
      setPricingDialogOpen(false)
      setPricingSaraf(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : tt('خطا در ذخیره قیمت', 'Failed to save pricing'))
    } finally {
      setPricingSaving(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      setActionLoading(prev => new Set(prev).add(id))
      const res = await fetch(`/api/admin/subscriptions/approve/${id}`, {
        method: 'POST'
      })

      if (res.ok) {
        toast.success(tt('اشتراک با موفقیت تایید شد', 'Subscription approved successfully'))
        fetchData()
      } else {
        const data = await res.json()
        toast.error(data.error || tt('خطا در تایید اشتراک', 'Error approving subscription'))
      }
    } catch (error) {
      toast.error(tt('خطا در تایید اشتراک', 'Error approving subscription'))
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleReject = async (id: string) => {
    try {
      setActionLoading(prev => new Set(prev).add(id))
      const res = await fetch(`/api/admin/subscriptions/reject/${id}`, {
        method: 'POST'
      })

      if (res.ok) {
        toast.success(tt('اشتراک با موفقیت رد شد', 'Subscription rejected successfully'))
        fetchData()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || tt('خطا در رد اشتراک', 'Error rejecting subscription'))
      }
    } catch (error) {
      toast.error(tt('خطا در رد اشتراک', 'Error rejecting subscription'))
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleDeactivate = async (id: string) => {
    try {
      setActionLoading(prev => new Set(prev).add(id))
      const res = await fetch(`/api/admin/subscriptions/deactivate/${id}`, {
        method: 'POST'
      })

      if (res.ok) {
        toast.success(tt('اشتراک غیرفعال شد', 'Subscription deactivated successfully'))
        fetchData()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || tt('خطا در غیرفعال‌سازی اشتراک', 'Error deactivating subscription'))
      }
    } catch (error) {
      toast.error(tt('خطا در غیرفعال‌سازی اشتراک', 'Error deactivating subscription'))
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleUpdatePrice = async (id: string, newPrice: number) => {
    try {
      setActionLoading(prev => new Set(prev).add(id))
      const res = await fetch(`/api/admin/subscriptions/update-price/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ price: newPrice })
      })

      if (res.ok) {
        toast.success(tt('قیمت اشتراک به‌روزرسانی شد', 'Subscription price updated successfully'))
        fetchData()
      } else {
        const data = await res.json().catch(() => null)
        toast.error(data?.error || tt('خطا در به‌روزرسانی قیمت', 'Error updating price'))
      }
    } catch (error) {
      toast.error(tt('خطا در به‌روزرسانی قیمت اشتراک', 'Error updating subscription price'))
    } finally {
      setActionLoading(prev => {
        const newSet = new Set(prev)
        newSet.delete(id)
        return newSet
      })
    }
  }

  const handleBulkApprove = async () => {
    if (selectedSubscriptions.size === 0) {
      toast.error(tt('هیچ اشتراکی انتخاب نشده است', 'No subscriptions selected'))
      return
    }

    try {
      setActionLoading(prev => new Set([...prev, ...selectedSubscriptions]))
      const promises = Array.from(selectedSubscriptions).map(id => 
        fetch(`/api/admin/subscriptions/approve/${id}`, { method: 'POST' })
      )
      
      await Promise.all(promises)
      toast.success(
        tt(
          `${selectedSubscriptions.size} اشتراک تایید شد`,
          `${selectedSubscriptions.size} subscriptions approved`
        )
      )
      setSelectedSubscriptions(new Set())
      fetchData()
    } catch (error) {
      toast.error(tt('خطا در تایید اشتراک‌ها', 'Error approving subscriptions'))
    } finally {
      setActionLoading(new Set())
    }
  }

  const handleBulkReject = async () => {
    if (selectedSubscriptions.size === 0) {
      toast.error(tt('هیچ اشتراکی انتخاب نشده است', 'No subscriptions selected'))
      return
    }

    try {
      setActionLoading(prev => new Set([...prev, ...selectedSubscriptions]))
      const promises = Array.from(selectedSubscriptions).map(id => 
        fetch(`/api/admin/subscriptions/reject/${id}`, { method: 'POST' })
      )
      
      await Promise.all(promises)
      toast.success(
        tt(
          `${selectedSubscriptions.size} اشتراک رد شد`,
          `${selectedSubscriptions.size} subscriptions rejected`
        )
      )
      setSelectedSubscriptions(new Set())
      fetchData()
    } catch (error) {
      toast.error(tt('خطا در رد اشتراک‌ها', 'Error rejecting subscriptions'))
    } finally {
      setActionLoading(new Set())
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/admin/subscriptions/export?status=${filter}`)
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `subscriptions-${filter}-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        toast.success(tt('خروجی با موفقیت تهیه شد', 'Export successful'))
      }
    } catch (error) {
      toast.error(tt('خطا در تهیه خروجی', 'Error exporting subscriptions'))
    }
  }

  const toggleExpand = (id: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedSubscriptions(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedSubscriptions.size === filteredSubscriptions.length) {
      setSelectedSubscriptions(new Set())
    } else {
      setSelectedSubscriptions(new Set(filteredSubscriptions.map(sub => sub.id)))
    }
  }

  const getStatusBadge = (status: string) => {
    const config = {
      PENDING: { label: tt('در انتظار', 'Pending'), className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
      ACTIVE: { label: tt('فعال', 'Active'), className: 'bg-green-100 text-green-800 border-green-300' },
      EXPIRED: { label: tt('منقضی', 'Expired'), className: 'bg-gray-100 text-gray-800 border-gray-300' },
      CANCELLED: { label: tt('غیرفعال', 'Deactivated'), className: 'bg-red-100 text-red-800 border-red-300' }
    }
    const statusConfig = config[status as keyof typeof config] || config.PENDING
    return <Badge className={statusConfig.className}>{statusConfig.label}</Badge>
  }

  const getPackageBadge = (packageType: string) => {
    const config = {
      PRO: { label: 'PRO', className: 'bg-blue-500 text-white border-blue-600' },
      PREMIUM: { label: 'PREMIUM', className: 'bg-purple-500 text-white border-purple-600' },
      ENTERPRISE: { label: 'ENTERPRISE', className: 'bg-slate-700 text-white border-slate-800' }
    }
    const packageConfig = config[packageType as keyof typeof config] || config.PRO
    return <Badge className={packageConfig.className}>{packageConfig.label}</Badge>
  }

  const filteredSubscriptions = subscriptions.filter(sub => 
    sub.saraf.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.saraf.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.saraf.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.packageType.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-6 max-w-full overflow-x-hidden">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">{tt('مدیریت اشتراک‌ها', 'Subscription Management')}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tt('مدیریت و بررسی درخواست‌های اشتراک صرافان', 'Manage and monitor all subscription requests')}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filter === 'PENDING' ? 'default' : 'outline'}
              onClick={() => setFilter('PENDING')}
              size="sm"
            >
              <Clock className="h-4 w-4 mr-2" />
              {tt('در انتظار', 'Pending')}
              {stats && stats.pending > 0 && (
                <Badge variant="secondary" className="ml-2">{stats.pending}</Badge>
              )}
            </Button>
            <Button
              variant={filter === 'ACTIVE' ? 'default' : 'outline'}
              onClick={() => setFilter('ACTIVE')}
              size="sm"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {tt('فعال', 'Active')}
              {stats && stats.active > 0 && (
                <Badge variant="secondary" className="ml-2">{stats.active}</Badge>
              )}
            </Button>
            <Button
              variant={filter === 'EXPIRED' ? 'default' : 'outline'}
              onClick={() => setFilter('EXPIRED')}
              size="sm"
            >
              <XCircle className="h-4 w-4 mr-2" />
              {tt('منقضی', 'Expired')}
              {stats && stats.expired > 0 && (
                <Badge variant="secondary" className="ml-2">{stats.expired}</Badge>
              )}
            </Button>
            <Button
              variant={filter === 'CANCELLED' ? 'default' : 'outline'}
              onClick={() => setFilter('CANCELLED')}
              size="sm"
            >
              <PowerOff className="h-4 w-4 mr-2" />
              {tt('غیرفعال', 'Deactivated')}
            </Button>
            <Button
              variant="outline"
              onClick={() => setFilter('ALL')}
              size="sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              {tt('همه', 'All')}
              {stats && stats.total > 0 && (
                <Badge variant="secondary" className="ml-2">{stats.total}</Badge>
              )}
            </Button>
          </div>
        </div>

        {packageConfigs.length > 0 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{tt('قیمت پکیج‌ها (قیمت پایه)', 'Package Base Pricing')}</CardTitle>
              <CardDescription>
                {tt('قیمت پایه پکیج‌ها را تنظیم کنید. قیمت اختصاصی هر صراف جداگانه قابل تنظیم است.', 'Set the base package prices. Each saraf can also have custom overrides.')}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-3">
              {packageConfigs.map((pkg) => (
                <div key={pkg.id} className="rounded-xl border border-border/70 bg-background/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{pkg.name}</div>
                      <div className="text-xs text-muted-foreground">{pkg.type}</div>
                    </div>
                    <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                      {pkg.isActive ? tt('فعال', 'Active') : tt('غیرفعال', 'Inactive')}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={packagePriceEdits[pkg.type] ?? pkg.price}
                      onChange={(e) =>
                        setPackagePriceEdits((prev) => ({
                          ...prev,
                          [pkg.type]: Math.max(0, parseInt(e.target.value || '0', 10) || 0),
                        }))
                      }
                    />
                    <Button
                      size="sm"
                      onClick={() => savePackagePrice(pkg.type)}
                      disabled={packageSaving}
                    >
                      {tt('ذخیره', 'Save')}
                    </Button>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {tt('برای تنظیمات کامل پکیج‌ها از صفحه پکیج‌ها استفاده کنید:', 'For full package configuration use:')}{' '}
                    <Link className="underline" href="/admin/packages">/admin/packages</Link>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tt('درآمد کل', 'Total Revenue')}</p>
                    <p className="text-2xl font-bold text-green-600">${stats.revenue.total.toLocaleString()}</p>
                  </div>
                  <DollarSign className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tt('این ماه', 'This Month')}</p>
                    <p className="text-2xl font-bold text-blue-600">${stats.revenue.thisMonth.toLocaleString()}</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tt('درخواست‌های در انتظار', 'Pending Requests')}</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="glass-card border-0">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{tt('اشتراک‌های فعال', 'Active Subscriptions')}</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.active}</p>
                  </div>
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={tt('جستجو بر اساس نام صرافی، کاربر، ایمیل یا پکیج...', 'Search by business name, user, email, or package...')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {selectedSubscriptions.size > 0 && (
              <>
                <Button
                  onClick={handleBulkApprove}
                  variant="default"
                  size="sm"
                  disabled={actionLoading.size > 0}
                >
                  <CheckSquare className="h-4 w-4 mr-2" />
                  {tt('تایید', 'Approve')} ({selectedSubscriptions.size})
                </Button>
                <Button
                  onClick={handleBulkReject}
                  variant="destructive"
                  size="sm"
                  disabled={actionLoading.size > 0}
                >
                  <XSquare className="h-4 w-4 mr-2" />
                  {tt('رد', 'Reject')} ({selectedSubscriptions.size})
                </Button>
              </>
            )}
            <Button
              onClick={handleExport}
              variant="outline"
              size="sm"
            >
              <Download className="h-4 w-4 mr-2" />
              {tt('خروجی', 'Export')}
            </Button>
            <Button
              onClick={fetchData}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {tt('به‌روزرسانی', 'Refresh')}
            </Button>
          </div>
        </div>

        {/* Subscriptions List */}
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">{tt('در حال بارگذاری اشتراک‌ها...', 'Loading subscriptions...')}</p>
          </div>
        ) : filteredSubscriptions.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="py-12 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50 text-muted-foreground" />
              <p className="text-muted-foreground">{tt('اشتراکی پیدا نشد', 'No subscriptions found')}</p>
              {searchTerm && (
                <Button
                  variant="link"
                  onClick={() => setSearchTerm('')}
                  className="mt-2"
                >
                  {tt('پاک کردن جستجو', 'Clear search')}
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Select All */}
            {filter === 'PENDING' && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  checked={selectedSubscriptions.size === filteredSubscriptions.length}
                  onChange={toggleSelectAll}
                  className="rounded"
                />
                <span>{tt('انتخاب همه', 'Select all')} ({filteredSubscriptions.length})</span>
              </div>
            )}

            <div className="grid gap-4">
              {filteredSubscriptions.map((sub) => (
                <Card 
                  key={sub.id} 
                  className={`glass-card border-0 transition-all ${
                    expandedCards.has(sub.id) ? 'ring-2 ring-purple-500' : ''
                  }`}
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        {filter === 'PENDING' && (
                          <input
                            type="checkbox"
                            checked={selectedSubscriptions.has(sub.id)}
                            onChange={() => toggleSelect(sub.id)}
                            className="rounded mt-1"
                          />
                        )}
                        <div className="flex-1">
                          <CardTitle className="text-lg sm:text-xl">{sub.saraf.businessName}</CardTitle>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {sub.saraf.user.name}
                            </span>
                            <span className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {sub.saraf.user.email}
                            </span>
                            {sub.saraf.phone && (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {sub.saraf.phone}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        {getPackageBadge(sub.packageType)}
                        {getStatusBadge(sub.status)}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleExpand(sub.id)}
                        >
                          {expandedCards.has(sub.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {tt('پکیج', 'Package')}
                        </p>
                        <p className="text-lg font-bold">{sub.packageType}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <DollarSign className="h-3 w-3" />
                          {tt('قیمت', 'Price')}
                        </p>
                        <p className="text-lg font-bold text-green-600">
                          {sub.price.toLocaleString('en-US')} {tt('کریدیت', 'credits')}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {tt('موجودی کریدیت', 'Credit Balance')}
                        </p>
                        <p className={`text-lg font-bold ${sub.saraf.creditBalance < sub.price ? 'text-red-600' : 'text-blue-600'}`}>
                          {sub.saraf.creditBalance}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {tt('تاریخ درخواست', 'Request Date')}
                        </p>
                        <p className="text-sm font-medium">
                          {new Date(sub.requestedAt).toLocaleDateString('fa-IR')}
                        </p>
                      </div>
                    </div>

                    {expandedCards.has(sub.id) && (
                      <div className="border-t pt-4 space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">{tt('شناسه اشتراک', 'Subscription ID')}</p>
                            <p className="text-sm font-mono">{sub.id}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">{tt('شناسه صراف', 'Saraf ID')}</p>
                            <p className="text-sm font-mono">{sub.saraf.id}</p>
                          </div>
                          {sub.expiryDate && (
                            <div>
                              <p className="text-xs text-muted-foreground">{tt('تاریخ انقضا', 'Expiry Date')}</p>
                              <p className="text-sm font-medium">
                                {new Date(sub.expiryDate).toLocaleDateString('fa-IR')}
                              </p>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <Link href={`/admin/sarafs/${sub.saraf.id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-2" />
                              {tt('جزئیات صراف', 'View Saraf Details')}
                            </Button>
                          </Link>
                        </div>

                        {sub.saraf.creditBalance < sub.price && (
                          <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-800 dark:text-red-200">
                                {tt('موجودی کریدیت ناکافی', 'Insufficient Credit Balance')}
                              </p>
                              <p className="text-xs text-red-600 dark:text-red-400">
                                {tt(
                                  `این صراف برای فعال‌سازی این اشتراک به ${sub.price - sub.saraf.creditBalance} کریدیت دیگر نیاز دارد.`,
                                  `This saraf needs ${sub.price - sub.saraf.creditBalance} more credits to activate this subscription.`
                                )}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {sub.status === 'PENDING' && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          onClick={() => handleApprove(sub.id)}
                          variant="default"
                          disabled={sub.saraf.creditBalance < sub.price || actionLoading.has(sub.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          {actionLoading.has(sub.id)
                            ? tt('در حال انجام...', 'Processing...')
                            : sub.saraf.creditBalance < sub.price
                              ? tt('کریدیت ناکافی', 'Insufficient Credits')
                              : tt('تایید', 'Approve')}
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleReject(sub.id)}
                          disabled={actionLoading.has(sub.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <XCircle className="h-4 w-4 mr-2" />
                          {actionLoading.has(sub.id) ? tt('در حال انجام...', 'Processing...') : tt('رد', 'Reject')}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => { setEditingPrice(sub.id); setNewPrice(sub.price); }}>
                              <Edit3 className="h-4 w-4 mr-2" />
                              {tt('ویرایش قیمت درخواست', 'Edit Request Price')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openSarafPricing(sub.saraf.id, sub.saraf.businessName)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              {tt('قیمت اختصاصی صراف', 'Custom Saraf Pricing')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleExpand(sub.id)}>
                              {expandedCards.has(sub.id) ? tt('بستن', 'Collapse') : tt('باز کردن', 'Expand')}{' '}
                              {tt('جزئیات', 'Details')}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/sarafs/${sub.saraf.id}`}>
                                {tt('مشاهده پروفایل صراف', 'View Saraf Profile')}
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {sub.status === 'ACTIVE' && (
                      <div className="flex flex-wrap gap-2 mt-4">
                        <Button
                          variant="destructive"
                          onClick={() => handleDeactivate(sub.id)}
                          disabled={actionLoading.has(sub.id)}
                          className="flex-1 sm:flex-none"
                        >
                          <PowerOff className="h-4 w-4 mr-2" />
                          {actionLoading.has(sub.id) ? tt('در حال انجام...', 'Processing...') : tt('غیرفعال‌سازی', 'Deactivate')}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem onClick={() => openSarafPricing(sub.saraf.id, sub.saraf.businessName)}>
                              <DollarSign className="h-4 w-4 mr-2" />
                              {tt('قیمت اختصاصی صراف', 'Custom Saraf Pricing')}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleExpand(sub.id)}>
                              {expandedCards.has(sub.id) ? tt('بستن', 'Collapse') : tt('باز کردن', 'Expand')}{' '}
                              {tt('جزئیات', 'Details')}
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/sarafs/${sub.saraf.id}`}>
                                {tt('مشاهده پروفایل صراف', 'View Saraf Profile')}
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}

                    {editingPrice === sub.id && (
                      <div className="flex flex-wrap gap-2 mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-2 flex-1">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <Input
                            type="number"
                            value={newPrice}
                            onChange={(e) => setNewPrice(parseInt(e.target.value) || 0)}
                            className="w-24"
                            min="0"
                          />
                          <span className="text-sm text-muted-foreground">{tt('کریدیت', 'credits')}</span>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => {
                              handleUpdatePrice(sub.id, newPrice)
                              setEditingPrice(null)
                            }}
                            disabled={actionLoading.has(sub.id) || newPrice < 0}
                          >
                            {tt('ذخیره', 'Save')}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingPrice(null)}
                          >
                            {tt('لغو', 'Cancel')}
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}

        <Dialog open={pricingDialogOpen} onOpenChange={setPricingDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{tt('قیمت اختصاصی صراف', 'Custom Saraf Pricing')}</DialogTitle>
              <DialogDescription>
                {pricingSaraf
                  ? tt(
                      `برای ${pricingSaraf.businessName} قیمت اختصاصی تنظیم کنید (خالی = استفاده از قیمت پایه پکیج).`,
                      `Set custom pricing for ${pricingSaraf.businessName} (empty = use base package price).`
                    )
                  : tt('قیمت اختصاصی را تنظیم کنید.', 'Set custom pricing.')}
              </DialogDescription>
            </DialogHeader>

            {pricingLoading ? (
              <div className="py-6 text-sm text-muted-foreground">{tt('در حال بارگذاری...', 'Loading...')}</div>
            ) : (
              <div className="grid gap-4">
                {(['PRO', 'PREMIUM', 'ENTERPRISE'] as const).map((type) => (
                  <div key={type} className="grid grid-cols-[96px_1fr] items-center gap-3">
                    <div className="text-sm font-medium">{type}</div>
                    <Input
                      type="number"
                      min={0}
                      placeholder={tt('خالی = قیمت پایه', 'Empty = base price')}
                      value={pricingOverrides[type]}
                      onChange={(e) =>
                        setPricingOverrides((prev) => ({
                          ...prev,
                          [type]: e.target.value,
                        }))
                      }
                    />
                  </div>
                ))}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={() => setPricingDialogOpen(false)}
                    disabled={pricingSaving}
                  >
                    {tt('بستن', 'Close')}
                  </Button>
                  <Button onClick={saveSarafPricing} disabled={pricingSaving}>
                    {pricingSaving ? tt('در حال ذخیره...', 'Saving...') : tt('ذخیره', 'Save')}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
