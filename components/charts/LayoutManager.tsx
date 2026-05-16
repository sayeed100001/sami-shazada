'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Layout, Save, Trash2, Star, Download, Upload } from 'lucide-react'

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

interface LayoutManagerProps {
  currentLayout: any
  onLayoutLoad: (layout: ChartLayout) => void
  userId?: string
}

export function LayoutManager({ currentLayout, onLayoutLoad, userId }: LayoutManagerProps) {
  const [layouts, setLayouts] = useState<ChartLayout[]>([])
  const [loading, setLoading] = useState(true)
  const [showSaveForm, setShowSaveForm] = useState(false)
  const [layoutName, setLayoutName] = useState('')

  useEffect(() => {
    if (userId) {
      loadLayouts()
    }
  }, [userId])

  const loadLayouts = async () => {
    try {
      const response = await fetch('/api/charts/layouts')
      if (response.ok) {
        const data = await response.json()
        setLayouts(data.layouts || [])
      }
    } catch (error) {
      console.error('Failed to load layouts:', error)
    } finally {
      setLoading(false)
    }
  }

  const saveCurrentLayout = async () => {
    if (!layoutName.trim()) return

    try {
      const response = await fetch('/api/charts/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: layoutName,
          symbol: 'BTCUSD', // Current symbol
          timeframe: '1H', // Current timeframe
          chartType: 'candlestick', // Current chart type
          indicators: ['Volume'], // Current indicators
          settings: currentLayout || {},
          isDefault: false
        })
      })

      if (response.ok) {
        setLayoutName('')
        setShowSaveForm(false)
        loadLayouts()
      }
    } catch (error) {
      console.error('Failed to save layout:', error)
    }
  }

  const deleteLayout = async (layoutId: string) => {
    try {
      const response = await fetch(`/api/charts/layouts?id=${layoutId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadLayouts()
      }
    } catch (error) {
      console.error('Failed to delete layout:', error)
    }
  }

  const setDefaultLayout = async (layoutId: string) => {
    try {
      const response = await fetch('/api/charts/layouts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: layoutId, isDefault: true })
      })

      if (response.ok) {
        loadLayouts()
      }
    } catch (error) {
      console.error('Failed to set default layout:', error)
    }
  }

  const exportLayout = (layout: ChartLayout) => {
    const dataStr = JSON.stringify(layout, null, 2)
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr)
    
    const exportFileDefaultName = `${layout.name.replace(/\s+/g, '_')}_layout.json`
    
    const linkElement = document.createElement('a')
    linkElement.setAttribute('href', dataUri)
    linkElement.setAttribute('download', exportFileDefaultName)
    linkElement.click()
  }

  const importLayout = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const layout = JSON.parse(e.target?.result as string)
            // Save imported layout
            fetch('/api/charts/layouts', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...layout,
                id: undefined, // Remove ID to create new
                name: `${layout.name} (Imported)`,
                isDefault: false
              })
            }).then(() => loadLayouts())
          } catch (error) {
            console.error('Failed to import layout:', error)
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Chart Layouts</h3>
        <div className="flex space-x-1">
          <Button size="sm" variant="outline" onClick={importLayout}>
            <Upload className="w-4 h-4" />
          </Button>
          <Button size="sm" onClick={() => setShowSaveForm(!showSaveForm)}>
            <Save className="w-4 h-4 mr-1" />
            Save
          </Button>
        </div>
      </div>

      {/* Save Layout Form */}
      {showSaveForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Save Current Layout</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Layout name"
              value={layoutName}
              onChange={(e) => setLayoutName(e.target.value)}
            />
            
            <div className="flex space-x-2">
              <Button onClick={saveCurrentLayout} size="sm" className="flex-1">
                Save Layout
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowSaveForm(false)} 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Layouts List */}
      <div className="space-y-2">
        {layouts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Layout className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No saved layouts</p>
            <p className="text-xs">Save your chart configurations for quick access</p>
          </div>
        ) : (
          layouts.map((layout) => (
            <Card key={layout.id} className={`${layout.isDefault ? 'border-blue-500' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <Layout className="w-4 h-4" />
                    <span className="font-medium text-sm">{layout.name}</span>
                    {layout.isDefault && (
                      <Badge className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        Default
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => exportLayout(layout)}
                      className="text-xs"
                      title="Export Layout"
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultLayout(layout.id)}
                      className="text-xs"
                      title="Set as Default"
                    >
                      <Star className={`w-4 h-4 ${layout.isDefault ? 'text-yellow-500 fill-current' : ''}`} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteLayout(layout.id)}
                      className="text-gray-400 hover:text-red-500"
                      title="Delete Layout"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Symbol: {layout.symbol}</span>
                    <span>Timeframe: {layout.timeframe}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>Chart: {layout.chartType}</span>
                    <span>Indicators: {layout.indicators.length}</span>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Updated {new Date(layout.updatedAt).toLocaleDateString()}
                  </div>
                  
                  <Button
                    onClick={() => onLayoutLoad(layout)}
                    size="sm"
                    className="w-full mt-2"
                    variant="outline"
                  >
                    Load Layout
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Quick Templates</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Load scalping template
                onLayoutLoad({
                  id: 'template-scalping',
                  name: 'Scalping',
                  symbol: 'BTCUSD',
                  timeframe: '1m',
                  chartType: 'candlestick',
                  indicators: ['Volume', 'RSI', 'EMA'],
                  settings: {},
                  isDefault: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                })
              }}
              className="text-xs"
            >
              Scalping
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Load swing trading template
                onLayoutLoad({
                  id: 'template-swing',
                  name: 'Swing Trading',
                  symbol: 'BTCUSD',
                  timeframe: '4H',
                  chartType: 'candlestick',
                  indicators: ['Volume', 'MACD', 'Bollinger'],
                  settings: {},
                  isDefault: false,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString()
                })
              }}
              className="text-xs"
            >
              Swing Trading
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}