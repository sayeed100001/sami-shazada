'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertTriangle, XCircle, RefreshCw, Activity, Database, Server, Wifi } from 'lucide-react'

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  checks: {
    database: {
      status: 'up' | 'down'
      responseTime?: number
      error?: string
    }
    api: {
      status: 'up' | 'down'
      responseTime?: number
    }
    memory: {
      used: number
      total: number
      percentage: number
    }
    uptime: number
  }
  version: string
  environment: string
}

export default function SystemStatusPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const fetchSystemHealth = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/health', {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        setHealth(data)
        setLastCheck(new Date())
      } else {
        throw new Error(`HTTP ${response.status}`)
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error)
      setHealth({
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        checks: {
          database: { status: 'down', error: 'Connection failed' },
          api: { status: 'down' },
          memory: { used: 0, total: 0, percentage: 0 },
          uptime: 0
        },
        version: '1.0.0',
        environment: 'unknown'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemHealth()
    const interval = setInterval(fetchSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'degraded':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'unhealthy':
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'up':
        return <Badge className="bg-green-100 text-green-800">سالم</Badge>
      case 'degraded':
        return <Badge className="bg-yellow-100 text-yellow-800">کاهش عملکرد</Badge>
      case 'unhealthy':
      case 'down':
        return <Badge className="bg-red-100 text-red-800">خطا</Badge>
      default:
        return <Badge variant="secondary">نامشخص</Badge>
    }
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (days > 0) {
      return `${days} روز، ${hours} ساعت`
    } else if (hours > 0) {
      return `${hours} ساعت، ${minutes} دقیقه`
    } else {
      return `${minutes} دقیقه`
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen w-full overflow-x-hidden p-2 sm:p-4 lg:p-6">
        <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6">
          <div className="text-center">
            <h1 className="text-lg sm:text-2xl lg:text-3xl font-bold gradient-text mb-2">
              وضعیت سیستم
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground">
              نظارت بر سلامت و عملکرد سیستم
            </p>
          </div>

          <Card>
            <CardHeader className="text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                {health && getStatusIcon(health.status)}
                <CardTitle className="text-lg sm:text-xl">
                  {health?.status === 'healthy' ? 'سیستم سالم است' :
                   health?.status === 'degraded' ? 'کاهش عملکرد سیستم' :
                   'سیستم دچار مشکل است'}
                </CardTitle>
              </div>
              {health && getStatusBadge(health.status)}
            </CardHeader>
            <CardContent className="text-center">
              <div className="flex flex-col sm:flex-row justify-center items-center gap-4 text-sm text-muted-foreground">
                <div>
                  آخرین بررسی: {lastCheck ? lastCheck.toLocaleTimeString('fa-IR') : 'در حال بارگذاری...'}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={fetchSystemHealth}
                  disabled={loading}
                  className="text-xs touch-target"
                >
                  <RefreshCw className={`h-3 w-3 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  بروزرسانی
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    <CardTitle className="text-base">پایگاه داده</CardTitle>
                  </div>
                  {health && getStatusIcon(health.checks.database.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>وضعیت:</span>
                    {health && getStatusBadge(health.checks.database.status)}
                  </div>
                  {health?.checks.database.responseTime && (
                    <div className="flex justify-between text-sm">
                      <span>زمان پاسخ:</span>
                      <span className="persian-numbers">{health.checks.database.responseTime}ms</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-green-500" />
                    <CardTitle className="text-base">API سرور</CardTitle>
                  </div>
                  {health && getStatusIcon(health.checks.api.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>وضعیت:</span>
                    {health && getStatusBadge(health.checks.api.status)}
                  </div>
                  {health?.checks.api.responseTime && (
                    <div className="flex justify-between text-sm">
                      <span>زمان پاسخ:</span>
                      <span className="persian-numbers">{health.checks.api.responseTime}ms</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}