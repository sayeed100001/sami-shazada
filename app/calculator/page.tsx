'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Calculator, ArrowRightLeft, TrendingUp, History, Sparkles } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { useState, useEffect } from 'react'

const currencies = [
  { code: 'USD', name: 'دالر آمریکا', flag: '🇺🇸' },
  { code: 'EUR', name: 'یورو', flag: '🇪🇺' },
  { code: 'GBP', name: 'پوند', flag: '🇬🇧' },
  { code: 'AFN', name: 'افغانی', flag: '🇦🇫' },
  { code: 'PKR', name: 'روپیه', flag: '🇵🇰' },
  { code: 'IRR', name: 'ریال', flag: '🇮🇷' }
]

export default function CalculatorPage() {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('AFN')
  const [amount, setAmount] = useState('1')
  const [result, setResult] = useState<any>(null)
  const [isManual, setIsManual] = useState(false)
  const [manualRate, setManualRate] = useState('')
  const [history, setHistory] = useState<any[]>([])

  const handleConvert = async () => {
    if (!amount || isNaN(Number(amount))) return
    
    if (isManual) {
      if (!manualRate || isNaN(Number(manualRate))) return
      const rate = Number(manualRate)
      const res = Number(amount) * rate
      const data = {
        result: res,
        from: fromCurrency,
        to: toCurrency,
        amount: Number(amount),
        rate: rate
      }
      setResult(data)
      setHistory(prev => [{ ...data, timestamp: Date.now() }, ...prev.slice(0, 9)])
      return
    }

    try {
      const response = await fetch(`/api/rates/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`)
      if (response.ok) {
        const data = await response.json()
        setResult(data)
        setHistory(prev => [{ ...data, timestamp: Date.now() }, ...prev.slice(0, 9)])
      }
    } catch (error) {
      console.error('Conversion error:', error)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20 pb-20">
        <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 md:p-12 text-white shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />
          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-semibold">محاسبه دقیق</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black mb-3">ماشین حساب ارز</h1>
            <p className="text-lg text-white/90">تبدیل دقیق ارزها با آخرین نرخهای بازار</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-transparent dark:from-violet-950/20" />
              <div className="relative z-10 p-8 space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-purple-600 flex items-center justify-center shadow-lg">
                    <Calculator className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">تبدیل ارز</h2>
                    <p className="text-sm text-gray-600 dark:text-gray-400">مبلغ و ارز را انتخاب کنید</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700 dark:text-gray-300 font-semibold">مبلغ</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مبلغ را وارد کنید"
                    className="h-14 text-lg bg-gray-50 dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300 font-semibold">از</Label>
                    <Select value={fromCurrency} onValueChange={setFromCurrency}>
                      <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-gray-700 dark:text-gray-300 font-semibold">به</Label>
                    <Select value={toCurrency} onValueChange={setToCurrency}>
                      <SelectTrigger className="h-12 bg-gray-50 dark:bg-gray-800">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currencies.map((c) => (
                          <SelectItem key={c.code} value={c.code}>
                            {c.flag} {c.code} - {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex flex-col gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/30 dark:bg-gray-800/20">
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Checkbox 
                      id="manual-rate" 
                      checked={isManual} 
                      onCheckedChange={(checked) => setIsManual(checked === true)} 
                    />
                    <Label 
                      htmlFor="manual-rate" 
                      className="text-sm font-bold cursor-pointer text-violet-700 dark:text-violet-300"
                    >
                      نرخ دستی (Manual Rate)
                    </Label>
                  </div>
                  
                  {isManual && (
                    <div className="space-y-2 transition-all duration-200 fade-in">
                      <Label className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                        نرخ برای ۱ {fromCurrency} (چند {toCurrency})
                      </Label>
                      <Input
                        type="number"
                        value={manualRate}
                        onChange={(e) => setManualRate(e.target.value)}
                        placeholder={`مقدار ${toCurrency} را وارد کنید...`}
                        className="h-12 border-violet-200 dark:border-violet-900 focus:ring-violet-500"
                      />
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      setFromCurrency(toCurrency)
                      setToCurrency(fromCurrency)
                    }}
                    className="rounded-full"
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </div>

                <Button 
                  onClick={handleConvert} 
                  className="w-full h-12 bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white font-bold text-lg"
                >
                  <Calculator className="h-5 w-5 mr-2" />
                  تبدیل
                </Button>

                {result && (
                  <div className="p-6 bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/20 dark:to-purple-950/20 rounded-xl border border-violet-200 dark:border-violet-800">
                    <div className="text-center space-y-2">
                      <div className="text-sm text-gray-600 dark:text-gray-400">نتیجه</div>
                      <div className="text-3xl font-black text-gray-900 dark:text-white persian-numbers">
                        {result.result?.toLocaleString()} {result.to}
                      </div>
                      <div className="text-sm text-gray-500">
                        نرخ: {result.rate?.toFixed(4)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp className="h-5 w-5 text-violet-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white">تبدیلهای سریع</h3>
                </div>
                <div className="space-y-2">
                  {[
                    { from: 'USD', to: 'AFN', amount: 100 },
                    { from: 'EUR', to: 'AFN', amount: 100 },
                    { from: 'AFN', to: 'USD', amount: 1000 }
                  ].map((q, i) => (
                    <Button
                      key={i}
                      variant="ghost"
                      className="w-full justify-between"
                      onClick={() => {
                        setFromCurrency(q.from)
                        setToCurrency(q.to)
                        setAmount(q.amount.toString())
                      }}
                    >
                      <span>{q.amount} {q.from}</span>
                      <ArrowRightLeft className="h-3 w-3" />
                      <span>{q.to}</span>
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-lg">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <History className="h-5 w-5 text-violet-600" />
                  <h3 className="font-bold text-gray-900 dark:text-white">تاریخچه</h3>
                </div>
                {history.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">تاریخچه خالی است</p>
                ) : (
                  <div className="space-y-2">
                    {history.slice(0, 5).map((item, i) => (
                      <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                        <div className="font-medium">{item.amount} {item.from} = {item.result?.toFixed(2)} {item.to}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
