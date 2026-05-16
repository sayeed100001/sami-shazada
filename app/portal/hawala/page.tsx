'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Plus, Search, Filter, Eye, CheckCircle, Clock, XCircle, Building2, MapPin, Phone, User, DollarSign, Calendar } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  referenceCode: string
  type: string
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  senderName: string
  senderPhone: string
  senderCity: string
  senderCountry: string
  receiverName: string
  receiverPhone: string
  receiverCity: string
  receiverCountry: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  rate: number
  fee: number
  notes?: string
  createdAt: string
  completedAt?: string
  branchId?: string
  branchName?: string
}

interface Branch {
  id: string
  name: string
  address: string
  phone: string
  city: string
  country: string
  isActive: boolean
}

export default function HawalaPortalPage() {
  const { data: session } = useSession()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [branchFilter, setBranchFilter] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const limit = 20

  useEffect(() => {
    fetchTransactions()
    fetchBranches()
  }, [page, statusFilter, branchFilter, searchQuery])

  const fetchTransactions = async () => {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      })
      
      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (branchFilter !== 'ALL') params.append('branchId', branchFilter)
      if (searchQuery) params.append('search', searchQuery)
      
      const response = await fetch(`/api/portal/hawala?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/portal/branches')
      if (response.ok) {
        const data = await response.json()
        setBranches(data.branches || [])
      }
    } catch (error) {
      console.error('Error fetching branches:', error)
    }
  }

  const updateTransactionStatus = async (transactionId: string, status: string) => {
    try {
      const response =
        status === 'COMPLETED'
          ? await fetch(`/api/portal/hawala/${transactionId}/confirm-payment`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({}),
            })
          : await fetch(`/api/portal/hawala/${transactionId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status }),
            })
      if (response.ok) {
        fetchTransactions()
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-500" />
      case 'COMPLETED': return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'CANCELLED': return <XCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      PENDING: 'default',
      COMPLETED: 'default',
      CANCELLED: 'destructive'
    } as const
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'default'}>
        {status === 'PENDING' ? 'در انتظار' : 
         status === 'COMPLETED' ? 'تکمیل شده' : 
         status === 'CANCELLED' ? 'لغو شده' : status}
      </Badge>
    )
  }

  const stats = {
    total: transactions.length,
    pending: transactions.filter(t => t.status === 'PENDING').length,
    completed: transactions.filter(t => t.status === 'COMPLETED').length,
    cancelled: transactions.filter(t => t.status === 'CANCELLED').length,
    totalVolume: transactions
      .filter(t => t.status === 'COMPLETED')
      .reduce((sum, t) => sum + t.toAmount, 0)
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">مدیریت حواله</h1>
            <p className="text-muted-foreground">مدیریت تراکنش‌های حواله و شعب</p>
          </div>
          <Link href="/portal/hawala/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              حواله جدید
            </Button>
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">کل تراکنش‌ها</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <div>
                  <p className="text-sm text-muted-foreground">در انتظار</p>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">تکمیل شده</p>
                  <p className="text-2xl font-bold">{stats.completed}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <div>
                  <p className="text-sm text-muted-foreground">لغو شده</p>
                  <p className="text-2xl font-bold">{stats.cancelled}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-sm text-muted-foreground">حجم کل</p>
                  <p className="text-lg font-bold">{stats.totalVolume.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="جستجو بر اساس کد پیگیری، نام فرستنده یا گیرنده..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="وضعیت" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه وضعیت‌ها</SelectItem>
                  <SelectItem value="PENDING">در انتظار</SelectItem>
                  <SelectItem value="COMPLETED">تکمیل شده</SelectItem>
                  <SelectItem value="CANCELLED">لغو شده</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={branchFilter} onValueChange={setBranchFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="شعبه" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه شعب</SelectItem>
                  {branches.map(branch => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>تراکنش‌های حواله</CardTitle>
            <CardDescription>
              {transactions.length} تراکنش یافت شد
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                هیچ تراکنشی یافت نشد
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                  <Card key={transaction.id} className="border-l-4 border-l-blue-500">
                    <CardContent className="p-4">
                      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                        {/* Transaction Info */}
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{transaction.referenceCode}</Badge>
                            {getStatusBadge(transaction.status)}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            <Calendar className="inline h-3 w-3 mr-1" />
                            {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                          </div>
                          {transaction.branchName && (
                            <div className="text-sm text-muted-foreground">
                              <Building2 className="inline h-3 w-3 mr-1" />
                              {transaction.branchName}
                            </div>
                          )}
                        </div>

                        {/* Sender Info */}
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">فرستنده</h4>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {transaction.senderName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {transaction.senderPhone}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {transaction.senderCity}, {transaction.senderCountry}
                            </div>
                          </div>
                        </div>

                        {/* Receiver Info */}
                        <div className="space-y-1">
                          <h4 className="font-medium text-sm">گیرنده</h4>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {transaction.receiverName}
                            </div>
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {transaction.receiverPhone}
                            </div>
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {transaction.receiverCity}, {transaction.receiverCountry}
                            </div>
                          </div>
                        </div>

                        {/* Amount & Actions */}
                        <div className="space-y-2">
                          <div className="text-sm">
                            <div className="font-medium">
                              {transaction.fromAmount.toLocaleString()} {transaction.fromCurrency}
                            </div>
                            <div className="text-muted-foreground">
                              → {transaction.toAmount.toLocaleString()} {transaction.toCurrency}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              نرخ: {transaction.rate} | کارمزد: {transaction.fee}
                            </div>
                          </div>
                          
                          <div className="flex gap-2">
                            {transaction.status === 'PENDING' && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => updateTransactionStatus(transaction.id, 'COMPLETED')}
                                >
                                  تکمیل
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => updateTransactionStatus(transaction.id, 'CANCELLED')}
                                >
                                  لغو
                                </Button>
                              </>
                            )}
                            <Button size="sm" variant="ghost">
                              <Eye className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    قبلی
                  </Button>
                  <span className="flex items-center px-4 text-sm">
                    صفحه {page} از {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    بعدی
                  </Button>
                </div>
              )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
