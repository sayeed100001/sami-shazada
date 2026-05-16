'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Bell, 
  Plus, 
  Trash2, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'

interface TradingAlert {
  id: string
  symbol: string
  condition: 'above' | 'below' | 'crosses_above' | 'crosses_below'
  price: number
  message?: string
  isActive: boolean
  createdAt: Date
  triggeredAt?: Date
}

interface TradingAlertsProps {
  symbol: string
}

export function TradingAlerts({ symbol }: TradingAlertsProps) {
  const [alerts, setAlerts] = useState<TradingAlert[]>([])
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAlert, setNewAlert] = useState({
    condition: 'above' as const,
    price: '',
    message: ''
  })

  // Load alerts from localStorage
  useEffect(() => {
    try {
      const savedAlerts = localStorage.getItem('trading_alerts')
      if (savedAlerts) {
        const parsed = JSON.parse(savedAlerts)
        setAlerts(parsed.map((alert: any) => ({
          ...alert,
          createdAt: new Date(alert.createdAt),
          triggeredAt: alert.triggeredAt ? new Date(alert.triggeredAt) : undefined
        })))
      }
    } catch (error) {
      console.warn('Failed to load alerts:', error)
    }
  }, [])

  // Save alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('trading_alerts', JSON.stringify(alerts))
    } catch (error) {
      console.warn('Failed to save alerts:', error)
    }
  }, [alerts])

  // Mock price monitoring (in real app, this would be WebSocket)
  useEffect(() => {
    const interval = setInterval(() => {
      const currentPrice = Math.random() * 1000 // Mock current price
      
      setAlerts(prev => prev.map(alert => {
        if (!alert.isActive || alert.triggeredAt) return alert

        let shouldTrigger = false
        switch (alert.condition) {
          case 'above':
            shouldTrigger = currentPrice > alert.price
            break
          case 'below':
            shouldTrigger = currentPrice < alert.price
            break
          case 'crosses_above':
            shouldTrigger = currentPrice > alert.price
            break
          case 'crosses_below':
            shouldTrigger = currentPrice < alert.price
            break
        }

        if (shouldTrigger) {
          // Show notification (in real app)
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`هشدار قیمت ${alert.symbol}`, {
              body: `قیمت ${getConditionText(alert.condition)} ${alert.price} رسید`,
              icon: '/favicon.ico'
            })
          }

          return {
            ...alert,
            triggeredAt: new Date(),
            isActive: false
          }
        }

        return alert
      }))
    }, 5000)

    return () => clearInterval(interval)
  }, [])

  const getConditionText = (condition: TradingAlert['condition']) => {
    switch (condition) {
      case 'above': return 'بالای'
      case 'below': return 'زیر'
      case 'crosses_above': return 'عبور از بالای'
      case 'crosses_below': return 'عبور از زیر'
      default: return condition
    }
  }

  const getConditionIcon = (condition: TradingAlert['condition']) => {
    switch (condition) {
      case 'above':
      case 'crosses_above':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'below':
      case 'crosses_below':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <AlertTriangle className="h-4 w-4" />
    }
  }

  const createAlert = () => {
    if (!newAlert.price || isNaN(Number(newAlert.price))) return

    const alert: TradingAlert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      symbol,
      condition: newAlert.condition,
      price: Number(newAlert.price),
      message: newAlert.message,
      isActive: true,
      createdAt: new Date()
    }

    setAlerts(prev => [alert, ...prev])
    setNewAlert({ condition: 'above', price: '', message: '' })
    setShowCreateForm(false)

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }

  const deleteAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId))
  }

  const toggleAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId 
        ? { ...alert, isActive: !alert.isActive, triggeredAt: undefined }
        : alert
    ))
  }

  const symbolAlerts = alerts.filter(alert => alert.symbol === symbol)
  const activeAlerts = symbolAlerts.filter(alert => alert.isActive && !alert.triggeredAt)
  const triggeredAlerts = symbolAlerts.filter(alert => alert.triggeredAt)

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            هشدارهای قیمت
            {activeAlerts.length > 0 && (
              <Badge variant="secondary">{activeAlerts.length}</Badge>
            )}
          </CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateForm(!showCreateForm)}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {showCreateForm && (
          <div className="space-y-3 p-3 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <Label>شرط هشدار</Label>
              <Select
                value={newAlert.condition}
                onValueChange={(value: any) => setNewAlert(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">بالای قیمت</SelectItem>
                  <SelectItem value="below">زیر قیمت</SelectItem>
                  <SelectItem value="crosses_above">عبور از بالای</SelectItem>
                  <SelectItem value="crosses_below">عبور از زیر</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>قیمت هدف</Label>
              <Input
                type="number"
                placeholder="مثال: 45000"
                value={newAlert.price}
                onChange={(e) => setNewAlert(prev => ({ ...prev, price: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>پیام (اختیاری)</Label>
              <Input
                placeholder="پیام سفارشی..."
                value={newAlert.message}
                onChange={(e) => setNewAlert(prev => ({ ...prev, message: e.target.value }))}
              />
            </div>

            <div className="flex gap-2">
              <Button onClick={createAlert} size="sm" className="flex-1">
                ایجاد هشدار
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowCreateForm(false)}
              >
                لغو
              </Button>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          <div className="space-y-3 p-3">
            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  هشدارهای فعال ({activeAlerts.length})
                </h4>
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getConditionIcon(alert.condition)}
                        <span className="font-semibold text-sm">{alert.symbol}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleAlert(alert.id)}
                          className="h-6 w-6 p-0"
                        >
                          <Bell className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteAlert(alert.id)}
                          className="h-6 w-6 p-0 text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-sm">
                      {getConditionText(alert.condition)} <span className="font-mono font-semibold">${alert.price.toLocaleString()}</span>
                    </div>
                    
                    {alert.message && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {alert.message}
                      </div>
                    )}
                    
                    <div className="text-xs text-muted-foreground mt-2">
                      ایجاد شده: {alert.createdAt.toLocaleString('fa-IR')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Triggered Alerts */}
            {triggeredAlerts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  هشدارهای اجرا شده ({triggeredAlerts.length})
                </h4>
                {triggeredAlerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className="p-3 border rounded-lg bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-sm">{alert.symbol}</span>
                        <Badge variant="secondary" className="text-xs">اجرا شده</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAlert(alert.id)}
                        className="h-6 w-6 p-0 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="text-sm">
                      {getConditionText(alert.condition)} <span className="font-mono font-semibold">${alert.price.toLocaleString()}</span>
                    </div>
                    
                    {alert.message && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {alert.message}
                      </div>
                    )}
                    
                    <div className="text-xs text-green-600 mt-2">
                      اجرا شده: {alert.triggeredAt?.toLocaleString('fa-IR')}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {symbolAlerts.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">هیچ هشداری برای {symbol} تنظیم نشده</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-2"
                  onClick={() => setShowCreateForm(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  ایجاد اولین هشدار
                </Button>
              </div>
            )}
          </div>
        </ScrollArea>

        {symbolAlerts.length > 0 && (
          <div className="p-3 border-t border-border">
            <div className="text-xs text-muted-foreground text-center">
              {activeAlerts.length} فعال • {triggeredAlerts.length} اجرا شده
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}