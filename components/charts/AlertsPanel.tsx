'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bell, Plus, Trash2, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

interface Alert {
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

interface AlertsPanelProps {
  symbol: string
  userId?: string
}

export function AlertsPanel({ symbol, userId }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newAlert, setNewAlert] = useState({
    name: '',
    condition: 'above',
    targetPrice: '',
    message: ''
  })

  useEffect(() => {
    if (userId) {
      loadAlerts()
    }
  }, [userId, symbol])

  const loadAlerts = async () => {
    try {
      const response = await fetch(`/api/charts/alerts?symbol=${symbol}`)
      if (response.ok) {
        const data = await response.json()
        setAlerts(data.alerts || [])
      }
    } catch (error) {
      console.error('Failed to load alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const createAlert = async () => {
    if (!newAlert.name || !newAlert.targetPrice) return

    try {
      const response = await fetch('/api/charts/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          name: newAlert.name,
          condition: newAlert.condition,
          targetPrice: parseFloat(newAlert.targetPrice),
          message: newAlert.message || undefined
        })
      })

      if (response.ok) {
        setNewAlert({ name: '', condition: 'above', targetPrice: '', message: '' })
        setShowCreateForm(false)
        loadAlerts()
      }
    } catch (error) {
      console.error('Failed to create alert:', error)
    }
  }

  const deleteAlert = async (alertId: string) => {
    try {
      const response = await fetch(`/api/charts/alerts?id=${alertId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Failed to delete alert:', error)
    }
  }

  const toggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const response = await fetch('/api/charts/alerts', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: alertId, isActive: !isActive })
      })

      if (response.ok) {
        loadAlerts()
      }
    } catch (error) {
      console.error('Failed to toggle alert:', error)
    }
  }

  const getAlertStatusIcon = (alert: Alert) => {
    if (alert.isTriggered) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    }
    if (!alert.isActive) {
      return <Clock className="w-4 h-4 text-gray-400" />
    }
    return <Bell className="w-4 h-4 text-blue-500" />
  }

  const getAlertStatusText = (alert: Alert) => {
    if (alert.isTriggered) return 'Triggered'
    if (!alert.isActive) return 'Paused'
    return 'Active'
  }

  const getAlertStatusColor = (alert: Alert) => {
    if (alert.isTriggered) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (!alert.isActive) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
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
        <h3 className="font-semibold">Price Alerts</h3>
        <Button size="sm" onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="w-4 h-4 mr-1" />
          New Alert
        </Button>
      </div>

      {/* Create Alert Form */}
      {showCreateForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Create Alert for {symbol}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              placeholder="Alert name"
              value={newAlert.name}
              onChange={(e) => setNewAlert(prev => ({ ...prev, name: e.target.value }))}
            />
            
            <div className="flex space-x-2">
              <Select
                value={newAlert.condition}
                onValueChange={(value) => setNewAlert(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="above">Above</SelectItem>
                  <SelectItem value="below">Below</SelectItem>
                  <SelectItem value="crosses_up">Crosses Up</SelectItem>
                  <SelectItem value="crosses_down">Crosses Down</SelectItem>
                </SelectContent>
              </Select>
              
              <Input
                type="number"
                placeholder="Target price"
                value={newAlert.targetPrice}
                onChange={(e) => setNewAlert(prev => ({ ...prev, targetPrice: e.target.value }))}
              />
            </div>
            
            <Input
              placeholder="Custom message (optional)"
              value={newAlert.message}
              onChange={(e) => setNewAlert(prev => ({ ...prev, message: e.target.value }))}
            />
            
            <div className="flex space-x-2">
              <Button onClick={createAlert} size="sm" className="flex-1">
                Create Alert
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowCreateForm(false)} 
                size="sm"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alerts List */}
      <div className="space-y-2">
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No price alerts set</p>
            <p className="text-xs">Create alerts to get notified of price movements</p>
          </div>
        ) : (
          alerts.map((alert) => (
            <Card key={alert.id} className={`${alert.isTriggered ? 'border-green-500' : ''}`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getAlertStatusIcon(alert)}
                    <span className="font-medium text-sm">{alert.name}</span>
                    <Badge className={`text-xs ${getAlertStatusColor(alert)}`}>
                      {getAlertStatusText(alert)}
                    </Badge>
                  </div>
                  
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleAlert(alert.id, alert.isActive)}
                      className="text-xs"
                    >
                      {alert.isActive ? 'Pause' : 'Resume'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteAlert(alert.id)}
                      className="text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="flex items-center justify-between">
                    <span>
                      When {alert.symbol} goes {alert.condition.replace('_', ' ')} ${alert.targetPrice.toLocaleString()}
                    </span>
                  </div>
                  
                  {alert.message && (
                    <div className="mt-1 text-xs bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      {alert.message}
                    </div>
                  )}
                  
                  {alert.isTriggered && alert.triggeredAt && (
                    <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      Triggered on {new Date(alert.triggeredAt).toLocaleString()}
                    </div>
                  )}
                  
                  <div className="mt-1 text-xs text-gray-500">
                    Created {new Date(alert.createdAt).toLocaleDateString()}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Alert Statistics */}
      {alerts.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Alert Summary</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-lg font-bold text-blue-600">
                  {alerts.filter(a => a.isActive && !a.isTriggered).length}
                </div>
                <div className="text-xs text-gray-500">Active</div>
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">
                  {alerts.filter(a => a.isTriggered).length}
                </div>
                <div className="text-xs text-gray-500">Triggered</div>
              </div>
              <div>
                <div className="text-lg font-bold text-gray-600">
                  {alerts.filter(a => !a.isActive).length}
                </div>
                <div className="text-xs text-gray-500">Paused</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}