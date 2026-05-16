'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Search, Package, Clock, CheckCircle, XCircle, Phone, User, MapPin, DollarSign, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import { formatCurrency, getTimeAgo } from '@/lib/utils'
import { EnhancedSarafChatWidget } from '@/components/chat/EnhancedSarafChatWidget'
import { TransactionShareDialog } from '@/components/social/TransactionShareDialog'

interface Transaction {
  id: string
  referenceCode: string
  type: string
  status: 'PENDING' | 'COMPLETED' | 'WITHDRAWN' | 'CANCELLED'
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  rate: number
  fee: number
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  senderCountry?: string
  senderCity?: string
  receiverCity: string
  saraf: {
    id: string
    businessName: string
    businessPhone: string
    businessAddress?: string
    rating: number
    isActive: boolean
    isPremium: boolean
  }
  createdAt: string
  completedAt?: string
  notes?: string
}

export default function HawalaTrackPage() {
  const [referenceCode, setReferenceCode] = useState('')
  const [transaction, setTransaction] = useState<Transaction | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showChat, setShowChat] = useState(false)

  const handleTrack = async () => {
    if (!referenceCode.trim()) {
      setError('لطفاً کد رهگیری را وارد کنید')
      return
    }

    setIsLoading(true)
    setError('')
    setTransaction(null)

    try {
      const response = await fetch(`/api/hawala/track/${encodeURIComponent(referenceCode)}`)
      
      if (!response.ok) {
        if (response.status === 401) {
          setError('برای پیگیری حواله لطفاً وارد حساب خود شوید. (برای پیگیری بدون ورود از صفحه /track استفاده کنید)')
          return
        }
        if (response.status === 403) {
          setError('شما اجازه مشاهده این حواله را ندارید')
          return
        }
        if (response.status === 404) {
          setError('تراکنشی با این کد رهگیری یافت نشد')
        } else {
          setError('خطا در جستجو')
        }
        return
      }

      const data = await response.json()
      setTransaction(data)
    } catch (error) {
      setError('خطا در اتصال به سرور')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'COMPLETED':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'WITHDRAWN':
        return <Package className="h-5 w-5 text-blue-500" />
      case 'CANCELLED':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'در انتظار'
      case 'COMPLETED':
        return 'تکمیل شده'
      case 'WITHDRAWN':
        return 'تحویل داده شده'
      case 'CANCELLED':
        return 'لغو شده'
      default:
        return status
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'WITHDRAWN':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'CANCELLED':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            پیگیری حواله
          </h1>
          <p className="text-lg text-muted-foreground">
            وضعیت حواله خود را با کد رهگیری پیگیری کنید
          </p>
        </div>

        {/* Search Form */}
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              جستجوی حواله
            </CardTitle>
            <CardDescription>
              کد رهگیری حواله خود را وارد کنید
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="referenceCode">کد رهگیری</Label>
              <Input
                id="referenceCode"
                type="text"
                value={referenceCode}
                onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
                placeholder="مثال: SH1234567890"
                className="text-center font-mono"
                onKeyPress={(e) => e.key === 'Enter' && handleTrack()}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button onClick={handleTrack} className="w-full" disabled={isLoading}>
              {isLoading ? (
                <div className="loading-spinner" />
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  پیگیری
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Transaction Details */}
        {transaction && (
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    {getStatusIcon(transaction.status)}
                    وضعیت حواله
                  </CardTitle>
                  <Badge className={getStatusColor(transaction.status)}>
                    {getStatusText(transaction.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">کد رهگیری</Label>
                    <p className="font-mono text-lg font-bold">{transaction.referenceCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">تاریخ ایجاد</Label>
                    <p>{getTimeAgo(new Date(transaction.createdAt))}</p>
                  </div>
                  {transaction.completedAt && (
                    <div>
                      <Label className="text-sm text-muted-foreground">تاریخ تکمیل</Label>
                      <p>{getTimeAgo(new Date(transaction.completedAt))}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Transaction Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Sender Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    اطلاعات فرستنده
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">نام</Label>
                    <p className="font-medium">{transaction.senderName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">تلفن</Label>
                    <p className="persian-numbers">{transaction.senderPhone}</p>
                  </div>
                  {transaction.senderCountry && (
                    <div>
                      <Label className="text-sm text-muted-foreground">کشور</Label>
                      <p>{transaction.senderCountry}</p>
                    </div>
                  )}
                  {transaction.senderCity && (
                    <div>
                      <Label className="text-sm text-muted-foreground">شهر</Label>
                      <p>{transaction.senderCity}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Receiver Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    اطلاعات گیرنده
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <Label className="text-sm text-muted-foreground">نام</Label>
                    <p className="font-medium">{transaction.receiverName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">تلفن</Label>
                    <p className="persian-numbers">{transaction.receiverPhone}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">شهر</Label>
                    <p>{transaction.receiverCity}</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Financial Details */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  جزئیات مالی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">مبلغ ارسالی</Label>
                    <p className="font-bold persian-numbers">
                      {formatCurrency(transaction.fromAmount, transaction.fromCurrency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">مبلغ دریافتی</Label>
                    <p className="font-bold persian-numbers">
                      {formatCurrency(transaction.toAmount, transaction.toCurrency)}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">نرخ تبدیل</Label>
                    <p className="persian-numbers">{transaction.rate.toFixed(4)}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">کارمزد</Label>
                    <p className="persian-numbers">
                      {formatCurrency(transaction.fee, transaction.toCurrency)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Saraf Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  اطلاعات صرافی
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-muted-foreground">نام صرافی</Label>
                    <p className="font-medium">{transaction.saraf.businessName}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">تلفن صرافی</Label>
                    <p className="persian-numbers">{transaction.saraf.businessPhone}</p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <TransactionShareDialog
                    transactionId={transaction.id}
                    defaultTitle={`${transaction.referenceCode} status update`}
                  />
                  <Button onClick={() => setShowChat(true)} variant="outline">
                    <MessageCircle className="h-4 w-4 mr-2" />
                    گفتگو با صراف
                  </Button>
                  <Button asChild variant="outline">
                    <a href={`/sarafs/${transaction.saraf.id}`}>مشاهده پروفایل صراف</a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Notes */}
            {transaction.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>یادداشت</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>{transaction.notes}</p>
                </CardContent>
              </Card>
            )}

            {/* Contact Info */}
            <Card>
              <CardContent className="text-center py-6">
                <Phone className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  برای اطلاعات بیشتر با صرافی تماس بگیرید
                </p>
                <p className="font-medium persian-numbers">
                  {transaction.saraf.businessPhone}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
        {showChat && transaction ? (
          <EnhancedSarafChatWidget
            sarafId={transaction.saraf.id}
            sarafInfo={{
              id: transaction.saraf.id,
              businessName: transaction.saraf.businessName,
              businessPhone: transaction.saraf.businessPhone,
              businessAddress: transaction.saraf.businessAddress,
              rating: transaction.saraf.rating,
              isActive: transaction.saraf.isActive,
              isPremium: transaction.saraf.isPremium,
            }}
            onClose={() => setShowChat(false)}
          />
        ) : null}
      </div>
    </DashboardLayout>
  )
}
