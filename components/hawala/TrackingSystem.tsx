'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Search, MapPin, User, Phone, DollarSign, Calendar, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface Transaction {
  id: string
  referenceCode: string
  status: string
  type: string
  fromAmount: number
  toAmount: number
  fromCurrency: string
  toCurrency: string
  rate: number
  fee: number
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  receiverCity: string
  receiverCountry?: string
  senderCountry?: string
  notes?: string
  createdAt: string
  completedAt?: string
  saraf?: {
    businessName: string
    businessPhone: string
    businessAddress: string
  }
}

export function TrackingSystem() {
  const [trackingCode, setTrackingCode] = useState('')
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // Listen for tracking code from parent component
    const handleSetTrackingCode = (event: CustomEvent) => {
      setTrackingCode(event.detail)
      handleTrack(event.detail)
    }

    window.addEventListener('setTrackingCode', handleSetTrackingCode as EventListener)
    return () => {
      window.removeEventListener('setTrackingCode', handleSetTrackingCode as EventListener)
    }
  }, [])

  const handleTrack = async (code?: string) => {
    const codeToTrack = code || trackingCode
    if (!codeToTrack.trim()) {
      toast.error('لطفاً کد پیگیری را وارد کنید')
      return
    }

    setLoading(true)
    setError('')
    setTransaction(null)

    try {
      const response = await fetch(`/api/hawala/track/${encodeURIComponent(codeToTrack)}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('برای پیگیری حواله لطفاً وارد حساب خود شوید.')
          return
        }
        if (response.status === 403) {
          setError('شما اجازه مشاهده این حواله را ندارید')
          return
        }
        if (response.status === 404) {
          setError('حواله با این کد پیگیری یافت نشد')
        } else {
          setError('خطا در دریافت اطلاعات حواله')
        }
        return
      }

      const data = await response.json()
      setTransaction(data)
      toast.success('اطلاعات حواله یافت شد')

    } catch (error) {
      console.error('Tracking error:', error)
      setError('خطا در اتصال به سرور')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      PENDING: {
        label: 'در انتظار',
        color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
        icon: Clock
      },
      COMPLETED: {
        label: 'تکمیل شده',
        color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        icon: CheckCircle
      },
      CANCELLED: {
        label: 'لغو شده',
        color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
        icon: XCircle
      },
      WITHDRAWN: {
        label: 'برداشت شده',
        color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        icon: CheckCircle
      }
    }

    const config = statusConfig[status as keyof typeof statusConfig] || {
      label: status,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
      icon: AlertCircle
    }

    const IconComponent = config.icon

    return (
      <Badge className={config.color}>
        <IconComponent className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number, currency: string) => {
    const symbols = {
      AFN: '؋',
      USD: '$',
      EUR: '€',
      GBP: '£',
      PKR: '₨',
      IRR: '﷼'
    }
    
    return `${amount.toLocaleString('fa-IR')} ${symbols[currency as keyof typeof symbols] || currency}`
  }

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            پیگیری حواله
          </CardTitle>
          <CardDescription>
            کد پیگیری حواله خود را وارد کنید تا وضعیت آن را مشاهده کنید
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="trackingCode">کد پیگیری</Label>
              <Input
                id="trackingCode"
                placeholder="مثال: HW-2024-001234"
                value={trackingCode}
                onChange={(e) => setTrackingCode(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleTrack()}
                className="mt-1"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={() => handleTrack()} disabled={loading || !trackingCode.trim()}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    در حال جستجو...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    پیگیری
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Message */}
      {error && (
        <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <XCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction Details */}
      {transaction && (
        <div className="space-y-6">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>وضعیت حواله</CardTitle>
                {getStatusBadge(transaction.status)}
              </div>
              <CardDescription>
                کد پیگیری: <span className="font-mono font-medium">{transaction.referenceCode}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">تاریخ ایجاد</p>
                    <p className="font-medium">{formatDate(transaction.createdAt)}</p>
                  </div>
                </div>
                {transaction.completedAt && (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <div>
                      <p className="text-sm text-muted-foreground">تاریخ تکمیل</p>
                      <p className="font-medium">{formatDate(transaction.completedAt)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transaction Amount */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                جزئیات مالی
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">مبلغ ارسالی</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(transaction.fromAmount, transaction.fromCurrency)}
                    </p>
                  </div>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">مبلغ دریافتی</p>
                    <p className="text-2xl font-bold">
                      {formatCurrency(transaction.toAmount, transaction.toCurrency)}
                    </p>
                  </div>
                </div>
                
                <Separator />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">نرخ تبدیل:</span>
                    <span className="font-mono">
                      1 {transaction.fromCurrency} = {transaction.rate} {transaction.toCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">کارمزد:</span>
                    <span className="font-mono">
                      {formatCurrency(transaction.fee, transaction.toCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sender & Receiver Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sender */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  فرستنده
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">نام</p>
                  <p className="font-medium">{transaction.senderName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{transaction.senderPhone}</span>
                </div>
                {transaction.senderCountry && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{transaction.senderCountry}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Receiver */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  گیرنده
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">نام</p>
                  <p className="font-medium">{transaction.receiverName}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{transaction.receiverPhone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>{transaction.receiverCity}, {transaction.receiverCountry || 'افغانستان'}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Saraf Information */}
          {transaction.saraf && (
            <Card>
              <CardHeader>
                <CardTitle>اطلاعات صرافی</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">نام صرافی</p>
                    <p className="font-medium">{transaction.saraf.businessName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono">{transaction.saraf.businessPhone}</span>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-sm text-muted-foreground">آدرس</p>
                    <p className="font-medium">{transaction.saraf.businessAddress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {transaction.notes && (
            <Card>
              <CardHeader>
                <CardTitle>یادداشت</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{transaction.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Status Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>وضعیت حواله</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">حواله ایجاد شد</p>
                    <p className="text-sm text-muted-foreground">{formatDate(transaction.createdAt)}</p>
                  </div>
                </div>
                
                {transaction.status === 'COMPLETED' && transaction.completedAt && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">حواله تکمیل شد</p>
                      <p className="text-sm text-muted-foreground">{formatDate(transaction.completedAt)}</p>
                    </div>
                  </div>
                )}
                
                {transaction.status === 'PENDING' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">در انتظار پردازش</p>
                      <p className="text-sm text-muted-foreground">حواله در حال بررسی است</p>
                    </div>
                  </div>
                )}
                
                {transaction.status === 'CANCELLED' && (
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center">
                      <XCircle className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-medium">حواله لغو شد</p>
                      <p className="text-sm text-muted-foreground">حواله توسط صرافی لغو شده است</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
