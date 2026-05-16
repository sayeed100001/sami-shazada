'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, Calculator, Send, User, MapPin, Phone, DollarSign } from 'lucide-react'
import { toast } from 'sonner'

interface HawalaFormData {
  // Sender Information
  senderName: string
  senderPhone: string
  senderAddress: string
  senderIdType: string
  senderIdNumber: string
  
  // Receiver Information
  receiverName: string
  receiverPhone: string
  receiverCity: string
  receiverAddress: string
  
  // Transaction Details
  fromAmount: number
  fromCurrency: string
  toCurrency: string
  toAmount: number
  exchangeRate: number
  fee: number
  totalAmount: number
  
  // Additional Information
  purpose: string
  notes: string
}

const CURRENCIES = [
  { code: 'AFN', name: 'Afghan Afghani', symbol: '؋' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: '₨' },
  { code: 'IRR', name: 'Iranian Rial', symbol: '﷼' }
]

const ID_TYPES = [
  { value: 'tazkira', label: 'تذکره' },
  { value: 'passport', label: 'پاسپورت' },
  { value: 'license', label: 'جواز رانندگی' },
  { value: 'other', label: 'سایر' }
]

const CITIES = [
  'کابل', 'هرات', 'مزار شریف', 'قندهار', 'جلال آباد',
  'کندز', 'تالقان', 'پل خمری', 'غزنی', 'بامیان'
]

export function NewHawalaForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState<HawalaFormData>({
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    senderIdType: '',
    senderIdNumber: '',
    receiverName: '',
    receiverPhone: '',
    receiverCity: '',
    receiverAddress: '',
    fromAmount: 0,
    fromCurrency: 'USD',
    toCurrency: 'AFN',
    toAmount: 0,
    exchangeRate: 70.5,
    fee: 0,
    totalAmount: 0,
    purpose: '',
    notes: ''
  })

  const calculateAmounts = (amount: number, rate: number) => {
    const convertedAmount = amount * rate
    const fee = Math.max(convertedAmount * 0.02, 50) // 2% fee, minimum 50 AFN
    const total = amount + (formData.fromCurrency === 'AFN' ? fee : fee / rate)
    
    setFormData(prev => ({
      ...prev,
      toAmount: convertedAmount,
      fee: fee,
      totalAmount: total
    }))
  }

  const handleAmountChange = (value: string) => {
    const amount = parseFloat(value) || 0
    setFormData(prev => ({ ...prev, fromAmount: amount }))
    calculateAmounts(amount, formData.exchangeRate)
  }

  const handleCurrencyChange = (field: 'fromCurrency' | 'toCurrency', value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    // Recalculate with new currencies
    calculateAmounts(formData.fromAmount, formData.exchangeRate)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate required fields
      const requiredFields = [
        'senderName', 'senderPhone', 'senderIdType', 'senderIdNumber',
        'receiverName', 'receiverPhone', 'receiverCity', 'fromAmount'
      ]
      
      for (const field of requiredFields) {
        if (!formData[field as keyof HawalaFormData]) {
          toast.error(`لطفاً ${field} را وارد کنید`)
          return
        }
      }

      if (formData.fromAmount <= 0) {
        toast.error('مبلغ باید بیشتر از صفر باشد')
        return
      }

      // Create hawala transaction
      const response = await fetch('/api/portal/hawala', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to create hawala')
      }

      const result = await response.json()
      
      toast.success(`حواله با موفقیت ایجاد شد. کد پیگیری: ${result.referenceCode}`)
      router.push(`/portal/hawala?ref=${result.referenceCode}`)
      
    } catch (error) {
      console.error('Error creating hawala:', error)
      toast.error('خطا در ایجاد حواله. لطفاً دوباره تلاش کنید')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Sender Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            اطلاعات فرستنده
          </CardTitle>
          <CardDescription>
            اطلاعات کامل شخص فرستنده حواله
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderName">نام کامل *</Label>
              <Input
                id="senderName"
                value={formData.senderName}
                onChange={(e) => setFormData(prev => ({ ...prev, senderName: e.target.value }))}
                placeholder="نام و نام خانوادگی"
                required
              />
            </div>
            <div>
              <Label htmlFor="senderPhone">شماره تلفن *</Label>
              <Input
                id="senderPhone"
                value={formData.senderPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, senderPhone: e.target.value }))}
                placeholder="+93 XXX XXX XXX"
                required
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="senderAddress">آدرس</Label>
            <Textarea
              id="senderAddress"
              value={formData.senderAddress}
              onChange={(e) => setFormData(prev => ({ ...prev, senderAddress: e.target.value }))}
              placeholder="آدرس کامل"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="senderIdType">نوع مدرک شناسایی *</Label>
              <Select value={formData.senderIdType} onValueChange={(value) => setFormData(prev => ({ ...prev, senderIdType: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب نوع مدرک" />
                </SelectTrigger>
                <SelectContent>
                  {ID_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="senderIdNumber">شماره مدرک *</Label>
              <Input
                id="senderIdNumber"
                value={formData.senderIdNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, senderIdNumber: e.target.value }))}
                placeholder="شماره مدرک شناسایی"
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Receiver Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            اطلاعات گیرنده
          </CardTitle>
          <CardDescription>
            اطلاعات شخص گیرنده حواله
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiverName">نام کامل *</Label>
              <Input
                id="receiverName"
                value={formData.receiverName}
                onChange={(e) => setFormData(prev => ({ ...prev, receiverName: e.target.value }))}
                placeholder="نام و نام خانوادگی"
                required
              />
            </div>
            <div>
              <Label htmlFor="receiverPhone">شماره تلفن *</Label>
              <Input
                id="receiverPhone"
                value={formData.receiverPhone}
                onChange={(e) => setFormData(prev => ({ ...prev, receiverPhone: e.target.value }))}
                placeholder="+93 XXX XXX XXX"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="receiverCity">شهر مقصد *</Label>
              <Select value={formData.receiverCity} onValueChange={(value) => setFormData(prev => ({ ...prev, receiverCity: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب شهر" />
                </SelectTrigger>
                <SelectContent>
                  {CITIES.map((city) => (
                    <SelectItem key={city} value={city}>
                      {city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="receiverAddress">آدرس</Label>
              <Input
                id="receiverAddress"
                value={formData.receiverAddress}
                onChange={(e) => setFormData(prev => ({ ...prev, receiverAddress: e.target.value }))}
                placeholder="آدرس دقیق"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            جزئیات تراکنش
          </CardTitle>
          <CardDescription>
            مبلغ و جزئیات مالی حواله
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="fromAmount">مبلغ *</Label>
              <Input
                id="fromAmount"
                type="number"
                value={formData.fromAmount}
                onChange={(e) => handleAmountChange(e.target.value)}
                placeholder="0"
                min="1"
                step="0.01"
                required
              />
            </div>
            <div>
              <Label htmlFor="fromCurrency">از ارز</Label>
              <Select value={formData.fromCurrency} onValueChange={(value) => handleCurrencyChange('fromCurrency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="toCurrency">به ارز</Label>
              <Select value={formData.toCurrency} onValueChange={(value) => handleCurrencyChange('toCurrency', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CURRENCIES.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {currency.symbol} {currency.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {/* Calculation Summary */}
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>نرخ تبدیل:</span>
              <span className="font-mono">1 {formData.fromCurrency} = {formData.exchangeRate} {formData.toCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span>مبلغ تبدیل شده:</span>
              <span className="font-mono">{formData.toAmount.toLocaleString()} {formData.toCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span>کارمزد:</span>
              <span className="font-mono">{formData.fee.toLocaleString()} {formData.toCurrency}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold">
              <span>مجموع قابل پرداخت:</span>
              <span className="font-mono">{formData.totalAmount.toLocaleString()} {formData.fromCurrency}</span>
            </div>
          </div>

          <div>
            <Label htmlFor="purpose">هدف حواله</Label>
            <Select value={formData.purpose} onValueChange={(value) => setFormData(prev => ({ ...prev, purpose: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="انتخاب هدف" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="family_support">حمایت خانواده</SelectItem>
                <SelectItem value="business">تجارت</SelectItem>
                <SelectItem value="education">تحصیل</SelectItem>
                <SelectItem value="medical">درمان</SelectItem>
                <SelectItem value="other">سایر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="notes">یادداشت</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="یادداشت اضافی (اختیاری)"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          لغو
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              در حال ایجاد...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" />
              ایجاد حواله
            </>
          )}
        </Button>
      </div>
    </form>
  )
}