'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowRightLeft, DollarSign, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface ExchangeRate {
  from: string
  to: string
  rate: number
  lastUpdate: string
}

const currencies = [
  { code: 'USD', name: 'دالر آمریکا', flag: '🇺🇸' },
  { code: 'EUR', name: 'یورو', flag: '🇪🇺' },
  { code: 'GBP', name: 'پوند انگلیس', flag: '🇬🇧' },
  { code: 'AFN', name: 'افغانی افغانستان', flag: '🇦🇫' },
  { code: 'PKR', name: 'روپیه پاکستان', flag: '🇵🇰' },
  { code: 'IRR', name: 'ریال ایران', flag: '🇮🇷' },
  { code: 'CAD', name: 'دلار کانادا', flag: '🇨🇦' },
  { code: 'JPY', name: 'ین ژاپن', flag: '🇯🇵' }
]

export function ExchangeRates() {
  const [fromCurrency, setFromCurrency] = useState('USD')
  const [toCurrency, setToCurrency] = useState('AFN')
  const [amount, setAmount] = useState('1')
  const [isManual, setIsManual] = useState(false)
  const [manualRate, setManualRate] = useState('')
  const [result, setResult] = useState<number | null>(null)

  const { data: rates, isLoading, refetch } = useQuery({
    queryKey: ['exchange-rates'],
    queryFn: async (): Promise<ExchangeRate[]> => {
      const response = await fetch('/api/rates')
      if (!response.ok) throw new Error('Failed to fetch rates')
      return response.json()
    },
    refetchInterval: 5 * 60 * 1000,
  })

  const handleConvert = async () => {
    if (!amount || isNaN(Number(amount))) return

    if (isManual) {
      if (!manualRate || isNaN(Number(manualRate))) return
      setResult(Number(amount) * Number(manualRate))
      return
    }

    try {
      const response = await fetch(`/api/rates/convert?from=${fromCurrency}&to=${toCurrency}&amount=${amount}`)
      if (!response.ok) throw new Error('Failed to convert')
      const data = await response.json()
      setResult(data.result)
    } catch (error) {
      console.error('Conversion error:', error)
    }
  }

  const swapCurrencies = () => {
    setFromCurrency(toCurrency)
    setToCurrency(fromCurrency)
    setResult(null)
  }

  const mainRates = rates?.filter(rate => 
    (rate.from === 'USD' && ['AFN', 'EUR', 'GBP', 'PKR', 'IRR'].includes(rate.to))
  ).slice(0, 5)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          نرخ ارز
        </CardTitle>
        <CardDescription>تبدیل ارز و نمایش آخرین نرخ‌ها (قیمت‌ها به دلار)</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Exchange Rate Calculator */}
          <div className="space-y-4">
            <h3 className="font-semibold">ماشین حساب تبدیل ارز</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>از</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <span className="flex items-center gap-2">
                          <span>{currency.flag}</span>
                          <span>{currency.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>به</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {currencies.map((currency) => (
                      <SelectItem key={currency.code} value={currency.code}>
                        <span className="flex items-center gap-2">
                          <span>{currency.flag}</span>
                          <span>{currency.code}</span>
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>مقدار</Label>
                <div className="flex gap-2">
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="مقدار را وارد کنید"
                    className="persian-numbers"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={swapCurrencies}
                  >
                    <ArrowRightLeft className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-col gap-3 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <Checkbox 
                    id="dashboard-manual-rate" 
                    checked={isManual} 
                    onCheckedChange={(checked) => setIsManual(checked === true)} 
                  />
                  <Label 
                    htmlFor="dashboard-manual-rate" 
                    className="text-sm font-bold cursor-pointer"
                  >
                    نرخ دستی (Manual Rate)
                  </Label>
                </div>
                
                {isManual && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      نرخ برای ۱ {fromCurrency} (چند {toCurrency})
                    </Label>
                    <Input
                      type="number"
                      value={manualRate}
                      onChange={(e) => setManualRate(e.target.value)}
                      placeholder={`مقدار ${toCurrency}`}
                      className="h-10 bg-background"
                    />
                  </div>
                )}
              </div>
            </div>

            <Button onClick={handleConvert} className="w-full">
              تبدیل
            </Button>

            {result && (
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground">نتیجه</div>
                  <div className="text-2xl font-bold persian-numbers">
                    {result.toFixed(4)} {toCurrency}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Current Rates */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">نرخ‌های فعلی</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                بروزرسانی
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 bg-muted rounded animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {mainRates?.map((rate) => {
                  const fromCurrency = currencies.find(c => c.code === rate.from)
                  const toCurrency = currencies.find(c => c.code === rate.to)
                  
                  return (
                    <div
                      key={`${rate.from}-${rate.to}`}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{fromCurrency?.flag}</span>
                        <span className="font-medium">
                          {rate.from}/{rate.to}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-bold persian-numbers">
                          {rate.rate.toLocaleString('en-US', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 4
                          })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(rate.lastUpdate).toLocaleTimeString('fa-AF', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="text-xs text-muted-foreground text-center">
              نرخ‌ها از منابع معتبر جهانی دریافت می‌شود
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}