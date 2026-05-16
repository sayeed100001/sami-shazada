'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Save, 
  Trash2, 
  Download, 
  Upload, 
  Settings, 
  Layers, 
  Palette, 
  TrendingUp,
  Bell,
  Eye,
  EyeOff
} from 'lucide-react'

interface ChartLayout {
  id: string
  name: string
  symbol: string
  timeframe: string
  chartType: string
  indicators: string[]
  settings: any
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface ChartDrawing {
  id: string
  symbol: string
  timeframe: string
  type: string
  name?: string
  data: any
  isPublic: boolean
  createdAt: string
  updatedAt: string
}

interface ChartAlert {
  id: string
  symbol: string
  name: string
  condition: string
  targetPrice: number
  message?: string
  isActive: boolean
  isTriggered: boolean
  triggeredAt?: string
  expiresAt?: string
  createdAt: string
}

interface ChartManagementProps {
  currentSymbol: string
  currentTimeframe: string
  onLayoutLoad: (layout: ChartLayout) => void
  onDrawingLoad: (drawings: ChartDrawing[]) => void
}

export function ChartManagement({ 
  currentSymbol, 
  currentTimeframe, 
  onLayoutLoad, 
  onDrawingLoad 
}: ChartManagementProps) {
  const { data: session } = useSession()
  const [layouts, setLayouts] = useState<ChartLayout[]>([])
  const [drawings, setDrawings] = useState<ChartDrawing[]>([])
  const [alerts, setAlerts] = useState<ChartAlert[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('layouts')

  // New layout form
  const [newLayoutName, setNewLayoutName] = useState('')
  const [savingLayout, setSavingLayout] = useState(false)

  // New alert form
  const [newAlert, setNewAlert] = useState({
    name: '',
    condition: 'above',
    targetPrice: 0,
    message: ''
  })
  const [savingAlert, setSavingAlert] = useState(false)

  // Load user data
  const loadData = async () => {
    if (!session?.user) return

    setLoading(true)
    try {
      // Load layouts
      const layoutsResponse = await fetch(`/api/charts/layouts?symbol=${currentSymbol}`)
      if (layoutsResponse.ok) {
        const layoutsData = await layoutsResponse.json()
        setLayouts(layoutsData.layouts || [])
      }

      // Load drawings
      const drawingsResponse = await fetch(`/api/charts/drawings?symbol=${currentSymbol}&timeframe=${currentTimeframe}`)
      if (drawingsResponse.ok) {
        const drawingsData = await drawingsResponse.json()
        setDrawings(drawingsData.drawings || [])
      }

      // Load alerts (if API exists)
      // const alertsResponse = await fetch(`/api/charts/alerts?symbol=${currentSymbol}`)
      // if (alertsResponse.ok) {
      //   const alertsData = await alertsResponse.json()
      //   setAlerts(alertsData.alerts || [])
      // }

    } catch (error) {
      console.error('Error loading chart data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Save new layout
  const saveLayout = async () => {
    if (!session?.user || !newLayoutName.trim()) return

    setSavingLayout(true)
    try {
      const response = await fetch('/api/charts/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newLayoutName,
          symbol: currentSymbol,
          timeframe: currentTimeframe,
          chartType: 'candlestick',
          indicators: [],
          settings: {},
          isDefault: false
        })
      })

      if (response.ok) {
        setNewLayoutName('')
        await loadData()
      }
    } catch (error) {
      console.error('Error saving layout:', error)
    } finally {
      setSavingLayout(false)
    }
  }

  // Delete layout
  const deleteLayout = async (layoutId: string) => {
    if (!session?.user) return

    try {
      const response = await fetch(`/api/charts/layouts?id=${layoutId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Error deleting layout:', error)
    }
  }

  // Delete drawing
  const deleteDrawing = async (drawingId: string) => {
    if (!session?.user) return

    try {
      const response = await fetch(`/api/charts/drawings?id=${drawingId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadData()
      }
    } catch (error) {
      console.error('Error deleting drawing:', error)
    }
  }

  // Export layouts
  const exportLayouts = () => {
    const dataStr = JSON.stringify(layouts, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `chart-layouts-${currentSymbol}-${Date.now()}.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  // Import layouts
  const importLayouts = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const importedLayouts = JSON.parse(e.target?.result as string)
        
        // Save imported layouts
        for (const layout of importedLayouts) {
          await fetch('/api/charts/layouts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...layout,
              id: undefined, // Remove ID to create new
              name: `${layout.name} (Imported)`
            })
          })
        }
        
        await loadData()
      } catch (error) {
        console.error('Error importing layouts:', error)
      }
    }
    reader.readAsText(file)
  }

  useEffect(() => {
    loadData()
  }, [session, currentSymbol, currentTimeframe])

  if (!session?.user) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">برای استفاده از ابزارهای پیشرفته نمودار وارد شوید</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          مدیریت نمودار
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="layouts">قالبها</TabsTrigger>
            <TabsTrigger value="drawings">نقاشیها</TabsTrigger>
            <TabsTrigger value="alerts">هشدارها</TabsTrigger>
          </TabsList>

          {/* Layouts Tab */}
          <TabsContent value="layouts" className="space-y-4">
            {/* Save New Layout */}
            <div className="flex gap-2">
              <Input
                placeholder="نام قالب جدید..."
                value={newLayoutName}
                onChange={(e) => setNewLayoutName(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={saveLayout} 
                disabled={savingLayout || !newLayoutName.trim()}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                ذخیره
              </Button>
            </div>

            {/* Import/Export */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={exportLayouts}>
                <Download className="h-4 w-4 mr-2" />
                صادرات
              </Button>
              <Button variant="outline" size="sm" asChild>
                <label>
                  <Upload className="h-4 w-4 mr-2" />
                  واردات
                  <input
                    type="file"
                    accept=".json"
                    onChange={importLayouts}
                    className="hidden"
                  />
                </label>
              </Button>
            </div>

            {/* Layouts List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : layouts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  هیچ قالبی ذخیره نشده
                </p>
              ) : (
                layouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{layout.name}</span>
                        {layout.isDefault && (
                          <Badge variant="default" className="text-xs">
                            پیشفرض
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {layout.symbol} • {layout.timeframe} • {layout.chartType}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onLayoutLoad(layout)}
                      >
                        <Layers className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteLayout(layout.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Drawings Tab */}
          <TabsContent value="drawings" className="space-y-4">
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {loading ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                </div>
              ) : drawings.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  هیچ نقاشی ذخیره نشده
                </p>
              ) : (
                drawings.map((drawing) => (
                  <div
                    key={drawing.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {drawing.name || `${drawing.type} Drawing`}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {drawing.type}
                        </Badge>
                        {drawing.isPublic && (
                          <Badge variant="secondary" className="text-xs">
                            عمومی
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {drawing.symbol} • {drawing.timeframe}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDrawingLoad([drawing])}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => deleteDrawing(drawing.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-4">
            {/* Create New Alert */}
            <div className="space-y-3 p-3 border rounded-lg">
              <Label>ایجاد هشدار جدید</Label>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="نام هشدار"
                  value={newAlert.name}
                  onChange={(e) => setNewAlert({...newAlert, name: e.target.value})}
                />
                <Input
                  type="number"
                  placeholder="قیمت هدف"
                  value={newAlert.targetPrice}
                  onChange={(e) => setNewAlert({...newAlert, targetPrice: parseFloat(e.target.value)})}
                />
              </div>
              <Input
                placeholder="پیام (اختیاری)"
                value={newAlert.message}
                onChange={(e) => setNewAlert({...newAlert, message: e.target.value})}
              />
              <Button 
                onClick={() => {/* Save alert logic */}} 
                disabled={savingAlert}
                size="sm"
                className="w-full"
              >
                <Bell className="h-4 w-4 mr-2" />
                ایجاد هشدار
              </Button>
            </div>

            {/* Alerts List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">
                  هیچ هشداری تنظیم نشده
                </p>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{alert.name}</span>
                        <Badge 
                          variant={alert.isActive ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {alert.isActive ? 'فعال' : 'غیرفعال'}
                        </Badge>
                        {alert.isTriggered && (
                          <Badge variant="destructive" className="text-xs">
                            اجرا شده
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {alert.symbol} {alert.condition} ${alert.targetPrice}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline">
                        {alert.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button size="sm" variant="outline">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}