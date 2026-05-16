'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Settings, Save, Calculator, Percent } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface CommissionSetting {
  id: string
  type: string
  minAmount: number
  maxAmount: number | null
  systemRate: number
  suggestedSarafRate: number | null
  isActive: boolean
}

export default function CommissionSettingsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [hawalaSettings, setHawalaSettings] = useState<CommissionSetting[]>([])
  const [exchangeSettings, setExchangeSettings] = useState<CommissionSetting[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testAmount, setTestAmount] = useState('1000')
  const [testResult, setTestResult] = useState<any>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/auth/signin')
      return
    }
    fetchSettings()
  }, [session, status, router])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/admin/commission-settings')
      if (response.ok) {
        const data = await response.json()
        setHawalaSettings(data.filter((s: CommissionSetting) => s.type === 'HAWALA'))
        setExchangeSettings(data.filter((s: CommissionSetting) => s.type === 'EXCHANGE'))
      }
    } catch (error) {
      toast.error(t('commission.loadError'))
    } finally {
      setLoading(false)
    }
  }

  const updateSetting = async (id: string, field: string, value: any) => {
    const updateList = (list: CommissionSetting[]) =>
      list.map(s => s.id === id ? { ...s, [field]: value } : s)
    
    setHawalaSettings(prev => updateList(prev))
    setExchangeSettings(prev => updateList(prev))
  }

  const saveSetting = async (setting: CommissionSetting) => {
    setSaving(true)
    try {
      const response = await fetch(`/api/admin/commission-settings/${setting.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(setting)
      })

      if (response.ok) {
        toast.success(t('commission.saved'))
      } else {
        toast.error(t('commission.saveError'))
      }
    } catch (error) {
      toast.error(t('commission.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const testCalculation = async () => {
    try {
      const response = await fetch(`/api/commission/calculate?type=HAWALA&amount=${testAmount}`)
      if (response.ok) {
        const data = await response.json()
        setTestResult(data)
      }
    } catch (error) {
      toast.error(t('commission.calculateError'))
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  const renderSettingsTable = (settings: CommissionSetting[], title: string) => (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Percent className="h-5 w-5" />
          {title}
        </CardTitle>
        <CardDescription>{t('commission.rangeSettings')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-2">{t('commission.amountRange')}</th>
                <th className="text-right p-2">{t('commission.systemRate')}</th>
                <th className="text-right p-2">{t('commission.suggestedSarafRate')}</th>
                <th className="text-right p-2">{t('common.status')}</th>
                <th className="text-right p-2">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {settings.map((setting) => (
                <tr key={setting.id} className="border-b">
                  <td className="p-2">
                    ${setting.minAmount.toLocaleString()} - {setting.maxAmount ? `$${setting.maxAmount.toLocaleString()}` : t('commission.unlimited')}
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={setting.systemRate}
                      onChange={(e) => updateSetting(setting.id, 'systemRate', parseFloat(e.target.value))}
                      className="w-24"
                    />
                  </td>
                  <td className="p-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={setting.suggestedSarafRate || 0}
                      onChange={(e) => updateSetting(setting.id, 'suggestedSarafRate', parseFloat(e.target.value))}
                      className="w-24"
                    />
                  </td>
                  <td className="p-2">
                    <Badge variant={setting.isActive ? 'default' : 'secondary'}>
                      {setting.isActive ? t('commission.active') : t('commission.inactive')}
                    </Badge>
                  </td>
                  <td className="p-2">
                    <Button
                      size="sm"
                      onClick={() => saveSetting(setting)}
                      disabled={saving}
                    >
                      <Save className="h-4 w-4 mr-1" />
                      {t('common.save')}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Settings className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('commission.title')}</h1>
            </div>
            <p className="text-violet-50 text-lg">{t('commission.subtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        {renderSettingsTable(hawalaSettings, t('commission.hawala'))}
        {renderSettingsTable(exchangeSettings, t('commission.exchange'))}

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t('commission.preview')}
            </CardTitle>
            <CardDescription>{t('commission.testCalculation')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label>{t('commission.hawalaAmount')}</Label>
                  <Input
                    type="number"
                    value={testAmount}
                    onChange={(e) => setTestAmount(e.target.value)}
                    placeholder="1000"
                  />
                </div>
                <div className="flex items-end">
                  <Button onClick={testCalculation}>{t('commission.calculate')}</Button>
                </div>
              </div>

              {testResult && (
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>{t('commission.amount')}:</span>
                    <span className="font-bold">${testResult.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('commission.systemCommission')} ({testResult.systemRate}%):</span>
                    <span className="font-bold">${testResult.systemCommission}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('commission.sarafCommission')} ({testResult.suggestedSarafRate}%):</span>
                    <span className="font-bold">${testResult.suggestedSarafCommission}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>{t('commission.totalCommission')}:</span>
                    <span className="font-bold">${testResult.totalCommission}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('commission.creditsRequired')}:</span>
                    <span className="font-bold text-red-600">{testResult.creditsRequired} {t('commission.credit')}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span>{t('commission.customerPays')}:</span>
                    <span className="font-bold text-green-600">${testResult.customerPays}</span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
