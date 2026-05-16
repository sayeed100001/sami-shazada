'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Users, Search, Plus, Edit, Eye, UserCheck, UserX } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface User {
  id: string
  email: string
  name: string
  phone?: string
  role: string
  isActive: boolean
  createdAt: string
  lastLogin?: string
  saraf?: {
    id: string
    businessName: string
    status: string
    rating: number
  }
  _count: {
    transactions: number
    notifications: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

interface UserDetails extends User {
  isVerified: boolean
  vipLevel: string
  vipPoints: number
  totalTransactions: number
}

interface UserReward {
  id: string
  type: string
  title: string
  description: string
  value?: number | null
  code?: string | null
  isUsed: boolean
  expiresAt?: string | null
  createdAt: string
}

export default function AdminUsersPage() {
  const { t } = useLanguage()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('ALL')
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [selectedUserDetails, setSelectedUserDetails] = useState<UserDetails | null>(null)
  const [userRewards, setUserRewards] = useState<UserReward[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showBulkDialog, setShowBulkDialog] = useState(false)
  const [showDetailsDialog, setShowDetailsDialog] = useState(false)
  const [showRewardDialog, setShowRewardDialog] = useState(false)
  const [showMessageDialog, setShowMessageDialog] = useState(false)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [bulkAction, setBulkAction] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    phone: '',
    role: 'USER',
    password: ''
  })
  const [rewardForm, setRewardForm] = useState({
    type: 'MANUAL_TRANSFER_DISCOUNT',
    title: '',
    description: '',
    value: '',
    code: '',
    expiresAt: ''
  })
  const [messageBody, setMessageBody] = useState('')

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, search, roleFilter])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        role: roleFilter
      })

      const response = await fetch(`/api/admin/users?${params}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to fetch users')
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      setUsers([])
      setPagination(prev => ({ ...prev, total: 0, pages: 0 }))
      setError(error instanceof Error ? error.message : 'خطا در بارگذاری کاربران')
    } finally {
      setLoading(false)
    }
  }

  const loadUserContext = async (userId: string) => {
    setDetailsLoading(true)
    setError('')

    try {
      const [userResponse, rewardsResponse] = await Promise.all([
        fetch(`/api/admin/users/${userId}`, { cache: 'no-store' }),
        fetch(`/api/admin/users/${userId}/rewards`, { cache: 'no-store' })
      ])

      const userData = await userResponse.json()
      const rewardsData = await rewardsResponse.json()

      if (!userResponse.ok) {
        throw new Error(userData.error || 'Failed to load user details')
      }

      if (!rewardsResponse.ok) {
        throw new Error(rewardsData.error || 'Failed to load user rewards')
      }

      setSelectedUserDetails(userData)
      setUserRewards(rewardsData.rewards || [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load user context')
    } finally {
      setDetailsLoading(false)
    }
  }

  const openDetails = async (user: User) => {
    setSelectedUser(user)
    setShowDetailsDialog(true)
    await loadUserContext(user.id)
  }

  const openRewardGrant = async (user: User) => {
    setSelectedUser(user)
    setRewardForm({
      type: 'MANUAL_TRANSFER_DISCOUNT',
      title: '',
      description: '',
      value: '',
      code: '',
      expiresAt: ''
    })
    setShowRewardDialog(true)
    await loadUserContext(user.id)
  }

  const openDirectMessage = (user: User) => {
    setSelectedUser(user)
    setMessageBody('')
    setShowMessageDialog(true)
  }

  const handleGrantReward = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser) return

    try {
      const response = await fetch(`/api/admin/users/${selectedUser.id}/rewards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: rewardForm.type,
          title: rewardForm.title,
          description: rewardForm.description,
          value: rewardForm.value ? Number.parseFloat(rewardForm.value) : undefined,
          code: rewardForm.code || undefined,
          expiresAt: rewardForm.expiresAt || undefined
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to grant reward')

      setSuccess('Reward granted successfully')
      setShowRewardDialog(false)
      await loadUserContext(selectedUser.id)
    } catch (grantError) {
      setError(grantError instanceof Error ? grantError.message : 'Failed to grant reward')
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !messageBody.trim()) return

    try {
      const response = await fetch('/api/admin/chat/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageBody.trim(),
          targetUsers: [selectedUser.id]
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to send message')

      setSuccess('Direct message sent successfully')
      setShowMessageDialog(false)
      setMessageBody('')
    } catch (messageError) {
      setError(messageError instanceof Error ? messageError.message : 'Failed to send message')
    }
  }

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error)

      setSuccess('کاربر با موفقیت ایجاد شد')
      setShowCreateDialog(false)
      setNewUser({ email: '', name: '', phone: '', role: 'USER', password: '' })
      fetchUsers()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'خطا در ایجاد کاربر')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus })
      })

      if (!response.ok) throw new Error('Failed to update user')

      setSuccess(`کاربر ${!currentStatus ? 'فعال' : 'غیرفعال'} شد`)
      fetchUsers()
    } catch (error) {
      setError('خطا در بروزرسانی وضعیت کاربر')
    }
  }

  const handleBulkAction = async () => {
    if (selectedUsers.length === 0 || !bulkAction) return

    const actionLabels: Record<string, string> = {
      activate: 'فعال کردن',
      deactivate: 'غیرفعال کردن',
      delete: 'حذف'
    }
    const label = actionLabels[bulkAction] || bulkAction
    const confirmed = window.confirm(
      `آیا مطمئن هستید؟ عملیات "${label}" روی ${selectedUsers.length} کاربر اجرا خواهد شد.`
    )
    if (!confirmed) return

    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const response = await fetch('/api/admin/users/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userIds: selectedUsers,
          action: bulkAction
        })
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to perform bulk action')

      const msg = data.message
        ? `عملیات گروهی بر ${data.count} کاربر انجام شد. ${data.message}`
        : `عملیات گروهی بر ${data.count} کاربر انجام شد`
      setSuccess(msg)
      setSelectedUsers([])
      setShowBulkDialog(false)
      setBulkAction('')
      fetchUsers()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'خطا در انجام عملیات گروهی')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(users.map(user => user.id))
    }
  }

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: 'destructive',
      SARAF: 'default',
      BRANCH_MANAGER: 'outline',
      BRANCH_STAFF: 'outline',
      USER: 'secondary'
    }
    const labels = {
      ADMIN: t('role.admin'),
      BRANCH_MANAGER: t('role.branchManager'),
      BRANCH_STAFF: t('role.branchStaff'),
      SARAF: t('role.saraf'),
      USER: t('role.user')
    }
    return (
      <Badge variant={variants[role as keyof typeof variants] as any}>
        {labels[role as keyof typeof labels]}
      </Badge>
    )
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? t('common.active') : t('common.inactive')}
    </Badge>
  )

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              {t('admin.users')}
            </h1>
            <p className="text-lg text-white/90">
              {t('admin.users.subtitle')}
            </p>
          </div>
        </div>

        <div className="space-y-6 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-2">
          {selectedUsers.length > 0 && (
            <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full sm:w-auto">
                  عملیات گروهی ({selectedUsers.length})
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[95vw] max-w-md">
                <DialogHeader>
                  <DialogTitle>عملیات گروهی</DialogTitle>
                  <DialogDescription>
                    عملیات بر {selectedUsers.length} کاربر انتخاب شده
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <Select value={bulkAction} onValueChange={setBulkAction}>
                    <SelectTrigger>
                      <SelectValue placeholder="عملیات را انتخاب کنید" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="activate">فعال کردن</SelectItem>
                      <SelectItem value="deactivate">غیرفعال کردن</SelectItem>
                      <SelectItem value="delete">حذف</SelectItem>
                    </SelectContent>
                  </Select>
                  {bulkAction === 'delete' && (
                    <p className="rounded-md bg-red-50 p-3 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
                      ⚠️ کاربرانی که تراکنش یا صراف مرتبط دارند حذف نخواهند شد.
                    </p>
                  )}
                  {loading && (
                    <div className="flex items-center gap-2 rounded-md bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      در حال پردازش {selectedUsers.length} کاربر...
                    </div>
                  )}
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowBulkDialog(false)} disabled={loading}>
                      لغو
                    </Button>
                    <Button
                      onClick={handleBulkAction}
                      disabled={!bulkAction || loading}
                      variant={bulkAction === 'delete' ? 'destructive' : 'default'}
                    >
                      {loading ? 'در حال اجرا...' : 'اجرا'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                کاربر جدید
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>ایجاد کاربر جدید</DialogTitle>
                <DialogDescription>اطلاعات کاربر جدید را وارد کنید</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div>
                  <Label htmlFor="email">ایمیل *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="name">نام *</Label>
                  <Input
                    id="name"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="phone">شماره تلفن</Label>
                  <Input
                    id="phone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="role">نقش *</Label>
                  <Select value={newUser.role} onValueChange={(value) => setNewUser(prev => ({ ...prev, role: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">کاربر</SelectItem>
                      <SelectItem value="ADMIN">مدیر</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="mt-2 text-xs text-muted-foreground">
                    ساخت حساب‌های صراف و شعبه از این فرم غیرفعال است تا رکوردهای وابسته ناقص ایجاد نشود.
                  </p>
                </div>
                <div>
                  <Label htmlFor="password">رمز عبور *</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowCreateDialog(false)}>
                    لغو
                  </Button>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'در حال ایجاد...' : 'ایجاد کاربر'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
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
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>فیلترها</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجو بر اساس نام، ایمیل یا تلفن..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه نقشها</SelectItem>
                  <SelectItem value="USER">کاربر</SelectItem>
                  <SelectItem value="SARAF">صراف</SelectItem>
                  <SelectItem value="BRANCH_MANAGER">مدیر شعبه</SelectItem>
                  <SelectItem value="BRANCH_STAFF">کارمند شعبه</SelectItem>
                  <SelectItem value="ADMIN">مدیر</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle>لیست کاربران ({pagination.total})</CardTitle>
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
                            checked={selectedUsers.length === users.length && users.length > 0}
                            onCheckedChange={() => handleSelectAll()}
                          />
                        </TableHead>
                        <TableHead className="min-w-[200px]">کاربر</TableHead>
                        <TableHead className="min-w-[100px]">نقش</TableHead>
                        <TableHead className="min-w-[80px]">وضعیت</TableHead>
                        <TableHead className="min-w-[80px] hidden sm:table-cell">تراکنشها</TableHead>
                        <TableHead className="min-w-[120px] hidden md:table-cell">تاریخ عضویت</TableHead>
                        <TableHead className="min-w-[120px] hidden lg:table-cell">آخرین ورود</TableHead>
                        <TableHead className="min-w-[100px]">عملیات</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <Checkbox
                              checked={selectedUsers.includes(user.id)}
                              onCheckedChange={() => handleSelectUser(user.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{user.name}</div>
                              <div className="text-sm text-muted-foreground">{user.email}</div>
                              {user.phone && (
                                <div className="text-sm text-muted-foreground">{user.phone}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              {getRoleBadge(user.role)}
                              {user.saraf && (
                                <div className="text-xs text-muted-foreground">
                                  {user.saraf.businessName}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(user.isActive)}</TableCell>
                          <TableCell className="hidden sm:table-cell">{user._count.transactions}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            {new Date(user.createdAt).toLocaleDateString('fa-IR')}
                          </TableCell>
                          <TableCell className="hidden lg:table-cell">
                            {user.lastLogin 
                              ? new Date(user.lastLogin).toLocaleDateString('fa-IR')
                              : 'هرگز'
                            }
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void openDetails(user)}
                                className="h-10 w-10 p-0 sm:h-9 sm:w-9"
                                title="View Details"
                              >
                                <Eye className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => void openRewardGrant(user)}
                                className="h-10 w-10 p-0 sm:h-9 sm:w-9"
                                title="Grant Reward"
                              >
                                <Plus className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDirectMessage(user)}
                                className="h-10 w-10 p-0 sm:h-9 sm:w-9"
                                title="Message User"
                              >
                                <Edit className="h-5 w-5" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleToggleUserStatus(user.id, user.isActive)}
                                className="h-10 w-10 p-0 sm:h-9 sm:w-9"
                                title={user.isActive ? "Deactivate" : "Activate"}
                              >
                                {user.isActive ? (
                                  <UserX className="h-5 w-5 text-red-500" />
                                ) : (
                                  <UserCheck className="h-5 w-5 text-green-500" />
                                )}
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
                    نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total} کاربر
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

        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="w-[95vw] max-h-[90vh] max-w-3xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>User profile</DialogTitle>
              <DialogDescription>
                Operational profile, verification, VIP status, and reward history for the selected user.
              </DialogDescription>
            </DialogHeader>
            {detailsLoading || !selectedUserDetails ? (
              <div className="py-8 text-center text-muted-foreground">Loading user details...</div>
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">VIP level</p>
                      <p className="text-xl font-bold">{selectedUserDetails.vipLevel}</p>
                      <p className="text-sm text-muted-foreground">{selectedUserDetails.vipPoints} points</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Verification</p>
                      <p className="text-xl font-bold">{selectedUserDetails.isVerified ? 'Verified' : 'Pending'}</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">Lifetime transfers</p>
                      <p className="text-xl font-bold">{selectedUserDetails.totalTransactions}</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Account details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <p><span className="font-medium">Name:</span> {selectedUserDetails.name}</p>
                    <p><span className="font-medium">Email:</span> {selectedUserDetails.email}</p>
                    {selectedUserDetails.phone && <p><span className="font-medium">Phone:</span> {selectedUserDetails.phone}</p>}
                    <p><span className="font-medium">Role:</span> {selectedUserDetails.role}</p>
                    <p><span className="font-medium">Created:</span> {new Date(selectedUserDetails.createdAt).toLocaleString()}</p>
                    <p><span className="font-medium">Last login:</span> {selectedUserDetails.lastLogin ? new Date(selectedUserDetails.lastLogin).toLocaleString() : 'Never'}</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Reward history</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {userRewards.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No rewards assigned yet.</p>
                    ) : (
                      <div className="space-y-3">
                        {userRewards.map((reward) => (
                          <div key={reward.id} className="rounded-lg border p-3">
                            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                              <div>
                                <p className="font-medium">{reward.title}</p>
                                <p className="text-sm text-muted-foreground">{reward.description}</p>
                              </div>
                              <div className="flex gap-2">
                                <Badge variant="outline">{reward.type}</Badge>
                                <Badge variant={reward.isUsed ? 'secondary' : 'default'}>
                                  {reward.isUsed ? 'Used' : 'Active'}
                                </Badge>
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-muted-foreground">
                              Created: {new Date(reward.createdAt).toLocaleString()}
                              {reward.expiresAt ? ` | Expires: ${new Date(reward.expiresAt).toLocaleString()}` : ''}
                              {reward.value !== null && reward.value !== undefined ? ` | Value: ${reward.value}` : ''}
                              {reward.code ? ` | Code: ${reward.code}` : ''}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <Dialog open={showRewardDialog} onOpenChange={setShowRewardDialog}>
          <DialogContent className="w-[95vw] max-w-xl">
            <DialogHeader>
              <DialogTitle>Grant manual reward</DialogTitle>
              <DialogDescription>
                Add a manual discount, free transfer, VIP upgrade, or bonus to {selectedUser?.name || 'this user'}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleGrantReward} className="space-y-4">
              <div className="space-y-2">
                <Label>Reward type</Label>
                <Select value={rewardForm.type} onValueChange={(value) => setRewardForm(prev => ({ ...prev, type: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="WELCOME_DISCOUNT">Welcome discount</SelectItem>
                    <SelectItem value="MANUAL_TRANSFER_DISCOUNT">Transfer discount</SelectItem>
                    <SelectItem value="FREE_TRANSACTION">Free transaction</SelectItem>
                    <SelectItem value="VIP_UPGRADE">VIP upgrade</SelectItem>
                    <SelectItem value="CASH_BONUS">Cash bonus</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input value={rewardForm.title} onChange={(e) => setRewardForm(prev => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={rewardForm.description} onChange={(e) => setRewardForm(prev => ({ ...prev, description: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Value</Label>
                  <Input type="number" step="0.01" value={rewardForm.value} onChange={(e) => setRewardForm(prev => ({ ...prev, value: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>Code</Label>
                  <Input value={rewardForm.code} onChange={(e) => setRewardForm(prev => ({ ...prev, code: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Expires at</Label>
                <Input type="datetime-local" value={rewardForm.expiresAt} onChange={(e) => setRewardForm(prev => ({ ...prev, expiresAt: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowRewardDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Grant reward</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={showMessageDialog} onOpenChange={setShowMessageDialog}>
          <DialogContent className="w-[95vw] max-w-xl">
            <DialogHeader>
              <DialogTitle>Send direct message</DialogTitle>
              <DialogDescription>
                This sends an in-app admin message directly to {selectedUser?.name || 'the selected user'}.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea value={messageBody} onChange={(e) => setMessageBody(e.target.value)} rows={6} required />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setShowMessageDialog(false)}>
                  Cancel
                </Button>
                <Button type="submit">Send message</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
        </div>
      </div>
    </DashboardLayout>
  )
}
