'use client'

import { useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { TrendingUp, BarChart3, LineChart, Pencil, Layers, ExternalLink } from 'lucide-react'
import { AdvancedTradingViewWidget } from '@/components/charts/AdvancedTradingViewWidget'

const AFGHAN_SHORTCUTS = [
  { label: 'USD/AFN', value: 'USDAFN', tv: 'FX_IDC:USDAFN' },
  { label: 'EUR/AFN', value: 'EURAFN', tv: 'FX_IDC:EURAFN' },
  { label: 'GBP/AFN', value: 'GBPAFN', tv: 'FX_IDC:GBPAFN' },
  { label: 'USD/PKR', value: 'USDPKR', tv: 'FX_IDC:USDPKR' },
  { label: 'USD/IRR', value: 'USDIRR', tv: 'OANDA:USDIRR' },
  { label: 'USD/AED', value: 'USDAED', tv: 'FX:USDAED' },
  { label: 'USD/SAR', value: 'USDSAR', tv: 'FX:USDSAR' },
  { label: 'USD/TRY', value: 'USDTRY', tv: 'FX:USDTRY' },
]

export default function ChartsPage() {
  // Afghanistan-first default
  const [selectedSymbol, setSelectedSymbol] = useState('USDAFN')

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        {/* Premium Header */}
        <div className="relative overflow-hidden bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative z-10 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4">
              <TrendingUp className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold mb-2">
              نمودارهای حرفه‌ای معاملاتی
            </h1>
            <p className="text-lg text-white/90">
              پلتفرم تحلیل تکنیکال پیشرفته با تمام ابزارهای TradingView
            </p>
          </div>
        </div>

        <div className="space-y-6">
        <Card className="glass-card border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              نمودار پیشرفته - {selectedSymbol}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AdvancedTradingViewWidget 
              symbol={selectedSymbol}
              onSymbolChange={setSelectedSymbol}
            />
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Pencil className="h-4 w-4" />
                ابزارهای ترسیم
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <div>• خطوط روند</div>
              <div>• فیبوناچی</div>
              <div>• الگوهای هارمونیک</div>
              <div>• مستطیل و دایره</div>
              <div>• پیکان و متن</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <LineChart className="h-4 w-4" />
                اندیکاتورها
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <div>• میانگین متحرک (MA)</div>
              <div>• RSI و MACD</div>
              <div>• باندهای بولینگر</div>
              <div>• استوکاستیک</div>
              <div>• +100 اندیکاتور دیگر</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                بازه‌های زمانی
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <div>• 1 دقیقه تا 1 ماه</div>
              <div>• نمودار تیک</div>
              <div>• رنج و رنکو</div>
              <div>• هایکن آشی</div>
              <div>• کاگی و لاین بریک</div>
            </CardContent>
          </Card>

          <Card className="glass-card border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Layers className="h-4 w-4" />
                قابلیت‌های پیشرفته
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs space-y-1">
              <div>• ذخیره خودکار نمودار</div>
              <div>• مقایسه نمادها</div>
              <div>• تنظیمات سفارشی</div>
              <div>• اسکرینشات</div>
              <div>• تمام صفحه</div>
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-0 shadow-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
          <CardContent className="pt-6">
            <div className="text-center space-y-2">
              <h3 className="font-semibold text-lg">میانبرهای نماد</h3>
              <p className="text-sm text-muted-foreground">
                برای دسترسی سریع به نمادهای افغانی از میانبرها استفاده کنید:
                <span className="font-mono mx-2">USDAFN</span>
                <span className="font-mono mx-2">EURAFN</span>
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {AFGHAN_SHORTCUTS.map((s) => (
                  <div key={s.value} className="flex items-center gap-1 rounded-full border border-border/70 bg-background/70 px-2 py-1 backdrop-blur">
                    <Button
                      type="button"
                      size="sm"
                      variant={selectedSymbol === s.value ? 'default' : 'ghost'}
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => setSelectedSymbol(s.value)}
                      title={s.value}
                    >
                      {s.label}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-full"
                      title="Open in TradingView"
                      onClick={() => {
                        window.open(
                          `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(s.tv)}`,
                          '_blank',
                          'noopener,noreferrer'
                        )
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
