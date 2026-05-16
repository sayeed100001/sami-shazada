'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Database, Download, Trash2, RefreshCw, HardDrive, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Progress } from '@/components/ui/progress'
import { useLanguage } from '@/hooks/useLanguage'

interface Backup {
  id: string
  type: 'database' | 'files' | 'full'
  filename?: string
  size: number
  status: 'completed' | 'in_progress' | 'failed'
  createdAt: string
  downloadUrl: string
}

export default function BackupsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t, language } = useLanguage()
  const [backups, setBackups] = useState<Backup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSavingAutomation, setIsSavingAutomation] = useState(false)
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(false)
  const [capabilities, setCapabilities] = useState({
    database: false,
    files: false,
    full: false
  })

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
    fetchBackups()
  }, [session, status, router])

  const fetchBackups = async () => {
    try {
      const response = await fetch('/api/admin/backups')
      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to fetch backups')
      }
      setBackups(data?.backups || [])
      setAutoBackupEnabled(data?.autoBackupEnabled || false)
      setCapabilities(data?.capabilities || { database: false, files: false, full: false })
    } catch (error) {
      console.error('Failed to fetch backups:', error)
      toast.error(error instanceof Error ? error.message : t('admin.backups.toast.fetchError'))
      setBackups([])
      setAutoBackupEnabled(false)
      setCapabilities({ database: false, files: false, full: false })
    } finally {
      setIsLoading(false)
    }
  }

  const createBackup = async (type: 'database' | 'files' | 'full') => {
    if (isLoading) return
    if (!capabilities[type]) {
      const key =
        type === 'database'
          ? 'admin.backups.capability.databaseDisabled'
          : type === 'files'
            ? 'admin.backups.capability.filesDisabled'
            : 'admin.backups.capability.fullDisabled'
      toast.error(t(key))
      return
    }

    setIsCreating(true)
    try {
      const response = await fetch('/api/admin/backups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })

      const data = await response.json().catch(() => null)
      if (response.ok) {
        toast.success(data?.backup?.filename ? data.backup.filename : t('admin.backups.action.create'))
        await fetchBackups()
      } else {
        toast.error(data?.details || data?.error || t('admin.backups.toast.createError'))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.backups.toast.createError'))
    } finally {
      setIsCreating(false)
    }
  }

  const deleteBackup = async (id: string) => {
    if (!confirm(t('admin.backups.confirmDelete'))) return

    try {
      const response = await fetch(`/api/admin/backups/${id}`, {
        method: 'DELETE'
      })

      const data = await response.json().catch(() => null)
      if (response.ok) {
        toast.success(t('admin.backups.toast.deleted'))
        fetchBackups()
      } else {
        toast.error(data?.error || t('admin.backups.toast.deleteError'))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t('admin.backups.toast.deleteError'))
    }
  }

  const updateAutoBackupSetting = async (enabled: boolean) => {
    setIsSavingAutomation(true)
    try {
      const response = await fetch('/api/admin/backups', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoBackupEnabled: enabled })
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to update backup automation')
      }

      setAutoBackupEnabled(Boolean(data?.autoBackupEnabled))
      toast.success(enabled ? t('admin.backups.toast.autoEnabled') : t('admin.backups.toast.autoDisabled'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update backup automation')
    } finally {
      setIsSavingAutomation(false)
    }
  }

  const downloadBackup = (backup: Backup) => {
    if (!backup.downloadUrl) {
      toast.error(t('admin.backups.toast.downloadMissing'))
      return
    }
    window.open(backup.downloadUrl, '_blank')
    toast.success(t('admin.backups.toast.downloadStarted'))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getTypeBadge = (type: string) => {
    const colors: any = {
      database: 'bg-blue-100 text-blue-800',
      files: 'bg-green-100 text-green-800',
      full: 'bg-purple-100 text-purple-800'
    }
    const labels: any = {
      database: t('admin.backups.type.database'),
      files: t('admin.backups.type.files'),
      full: t('admin.backups.type.full')
    }
    return <Badge className={colors[type]}>{labels[type] || type}</Badge>
  }

  const getStatusBadge = (status: string) => {
    const colors: any = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    const labels: any = {
      completed: t('admin.backups.status.completed'),
      in_progress: t('admin.backups.status.inProgress'),
      failed: t('admin.backups.status.failed')
    }
    return <Badge className={colors[status]}>{labels[status] || status}</Badge>
  }

  const formatDateTime = (iso: string) => {
    const locale = language === 'en' ? 'en-US' : 'fa-IR'
    return new Date(iso).toLocaleString(locale)
  }

  if (status === 'loading' || !session) {
    return <DashboardLayout><div className="flex justify-center py-12">{t('common.loading')}</div></DashboardLayout>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 p-8 text-white rounded-2xl shadow-xl">
          <div className="flex items-center gap-3 mb-2">
            <Database className="h-8 w-8" />
            <h1 className="text-4xl font-bold">{t('admin.backups')}</h1>
          </div>
          <p className="text-teal-50 text-lg">{t('admin.backups.subtitle')}</p>
        </div>

        {!isLoading && !capabilities.database && !capabilities.files ? (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t('admin.system.maintenance.db.title')}</CardTitle>
              <CardDescription>{t('admin.system.maintenance.db.desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground leading-7">{t('admin.system.maintenance.db.note')}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => router.push('/admin/system')}>
                  {t('admin.system')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t('admin.backups.card.database.title')}</CardTitle>
              <CardDescription>{t('admin.backups.card.database.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createBackup('database')} 
                disabled={isCreating || !capabilities.database}
                className="w-full"
              >
                <Database className="h-4 w-4 mr-2" />
                {t('admin.backups.action.create')}
              </Button>
              {!capabilities.database && (
                <p className="mt-2 text-xs text-muted-foreground">{t('admin.backups.capability.databaseDisabled')}</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t('admin.backups.card.files.title')}</CardTitle>
              <CardDescription>{t('admin.backups.card.files.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createBackup('files')} 
                disabled={isCreating || !capabilities.files}
                className="w-full"
              >
                <HardDrive className="h-4 w-4 mr-2" />
                {t('admin.backups.action.create')}
              </Button>
              {!capabilities.files && (
                <p className="mt-2 text-xs text-muted-foreground">{t('admin.backups.capability.filesDisabled')}</p>
              )}
            </CardContent>
          </Card>

          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>{t('admin.backups.card.full.title')}</CardTitle>
              <CardDescription>{t('admin.backups.card.full.desc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => createBackup('full')} 
                disabled={isCreating || !capabilities.full}
                className="w-full"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('admin.backups.action.create')}
              </Button>
              {!capabilities.full && (
                <p className="mt-2 text-xs text-muted-foreground">{t('admin.backups.capability.fullDisabled')}</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="glass-card border-0">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>{t('admin.backups.list.title')}</CardTitle>
                <CardDescription>{backups.length} {t('admin.backups.list.countSuffix')}</CardDescription>
              </div>
              <Button onClick={fetchBackups} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                {t('admin.backups.action.refresh')}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoading ? (
                <div className="text-center py-8">{t('common.loading')}</div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Database className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>{t('admin.backups.list.empty')}</p>
                </div>
              ) : (
                backups.map((backup) => (
                  <Card key={backup.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            {getTypeBadge(backup.type)}
                            {getStatusBadge(backup.status)}
                            <span className="text-sm text-muted-foreground">
                              {formatSize(backup.size)}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            <span>{formatDateTime(backup.createdAt)}</span>
                          </div>
                          {backup.filename && (
                            <div className="mt-1 text-xs text-muted-foreground break-all">
                              {backup.filename}
                            </div>
                          )}

                          {backup.status === 'in_progress' && (
                            <Progress value={65} className="mt-2" />
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          {backup.status === 'completed' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => downloadBackup(backup)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteBackup(backup.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>{t('admin.backups.automation.title')}</CardTitle>
            <CardDescription>{t('admin.backups.automation.desc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                <span>{t('admin.backups.automation.daily')}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={autoBackupEnabled ? 'default' : 'secondary'}>
                    {autoBackupEnabled ? t('admin.backups.automation.enabled') : t('admin.backups.automation.disabled')}
                  </Badge>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isSavingAutomation}
                    onClick={() => updateAutoBackupSetting(!autoBackupEnabled)}
                  >
                    {autoBackupEnabled ? t('admin.backups.action.disable') : t('admin.backups.action.enable')}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {t('admin.backups.automation.note')}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
