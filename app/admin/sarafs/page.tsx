'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Building, Search, Check, X, Eye, Star, Sparkles } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface Saraf {
  id: string
  businessName: string
  businessAddress: string
  businessPhone: string
  licenseNumber?: string
  status: string
  isActive: boolean
  isPremium: boolean
  isFeatured: boolean
  isOnFreeTrial: boolean
  freeTrialEndDate?: string | null
  creditBalance: number
  subscriptionType: string
  rating: number
  totalTransactions: number
  createdAt: string
  user: {
    id: string
    name: string
    email: string
    phone?: string
    isActive: boolean
    lastLogin?: string
  }
  _count: {
    transactions: number
    rates: number
    documents: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AdminSarafsPage() {
  const { data: session } = useSession()
  const { t } = useLanguage()
  const [sarafs, setSarafs] = useState<Saraf[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedSaraf, setSelectedSaraf] = useState<Saraf | null>(null)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showManageDialog, setShowManageDialog] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkAction, setBulkAction] = useState('NONE')
  const [trialFilter, setTrialFilter] = useState('ALL')
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [manageForm, setManageForm] = useState({
    isActive: true,
    userIsActive: true,
    isFeatured: false,
    isPremium: false,
    isOnFreeTrial: false,
    creditBalance: 0,
    subscriptionType: 'BASIC',
    freeTrialDaysExtend: 0
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [showPromotionsDialog, setShowPromotionsDialog] = useState(false)
  const [promotionsLoading, setPromotionsLoading] = useState(false)
  const [promotionsData, setPromotionsData] = useState<any>(null)
  const [grantType, setGrantType] = useState('FEATURED')
  const [grantDurationDays, setGrantDurationDays] = useState('30')
  const [grantNotes, setGrantNotes] = useState('')
  const [grantBusy, setGrantBusy] = useState(false)
  const [promotionActionBusy, setPromotionActionBusy] = useState<Set<string>>(new Set())
  const [extendDaysByPromotionId, setExtendDaysByPromotionId] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchSarafs()
  }, [pagination.page, search, statusFilter, trialFilter, activeFilter])

  const openPromotionsDialog = async (saraf: Saraf) => {
    setSelectedSaraf(saraf)
    setShowPromotionsDialog(true)
    setPromotionsLoading(true)
    setPromotionsData(null)
    try {
      const res = await fetch(`/api/admin/sarafs/${saraf.id}/promotions`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to load promotions')
      }
      setPromotionsData(data)
      const firstType = Array.isArray(data?.configs) && data.configs.length > 0 ? String(data.configs[0].type) : 'FEATURED'
      setGrantType(firstType || 'FEATURED')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در دریافت پروموشن‌ها')
    } finally {
      setPromotionsLoading(false)
    }
  }

  const refreshPromotionsDialog = async () => {
    if (!selectedSaraf) return
    setPromotionsLoading(true)
    try {
      const res = await fetch(`/api/admin/sarafs/${selectedSaraf.id}/promotions`, { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      setPromotionsData(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در بروزرسانی')
    } finally {
      setPromotionsLoading(false)
    }
  }

  const grantFreePromotion = async () => {
    if (!selectedSaraf) return
    setGrantBusy(true)
    try {
      const duration = Math.trunc(Number(grantDurationDays) || 0)
      const res = await fetch(`/api/admin/sarafs/${selectedSaraf.id}/promotions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: grantType,
          duration,
          amount: 0,
          paymentMethod: 'ADMIN_GRANT',
          notes: grantNotes || null,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok || !data?.success) throw new Error(data?.error || 'Failed')
      setSuccess('پروموشن رایگان اضافه شد')
      setGrantNotes('')
      await refreshPromotionsDialog()
      await fetchSarafs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا در ثبت پروموشن')
    } finally {
      setGrantBusy(false)
    }
  }

  const updatePromotionStatus = async (promotionId: string, payload: any) => {
    setPromotionActionBusy((prev) => new Set(prev).add(promotionId))
    try {
      const res = await fetch(`/api/admin/promotions/${promotionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) throw new Error(data?.error || 'Failed')
      await refreshPromotionsDialog()
      await fetchSarafs()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطا')
    } finally {
      setPromotionActionBusy((prev) => {
        const next = new Set(prev)
        next.delete(promotionId)
        return next
      })
    }
  }

  const fetchSarafs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status: statusFilter,
        trial: trialFilter,
        active: activeFilter
      })

      const response = await fetch(`/api/admin/sarafs?${params}`)
      if (!response.ok) throw new Error('Failed to fetch sarafs')

      const data = await response.json()
      setSarafs(data.sarafs)
      setPagination(data.pagination)
    } catch (error) {
      setError('خطا در بارگذاری صرافان')
    } finally {
      setLoading(false)
    }
  }

  const openManageDialog = (saraf: Saraf) => {
    setSelectedSaraf(saraf)
    setManageForm({
      isActive: saraf.isActive,
      userIsActive: saraf.user.isActive,
      isFeatured: saraf.isFeatured,
      isPremium: saraf.isPremium,
      isOnFreeTrial: saraf.isOnFreeTrial,
      creditBalance: saraf.creditBalance || 0,
      subscriptionType: saraf.subscriptionType || 'BASIC',
      freeTrialDaysExtend: 0
    })
    setShowManageDialog(true)
  }

  const saveManageForm = async () => {
    if (!selectedSaraf) return
    try {
      const response = await fetch(`/api/admin/sarafs/${selectedSaraf.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manageForm)
      })
      if (!response.ok) throw new Error('Failed to update saraf controls')
      setSuccess('تنظیمات مدیریتی صراف با موفقیت ذخیره شد')
      setShowManageDialog(false)
      await fetchSarafs()
    } catch {
      setError('ذخیره تنظیمات مدیریتی ناموفق بود')
    }
  }

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(sarafs.map((s) => s.id))
    } else {
      setSelectedIds([])
    }
  }

  const toggleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id))
    }
  }

  const handleBulkAction = async () => {
    if (bulkAction === 'NONE' || selectedIds.length === 0) return
    try {
      const response = await fetch('/api/admin/sarafs/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: bulkAction, ids: selectedIds })
      })
      if (!response.ok) throw new Error('Bulk action failed')
      setSuccess('عملیات گروهی با موفقیت انجام شد')
      setBulkAction('NONE')
      setSelectedIds([])
      await fetchSarafs()
    } catch {
      setError('اجرای عملیات گروهی ناموفق بود')
    }
  }

  const handleStatusChange = async (sarafId: string, newStatus: string) => {
    try {
      const response = await fetch(`/api/admin/sarafs/${sarafId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) throw new Error('Failed to update saraf')

      const statusLabels = {
        APPROVED: 'تایید شد',
        REJECTED: 'رد شد',
        SUSPENDED: 'تعلیق شد'
      }

      setSuccess(`صراف ${statusLabels[newStatus as keyof typeof statusLabels]}`)
      fetchSarafs()
    } catch (error) {
      setError('خطا در بروزرسانی وضعیت صراف')
    }
  }

  const handleTogglePremium = async (sarafId: string, currentPremium: boolean) => {
    try {
      const response = await fetch(`/api/admin/sarafs/${sarafId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPremium: !currentPremium })
      })

      if (!response.ok) throw new Error('Failed to update saraf')

      setSuccess(`صراف ${!currentPremium ? 'پریمیوم' : 'عادی'} شد`)
      fetchSarafs()
    } catch (error) {
      setError('خطا در بروزرسانی وضعیت پریمیوم')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'secondary',
      APPROVED: 'default',
      REJECTED: 'destructive',
      SUSPENDED: 'outline'
    }
    const labels = {
      PENDING: 'در انتظار',
      APPROVED: 'تایید شده',
      REJECTED: 'رد شده',
      SUSPENDED: 'تعلیق شده'
    }
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {labels[status as keyof typeof labels]}
      </Badge>
    )
  }

  const getRatingStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-sm text-muted-foreground ml-1">({rating.toFixed(1)})</span>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Building className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('admin.sarafs')}</h1>
            </div>
            <p className="text-emerald-50 text-lg">{t('admin.sarafs.subtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-3xl"></div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>فیلترها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجو بر اساس نام کسب و کار، نام کاربر یا ایمیل..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه وضعیتها</SelectItem>
                  <SelectItem value="PENDING">در انتظار</SelectItem>
                  <SelectItem value="APPROVED">تایید شده</SelectItem>
                  <SelectItem value="REJECTED">رد شده</SelectItem>
                  <SelectItem value="SUSPENDED">تعلیق شده</SelectItem>
                </SelectContent>
              </Select>
              <Select value={trialFilter} onValueChange={setTrialFilter}>
                <SelectTrigger className="w-full sm:w-44">
                  <SelectValue placeholder="فری ترایل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه فری ترایل</SelectItem>
                  <SelectItem value="ON_TRIAL">روی فری ترایل</SelectItem>
                  <SelectItem value="EXPIRED_TRIAL">فری ترایل منقضی</SelectItem>
                  <SelectItem value="NO_TRIAL">بدون فری ترایل</SelectItem>
                </SelectContent>
              </Select>
              <Select value={activeFilter} onValueChange={setActiveFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="فعال/غیرفعال" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه</SelectItem>
                  <SelectItem value="ACTIVE">فعال</SelectItem>
                  <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Sarafs Table */}
        <Card>
          <CardHeader>
            <CardTitle>لیست صرافان ({pagination.total})</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Select value={bulkAction} onValueChange={setBulkAction}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue placeholder="عملیات گروهی" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">انتخاب عملیات گروهی</SelectItem>
                  <SelectItem value="approve">تایید گروهی</SelectItem>
                  <SelectItem value="suspend">تعلیق گروهی</SelectItem>
                  <SelectItem value="activate">فعال سازی</SelectItem>
                  <SelectItem value="deactivate">غیرفعال سازی</SelectItem>
                  <SelectItem value="enablePremium">پریمیوم کردن</SelectItem>
                  <SelectItem value="disablePremium">حذف پریمیوم</SelectItem>
                  <SelectItem value="grant30DayTrial">فری ترایل 30 روزه</SelectItem>
                  <SelectItem value="disableTrial">لغو فری ترایل</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleBulkAction} disabled={bulkAction === 'NONE' || selectedIds.length === 0}>
                اجرای عملیات ({selectedIds.length})
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={sarafs.length > 0 && selectedIds.length === sarafs.length}
                            onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                          />
                        </TableHead>
                        <TableHead className="min-w-[200px]">کسب و کار</TableHead>
                        <TableHead className="min-w-[150px] hidden md:table-cell">مالک</TableHead>
                        <TableHead className="min-w-[100px]">وضعیت</TableHead>
                        <TableHead className="min-w-[120px] hidden sm:table-cell">امتیاز</TableHead>
                        <TableHead className="min-w-[100px] hidden lg:table-cell">تراکنشها</TableHead>
                        <TableHead className="min-w-[120px] hidden xl:table-cell">تاریخ ثبت نام</TableHead>
                        <TableHead className="min-w-[150px]">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sarafs.map((saraf) => (
                        <TableRow key={saraf.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.includes(saraf.id)}
                              onCheckedChange={(checked) => toggleSelectOne(saraf.id, Boolean(checked))}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                {saraf.businessName}
                                {saraf.isPremium && (
                                  <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                    پریمیوم
                                  </Badge>
                                )}
                                {saraf.isOnFreeTrial && (
                                  <Badge variant="outline" className="text-blue-600 border-blue-600">
                                    فری ترایل
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">{saraf.businessPhone}</div>
                              <div className="text-sm text-muted-foreground truncate max-w-[200px]">{saraf.businessAddress}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            <div>
                              <div className="font-medium">{saraf.user.name}</div>
                              <div className="text-sm text-muted-foreground">{saraf.user.email}</div>
                              {saraf.user.phone && (
                                <div className="text-sm text-muted-foreground">{saraf.user.phone}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(saraf.status)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{getRatingStars(saraf.rating)}</TableCell>
                          <TableCell className="hidden lg:table-cell">
                            <div className="text-center">
                              <div className="font-medium">{saraf._count.transactions}</div>
                              <div className="text-xs text-muted-foreground">
                                {saraf._count.rates} نرخ فعال
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden xl:table-cell">
                            {new Date(saraf.createdAt).toLocaleDateString('fa-IR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {saraf.status === 'PENDING' && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-green-600 border-green-600 hover:bg-green-50 min-w-[44px] h-9"
                                    onClick={() => handleStatusChange(saraf.id, 'APPROVED')}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-600 hover:bg-red-50 min-w-[44px] h-9"
                                    onClick={() => handleStatusChange(saraf.id, 'REJECTED')}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                              
                              {saraf.status === 'APPROVED' && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className={`min-w-[44px] h-9 ${saraf.isPremium ? "text-gray-600" : "text-yellow-600 border-yellow-600"}`}
                                  onClick={() => handleTogglePremium(saraf.id, saraf.isPremium)}
                                >
                                  <Star className="h-4 w-4" />
                                </Button>
                              )}
                              
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openManageDialog(saraf)}
                                className="min-w-[44px] h-9"
                              >
                                مدیریت
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void openPromotionsDialog(saraf)}
                                className="min-w-[44px] h-9"
                                title="پروموشن‌ها"
                              >
                                <Sparkles className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedSaraf(saraf)
                                  setShowDetailsDialog(true)
                                }}
                                className="min-w-[44px] h-9"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground text-center sm:text-left">
                    نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total} صراف
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page <= 1}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                      className="min-w-[44px] h-9"
                    >
                      قبلی
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                      className="min-w-[44px] h-9"
                    >
                      بعدی
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={showManageDialog} onOpenChange={setShowManageDialog}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>کنترل پیشرفته صراف</DialogTitle>
              <DialogDescription>ابزارهای مدیریتی برای دسترسی، فری ترایل، اعتبار و اشتراک</DialogDescription>
            </DialogHeader>
            {selectedSaraf && (
              <div className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اعتبار (Credit)</Label>
                    <Input
                      type="number"
                      value={manageForm.creditBalance}
                      onChange={(e) => setManageForm((prev) => ({ ...prev, creditBalance: Number(e.target.value || 0) }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>نوع اشتراک</Label>
                    <Select
                      value={manageForm.subscriptionType}
                      onValueChange={(value) => setManageForm((prev) => ({ ...prev, subscriptionType: value }))}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASIC">BASIC</SelectItem>
                        <SelectItem value="PRO">PRO</SelectItem>
                        <SelectItem value="PREMIUM">PREMIUM</SelectItem>
                        <SelectItem value="ENTERPRISE">ENTERPRISE</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label>فعال بودن صراف</Label>
                    <Switch checked={manageForm.isActive} onCheckedChange={(v) => setManageForm((p) => ({ ...p, isActive: v }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label>فعال بودن کاربر مالک</Label>
                    <Switch checked={manageForm.userIsActive} onCheckedChange={(v) => setManageForm((p) => ({ ...p, userIsActive: v }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label>حالت پریمیوم</Label>
                    <Switch checked={manageForm.isPremium} onCheckedChange={(v) => setManageForm((p) => ({ ...p, isPremium: v }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <Label>نمایش ویژه (Featured)</Label>
                    <Switch checked={manageForm.isFeatured} onCheckedChange={(v) => setManageForm((p) => ({ ...p, isFeatured: v }))} />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3 md:col-span-2">
                    <Label>فری ترایل فعال</Label>
                    <Switch checked={manageForm.isOnFreeTrial} onCheckedChange={(v) => setManageForm((p) => ({ ...p, isOnFreeTrial: v }))} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>تمدید فری ترایل (روز)</Label>
                  <Input
                    type="number"
                    value={manageForm.freeTrialDaysExtend}
                    onChange={(e) => setManageForm((prev) => ({ ...prev, freeTrialDaysExtend: Number(e.target.value || 0) }))}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowManageDialog(false)}>لغو</Button>
                  <Button onClick={saveManageForm}>ذخیره تنظیمات</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Saraf Promotions Dialog */}
        <Dialog open={showPromotionsDialog} onOpenChange={setShowPromotionsDialog}>
          <DialogContent className="w-[95vw] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>پروموشن‌های صراف</DialogTitle>
              <DialogDescription>مدیریت و اعمال پروموشن برای این صراف (رایگان یا دستی)</DialogDescription>
            </DialogHeader>

            {promotionsLoading ? (
              <div className="py-10 text-center text-sm text-muted-foreground">در حال بارگذاری...</div>
            ) : selectedSaraf ? (
              <div className="space-y-5">
                <div className="rounded-lg border border-border/70 bg-background/70 p-4">
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate font-semibold">{selectedSaraf.businessName}</div>
                      <div className="truncate text-xs text-muted-foreground">{selectedSaraf.businessPhone}</div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void refreshPromotionsDialog()} disabled={promotionsLoading}>
                      بروزرسانی
                    </Button>
                  </div>

                  {promotionsData?.effects ? (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {typeof promotionsData.effects?.directoryWeight === 'number' ? (
                        <Badge variant="secondary">Boost: {promotionsData.effects.directoryWeight}</Badge>
                      ) : null}
                      {typeof promotionsData.effects?.maxRatePairs === 'number' ? (
                        <Badge variant="secondary">Max rates: {promotionsData.effects.maxRatePairs}</Badge>
                      ) : null}
                      {promotionsData.effects?.prioritySupport ? <Badge variant="secondary">Priority support</Badge> : null}
                      {promotionsData.effects?.detailedReports ? <Badge variant="secondary">Detailed reports</Badge> : null}
                    </div>
                  ) : null}
                </div>

                <div className="rounded-lg border border-border/70 bg-background/70 p-4 space-y-4">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    <div className="font-semibold">افزودن پروموشن رایگان</div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>نوع</Label>
                      <Select value={grantType} onValueChange={setGrantType}>
                        <SelectTrigger>
                          <SelectValue placeholder="نوع" />
                        </SelectTrigger>
                        <SelectContent>
                          {(Array.isArray(promotionsData?.configs) ? promotionsData.configs : []).map((cfg: any) => (
                            <SelectItem key={String(cfg.type)} value={String(cfg.type)}>
                              {String(cfg.type)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>مدت (روز)</Label>
                      <Input type="number" value={grantDurationDays} onChange={(e) => setGrantDurationDays(e.target.value)} />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                      <Label>یادداشت (اختیاری)</Label>
                      <Input value={grantNotes} onChange={(e) => setGrantNotes(e.target.value)} placeholder="ADMIN_GRANT" />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button onClick={grantFreePromotion} disabled={grantBusy}>
                      {grantBusy ? 'در حال ثبت...' : 'ثبت پروموشن'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="font-semibold">لیست درخواست‌ها</div>
                  <div className="space-y-2">
                    {(Array.isArray(promotionsData?.requests) ? promotionsData.requests : []).map((r: any) => {
                      const now = promotionsData?.now ? new Date(promotionsData.now) : new Date()
                      const expiresAt = r?.expiresAt ? new Date(r.expiresAt) : null
                      const active = r?.status === 'APPROVED' && (!expiresAt || expiresAt.getTime() >= now.getTime())
                      const busy = promotionActionBusy.has(String(r.id))
                      return (
                        <div key={String(r.id)} className="rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="flex flex-wrap items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <Badge variant="secondary">{String(r.type)}</Badge>
                                <Badge variant={r.status === 'APPROVED' ? 'default' : r.status === 'REJECTED' ? 'destructive' : 'secondary'}>
                                  {String(r.status)}
                                </Badge>
                                {active ? <Badge className="bg-emerald-600 text-white">ACTIVE</Badge> : null}
                              </div>
                              <div className="mt-2 text-xs text-muted-foreground">
                                مدت: {Number(r.duration) || 0} روز | مبلغ: {Number(r.amount) || 0} | روش: {String(r.paymentMethod || '')}
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                انقضا: {expiresAt ? expiresAt.toLocaleString('fa-IR') : '—'}
                              </div>
                            </div>

                            {active ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  className="h-9 w-24"
                                  type="number"
                                  placeholder="روز"
                                  value={extendDaysByPromotionId[String(r.id)] ?? ''}
                                  onChange={(e) =>
                                    setExtendDaysByPromotionId((prev) => ({ ...prev, [String(r.id)]: e.target.value }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy || !extendDaysByPromotionId[String(r.id)]}
                                  onClick={() =>
                                    void updatePromotionStatus(String(r.id), {
                                      status: 'APPROVED',
                                      extendDays: Number(extendDaysByPromotionId[String(r.id)] || 0),
                                    })
                                  }
                                >
                                  تمدید
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  disabled={busy}
                                  onClick={() => void updatePromotionStatus(String(r.id), { status: 'APPROVED', expireNow: true })}
                                >
                                  غیرفعال
                                </Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-muted-foreground">صراف انتخاب نشده است.</div>
            )}
          </DialogContent>
        </Dialog>

        {/* Saraf Details Dialog */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="w-[95vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>جزئیات صراف</DialogTitle>
              <DialogDescription>اطلاعات کامل صراف</DialogDescription>
            </DialogHeader>
            {selectedSaraf && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium">اطلاعات کسب و کار</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>نام:</strong> {selectedSaraf.businessName}</div>
                      <div><strong>آدرس:</strong> {selectedSaraf.businessAddress}</div>
                      <div><strong>تلفن:</strong> {selectedSaraf.businessPhone}</div>
                      {selectedSaraf.licenseNumber && (
                        <div><strong>شماره مجوز:</strong> {selectedSaraf.licenseNumber}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium">اطلاعات مالک</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>نام:</strong> {selectedSaraf.user.name}</div>
                      <div><strong>ایمیل:</strong> {selectedSaraf.user.email}</div>
                      {selectedSaraf.user.phone && (
                        <div><strong>تلفن:</strong> {selectedSaraf.user.phone}</div>
                      )}
                      <div><strong>آخرین ورود:</strong> {
                        selectedSaraf.user.lastLogin 
                          ? new Date(selectedSaraf.user.lastLogin).toLocaleDateString('fa-IR')
                          : 'هرگز'
                      }</div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedSaraf._count.transactions}</div>
                    <div className="text-sm text-muted-foreground">تراکنش</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedSaraf._count.rates}</div>
                    <div className="text-sm text-muted-foreground">نرخ فعال</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold">{selectedSaraf.rating.toFixed(1)}</div>
                    <div className="text-sm text-muted-foreground">امتیاز</div>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
