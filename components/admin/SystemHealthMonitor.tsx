'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle, RefreshCw, Server, XCircle } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface SystemHealth {
  status: 'healthy' | 'warning' | 'critical'
  metrics: {
    totalRequests: number
    totalErrors: number
    criticalErrors: number
    highErrors: number
    avgResponseTime: number
    errorRate: number
  }
  timestamp: Date
}

interface SystemMetric {
  name: string
  value: number
  unit: string
  status: 'good' | 'warning' | 'critical'
  threshold: number
}

const localeMap = {
  fa: 'fa-IR',
  en: 'en-US',
  ps: 'ps-AF',
} as const

const copy = {
  fa: {
    title: 'سلامت سیستم',
    overallStatus: 'وضعیت کلی',
    totalRequests: 'کل درخواست‌ها',
    errorRate: 'نرخ خطا',
    errorSummary: 'خلاصه خطاها',
    criticalErrors: 'خطاهای بحرانی',
    highErrors: 'خطاهای مهم',
    totalErrors: 'کل خطاها',
    criticalAlert: 'سیستم در وضعیت بحرانی قرار دارد و نیاز به بررسی فوری دارد.',
    warningAlert: 'سیستم نشانه‌های هشدار دارد و باید پایش شود.',
    lastUpdate: 'آخرین بروزرسانی',
    threshold: 'حد آستانه',
    status: {
      healthy: 'سالم',
      warning: 'هشدار',
      critical: 'بحرانی',
      good: 'خوب',
      unknown: 'نامشخص',
    },
    metrics: {
      'Response Time': 'زمان پاسخ',
      'Memory Usage': 'مصرف حافظه',
      'Active Users': 'کاربران فعال',
      'Error Rate': 'نرخ خطا',
    },
  },
  en: {
    title: 'System Health',
    overallStatus: 'Overall Status',
    totalRequests: 'Total Requests',
    errorRate: 'Error Rate',
    errorSummary: 'Error Summary',
    criticalErrors: 'Critical Errors',
    highErrors: 'High Errors',
    totalErrors: 'Total Errors',
    criticalAlert: 'The system is in a critical state and needs immediate attention.',
    warningAlert: 'The system is showing warnings and should be monitored closely.',
    lastUpdate: 'Last Update',
    threshold: 'Threshold',
    status: {
      healthy: 'Healthy',
      warning: 'Warning',
      critical: 'Critical',
      good: 'Good',
      unknown: 'Unknown',
    },
    metrics: {
      'Response Time': 'Response Time',
      'Memory Usage': 'Memory Usage',
      'Active Users': 'Active Users',
      'Error Rate': 'Error Rate',
    },
  },
  ps: {
    title: 'د سیسټم روغتیا',
    overallStatus: 'عمومي وضعیت',
    totalRequests: 'ټولې غوښتنې',
    errorRate: 'د خطا کچه',
    errorSummary: 'د خطا لنډیز',
    criticalErrors: 'بحراني خطاګانې',
    highErrors: 'لوړې خطاګانې',
    totalErrors: 'ټولې خطاګانې',
    criticalAlert: 'سیسټم په بحراني حالت کې دی او عاجلې څېړنې ته اړتیا لري.',
    warningAlert: 'سیسټم د خبرتیا نښې لري او باید وڅارل شي.',
    lastUpdate: 'وروستۍ بروزرسانی',
    threshold: 'حد',
    status: {
      healthy: 'سالم',
      warning: 'خبرتیا',
      critical: 'بحراني',
      good: 'ښه',
      unknown: 'نامعلوم',
    },
    metrics: {
      'Response Time': 'د ځواب وخت',
      'Memory Usage': 'د حافظې کارونه',
      'Active Users': 'فعال کاروونکي',
      'Error Rate': 'د خطا کچه',
    },
  },
} as const

type HealthLanguage = keyof typeof copy

export function SystemHealthMonitor() {
  const { language } = useLanguage()
  const activeLanguage = ((language as HealthLanguage) || 'fa')
  const labels = copy[activeLanguage] ?? copy.fa
  const locale = localeMap[activeLanguage] ?? localeMap.fa

  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [metrics, setMetrics] = useState<SystemMetric[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale])
  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      }),
    [locale]
  )

  useEffect(() => {
    void loadSystemHealth()
  }, [])

  const loadSystemHealth = async () => {
    try {
      setIsLoading(true)

      const metricsResponse = await fetch('/api/admin/system/metrics')
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json()
        setMetrics(metricsData.metrics || [])
        if (metricsData.health) {
          setHealth({
            ...metricsData.health,
            timestamp: new Date(metricsData.health.timestamp),
          })
        }
      }

      setLastUpdate(new Date())
    } catch (error) {
      console.error('Failed to load system health:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Activity className="h-5 w-5 text-gray-500" />
    }
  }

  const formatMetricValue = (value: number, unit: string) => {
    const formattedValue = numberFormatter.format(Math.round(unit === 'ms' ? value : value * 100) / (unit === 'ms' ? 1 : 100))

    if (unit === 'ms') return `${formattedValue}ms`
    if (unit === '%') return `${formattedValue}%`
    if (unit === 'MB') return `${formattedValue}MB`
    return `${formattedValue}${unit}`
  }

  const formatStatus = (status: string) => {
    switch (status) {
      case 'healthy':
        return labels.status.healthy
      case 'warning':
        return labels.status.warning
      case 'critical':
        return labels.status.critical
      case 'good':
        return labels.status.good
      default:
        return labels.status.unknown
    }
  }

  const getMetricLabel = (metricName: string) => labels.metrics[metricName as keyof typeof labels.metrics] || metricName

  useAdaptivePolling(loadSystemHealth, {
    enabled: true,
    activeIntervalMs: POLLING_INTERVALS.adminStatsActiveMs,
    idleIntervalMs: POLLING_INTERVALS.adminStatsIdleMs,
    hiddenIntervalMs: false,
    runImmediately: false,
  })

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            <span>{labels.title}</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={health?.status === 'healthy' ? 'default' : 'destructive'}>
              {formatStatus(health?.status || 'unknown')}
            </Badge>
            <Button variant="outline" size="sm" onClick={loadSystemHealth} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {health ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="flex items-center gap-3">
                {getStatusIcon(health.status)}
                <div>
                  <p className="font-medium">{labels.overallStatus}</p>
                  <p className="text-sm text-muted-foreground">{formatStatus(health.status)}</p>
                </div>
              </div>
              <div>
                <p className="font-medium">{labels.totalRequests}</p>
                <p className="text-2xl font-bold">{numberFormatter.format(health.metrics.totalRequests)}</p>
              </div>
              <div>
                <p className="font-medium">{labels.errorRate}</p>
                <p className="text-2xl font-bold">{numberFormatter.format(Math.round(health.metrics.errorRate * 100))}%</p>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric, index) => (
          <Card key={`${metric.name}-${index}`}>
            <CardContent className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-medium">{getMetricLabel(metric.name)}</p>
                <Badge variant={metric.status === 'good' ? 'default' : 'destructive'} className="text-xs">
                  {formatStatus(metric.status)}
                </Badge>
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold">{formatMetricValue(metric.value, metric.unit)}</p>
                <Progress value={Math.min(100, (metric.value / metric.threshold) * 100)} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {labels.threshold}: {formatMetricValue(metric.threshold, metric.unit)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {health && health.metrics.totalErrors > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span>{labels.errorSummary}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-500">{numberFormatter.format(health.metrics.criticalErrors)}</p>
                <p className="text-sm text-muted-foreground">{labels.criticalErrors}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-yellow-500">{numberFormatter.format(health.metrics.highErrors)}</p>
                <p className="text-sm text-muted-foreground">{labels.highErrors}</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{numberFormatter.format(health.metrics.totalErrors)}</p>
                <p className="text-sm text-muted-foreground">{labels.totalErrors}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {health?.status === 'critical' ? (
        <Alert variant="destructive">
          <XCircle className="h-4 w-4" />
          <AlertDescription>{labels.criticalAlert}</AlertDescription>
        </Alert>
      ) : null}

      {health?.status === 'warning' ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{labels.warningAlert}</AlertDescription>
        </Alert>
      ) : null}

      <div className="text-center text-sm text-muted-foreground">
        {labels.lastUpdate}: {dateFormatter.format(lastUpdate)}
      </div>
    </div>
  )
}
