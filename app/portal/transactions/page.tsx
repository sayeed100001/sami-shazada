'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Search, Eye, CheckCircle, XCircle, DollarSign, Clock, TrendingUp, MessageCircle, Ban } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { isPortalRole } from '@/lib/portal-access'

interface Transaction {
  id: string
  referenceCode: string
  type: string
  status: string
  senderId?: string | null
  senderPhone?: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  rate: number
  fee: number
  senderName: string
  receiverName: string
  receiverCity: string
  createdAt: string
  completedAt?: string
}

export default function PortalTransactionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set())
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  const [blacklistingTransactionId, setBlacklistingTransactionId] = useState<string | null>(null)
  const [startingChatTransactionId, setStartingChatTransactionId] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (!isPortalRole(session.user.role)) {
      router.push('/')
      return
    }
  }, [session, status, router])

  const fetchTransactions = async () => {
    if (!session?.user) return
    
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ limit: '50' })
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)
      
      const response = await fetch(`/api/portal/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
      toast({
        title: 'خطا',
        description: 'دریافت تراکنشها با خطا مواجه شد',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [session, statusFilter, searchTerm])

  const handleStatusUpdate = async (transaction: Transaction, newStatus: string) => {
    // Optimistic update
    const previousTransactions = [...transactions]
    setTransactions(transactions.map(t => 
      t.id === transaction.id ? { ...t, status: newStatus } : t
    ))

    try {
      const response =
        transaction.type === 'HAWALA' && newStatus === 'COMPLETED'
          ? await fetch(`/api/portal/hawala/${transaction.id}/confirm-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
          : await fetch('/api/portal/transactions', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ id: transaction.id, status: newStatus })
            })

      if (response.ok) {
        toast({ title: 'موفق', description: 'وضعیت تراکنش بروزرسانی شد' })
      } else {
        setTransactions(previousTransactions)
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed to update status')
      }
    } catch (error) {
      setTransactions(previousTransactions)
      console.error('Failed to update status:', error)
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'بروزرسانی وضعیت با خطا مواجه شد',
        variant: 'destructive'
      })
    }
  }

  const handleBulkAction = async (action: 'CANCELLED') => {
    if (selectedTransactions.size === 0) {
      toast({ title: 'خطا', description: 'لطفاً حداقل یک تراکنش انتخاب کنید', variant: 'destructive' })
      return
    }

    setBulkActionLoading(true)
    const previousTransactions = [...transactions]
    
    // Optimistic update
    setTransactions(transactions.map(t => 
      selectedTransactions.has(t.id) ? { ...t, status: action } : t
    ))

    try {
      const promises = Array.from(selectedTransactions).map(id =>
        fetch('/api/portal/transactions', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, status: action })
        })
      )

      const results = await Promise.all(promises)
      const allSuccess = results.every(r => r.ok)

      if (allSuccess) {
        toast({ 
          title: 'موفق', 
          description: `${selectedTransactions.size} تراکنش لغو شد` 
        })
        setSelectedTransactions(new Set())
      } else {
        setTransactions(previousTransactions)
        throw new Error('Some updates failed')
      }
    } catch (error) {
      setTransactions(previousTransactions)
      console.error('Bulk action failed:', error)
      toast({ title: 'خطا', description: 'عملیات گروهی با خطا مواجه شد', variant: 'destructive' })
    } finally {
      setBulkActionLoading(false)
    }
  }

  const toggleSelectTransaction = (id: string) => {
    const newSelected = new Set(selectedTransactions)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedTransactions(newSelected)
  }

  const toggleSelectAll = () => {
    if (selectedTransactions.size === transactions.filter(t => t.status === 'PENDING' && t.type !== 'HAWALA' && t.type !== 'HAWALA_REQUEST').length) {
      setSelectedTransactions(new Set())
    } else {
      setSelectedTransactions(new Set(transactions.filter(t => t.status === 'PENDING' && t.type !== 'HAWALA' && t.type !== 'HAWALA_REQUEST').map(t => t.id)))
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">تکمیل شده</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">در انتظار</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">لغو شده</Badge>
      case 'WITHDRAWN':
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">برداشت شده</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HAWALA':
        return <Badge variant="outline">HAWALA</Badge>
      case 'HAWALA_REQUEST':
        return <Badge variant="outline">درخواست حواله</Badge>
      case 'EXCHANGE':
        return <Badge variant="outline">EXCHANGE</Badge>
      case 'CRYPTO':
        return <Badge variant="outline">CRYPTO</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  const canStartDirectUserChat = session?.user?.role === 'SARAF'

  const handleBlacklistSender = async (transaction: Transaction) => {
    if (!transaction.senderPhone) {
      toast({
        title: 'خطا',
        description: 'شماره تماس فرستنده موجود نیست',
        variant: 'destructive'
      })
      return
    }

    const confirmed = window.confirm(`شماره ${transaction.senderPhone} برای این صراف در بلک لیست ثبت شود؟`)
    if (!confirmed) {
      return
    }

    setBlacklistingTransactionId(transaction.id)
    try {
      const response = await fetch('/api/portal/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PHONE',
          value: transaction.senderPhone,
          reason: `Sender blacklisted from transaction ${transaction.referenceCode}`,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok && response.status !== 409) {
        throw new Error(payload?.error || 'Failed to blacklist sender')
      }

      toast({
        title: 'موفق',
        description:
          response.status === 409
            ? 'این شماره قبلاً در بلک لیست ثبت شده است'
            : 'کاربر در بلک لیست ثبت شد',
      })
    } catch (error) {
      console.error('Blacklist sender error:', error)
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'ثبت بلک لیست با خطا مواجه شد',
        variant: 'destructive'
      })
    } finally {
      setBlacklistingTransactionId(null)
    }
  }

  const handleStartChat = async (transaction: Transaction) => {
    if (!transaction.senderId) {
      toast({
        title: 'خطا',
        description: 'شناسه کاربر برای شروع گفتگو در دسترس نیست',
        variant: 'destructive'
      })
      return
    }

    setStartingChatTransactionId(transaction.id)
    try {
      const response = await fetch('/api/saraf-chat/direct-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: transaction.senderId }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.sessionId) {
        throw new Error(payload?.error || 'Failed to start chat')
      }

      router.push(`/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(payload.sessionId)}`)
    } catch (error) {
      console.error('Start chat error:', error)
      toast({
        title: 'خطا',
        description: error instanceof Error ? error.message : 'شروع گفتگو با خطا مواجه شد',
        variant: 'destructive'
      })
    } finally {
      setStartingChatTransactionId(null)
    }
  }

  if (status === 'loading' || !session || !isPortalRole(session.user.role)) {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-purple-500 via-pink-500 to-rose-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <TrendingUp className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold">مدیریت تراکنشها</h1>
                <p className="text-purple-50 text-lg">مشاهده و مدیریت تراکنشهای صرافی</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-rose-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <Card className="glass-card hover-lift border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">کل تراکنشها</p>
                  <p className="text-2xl font-bold">{transactions.length}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">در انتظار</p>
                  <p className="text-2xl font-bold">{transactions.filter(t => t.status === 'PENDING').length}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift border-0 shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تکمیل شده</p>
                  <p className="text-2xl font-bold">{transactions.filter(t => t.status === 'COMPLETED').length}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-card border-0 shadow-lg">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجو بر اساس کد پیگیری، نام فرستنده یا گیرنده..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه وضعیتها</SelectItem>
                  <SelectItem value="PENDING">در انتظار</SelectItem>
                  <SelectItem value="COMPLETED">تکمیل شده</SelectItem>
                  <SelectItem value="CANCELLED">لغو شده</SelectItem>
                  <SelectItem value="WITHDRAWN">برداشت شده</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>تراکنشها ({transactions.length})</CardTitle>
              {selectedTransactions.size > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {selectedTransactions.size} انتخاب شده
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleBulkAction('CANCELLED')}
                    disabled={bulkActionLoading}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    لغو همه
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent mb-4"></div>
                <p className="text-muted-foreground">در حال بارگذاری تراکنشها...</p>
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>تراکنشی یافت نشد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.filter(t => t.status === 'PENDING' && t.type !== 'HAWALA' && t.type !== 'HAWALA_REQUEST').length > 0 && (
                  <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                    <Checkbox
                      checked={selectedTransactions.size === transactions.filter(t => t.status === 'PENDING' && t.type !== 'HAWALA' && t.type !== 'HAWALA_REQUEST').length}
                      onCheckedChange={() => toggleSelectAll()}
                    />
                    <span className="text-sm">انتخاب همه تراکنشهای در انتظار</span>
                  </div>
                )}
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="glass-card border-0 shadow-md p-4 rounded-xl hover:shadow-lg transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {transaction.status === 'PENDING' && transaction.type !== 'HAWALA_REQUEST' && transaction.type !== 'HAWALA' && (
                          <Checkbox
                            checked={selectedTransactions.has(transaction.id)}
                            onCheckedChange={() => toggleSelectTransaction(transaction.id)}
                            className="mt-1"
                          />
                        )}
                        <div>
                          <p className="font-medium">{transaction.referenceCode}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(transaction.status)}
                            {getTypeBadge(transaction.type)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {transaction.status === 'PENDING' && transaction.type !== 'HAWALA_REQUEST' && (
                          <>
                            {transaction.type === 'HAWALA' ? (
                              <Button size="sm" onClick={() => handleStatusUpdate(transaction, 'COMPLETED')}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                تایید پرداخت
                              </Button>
                            ) : transaction.type === 'EXCHANGE' ? (
                              <Button size="sm" onClick={() => handleStatusUpdate(transaction, 'COMPLETED')}>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                تایید و تکمیل تبادله
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStatusUpdate(transaction, 'CANCELLED')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              لغو
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-muted-foreground text-xs">مبلغ و ارز</p>
                        <p className="font-medium">
                          {transaction.fromAmount.toLocaleString()} {transaction.fromCurrency}
                          {' → '}
                          {transaction.toAmount.toLocaleString()} {transaction.toCurrency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          نرخ: {transaction.rate.toLocaleString()} | کارمزد: {transaction.fee.toLocaleString()}
                        </p>
                      </div>
                      
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-muted-foreground text-xs">فرستنده و گیرنده</p>
                        <p className="font-medium">{transaction.senderName}</p>
                        <p className="text-xs text-muted-foreground">
                          به {transaction.receiverName} - {transaction.receiverCity}
                        </p>
                      </div>
                      
                      <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                        <p className="text-muted-foreground text-xs">تاریخ</p>
                        <p className="font-medium">
                          {new Date(transaction.createdAt).toLocaleDateString('fa-AF')}
                        </p>
                        {transaction.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            تکمیل: {new Date(transaction.completedAt).toLocaleDateString('fa-AF')}
                          </p>
                        )}
                      </div>
                    </div>

                    {canStartDirectUserChat && transaction.senderId ? (
                      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleStartChat(transaction)}
                          disabled={startingChatTransactionId === transaction.id}
                        >
                          <MessageCircle className="h-4 w-4 mr-1" />
                          {startingChatTransactionId === transaction.id ? 'در حال باز کردن گفتگو...' : 'گفتگو با کاربر'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void handleBlacklistSender(transaction)}
                          disabled={blacklistingTransactionId === transaction.id}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          {blacklistingTransactionId === transaction.id ? 'در حال ثبت...' : 'بلک لیست کاربر'}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
