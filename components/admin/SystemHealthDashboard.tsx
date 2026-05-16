'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RefreshCw, Database, Globe, Settings } from 'lucide-react'
import { SystemHealth, getHealthStatusColor, getHealthStatusIcon } from '@/lib/system-health'

export function SystemHealthDashboard() {
  const [health, setHealth] = useState<SystemHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchSystemHealth = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/system/health')
      if (response.ok) {
        const data = await response.json()
        setHealth(data.health)
        setLastUpdated(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSystemHealth()
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchSystemHealth, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading && !health) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            System Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              System Health Monitor
            </CardTitle>
            <div className="flex items-center gap-2">
              {health && (
                <Badge 
                  variant={health.overall === 'healthy' ? 'default' : health.overall === 'degraded' ? 'secondary' : 'destructive'}
                  className="flex items-center gap-1"
                >
                  <span>{getHealthStatusIcon(health.overall)}</span>
                  {health.overall.toUpperCase()}
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchSystemHealth}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </div>
          {lastUpdated && (
            <p className="text-sm text-muted-foreground">
              Last updated: {lastUpdated.toLocaleString()}
            </p>
          )}
        </CardHeader>
        <CardContent>
          {health && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Database Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    Database
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Connection</span>
                      <Badge variant={health.database.connected ? 'default' : 'destructive'}>
                        {health.database.connected ? '✅ Connected' : '❌ Disconnected'}
                      </Badge>
                    </div>
                    {health.database.latency && (
                      <div className="flex items-center justify-between">
                        <span>Latency</span>
                        <span className="text-sm text-muted-foreground">
                          {health.database.latency}ms
                        </span>
                      </div>
                    )}
                    {health.database.error && (
                      <div className="text-sm text-red-500 mt-2">
                        Error: {health.database.error}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* APIs Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Globe className="w-5 h-5" />
                    External APIs
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Crypto API</span>
                      <Badge variant={health.apis.crypto ? 'default' : 'destructive'}>
                        {health.apis.crypto ? '✅ Online' : '❌ Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Exchange Rates</span>
                      <Badge variant={health.apis.rates ? 'default' : 'destructive'}>
                        {health.apis.rates ? '✅ Online' : '❌ Offline'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Commodities</span>
                      <Badge variant={health.apis.commodities ? 'default' : 'destructive'}>
                        {health.apis.commodities ? '✅ Online' : '❌ Offline'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Services Health */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Services
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>Authentication</span>
                      <Badge variant={health.services.auth ? 'default' : 'destructive'}>
                        {health.services.auth ? '✅ Active' : '❌ Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Notifications</span>
                      <Badge variant={health.services.notifications ? 'default' : 'destructive'}>
                        {health.services.notifications ? '✅ Active' : '❌ Inactive'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Charts</span>
                      <Badge variant={health.services.charts ? 'default' : 'destructive'}>
                        {health.services.charts ? '✅ Active' : '❌ Inactive'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}