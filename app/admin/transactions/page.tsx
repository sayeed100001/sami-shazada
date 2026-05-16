'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Search, Eye, DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface Transaction {
  id: string
  referenceCode: string
  type: string
  status: string
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
  saraf: {
    businessName: string
    user: { name: string }
  }
}

export default function AdminTransactionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
  }, [session, status, router])

  const fetchTransactions = async () => {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter && statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter && typeFilter !== 'ALL') params.append('type', typeFilter)
      
      const response = await fetch(`/api/admin/transactions?${params}`)
      if (response.ok) {
        const data = await response.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [session, searchTerm, statusFilter, typeFilter])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <Badge className="bg-green-100 text-green-800">تکمیل شده</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">در انتظار</Badge>
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">لغو شده</Badge>
      case 'WITHDRAWN':
        return <Badge className="bg-blue-100 text-blue-800">برداشت شده</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'HAWALA':
        return <Badge variant="outline">حواله</Badge>
      case 'HAWALA_REQUEST':
        return <Badge variant="outline">HAWALA REQUEST</Badge>
      case 'EXCHANGE':
        return <Badge variant="outline">تبدیل ارز</Badge>
      case 'CRYPTO':
        return <Badge variant="outline">ارز دیجیتال</Badge>
      default:
        return <Badge variant="outline">{type}</Badge>
    }
  }

  if (status === 'loading' || !session) {
    return <div>در حال بارگذاری...</div>
  }

  if (session.user.role !== 'ADMIN') {
    return <div>دسترسی غیرمجاز</div>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <DollarSign className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">نظارت بر تراکنشها</h1>
            </div>
            <p className="text-blue-50 text-lg">مشاهده و نظارت بر تمام تراکنشهای سیستم</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Stats Cards - Glass Card Style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">کل تراکنشها</p>
                  <p className="text-2xl font-bold persian-numbers">{transactions.length}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تکمیل شده</p>
                  <p className="text-2xl font-bold persian-numbers">
                    {transactions.filter(t => t.status === 'COMPLETED').length}
                  </p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">در انتظار</p>
                  <p className="text-2xl font-bold persian-numbers">
                    {transactions.filter(t => t.status === 'PENDING').length}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="glass-card hover-lift">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">حجم کل (AFN)</p>
                  <p className="text-2xl font-bold persian-numbers">
                    {transactions
                      .filter(t => t.status === 'COMPLETED')
                      .reduce((sum, t) => sum + t.toAmount, 0)
                      .toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/10 rounded-xl">
                  <TrendingUp className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
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
                <SelectTrigger className="w-full sm:w-48">
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
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="نوع تراکنش" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه انواع</SelectItem>
                  <SelectItem value="HAWALA">حواله</SelectItem>
                  <SelectItem value="HAWALA_REQUEST">درخواست حواله</SelectItem>
                  <SelectItem value="EXCHANGE">تبدیل ارز</SelectItem>
                  <SelectItem value="CRYPTO">ارز دیجیتال</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <Card>
          <CardHeader>
            <CardTitle>تراکنشها ({transactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">در حال بارگذاری...</div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>تراکنشی یافت نشد</p>
              </div>
            ) : (
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div>
                          <p className="font-medium">{transaction.referenceCode}</p>
                          <div className="flex items-center gap-2 mt-1">
                            {getTypeBadge(transaction.type)}
                            {getStatusBadge(transaction.status)}
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm" className="min-w-[44px] h-9">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">مبلغ و ارز</p>
                        <p className="font-medium">
                          {transaction.fromAmount.toLocaleString()} {transaction.fromCurrency}
                          {' → '}
                          {transaction.toAmount.toLocaleString()} {transaction.toCurrency}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          نرخ: {transaction.rate.toLocaleString()}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">فرستنده و گیرنده</p>
                        <p className="font-medium">{transaction.senderName}</p>
                        <p className="text-xs text-muted-foreground">
                          به {transaction.receiverName} - {transaction.receiverCity}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">صراف</p>
                        <p className="font-medium">{transaction.saraf?.businessName}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.saraf?.user?.name}
                        </p>
                      </div>
                      
                      <div>
                        <p className="text-muted-foreground">تاریخ</p>
                        <p className="font-medium">
                          {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                        </p>
                        {transaction.completedAt && (
                          <p className="text-xs text-muted-foreground">
                            تکمیل: {new Date(transaction.completedAt).toLocaleDateString('fa-IR')}
                          </p>
                        )}
                      </div>
                    </div>
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
