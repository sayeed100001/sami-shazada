'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calculator, ArrowRightLeft, Coins, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Currency {
  code: string
  name: string
  flag: string
  type: string
  category: string
}

interface EnhancedCalculatorProps {
  fromCurrency: string
  toCurrency: string
  amount: string
  result: any
  isConverting: boolean
  currentRate: number | null
  getCurrencyPrice: (code: string) => any
  setFromCurrency: (code: string) => void
  setToCurrency: (code: string) => void
  setAmount: (amount: string) => void
  swapCurrencies: () => void
  handleConvert: () => void
  filteredCurrencies: Currency[]
}

export function EnhancedCalculator({
  fromCurrency,
  toCurrency,
  amount,
  result,
  isConverting,
  currentRate,
  getCurrencyPrice,
  setFromCurrency,
  setToCurrency,
  setAmount,
  swapCurrencies,
  handleConvert,
  filteredCurrencies
}: EnhancedCalculatorProps) {
  return (
    <Card className="h-fit shadow-2xl border-2 hover:shadow-3xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 border-b-2">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-lg">
            <Calculator className="h-5 w-5 text-white" />
          </div>
          💱 ماشین حساب تبدیل
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          🚀 تبدیل سریع و دقیق با API های معتبر جهانی
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
        <div className="space-y-2">
          <Label htmlFor="amount" className="text-sm sm:text-base font-medium flex items-center gap-2">
            <Coins className="h-4 w-4 text-purple-500" />
            مبلغ
          </Label>
          <div className="relative">
            <Input
              id="amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="مبلغ را وارد کنید"
              className="text-xl sm:text-2xl font-bold persian-numbers h-14 sm:h-16 text-center border-2 focus:border-purple-500 focus:ring-4 focus:ring-purple-200 dark:focus:ring-purple-900 transition-all rounded-xl shadow-inner"
              min="0"
              step="0.00000001"
            />
            {amount && Number(amount) > 0 && (
              <button
                onClick={() => setAmount('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-red-600 transition-colors text-xl"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <span className="font-semibold">از</span>
              {getCurrencyPrice(fromCurrency) && (
                <Badge variant={getCurrencyPrice(fromCurrency)!.trend === 'up' ? 'default' : getCurrencyPrice(fromCurrency)!.trend === 'down' ? 'destructive' : 'secondary'} className="text-xs">
                  {getCurrencyPrice(fromCurrency)!.change > 0 ? '📈 +' : '📉 '}{getCurrencyPrice(fromCurrency)!.change.toFixed(2)}%
                </Badge>
              )}
            </Label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger className="h-12 sm:h-14 border-2 hover:border-purple-400 transition-colors rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {filteredCurrencies.map((currency) => {
                  const price = getCurrencyPrice(currency.code)
                  return (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{currency.flag}</span>
                          <div>
                            <div className="font-bold text-sm">{currency.code}</div>
                            <div className="text-xs text-muted-foreground">{currency.name}</div>
                          </div>
                        </div>
                        {price && (
                          <div className="text-right text-xs">
                            <div className="font-semibold">${price.price.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm sm:text-base">
              <span className="font-semibold">به</span>
              {getCurrencyPrice(toCurrency) && (
                <Badge variant={getCurrencyPrice(toCurrency)!.trend === 'up' ? 'default' : getCurrencyPrice(toCurrency)!.trend === 'down' ? 'destructive' : 'secondary'} className="text-xs">
                  {getCurrencyPrice(toCurrency)!.change > 0 ? '📈 +' : '📉 '}{getCurrencyPrice(toCurrency)!.change.toFixed(2)}%
                </Badge>
              )}
            </Label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger className="h-12 sm:h-14 border-2 hover:border-purple-400 transition-colors rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {filteredCurrencies.map((currency) => {
                  const price = getCurrencyPrice(currency.code)
                  return (
                    <SelectItem key={currency.code} value={currency.code}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{currency.flag}</span>
                          <div>
                            <div className="font-bold text-sm">{currency.code}</div>
                            <div className="text-xs text-muted-foreground">{currency.name}</div>
                          </div>
                        </div>
                        {price && (
                          <div className="text-right text-xs">
                            <div className="font-semibold">${price.price.toLocaleString()}</div>
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex justify-center -my-2">
          <Button
            variant="outline"
            size="icon"
            onClick={swapCurrencies}
            className="rounded-full h-12 w-12 sm:h-14 sm:w-14 hover:scale-110 transition-all shadow-lg hover:shadow-2xl bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white border-0 hover:from-blue-600 hover:via-purple-600 hover:to-pink-600 active:scale-95"
          >
            <ArrowRightLeft className="h-5 w-5 sm:h-6 sm:w-6" />
          </Button>
        </div>

        {currentRate && (
          <div className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 via-purple-50 to-pink-50 dark:from-blue-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl border-2 border-blue-200 dark:border-blue-800 shadow-lg">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <span className="text-xs sm:text-sm text-muted-foreground flex items-center gap-2 font-medium">
                <Zap className="h-4 w-4 text-yellow-500 animate-pulse" />
                نرخ لحظهای:
              </span>
              <div className="text-center sm:text-right">
                <div className="font-bold persian-numbers text-base sm:text-lg text-blue-700 dark:text-blue-400">
                  1 {fromCurrency} = {currentRate.toLocaleString()} {toCurrency}
                </div>
                <div className="text-xs text-muted-foreground">
                  🕐 {new Date().toLocaleTimeString('fa-AF')}
                </div>
              </div>
            </div>
          </div>
        )}

        <Button 
          onClick={handleConvert} 
          className="w-full h-14 sm:h-16 text-base sm:text-lg font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 hover:from-blue-700 hover:via-purple-700 hover:to-pink-700 shadow-xl hover:shadow-2xl transition-all transform hover:scale-[1.02] active:scale-95 rounded-xl"
          disabled={isConverting || !amount || isNaN(Number(amount))}
        >
          {isConverting ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ⏳ در حال محاسبه...
            </div>
          ) : (
            <>
              <Calculator className="h-5 w-5 sm:h-6 sm:w-6 mr-2" />
              🚀 تبدیل فوری
            </>
          )}
        </Button>

        {result && (
          <div className="p-4 sm:p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 rounded-2xl border-2 border-green-300 dark:border-green-700 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center space-y-3">
              <div className="text-xs sm:text-sm font-bold text-green-700 dark:text-green-400 flex items-center justify-center gap-2">
                <div className="p-2 rounded-full bg-green-500 animate-bounce shadow-lg">
                  <Coins className="h-4 w-4 text-white" />
                </div>
                ✅ نتیجه تبدیل
              </div>
              <div className="text-3xl sm:text-4xl lg:text-5xl font-black persian-numbers text-green-700 dark:text-green-400 drop-shadow-lg">
                {result.result.toLocaleString()} {result.to}
              </div>
              <div className="text-sm sm:text-base text-muted-foreground font-semibold">
                {result.amount.toLocaleString()} {result.from} ➜ {result.result.toLocaleString()} {result.to}
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2">
                <div className="text-xs persian-numbers bg-white/70 dark:bg-black/30 rounded-full px-4 py-2 font-bold border-2 border-green-200 dark:border-green-800 shadow-md">
                  📊 نرخ: {result.rate.toLocaleString()}
                </div>
                <div className="text-xs bg-white/70 dark:bg-black/30 rounded-full px-4 py-2 font-bold border-2 border-green-200 dark:border-green-800 shadow-md">
                  ⚡ فوری
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
