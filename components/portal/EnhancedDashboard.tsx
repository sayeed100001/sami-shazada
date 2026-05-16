'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { TrendingUp, DollarSign, CreditCard, Building2, ArrowUpRight, ArrowDownRight, RefreshCw } from 'lucide-react'

export default function EnhancedDashboard() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchStats = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true)
    try {
      const res = await fetch('/api/portal/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  if (loading || !stats) return <div className="p-6">Loading...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">داشبورد</h1>
        <Button onClick={() => fetchStats(true)} disabled={refreshing} variant="outline" size="sm">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          بروزرسانی
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              موجودی کریدیت
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.creditBalance || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              درآمد امروز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">${stats.todayRevenue || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              تراکنشهای امروز
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.todayTransactions || 0}</div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              شعب فعال
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.activeBranches || 0}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
