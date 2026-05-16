'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Send, User, Phone, MapPin, DollarSign, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface HawalaRequestFormProps {
  sarafId: string
  sarafName: string
  onSuccess?: (result: {
    referenceCode: string
    transaction?: {
      id: string
      referenceCode: string
      status: string
      fromAmount: number
      toAmount: number
      fromCurrency: string
      toCurrency: string
      rate: number
      createdAt: string
      saraf: {
        businessName: string
        businessPhone: string
        businessAddress: string
      }
    }
  }) => void
}

export function HawalaRequestForm({ sarafId, sarafName, onSuccess }: HawalaRequestFormProps) {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [referenceCode, setReferenceCode] = useState('')
  
  const [formData, setFormData] = useState({
    senderTazkiraNumber: '',
    receiverName: '',
    receiverPhone: '',
    receiverCity: '',
    receiverCountry: 'افغانستان',
    receiverTazkiraNumber: '',
    fromAmount: '',
    fromCurrency: 'AFN',
    toCurrency: 'USD',
    notes: ''
  })

  const currencies = [
    { code: 'AFN', name: 'افغانی', symbol: '؋' },
    { code: 'USD', name: 'دلار آمریکا', symbol: '$' },
    { code: 'EUR', name: 'یورو', symbol: '€' },
    { code: 'GBP', name: 'پوند', symbol: '£' },
    { code: 'PKR', name: 'روپیه پاکستان', symbol: '₨' },
    { code: 'IRR', name: 'ریال ایران', symbol: '﷼' }
  ]

  const cities = [
    'کابل',
    'هرات',
    'مزار شریف',
    'قندهار',
    'جلال آباد',
    'کندز',
    'بلخ',
    'بامیان',
    'غزنی',
    'پکتیا'
  ]

  // Redirect to login if not authenticated
  if (!session?.user) {
    return (
      <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-blue-600 mx-auto" />
            <div>
              <h3 className="text-xl font-bold text-blue-900 dark:text-blue-100 mb-2">
                برای ثبت درخواست حواله باید وارد شوید
              </h3>
              <p className="text-blue-700 dark:text-blue-300 mb-6">
                برای ثبت درخواست حواله و استفاده از امکانات سیستم، لطفاً ابتدا وارد حساب کاربری خود شوید یا ثبتنام کنید.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="bg-blue-600 hover:bg-blue-700">
                <Link href="/auth/signin">
                  ورود به حساب
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="border-blue-600 text-blue-600">
                <Link href="/auth/signup">
                  ثبتنام رایگان
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!formData.receiverName || !formData.receiverPhone || !formData.receiverCity || !formData.fromAmount) {
      toast.error('لطفاً تمام فیلدهای ضروری را پر کنید')
      return
    }

    if (parseFloat(formData.fromAmount) <= 0) {
      toast.error('مبلغ باید بیشتر از صفر باشد')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/hawala/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          fromAmount: parseFloat(formData.fromAmount),
          sarafId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'خطا در ثبت درخواست')
      }

      const data = await response.json()
      setReferenceCode(data.referenceCode)
      setSuccess(true)
      onSuccess?.({
        referenceCode: data.referenceCode,
        transaction: data.transaction,
      })
      toast.success('درخواست حواله با موفقیت ثبت شد!')
      
      // Reset form
      setFormData({
        senderTazkiraNumber: '',
        receiverName: '',
        receiverPhone: '',
        receiverCity: '',
        receiverCountry: 'افغانستان',
        receiverTazkiraNumber: '',
        fromAmount: '',
        fromCurrency: 'AFN',
        toCurrency: 'USD',
        notes: ''
      })

    } catch (error) {
      console.error('Hawala request error:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در ثبت درخواست')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-100 mb-2">
                درخواست حواله ثبت شد!
              </h3>
              <p className="text-green-700 dark:text-green-300 mb-4">
                کد پیگیری شما:
              </p>
              <div className="bg-white dark:bg-gray-800 border-2 border-green-300 dark:border-green-700 rounded-lg p-4 mb-4">
                <p className="text-3xl font-mono font-bold text-green-600 dark:text-green-400">
                  {referenceCode}
                </p>
              </div>
              <Alert className="mb-6">
                <AlertDescription className="text-sm">
                  <strong>مراحل بعدی:</strong>
                  <ol className="list-decimal list-inside mt-2 space-y-1">
                    <li>به صرافی <strong>{sarafName}</strong> مراجعه کنید</li>
                    <li>کد پیگیری را به صراف نشان دهید</li>
                    <li>پول را پرداخت کنید</li>
                    <li>صراف حواله را ارسال میکند</li>
                    <li>شما امتیاز وفاداری دریافت میکنید</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(referenceCode)
                  toast.success('کد پیگیری کپی شد')
                }}
                variant="outline"
                className="border-green-600 text-green-600 hover:bg-green-50"
              >
                کپی کد پیگیری
              </Button>
              
              <Button 
                onClick={() => setSuccess(false)}
                className="bg-green-600 hover:bg-green-700"
              >
                ثبت درخواست جدید
              </Button>
              
              <Button 
                asChild
                variant="outline"
              >
                <Link href="/hawala/track">
                  پیگیری درخواست
                  <ArrowRight className="mr-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          ثبت درخواست حواله از {sarafName}
        </CardTitle>
        <CardDescription>
          اطلاعات گیرنده و مبلغ مورد نظر را وارد کنید. بعد از تایید، به صرافی مراجعه کنید.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Alert className="mb-6">
          <AlertDescription>
            <strong>توجه:</strong> این فقط یک درخواست است. برای ارسال حواله باید به صرافی مراجعه کرده و پول را پرداخت کنید.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Receiver Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <User className="h-5 w-5" />
              اطلاعات گیرنده
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-lg border border-border/60 p-4">
              <div>
                <Label htmlFor="senderTazkiraNumber">شماره تذکره فرستنده (اختیاری)</Label>
                <Input
                  id="senderTazkiraNumber"
                  value={formData.senderTazkiraNumber}
                  onChange={(e) => handleChange('senderTazkiraNumber', e.target.value)}
                  placeholder="شماره تذکره فرستنده"
                />
              </div>

              <div>
                <Label htmlFor="receiverTazkiraNumber">شماره تذکره گیرنده (اختیاری)</Label>
                <Input
                  id="receiverTazkiraNumber"
                  value={formData.receiverTazkiraNumber}
                  onChange={(e) => handleChange('receiverTazkiraNumber', e.target.value)}
                  placeholder="شماره تذکره گیرنده"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="receiverName">نام گیرنده *</Label>
                <Input
                  id="receiverName"
                  value={formData.receiverName}
                  onChange={(e) => handleChange('receiverName', e.target.value)}
                  placeholder="نام کامل"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="receiverPhone">شماره تماس *</Label>
                <Input
                  id="receiverPhone"
                  value={formData.receiverPhone}
                  onChange={(e) => handleChange('receiverPhone', e.target.value)}
                  placeholder="+93 700 000 000"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="receiverCity">شهر *</Label>
                <Select value={formData.receiverCity} onValueChange={(value) => handleChange('receiverCity', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="انتخاب شهر" />
                  </SelectTrigger>
                  <SelectContent>
                    {cities.map(city => (
                      <SelectItem key={city} value={city}>{city}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="receiverCountry">کشور</Label>
                <Input
                  id="receiverCountry"
                  value={formData.receiverCountry}
                  onChange={(e) => handleChange('receiverCountry', e.target.value)}
                  placeholder="افغانستان"
                />
              </div>
            </div>
          </div>

          {/* Amount Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <DollarSign className="h-5 w-5" />
              اطلاعات مالی
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="fromAmount">مبلغ *</Label>
                <Input
                  id="fromAmount"
                  type="number"
                  step="0.01"
                  value={formData.fromAmount}
                  onChange={(e) => handleChange('fromAmount', e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="fromCurrency">ارز مبدا</Label>
                <Select value={formData.fromCurrency} onValueChange={(value) => handleChange('fromCurrency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="toCurrency">ارز مقصد</Label>
                <Select value={formData.toCurrency} onValueChange={(value) => handleChange('toCurrency', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map(currency => (
                      <SelectItem key={currency.code} value={currency.code}>
                        {currency.symbol} {currency.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">یادداشت (اختیاری)</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleChange('notes', e.target.value)}
              placeholder="توضیحات اضافی..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex flex-col gap-3">
            <Button 
              type="submit" 
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-lg py-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white ml-2"></div>
                  در حال ثبت...
                </>
              ) : (
                <>
                  <Send className="ml-2 h-5 w-5" />
                  ثبت درخواست حواله
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
