'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  CREDIT_PURCHASE_DISCOUNT_TIERS,
  quoteCreditPurchase,
} from '@/lib/credit-pricing'

type CreditPricingResponse = {
  creditPriceUsd: number
}

export default function CreditPurchasePage() {
  const [amount, setAmount] = useState(100)
  const [paymentMethod, setPaymentMethod] = useState('BANK')
  const [discountCode, setDiscountCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [balance, setBalance] = useState(0)
  const [creditPriceUsd, setCreditPriceUsd] = useState(1)

  useEffect(() => {
    void fetchBalance()
    void fetchPricing()
  }, [])

  const quote = quoteCreditPurchase({ amount, unitPriceUsd: creditPriceUsd })

  const fetchBalance = async () => {
    try {
      const res = await fetch('/api/portal/stats')
      const data = await res.json()
      setBalance(data.creditBalance || 0)
    } catch (error) {
      console.error('Error fetching balance:', error)
    }
  }

  const fetchPricing = async () => {
    try {
      const res = await fetch('/api/portal/credit/purchase')
      if (!res.ok) {
        throw new Error('Failed to fetch credit pricing')
      }

      const data = (await res.json()) as CreditPricingResponse
      if (typeof data.creditPriceUsd === 'number' && data.creditPriceUsd > 0) {
        setCreditPriceUsd(data.creditPriceUsd)
      }
    } catch (error) {
      console.error('Error fetching credit pricing:', error)
    }
  }

  const handlePurchase = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/credit/purchase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          paymentMethod,
          discountCode: discountCode || undefined,
        }),
      })

      if (res.ok) {
        toast.success('درخواست خرید کریدیت ثبت شد')
        setAmount(100)
        setDiscountCode('')
        void fetchBalance()
      } else {
        const data = await res.json()
        toast.error(data.error || 'خطا در ثبت درخواست')
      }
    } catch (error) {
      toast.error('خطا در ثبت درخواست')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 p-8 text-white shadow-xl">
        <div className="flex items-center justify-between gap-6">
          <div>
            <div className="mb-4 flex items-center gap-4">
              <Link href="/portal">
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  بازگشت
                </Button>
              </Link>
            </div>
            <h1 className="mb-2 text-4xl font-bold">خرید کریدیت</h1>
            <p className="text-lg text-cyan-50">شارژ حساب صرافی با قیمت‌گذاری داینامیک ادمین</p>
          </div>
          <Card className="w-56 border-0">
            <CardContent className="pt-6">
              <p className="text-sm text-muted-foreground">موجودی فعلی</p>
              <p className="text-3xl font-bold text-green-600">{balance}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-0">
          <CardHeader>
            <CardTitle>انتخاب پکیج</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {CREDIT_PURCHASE_DISCOUNT_TIERS.map((pkg) => (
                <Button
                  key={pkg.amount}
                  variant={amount === pkg.amount ? 'default' : 'outline'}
                  onClick={() => setAmount(pkg.amount)}
                  className="flex h-24 flex-col"
                >
                  <span className="text-2xl font-bold">{pkg.amount}</span>
                  <span className="text-sm">کریدیت</span>
                  <span className="text-xs text-green-500">{pkg.discount}% تخفیف</span>
                </Button>
              ))}
            </div>

            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between">
                <span>قیمت هر کریدیت:</span>
                <span className="font-semibold">${creditPriceUsd.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>قیمت پایه:</span>
                <span>${quote.basePriceUsd.toFixed(2)}</span>
              </div>
              <div className="mt-1 flex justify-between text-muted-foreground">
                <span>تخفیف بسته:</span>
                <span>${quote.bulkDiscountAmountUsd.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>مقدار دلخواه</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value, 10) || 0)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label>کد تخفیف (اختیاری)</Label>
              <Input
                value={discountCode}
                onChange={(e) => setDiscountCode(e.target.value)}
                placeholder="کد تخفیف را وارد کنید"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0">
          <CardHeader>
            <CardTitle>روش پرداخت</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="BANK" id="bank" />
                <Label htmlFor="bank">انتقال بانکی</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="CASH" id="cash" />
                <Label htmlFor="cash">نقدی حضوری</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="CARD" id="card" />
                <Label htmlFor="card">کارت به کارت</Label>
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <RadioGroupItem value="USDT" id="usdt" />
                <Label htmlFor="usdt">USDT</Label>
              </div>
            </RadioGroup>

            <div className="space-y-2 border-t pt-4">
              <div className="flex justify-between">
                <span>مقدار کریدیت:</span>
                <span className="font-bold">{amount}</span>
              </div>
              <div className="flex justify-between">
                <span>تخفیف پکیج:</span>
                <span>${quote.bulkDiscountAmountUsd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-lg">
                <span>قیمت نهایی:</span>
                <span className="font-bold text-green-600">${quote.finalPriceUsd.toFixed(2)}</span>
              </div>
            </div>

            <Button
              onClick={handlePurchase}
              disabled={loading || amount <= 0}
              className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700"
              size="lg"
            >
              {loading ? 'در حال ثبت...' : 'ثبت درخواست'}
            </Button>

            <p className="text-center text-xs text-muted-foreground">
              قیمت نهایی با کد تخفیف معتبر ممکن است کمتر از این پیش‌نمایش شود.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
