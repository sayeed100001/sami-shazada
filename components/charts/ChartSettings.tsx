'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Settings, 
  X, 
  Palette, 
  BarChart3, 
  TrendingUp,
  Eye,
  EyeOff,
  RotateCcw
} from 'lucide-react'

interface ChartSettingsProps {
  onClose: () => void
  symbol: string
  interval: string
}

interface TechnicalIndicator {
  id: string
  name: string
  namePersian: string
  type: 'overlay' | 'oscillator' | 'volume'
  enabled: boolean
  color: string
  parameters: { [key: string]: number }
}

const AVAILABLE_INDICATORS: TechnicalIndicator[] = [
  {
    id: 'sma',
    name: 'Simple Moving Average',
    namePersian: 'میانگین متحرک ساده',
    type: 'overlay',
    enabled: false,
    color: '#3b82f6',
    parameters: { period: 20 }
  },
  {
    id: 'ema',
    name: 'Exponential Moving Average',
    namePersian: 'میانگین متحرک نمایی',
    type: 'overlay',
    enabled: false,
    color: '#ef4444',
    parameters: { period: 20 }
  },
  {
    id: 'bb',
    name: 'Bollinger Bands',
    namePersian: 'باندهای بولینگر',
    type: 'overlay',
    enabled: false,
    color: '#8b5cf6',
    parameters: { period: 20, stdDev: 2 }
  },
  {
    id: 'rsi',
    name: 'Relative Strength Index',
    namePersian: 'شاخص قدرت نسبی',
    type: 'oscillator',
    enabled: false,
    color: '#f59e0b',
    parameters: { period: 14 }
  },
  {
    id: 'macd',
    name: 'MACD',
    namePersian: 'مکد',
    type: 'oscillator',
    enabled: false,
    color: '#10b981',
    parameters: { fast: 12, slow: 26, signal: 9 }
  },
  {
    id: 'stoch',
    name: 'Stochastic',
    namePersian: 'استوکاستیک',
    type: 'oscillator',
    enabled: false,
    color: '#f97316',
    parameters: { k: 14, d: 3 }
  },
  {
    id: 'vwap',
    name: 'Volume Weighted Average Price',
    namePersian: 'میانگین قیمت وزنی حجم',
    type: 'overlay',
    enabled: false,
    color: '#06b6d4',
    parameters: {}
  }
]

const CHART_THEMES = [
  { id: 'dark', name: 'تیره', colors: { bg: '#0f172a', grid: '#1e293b', text: '#f8fafc' } },
  { id: 'light', name: 'روشن', colors: { bg: '#ffffff', grid: '#e5e7eb', text: '#111827' } },
  { id: 'blue', name: 'آبی', colors: { bg: '#1e3a8a', grid: '#3b82f6', text: '#dbeafe' } },
  { id: 'green', name: 'سبز', colors: { bg: '#14532d', grid: '#22c55e', text: '#dcfce7' } }
]

const CHART_TYPES = [
  { id: 'candlestick', name: 'کندل استیک', icon: '📊' },
  { id: 'ohlc', name: 'OHLC', icon: '📈' },
  { id: 'line', name: 'خطی', icon: '📉' },
  { id: 'area', name: 'ناحیه‌ای', icon: '🏔️' },
  { id: 'heikin-ashi', name: 'هیکین آشی', icon: '🎯' },
  { id: 'renko', name: 'رنکو', icon: '🧱' }
]

export function ChartSettings({ onClose, symbol, interval }: ChartSettingsProps) {
  const [indicators, setIndicators] = useState<TechnicalIndicator[]>(AVAILABLE_INDICATORS)
  const [chartType, setChartType] = useState('candlestick')
  const [theme, setTheme] = useState('dark')
  const [showVolume, setShowVolume] = useState(true)
  const [showGrid, setShowGrid] = useState(true)
  const [showCrosshair, setShowCrosshair] = useState(true)
  const [chartOpacity, setChartOpacity] = useState([80])

  // Load settings from localStorage
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem(`chart_settings_${symbol}`)
      if (savedSettings) {
        const settings = JSON.parse(savedSettings)
        setIndicators(settings.indicators || AVAILABLE_INDICATORS)
        setChartType(settings.chartType || 'candlestick')
        setTheme(settings.theme || 'dark')
        setShowVolume(settings.showVolume ?? true)
        setShowGrid(settings.showGrid ?? true)
        setShowCrosshair(settings.showCrosshair ?? true)
        setChartOpacity(settings.chartOpacity || [80])
      }
    } catch (error) {
      console.warn('Failed to load chart settings:', error)
    }
  }, [symbol])

  // Save settings to localStorage
  const saveSettings = () => {
    try {
      const settings = {
        indicators,
        chartType,
        theme,
        showVolume,
        showGrid,
        showCrosshair,
        chartOpacity
      }
      localStorage.setItem(`chart_settings_${symbol}`, JSON.stringify(settings))
    } catch (error) {
      console.warn('Failed to save chart settings:', error)
    }
  }

  useEffect(() => {
    saveSettings()
  }, [indicators, chartType, theme, showVolume, showGrid, showCrosshair, chartOpacity])

  const toggleIndicator = (indicatorId: string) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === indicatorId ? { ...ind, enabled: !ind.enabled } : ind
    ))
  }

  const updateIndicatorParameter = (indicatorId: string, paramName: string, value: number) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === indicatorId 
        ? { ...ind, parameters: { ...ind.parameters, [paramName]: value } }
        : ind
    ))
  }

  const updateIndicatorColor = (indicatorId: string, color: string) => {
    setIndicators(prev => prev.map(ind => 
      ind.id === indicatorId ? { ...ind, color } : ind
    ))
  }

  const resetToDefaults = () => {
    setIndicators(AVAILABLE_INDICATORS)
    setChartType('candlestick')
    setTheme('dark')
    setShowVolume(true)
    setShowGrid(true)
    setShowCrosshair(true)
    setChartOpacity([80])
  }

  const enabledIndicators = indicators.filter(ind => ind.enabled)
  const overlayIndicators = indicators.filter(ind => ind.type === 'overlay')
  const oscillatorIndicators = indicators.filter(ind => ind.type === 'oscillator')

  return (
    <Card className="fixed inset-4 z-50 bg-background border shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          تنظیمات نمودار - {symbol}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-2" />
            بازنشانی
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="chart" className="h-full">
          <div className="px-6 border-b">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="chart">نمودار</TabsTrigger>
              <TabsTrigger value="indicators">اندیکاتورها</TabsTrigger>
              <TabsTrigger value="appearance">ظاهر</TabsTrigger>
              <TabsTrigger value="advanced">پیشرفته</TabsTrigger>
            </TabsList>
          </div>

          <ScrollArea className="h-[500px]">
            <div className="p-6">
              <TabsContent value="chart" className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">نوع نمودار</Label>
                  <div className="grid grid-cols-3 gap-3 mt-3">
                    {CHART_TYPES.map((type) => (
                      <Button
                        key={type.id}
                        variant={chartType === type.id ? "default" : "outline"}
                        className="flex items-center gap-2 h-auto p-3"
                        onClick={() => setChartType(type.id)}
                      >
                        <span className="text-lg">{type.icon}</span>
                        <span className="text-sm">{type.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">تنظیمات نمایش</Label>
                  
                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-volume">نمایش حجم معاملات</Label>
                    <Switch
                      id="show-volume"
                      checked={showVolume}
                      onCheckedChange={setShowVolume}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-grid">نمایش شبکه</Label>
                    <Switch
                      id="show-grid"
                      checked={showGrid}
                      onCheckedChange={setShowGrid}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="show-crosshair">نمایش خط متقاطع</Label>
                    <Switch
                      id="show-crosshair"
                      checked={showCrosshair}
                      onCheckedChange={setShowCrosshair}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>شفافیت نمودار: {chartOpacity[0]}%</Label>
                    <Slider
                      value={chartOpacity}
                      onValueChange={setChartOpacity}
                      max={100}
                      min={10}
                      step={10}
                      className="w-full"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="indicators" className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">اندیکاتورهای فعال</Label>
                  <Badge variant="secondary">{enabledIndicators.length}</Badge>
                </div>

                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      اندیکاتورهای روی نمودار
                    </h4>
                    {overlayIndicators.map((indicator) => (
                      <div key={indicator.id} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={indicator.enabled}
                              onCheckedChange={() => toggleIndicator(indicator.id)}
                            />
                            <div>
                              <div className="font-medium">{indicator.namePersian}</div>
                              <div className="text-xs text-muted-foreground">{indicator.name}</div>
                            </div>
                          </div>
                          {indicator.enabled && (
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={indicator.color}
                                onChange={(e) => updateIndicatorColor(indicator.id, e.target.value)}
                                className="w-8 h-8 rounded border"
                              />
                            </div>
                          )}
                        </div>

                        {indicator.enabled && Object.keys(indicator.parameters).length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(indicator.parameters).map(([param, value]) => (
                              <div key={param} className="space-y-1">
                                <Label className="text-xs">{param}: {value}</Label>
                                <Slider
                                  value={[value]}
                                  onValueChange={([newValue]) => updateIndicatorParameter(indicator.id, param, newValue)}
                                  max={param === 'period' ? 200 : param === 'stdDev' ? 5 : 50}
                                  min={1}
                                  step={1}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div>
                    <h4 className="font-medium mb-3 flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      اندیکاتورهای اسیلاتور
                    </h4>
                    {oscillatorIndicators.map((indicator) => (
                      <div key={indicator.id} className="p-3 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Switch
                              checked={indicator.enabled}
                              onCheckedChange={() => toggleIndicator(indicator.id)}
                            />
                            <div>
                              <div className="font-medium">{indicator.namePersian}</div>
                              <div className="text-xs text-muted-foreground">{indicator.name}</div>
                            </div>
                          </div>
                          {indicator.enabled && (
                            <div className="flex items-center gap-2">
                              <input
                                type="color"
                                value={indicator.color}
                                onChange={(e) => updateIndicatorColor(indicator.id, e.target.value)}
                                className="w-8 h-8 rounded border"
                              />
                            </div>
                          )}
                        </div>

                        {indicator.enabled && Object.keys(indicator.parameters).length > 0 && (
                          <div className="grid grid-cols-2 gap-3">
                            {Object.entries(indicator.parameters).map(([param, value]) => (
                              <div key={param} className="space-y-1">
                                <Label className="text-xs">{param}: {value}</Label>
                                <Slider
                                  value={[value]}
                                  onValueChange={([newValue]) => updateIndicatorParameter(indicator.id, param, newValue)}
                                  max={param === 'period' || param === 'k' ? 50 : param === 'fast' ? 20 : param === 'slow' ? 50 : 20}
                                  min={1}
                                  step={1}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="appearance" className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">تم نمودار</Label>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    {CHART_THEMES.map((chartTheme) => (
                      <Button
                        key={chartTheme.id}
                        variant={theme === chartTheme.id ? "default" : "outline"}
                        className="flex items-center gap-3 h-auto p-3"
                        onClick={() => setTheme(chartTheme.id)}
                      >
                        <div 
                          className="w-6 h-6 rounded border"
                          style={{ backgroundColor: chartTheme.colors.bg }}
                        />
                        <span>{chartTheme.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <Label className="text-base font-semibold">رنگ‌های سفارشی</Label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رنگ کندل صعودی</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" defaultValue="#10b981" className="w-10 h-10 rounded border" />
                        <span className="text-sm text-muted-foreground">#10b981</span>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label>رنگ کندل نزولی</Label>
                      <div className="flex items-center gap-2">
                        <input type="color" defaultValue="#ef4444" className="w-10 h-10 rounded border" />
                        <span className="text-sm text-muted-foreground">#ef4444</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-semibold">تنظیمات پیشرفته</Label>
                  
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium mb-2">اطلاعات نماد</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>نماد:</span>
                        <span className="font-mono">{symbol}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>بازه زمانی:</span>
                        <span>{interval}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>اندیکاتورهای فعال:</span>
                        <span>{enabledIndicators.length}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">عملیات</h4>
                    <div className="space-y-2">
                      <Button variant="outline" size="sm" className="w-full">
                        صادرات تنظیمات
                      </Button>
                      <Button variant="outline" size="sm" className="w-full">
                        وارد کردن تنظیمات
                      </Button>
                      <Button variant="destructive" size="sm" className="w-full" onClick={resetToDefaults}>
                        بازنشانی به حالت پیش‌فرض
                      </Button>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </div>
          </ScrollArea>

          <div className="p-6 border-t bg-muted/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                تنظیمات به صورت خودکار ذخیره می‌شوند
              </div>
              <Button onClick={onClose}>
                اعمال و بستن
              </Button>
            </div>
          </div>
        </Tabs>
      </CardContent>
    </Card>
  )
}