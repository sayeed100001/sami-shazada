'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ManagedImageUploadField } from '@/components/shared/managed-image-upload-field'
import { IMAGE_UPLOAD_LIMITS } from '@/lib/image-upload-limits'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Settings, RefreshCw, AlertTriangle, Server, Image as ImageIcon, Palette, Database, HardDrive, Trash2, Eye, Download, Upload, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useLanguage } from '@/hooks/useLanguage'

interface SystemConfig {
  key: string
  value: string
  description?: string | null
  updatedAt: string
  isSensitive?: boolean
  isConfigured?: boolean
  maskedValue?: string | null
}

type StorageUsagePayload = {
  provider: string
  now: string
  database: {
    sizeBytes: number | null
    documentsTotalBytes: number
    tableCounts: Record<string, number>
  }
  blob: {
    uniqueReferencedUrls: number
    headChecked: number
    headFailed: number
    bytesFromHead: number
    truncated: boolean
    note: string
  }
  hosting: {
    vercelRegion: string | null
    vercelEnv: string | null
    note: string
  }
}

export default function SystemConfigPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { t } = useLanguage()
  const [configs, setConfigs] = useState<SystemConfig[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [storageUsage, setStorageUsage] = useState<StorageUsagePayload | null>(null)
  const [storageLoading, setStorageLoading] = useState(false)
  const [cleanupBusy, setCleanupBusy] = useState(false)
  const [cleanupResult, setCleanupResult] = useState<any>(null)
  const [cleanupOptions, setCleanupOptions] = useState({
    olderThanDays: 30,
    purgeAttachments: true,
    purgeMessages: false,
    purgeChats: false,
    purgeExpiredStories: true,
  })
  const [cleanupConfirm, setCleanupConfirm] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [resetPhrase, setResetPhrase] = useState('')
  const [resetConfirm, setResetConfirm] = useState(false)
  const [dbExportBusy, setDbExportBusy] = useState(false)
  const [dbRestoreBusy, setDbRestoreBusy] = useState(false)
  const [dbRestoreTarget, setDbRestoreTarget] = useState<'primary' | 'backup'>('primary')
  const [dbRestoreConfirm, setDbRestoreConfirm] = useState(false)
  const [dbRestorePhrase, setDbRestorePhrase] = useState('')
  const [dbRestoreFile, setDbRestoreFile] = useState<File | null>(null)
  const [backupDbUrlDraft, setBackupDbUrlDraft] = useState('')

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'ADMIN') {
      router.push('/')
      return
    }
  }, [session, status, router])

  useEffect(() => {
    if (session?.user?.role === 'ADMIN') {
      fetchConfigs()
    }
  }, [session])

  const fetchConfigs = async () => {
    try {
      const response = await fetch('/api/admin/system-config')
      if (response.ok) {
        const data = await response.json()
        setConfigs(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to fetch configs:', error)
      toast.error(t('admin.system.toast.loadError'))
    } finally {
      setIsLoading(false)
    }
  }

  const updateConfig = async (key: string, value: string) => {
    try {
      setIsSaving(true)
      const response = await fetch('/api/admin/system-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      })
      const payload = await response.json().catch(() => null)

      if (response.ok) {
        await fetchConfigs()
        toast.success(t('admin.system.toast.saved'))
        
        if (key === 'default_language') {
          document.documentElement.lang = value
          document.documentElement.dir = value === 'en' ? 'ltr' : 'rtl'
        }

        if (key === 'ui_scale') {
          const parsed = Number(value)
          const clamped = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0.75), 1) : null
          if (clamped) {
            document.documentElement.style.setProperty('--ui-scale', String(clamped))
          }
        }
        
        if (key === 'maintenance_mode' && value === 'true') {
          toast.warning(t('admin.system.toast.maintenanceEnabled'))
        }
      } else {
        await fetchConfigs()
        const errorMessage =
          payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
            ? payload.error
            : null
        if (errorMessage) {
          toast.error(errorMessage)
          return
        }
        toast.error(t('admin.system.toast.saveError'))
      }
    } catch (error) {
      console.error('Config update error:', error)
      await fetchConfigs()
      toast.error(t('admin.system.toast.saveError'))
    } finally {
      setIsSaving(false)
    }
  }

  const getConfigValue = (key: string) => {
    return configs.find(c => c.key === key)?.value || ''
  }

  const getConfigMeta = (key: string) => {
    return configs.find(config => config.key === key)
  }

  const setConfigValueLocally = (key: string, value: string) => {
    setConfigs(prev => {
      const existingConfig = prev.find(config => config.key === key)

      if (existingConfig) {
        return prev.map(config =>
          config.key === key
            ? { ...config, value, updatedAt: new Date().toISOString() }
            : config
        )
      }

      return [
        ...prev,
        {
          key,
          value,
          updatedAt: new Date().toISOString()
        }
      ]
    })
  }

  const updateManagedImageConfig = (key: string, value: string) => {
    setConfigValueLocally(key, value)
    void updateConfig(key, value)
  }

  const fetchStorageUsage = async () => {
    try {
      setStorageLoading(true)
      const res = await fetch('/api/admin/maintenance/storage-usage', { cache: 'no-store' })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setStorageUsage(data as StorageUsagePayload)
    } catch (error) {
      console.error('Failed to fetch storage usage:', error)
      toast.error(t('admin.system.maintenance.toast.usageError'))
    } finally {
      setStorageLoading(false)
    }
  }

  const downloadDiagnostics = async () => {
    try {
      const res = await fetch('/api/admin/maintenance/diagnostics/export', { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `diagnostics-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(t('admin.system.maintenance.diagnostics.toast.done'))
    } catch (error) {
      console.error('Diagnostics download failed:', error)
      toast.error(error instanceof Error ? error.message : t('admin.system.maintenance.diagnostics.toast.failed'))
    }
  }

  const parseDispositionFilename = (contentDisposition: string | null) => {
    if (!contentDisposition) return null
    const match = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition)
    return match?.[1] || null
  }

  const downloadDatabaseExport = async (target: 'primary' | 'backup') => {
    try {
      setDbExportBusy(true)
      const res = await fetch(`/api/admin/maintenance/database/export?target=${target}`, { cache: 'no-store' })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download =
        parseDispositionFilename(res.headers.get('content-disposition')) ||
        `db-export-${target}-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(t('admin.system.maintenance.db.toast.exported'))
    } catch (error) {
      console.error('Database export failed:', error)
      toast.error(error instanceof Error ? error.message : t('admin.system.maintenance.db.toast.exportFailed'))
    } finally {
      setDbExportBusy(false)
    }
  }

  const restoreDatabaseFromUpload = async () => {
    try {
      if (!dbRestoreConfirm || dbRestorePhrase.trim() !== 'RESTORE DATABASE') {
        toast.error(t('admin.system.maintenance.db.toast.confirmRequired'))
        return
      }

      if (!dbRestoreFile) {
        toast.error(t('admin.system.maintenance.db.toast.fileRequired'))
        return
      }

      setDbRestoreBusy(true)
      const form = new FormData()
      form.append('file', dbRestoreFile)
      form.append('target', dbRestoreTarget)
      form.append('confirm', 'true')
      form.append('phrase', dbRestorePhrase.trim())

      const res = await fetch('/api/admin/maintenance/database/restore', {
        method: 'POST',
        body: form,
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }

      toast.success(t('admin.system.maintenance.db.toast.restored'))
      setDbRestoreFile(null)
      setDbRestorePhrase('')
      setDbRestoreConfirm(false)
    } catch (error) {
      console.error('Database restore failed:', error)
      toast.error(error instanceof Error ? error.message : t('admin.system.maintenance.db.toast.restoreFailed'))
    } finally {
      setDbRestoreBusy(false)
    }
  }

  const runCleanup = async (mode: 'dryRun' | 'execute') => {
    try {
      if (mode === 'execute' && !cleanupConfirm) {
        toast.error(t('admin.system.maintenance.toast.confirmRequired'))
        return
      }

      setCleanupBusy(true)
      setCleanupResult(null)
      const res = await fetch('/api/admin/maintenance/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cleanupOptions,
          dryRun: mode === 'dryRun',
          confirm: true,
        }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      setCleanupResult(data)
      if (mode === 'dryRun') {
        toast.success(t('admin.system.maintenance.toast.dryRunReady'))
      } else {
        toast.success(t('admin.system.maintenance.toast.cleaned'))
        setCleanupConfirm(false)
        void fetchStorageUsage()
      }
    } catch (error) {
      console.error('Cleanup failed:', error)
      toast.error(error instanceof Error ? error.message : t('admin.system.maintenance.toast.cleanupError'))
    } finally {
      setCleanupBusy(false)
    }
  }

  const runFactoryReset = async () => {
    try {
      if (!resetConfirm) {
        toast.error(t('admin.system.maintenance.reset.toast.confirmRequired'))
        return
      }

      setResetBusy(true)
      const res = await fetch('/api/admin/maintenance/factory-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true, phrase: resetPhrase }),
      })
      const data = await res.json().catch(() => null)
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`)
      }
      toast.success(t('admin.system.maintenance.reset.toast.done'))
      setResetPhrase('')
      setResetConfirm(false)
      setCleanupResult(null)
      void fetchStorageUsage()
    } catch (error) {
      console.error('Factory reset failed:', error)
      toast.error(error instanceof Error ? error.message : t('admin.system.maintenance.reset.toast.failed'))
    } finally {
      setResetBusy(false)
    }
  }

  const formatBytes = (bytes: number | null | undefined) => {
    if (bytes == null || !Number.isFinite(bytes)) return '-'
    if (bytes === 0) return '0 B'
    if (!bytes || !Number.isFinite(bytes)) return '—'
    const units = ['B', 'KB', 'MB', 'GB', 'TB']
    let value = bytes
    let idx = 0
    while (value >= 1024 && idx < units.length - 1) {
      value /= 1024
      idx += 1
    }
    return `${value.toFixed(idx === 0 ? 0 : 2)} ${units[idx]}`
  }

  const renderConfigInput = (
    key: string,
    label: string,
    type: 'text' | 'number' | 'password' | 'boolean' | 'select',
    options?: string[]
  ) => {
    const value = getConfigValue(key)
    const config = getConfigMeta(key)
    const labelText = label.includes('.') ? t(label) : label
    
    if (type === 'boolean') {
      return (
        <div className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
          <Label className="cursor-pointer">{labelText}</Label>
          <Switch
            checked={value === 'true'}
            onCheckedChange={(checked) => {
              const nextValue = checked.toString()
              setConfigValueLocally(key, nextValue)
              updateConfig(key, nextValue)
            }}
            disabled={isSaving}
          />
        </div>
      )
    }

    if (type === 'select' && options) {
      return (
        <div className="space-y-2">
          <Label>{labelText}</Label>
          <Select
            value={value}
            onValueChange={(newValue) => {
              setConfigValueLocally(key, newValue)
              updateConfig(key, newValue)
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {options.map(option => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label>{labelText}</Label>
          {config?.isSensitive && config?.isConfigured && (
            <Badge variant="secondary">{t('admin.system.configured')}</Badge>
          )}
        </div>
        <Input
          type={type}
          value={value}
          onChange={(e) => setConfigValueLocally(key, e.target.value)}
          onBlur={(e) => {
            const nextValue = e.target.value.trim()
            if (config?.isSensitive && config.isConfigured && !nextValue) {
              return
            }

            updateConfig(key, e.target.value)
          }}
          disabled={isSaving}
          placeholder={config?.isSensitive && config?.isConfigured ? (config.maskedValue || t('admin.system.configured')) : undefined}
          autoComplete={config?.isSensitive ? 'new-password' : undefined}
        />
      </div>
    )
  }

  if (status === 'loading' || !session) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </DashboardLayout>
    )
  }

  if (session.user.role !== 'ADMIN') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-xl">{t('admin.system.unauthorized')}</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Server className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('admin.system')}</h1>
            </div>
            <p className="text-slate-50 text-lg">{t('admin.system.heroSubtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-zinc-400/20 rounded-full blur-3xl"></div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="general" className="space-y-6">
            <TabsList className="!grid grid-cols-3 grid-rows-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 w-full gap-2 sm:gap-1 h-auto p-2">
              <TabsTrigger value="general">{t('admin.system.tabs.general')}</TabsTrigger>
              <TabsTrigger value="appearance">{t('admin.system.tabs.appearance')}</TabsTrigger>
              <TabsTrigger value="communication">{t('admin.system.tabs.communication')}</TabsTrigger>
              <TabsTrigger value="security">{t('admin.system.tabs.security')}</TabsTrigger>
              <TabsTrigger value="transaction">{t('admin.system.tabs.transaction')}</TabsTrigger>
              <TabsTrigger value="features">{t('admin.system.tabs.features')}</TabsTrigger>
              <TabsTrigger value="maintenance" onClick={() => void fetchStorageUsage()}>
                {t('admin.system.tabs.maintenance')}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Settings className="h-5 w-5" />
                      {t('admin.system.general.core.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.system.general.core.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('site_title', 'admin.system.config.site_title', 'text')}
                    {renderConfigInput('site_description', 'admin.system.config.site_description', 'text')}
                    {renderConfigInput('saraf_directory_title', 'admin.system.config.saraf_directory_title', 'text')}
                    {renderConfigInput('default_language', 'admin.system.config.default_language', 'select', ['fa', 'en', 'ps'])}
                    {renderConfigInput('maintenance_mode', 'admin.system.config.maintenance_mode', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.general.contact.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.general.contact.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('contact_email', 'admin.system.config.contact_email', 'text')}
                    {renderConfigInput('contact_phone', 'admin.system.config.contact_phone', 'text')}
                    {renderConfigInput('support_email', 'admin.system.config.support_email', 'text')}
                    {renderConfigInput('address', 'admin.system.config.address', 'text')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0 lg:col-span-2">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-500" />
                      {t('admin.system.maintenance.reset.title')}
                    </CardTitle>
                    <CardDescription>{t('admin.system.maintenance.reset.desc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-rose-200/60 bg-rose-50/50 p-4 text-sm text-rose-800 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200">
                      {t('admin.system.maintenance.reset.warning')}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('admin.system.maintenance.reset.phraseLabel')}</Label>
                        <Input value={resetPhrase} onChange={(e) => setResetPhrase(e.target.value)} placeholder="RESET ALL DATA" />
                        <p className="text-xs text-muted-foreground">{t('admin.system.maintenance.reset.phraseHint')}</p>
                      </div>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                        <Switch checked={resetConfirm} onCheckedChange={setResetConfirm} />
                        <span className="text-sm">{t('admin.system.maintenance.reset.confirm')}</span>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => void runFactoryReset()}
                        disabled={resetBusy || !resetConfirm || resetPhrase.trim() !== 'RESET ALL DATA'}
                      >
                        {resetBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t('admin.system.maintenance.reset.execute')}
                      </Button>
                    </div>

                    <p className="text-xs leading-6 text-muted-foreground">{t('admin.system.maintenance.reset.envHint')}</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="appearance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ImageIcon className="h-5 w-5" />
                      {t('admin.system.appearance.branding.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.system.appearance.branding.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ManagedImageUploadField
                      label={t('admin.system.appearance.branding.logo.label')}
                      value={getConfigValue('logo_url')}
                      onChange={(value) => updateManagedImageConfig('logo_url', value)}
                      scope="branding-logo"
                      maxSizeBytes={IMAGE_UPLOAD_LIMITS.brandingLogo.maxBytes}
                      maxSizeLabel={IMAGE_UPLOAD_LIMITS.brandingLogo.label}
                      helperText={t('admin.system.appearance.branding.logo.helper')}
                      previewAlt="Site logo"
                      uploadLabel={t('admin.system.appearance.branding.logo.upload')}
                      clearLabel={t('admin.system.appearance.branding.logo.clear')}
                      emptyLabel={t('admin.system.appearance.branding.logo.empty')}
                      uploadSuccessMessage={t('admin.system.appearance.branding.logo.success')}
                      previewHeightClassName="h-32"
                    />

                    <ManagedImageUploadField
                      label={t('admin.system.appearance.branding.favicon.label')}
                      value={getConfigValue('favicon_url')}
                      onChange={(value) => updateManagedImageConfig('favicon_url', value)}
                      scope="branding-favicon"
                      accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
                      maxSizeBytes={IMAGE_UPLOAD_LIMITS.brandingFavicon.maxBytes}
                      maxSizeLabel={IMAGE_UPLOAD_LIMITS.brandingFavicon.label}
                      helperText={t('admin.system.appearance.branding.favicon.helper')}
                      previewAlt="Favicon"
                      uploadLabel={t('admin.system.appearance.branding.favicon.upload')}
                      clearLabel={t('admin.system.appearance.branding.favicon.clear')}
                      emptyLabel={t('admin.system.appearance.branding.favicon.empty')}
                      uploadSuccessMessage={t('admin.system.appearance.branding.favicon.success')}
                      previewHeightClassName="h-24"
                    />

                    <ManagedImageUploadField
                      label={t('admin.system.appearance.branding.defaultImage.label')}
                      value={getConfigValue('default_image_url')}
                      onChange={(value) => updateManagedImageConfig('default_image_url', value)}
                      scope="branding-default"
                      maxSizeBytes={IMAGE_UPLOAD_LIMITS.brandingDefault.maxBytes}
                      maxSizeLabel={IMAGE_UPLOAD_LIMITS.brandingDefault.label}
                      helperText={t('admin.system.appearance.branding.defaultImage.helper')}
                      previewAlt="Default system image"
                      uploadLabel={t('admin.system.appearance.branding.defaultImage.upload')}
                      clearLabel={t('admin.system.appearance.branding.defaultImage.clear')}
                      emptyLabel={t('admin.system.appearance.branding.defaultImage.empty')}
                      uploadSuccessMessage={t('admin.system.appearance.branding.defaultImage.success')}
                      previewHeightClassName="h-40"
                    />
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      {t('admin.system.appearance.theme.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.system.appearance.theme.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('ui_scale', 'admin.system.config.ui_scale', 'number')}

                    <div className="space-y-2">
                      <Label>{t('admin.system.config.primary_color')}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={getConfigValue('primary_color') || '#6366f1'}
                          onChange={(e) => updateConfig('primary_color', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={getConfigValue('primary_color') || '#6366f1'}
                          onChange={(e) => setConfigValueLocally('primary_color', e.target.value)}
                          onBlur={(e) => updateConfig('primary_color', e.target.value)}
                          placeholder="#6366f1"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('admin.system.config.secondary_color')}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={getConfigValue('secondary_color') || '#8b5cf6'}
                          onChange={(e) => updateConfig('secondary_color', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={getConfigValue('secondary_color') || '#8b5cf6'}
                          onChange={(e) => setConfigValueLocally('secondary_color', e.target.value)}
                          onBlur={(e) => updateConfig('secondary_color', e.target.value)}
                          placeholder="#8b5cf6"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>{t('admin.system.config.success_color')}</Label>
                      <div className="flex gap-2">
                        <Input
                          type="color"
                          value={getConfigValue('success_color') || '#10b981'}
                          onChange={(e) => updateConfig('success_color', e.target.value)}
                          className="w-20 h-10"
                        />
                        <Input
                          type="text"
                          value={getConfigValue('success_color') || '#10b981'}
                          onChange={(e) => setConfigValueLocally('success_color', e.target.value)}
                          onBlur={(e) => updateConfig('success_color', e.target.value)}
                          placeholder="#10b981"
                        />
                      </div>
                    </div>

                    {renderConfigInput('theme_mode', 'admin.system.config.theme_mode', 'select', ['light', 'dark', 'auto'])}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="communication" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.communication.smtp.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.communication.smtp.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('smtp_host', 'admin.system.config.smtp_host', 'text')}
                    {renderConfigInput('smtp_port', 'admin.system.config.smtp_port', 'number')}
                    {renderConfigInput('smtp_user', 'admin.system.config.smtp_user', 'text')}
                    {renderConfigInput('smtp_password', 'admin.system.config.smtp_password', 'password')}
                    {renderConfigInput('smtp_from_email', 'admin.system.config.smtp_from_email', 'text')}
                    {renderConfigInput('smtp_from_name', 'admin.system.config.smtp_from_name', 'text')}
                    {renderConfigInput('email_enabled', 'admin.system.config.email_enabled', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.communication.sms.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.communication.sms.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('sms_provider', 'admin.system.config.sms_provider', 'select', ['twilio', 'nexmo', 'kavenegar', 'ghasedak'])}
                    {renderConfigInput('sms_api_key', 'admin.system.config.sms_api_key', 'password')}
                    {renderConfigInput('sms_api_secret', 'admin.system.config.sms_api_secret', 'password')}
                    {renderConfigInput('sms_sender_number', 'admin.system.config.sms_sender_number', 'text')}
                    {renderConfigInput('sms_enabled', 'admin.system.config.sms_enabled', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.communication.whatsapp.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.communication.whatsapp.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('whatsapp_api_url', 'admin.system.config.whatsapp_api_url', 'text')}
                    {renderConfigInput('whatsapp_api_key', 'admin.system.config.whatsapp_api_key', 'password')}
                    {renderConfigInput('whatsapp_phone_number', 'admin.system.config.whatsapp_phone_number', 'text')}
                    {renderConfigInput('whatsapp_enabled', 'admin.system.config.whatsapp_enabled', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.communication.telegram.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.communication.telegram.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('telegram_bot_token', 'admin.system.config.telegram_bot_token', 'password')}
                    {renderConfigInput('telegram_chat_id', 'admin.system.config.telegram_chat_id', 'text')}
                    {renderConfigInput('telegram_enabled', 'admin.system.config.telegram_enabled', 'boolean')}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.security.otp.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.security.otp.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('otp_length', 'admin.system.config.otp_length', 'number')}
                    {renderConfigInput('otp_expiry_minutes', 'admin.system.config.otp_expiry_minutes', 'number')}
                    {renderConfigInput('otp_max_attempts', 'admin.system.config.otp_max_attempts', 'number')}
                    {renderConfigInput('otp_method', 'admin.system.config.otp_method', 'select', ['sms', 'email', 'both'])}
                    {renderConfigInput('otp_enabled', 'admin.system.config.otp_enabled', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.security.recaptcha.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.security.recaptcha.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('recaptcha_site_key', 'admin.system.config.recaptcha_site_key', 'text')}
                    {renderConfigInput('recaptcha_secret_key', 'admin.system.config.recaptcha_secret_key', 'password')}
                    {renderConfigInput('recaptcha_threshold', 'admin.system.config.recaptcha_threshold', 'number')}
                    {renderConfigInput('recaptcha_enabled', 'admin.system.config.recaptcha_enabled', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.security.password.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.security.password.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('password_min_length', 'admin.system.config.password_min_length', 'number')}
                    {renderConfigInput('password_require_uppercase', 'admin.system.config.password_require_uppercase', 'boolean')}
                    {renderConfigInput('password_require_numbers', 'admin.system.config.password_require_numbers', 'boolean')}
                    {renderConfigInput('password_require_special', 'admin.system.config.password_require_special', 'boolean')}
                    {renderConfigInput('password_expiry_days', 'admin.system.config.password_expiry_days', 'number')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.security.access.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.security.access.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('rate_limit_requests', 'admin.system.config.rate_limit_requests', 'number')}
                    {renderConfigInput('max_login_attempts', 'admin.system.config.max_login_attempts', 'number')}
                    {renderConfigInput('login_lockout_minutes', 'admin.system.config.login_lockout_minutes', 'number')}
                    {renderConfigInput('ip_whitelist', 'admin.system.config.ip_whitelist', 'text')}
                    {renderConfigInput('ip_blacklist', 'admin.system.config.ip_blacklist', 'text')}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="transaction" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.transaction.settings.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.transaction.settings.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('max_transaction_amount', 'admin.system.config.max_transaction_amount', 'number')}
                    {renderConfigInput('min_transaction_amount', 'admin.system.config.min_transaction_amount', 'number')}
                    {renderConfigInput('default_fee_percentage', 'admin.system.config.default_fee_percentage', 'number')}
                    {renderConfigInput('credit_price_usd', 'admin.system.config.credit_price_usd', 'number')}
                    {renderConfigInput('currency_update_interval', 'admin.system.config.currency_update_interval', 'number')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.transaction.userLimits.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.transaction.userLimits.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {renderConfigInput('max_daily_transactions', 'admin.system.config.max_daily_transactions', 'number')}
                    {renderConfigInput('max_monthly_volume', 'admin.system.config.max_monthly_volume', 'number')}
                    {renderConfigInput('verification_required_amount', 'admin.system.config.verification_required_amount', 'number')}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="features" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.features.settings.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.features.settings.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {renderConfigInput('features_master_enabled', 'admin.system.config.features_master_enabled', 'boolean')}
                    <div className="pt-2" />
                    {renderConfigInput('feature_hawala_enabled', 'admin.system.config.feature_hawala_enabled', 'boolean')}
                    {renderConfigInput('feature_exchange_enabled', 'admin.system.config.feature_exchange_enabled', 'boolean')}
                    {renderConfigInput('feature_rewards_enabled', 'admin.system.config.feature_rewards_enabled', 'boolean')}
                    {renderConfigInput('feature_promotions_enabled', 'admin.system.config.feature_promotions_enabled', 'boolean')}
                    {renderConfigInput('feature_ads_enabled', 'admin.system.config.feature_ads_enabled', 'boolean')}
                    {renderConfigInput('feature_chat_enabled', 'admin.system.config.feature_chat_enabled', 'boolean')}
                    <div className="pt-2" />
                    {renderConfigInput('free_access_enabled', 'admin.system.config.free_access_enabled', 'boolean')}
                    <div className="pt-2" />
                    {renderConfigInput('notifications_enabled', 'admin.system.config.notifications_enabled', 'boolean')}
                    {renderConfigInput('registration_enabled', 'admin.system.config.registration_enabled', 'boolean')}
                    {renderConfigInput('forgot_password_enabled', 'admin.system.config.forgot_password_enabled', 'boolean')}
                    {renderConfigInput('saraf_approval_required', 'admin.system.config.saraf_approval_required', 'boolean')}
                    {renderConfigInput('email_verification_required', 'admin.system.config.email_verification_required', 'boolean')}
                    {renderConfigInput('two_factor_enabled', 'admin.system.config.two_factor_enabled', 'boolean')}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle>{t('admin.system.features.status.title')}</CardTitle>
                    <CardDescription>
                      {t('admin.system.features.status.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-medium">{t('admin.system.config.maintenance_mode')}</span>
                      <Badge variant={getConfigValue('maintenance_mode') === 'true' ? 'destructive' : 'default'}>
                        {getConfigValue('maintenance_mode') === 'true' ? t('admin.system.status.active') : t('admin.system.status.inactive')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-medium">{t('admin.system.config.registration_enabled')}</span>
                      <Badge variant={getConfigValue('registration_enabled') === 'true' ? 'default' : 'secondary'}>
                        {getConfigValue('registration_enabled') === 'true' ? t('admin.system.status.active') : t('admin.system.status.inactive')}
                      </Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-medium">{t('admin.system.config.forgot_password_enabled')}</span>
                      <Badge variant={getConfigValue('forgot_password_enabled') === 'true' ? 'default' : 'secondary'}>
                        {getConfigValue('forgot_password_enabled') === 'true' ? t('admin.system.status.active') : t('admin.system.status.inactive')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                      <span className="font-medium">{t('admin.system.config.notifications_enabled')}</span>
                      <Badge variant={getConfigValue('notifications_enabled') === 'true' ? 'default' : 'secondary'}>
                        {getConfigValue('notifications_enabled') === 'true' ? t('admin.system.status.active') : t('admin.system.status.inactive')}
                      </Badge>
                    </div>

                    {getConfigValue('maintenance_mode') === 'true' && (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <span className="text-sm text-yellow-800 dark:text-yellow-200">
                          {t('admin.system.features.status.maintenanceWarning')}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="maintenance" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Database className="h-5 w-5" />
                      {t('admin.system.maintenance.usage.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.system.maintenance.usage.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => void fetchStorageUsage()} disabled={storageLoading}>
                        <RefreshCw className={`mr-2 h-4 w-4 ${storageLoading ? 'animate-spin' : ''}`} />
                        {t('admin.system.maintenance.usage.refresh')}
                      </Button>
                      {storageUsage?.provider ? (
                        <Badge variant="secondary">DB: {storageUsage.provider}</Badge>
                      ) : null}
                      {storageUsage?.hosting?.vercelEnv ? (
                        <Badge variant="secondary">Vercel: {storageUsage.hosting.vercelEnv}</Badge>
                      ) : null}
                    </div>

                    {storageUsage ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <HardDrive className="h-4 w-4" />
                            {t('admin.system.maintenance.usage.dbSize')}
                          </div>
                          <div className="mt-2 text-lg font-black">{formatBytes(storageUsage.database.sizeBytes)}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.usage.documents')}</div>
                          <div className="mt-2 text-lg font-black">{formatBytes(storageUsage.database.documentsTotalBytes)}</div>
                        </div>
                        <div className="rounded-lg border border-border/70 bg-background/70 p-3 sm:col-span-2">
                          <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.usage.blobHead')}</div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="text-lg font-black">{formatBytes(storageUsage.blob.bytesFromHead)}</span>
                            <Badge variant="outline">{t('admin.system.maintenance.usage.uniqueUrls')}: {storageUsage.blob.uniqueReferencedUrls}</Badge>
                            <Badge variant="outline">{t('admin.system.maintenance.usage.checked')}: {storageUsage.blob.headChecked}</Badge>
                            <Badge variant="outline">{t('admin.system.maintenance.usage.failed')}: {storageUsage.blob.headFailed}</Badge>
                            {storageUsage.blob.truncated ? <Badge variant="destructive">{t('admin.system.maintenance.usage.truncated')}</Badge> : null}
                          </div>
                          <p className="mt-2 text-xs text-muted-foreground leading-6">{storageUsage.blob.note}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{t('admin.system.maintenance.usage.empty')}</p>
                    )}

                    {storageUsage ? (
                      <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                        <div className="text-sm font-semibold mb-2">{t('admin.system.maintenance.usage.kpisTitle')}</div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.usage.kpi.internalOld')}</span>
                            <span className="font-bold">{storageUsage.database.tableCounts.internalChatMessagesOlderThan30d ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.usage.kpi.guestOld')}</span>
                            <span className="font-bold">{storageUsage.database.tableCounts.guestChatMessagesOlderThan30d ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.usage.kpi.supportOld')}</span>
                            <span className="font-bold">{storageUsage.database.tableCounts.supportChatMessagesOlderThan30d ?? 0}</span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.usage.kpi.expiredStories')}</span>
                            <span className="font-bold">{storageUsage.database.tableCounts.portalStoriesExpired ?? 0}</span>
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground leading-6">{storageUsage.hosting.note}</p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <HardDrive className="h-5 w-5" />
                      {t('admin.system.maintenance.db.title')}
                    </CardTitle>
                    <CardDescription>{t('admin.system.maintenance.db.desc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-xs text-muted-foreground leading-6">
                      {t('admin.system.maintenance.db.note')}
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold">{t('admin.system.maintenance.db.enable.title')}</div>
                          <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.db.enable.desc')}</div>
                        </div>
                        <Switch
                          checked={getConfigValue('admin_backups_enabled') === 'true'}
                          onCheckedChange={(checked) => {
                            const next = checked.toString()
                            setConfigValueLocally('admin_backups_enabled', next)
                            void updateConfig('admin_backups_enabled', next)
                          }}
                          disabled={isSaving}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Button type="button" variant="outline" onClick={() => router.push('/admin/backups')}>
                          <ExternalLink className="mr-2 h-4 w-4" />
                          {t('admin.system.maintenance.db.openBackups')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={dbExportBusy || getConfigValue('admin_backups_enabled') !== 'true'}
                          onClick={() => void downloadDatabaseExport('primary')}
                        >
                          {dbExportBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                          {t('admin.system.maintenance.db.exportPrimary')}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          disabled={
                            dbExportBusy ||
                            getConfigValue('admin_backups_enabled') !== 'true' ||
                            !(getConfigMeta('backup_database_url')?.isConfigured)
                          }
                          onClick={() => void downloadDatabaseExport('backup')}
                        >
                          {dbExportBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                          {t('admin.system.maintenance.db.exportBackup')}
                        </Button>
                      </div>
                    </div>

                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 space-y-3">
                      <div className="text-sm font-semibold">{t('admin.system.maintenance.db.backupTarget.title')}</div>
                      <div className="text-xs text-muted-foreground leading-6">{t('admin.system.maintenance.db.backupTarget.desc')}</div>

                      <div className="space-y-2">
                        <Label>{t('admin.system.maintenance.db.backupTarget.label')}</Label>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Input
                            type="password"
                            value={backupDbUrlDraft}
                            onChange={(e) => setBackupDbUrlDraft(e.target.value)}
                            placeholder={getConfigMeta('backup_database_url')?.maskedValue || t('admin.system.maintenance.db.backupTarget.placeholder')}
                            autoComplete="new-password"
                          />
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isSaving || !backupDbUrlDraft.trim()}
                              onClick={() => {
                                const next = backupDbUrlDraft.trim()
                                setBackupDbUrlDraft('')
                                void updateConfig('backup_database_url', next)
                              }}
                            >
                              {t('common.save')}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              disabled={isSaving || !(getConfigMeta('backup_database_url')?.isConfigured)}
                              onClick={() => void updateConfig('backup_database_url', '')}
                            >
                              {t('common.clear')}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg border border-rose-200/60 bg-rose-50/40 p-3 text-sm text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200 space-y-3">
                      <div className="flex items-center gap-2 font-semibold">
                        <AlertTriangle className="h-4 w-4" />
                        {t('admin.system.maintenance.db.restore.title')}
                      </div>
                      <div className="text-xs leading-6 text-rose-800/90 dark:text-rose-200/90">
                        {t('admin.system.maintenance.db.restore.desc')}
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div className="space-y-2">
                          <Label>{t('admin.system.maintenance.db.restore.target')}</Label>
                          <Select value={dbRestoreTarget} onValueChange={(v) => setDbRestoreTarget(v === 'backup' ? 'backup' : 'primary')}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="primary">{t('admin.system.maintenance.db.restore.targetPrimary')}</SelectItem>
                              <SelectItem value="backup">{t('admin.system.maintenance.db.restore.targetBackup')}</SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">{t('admin.system.maintenance.db.restore.targetHint')}</p>
                        </div>

                        <div className="space-y-2">
                          <Label>{t('admin.system.maintenance.db.restore.file')}</Label>
                          <Input
                            type="file"
                            accept=".sql,.db,application/sql,application/vnd.sqlite3"
                            onChange={(e) => setDbRestoreFile(e.target.files?.[0] || null)}
                            disabled={dbRestoreBusy || getConfigValue('admin_backups_enabled') !== 'true'}
                          />
                          {dbRestoreFile ? (
                            <p className="text-xs text-muted-foreground">
                              {t('admin.system.maintenance.db.restore.selected')}: {dbRestoreFile.name} ({formatBytes(dbRestoreFile.size)})
                            </p>
                          ) : null}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                          <div className="space-y-2">
                            <Label>{t('admin.system.maintenance.db.restore.phraseLabel')}</Label>
                            <Input value={dbRestorePhrase} onChange={(e) => setDbRestorePhrase(e.target.value)} placeholder="RESTORE DATABASE" />
                            <p className="text-xs text-muted-foreground">{t('admin.system.maintenance.db.restore.phraseHint')}</p>
                          </div>
                          <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                            <Switch checked={dbRestoreConfirm} onCheckedChange={setDbRestoreConfirm} />
                            <span className="text-sm">{t('admin.system.maintenance.db.restore.confirm')}</span>
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <Button
                            type="button"
                            variant="destructive"
                            disabled={dbRestoreBusy || getConfigValue('admin_backups_enabled') !== 'true'}
                            onClick={() => void restoreDatabaseFromUpload()}
                          >
                            {dbRestoreBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                            {t('admin.system.maintenance.db.restore.cta')}
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Server className="h-5 w-5" />
                      {t('admin.system.maintenance.diagnostics.title')}
                    </CardTitle>
                    <CardDescription>{t('admin.system.maintenance.diagnostics.desc')}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground leading-7">
                      {t('admin.system.maintenance.diagnostics.note')}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => void downloadDiagnostics()}>
                        {t('admin.system.maintenance.diagnostics.download')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="glass-card hover-lift border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trash2 className="h-5 w-5" />
                      {t('admin.system.maintenance.cleanup.title')}
                    </CardTitle>
                    <CardDescription>
                      {t('admin.system.maintenance.cleanup.desc')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>{t('admin.system.maintenance.cleanup.olderThanDays')}</Label>
                        <Input
                          type="number"
                          min={7}
                          max={365}
                          value={cleanupOptions.olderThanDays}
                          onChange={(e) =>
                            setCleanupOptions((prev) => ({ ...prev, olderThanDays: Number(e.target.value || 30) }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">{t('admin.system.maintenance.cleanup.daysHint')}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{t('admin.system.maintenance.cleanup.attachments.title')}</div>
                            <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.cleanup.attachments.desc')}</div>
                          </div>
                          <Switch
                            checked={cleanupOptions.purgeAttachments}
                            onCheckedChange={(checked) =>
                              setCleanupOptions((prev) => ({ ...prev, purgeAttachments: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{t('admin.system.maintenance.cleanup.messages.title')}</div>
                            <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.cleanup.messages.desc')}</div>
                          </div>
                          <Switch
                            checked={cleanupOptions.purgeMessages}
                            onCheckedChange={(checked) =>
                              setCleanupOptions((prev) => ({ ...prev, purgeMessages: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{t('admin.system.maintenance.cleanup.chats.title')}</div>
                            <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.cleanup.chats.desc')}</div>
                          </div>
                          <Switch
                            checked={cleanupOptions.purgeChats}
                            onCheckedChange={(checked) =>
                              setCleanupOptions((prev) => ({ ...prev, purgeChats: checked }))
                            }
                          />
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-background/70 p-3">
                          <div className="min-w-0">
                            <div className="text-sm font-semibold">{t('admin.system.maintenance.cleanup.stories.title')}</div>
                            <div className="text-xs text-muted-foreground">{t('admin.system.maintenance.cleanup.stories.desc')}</div>
                          </div>
                          <Switch
                            checked={cleanupOptions.purgeExpiredStories}
                            onCheckedChange={(checked) =>
                              setCleanupOptions((prev) => ({ ...prev, purgeExpiredStories: checked }))
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => void runCleanup('dryRun')} disabled={cleanupBusy}>
                        {cleanupBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}
                        {t('admin.system.maintenance.cleanup.dryRun')}
                      </Button>
                      <Button type="button" onClick={() => void runCleanup('execute')} disabled={cleanupBusy || !cleanupConfirm}>
                        {cleanupBusy ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                        {t('admin.system.maintenance.cleanup.execute')}
                      </Button>
                      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 py-2">
                        <Switch checked={cleanupConfirm} onCheckedChange={setCleanupConfirm} />
                        <span className="text-sm">{t('admin.system.maintenance.cleanup.confirm')}</span>
                      </div>
                    </div>

                    {cleanupResult ? (
                      <div className="space-y-3 rounded-lg border border-border/70 bg-black/5 p-3 dark:bg-white/5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="text-sm font-semibold">
                            {cleanupResult?.dryRun ? t('admin.system.maintenance.cleanup.result.previewTitle') : t('admin.system.maintenance.cleanup.result.executedTitle')}
                          </div>
                          <Badge variant="secondary">
                            {t('admin.system.maintenance.cleanup.result.threshold')}: {String(cleanupResult?.olderThanDays ?? cleanupOptions.olderThanDays)}d
                          </Badge>
                        </div>

                        <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.cleanup.result.internal')}</span>
                            <span className="font-bold">
                              {cleanupResult?.dryRun
                                ? (cleanupResult?.wouldDelete?.internalChatMessages ?? 0)
                                : (cleanupResult?.mutations?.internalChatMessagesDeleted ?? cleanupResult?.mutations?.internalChatMessagesUpdated ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.cleanup.result.guest')}</span>
                            <span className="font-bold">
                              {cleanupResult?.dryRun
                                ? (cleanupResult?.wouldDelete?.guestChatMessages ?? 0)
                                : (cleanupResult?.mutations?.guestChatMessagesDeleted ?? cleanupResult?.mutations?.guestChatMessagesUpdated ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.cleanup.result.support')}</span>
                            <span className="font-bold">
                              {cleanupResult?.dryRun
                                ? (cleanupResult?.wouldDelete?.supportChatMessages ?? 0)
                                : (cleanupResult?.mutations?.supportChatMessagesDeleted ?? cleanupResult?.mutations?.supportChatMessagesUpdated ?? 0)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-muted-foreground">{t('admin.system.maintenance.cleanup.result.stories')}</span>
                            <span className="font-bold">
                              {cleanupResult?.dryRun
                                ? (cleanupResult?.wouldDelete?.portalStoriesExpired ?? 0)
                                : (cleanupResult?.mutations?.portalStoriesDeleted ?? 0)}
                            </span>
                          </div>
                        </div>

                        <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm">
                          <div className="mb-1 text-xs font-semibold text-muted-foreground">{t('admin.system.maintenance.cleanup.result.attachmentsTitle')}</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{t('admin.system.maintenance.cleanup.result.uniqueUrls')}: {cleanupResult?.attachments?.uniqueUrlsFound ?? 0}</Badge>
                            <Badge variant="outline">{t('admin.system.maintenance.cleanup.result.deleteTargets')}: {cleanupResult?.attachments?.deleteTargets ?? 0}</Badge>
                            {(cleanupResult?.attachments?.truncated ?? false) ? <Badge variant="destructive">{t('admin.system.maintenance.cleanup.result.truncated')}</Badge> : null}
                          </div>
                        </div>

                        <details className="rounded-lg border border-border/70 bg-background/70 p-3">
                          <summary className="cursor-pointer text-sm font-semibold">{t('admin.system.maintenance.cleanup.result.details')}</summary>
                          <pre className="mt-3 whitespace-pre-wrap break-words text-xs leading-6">
                            {JSON.stringify(cleanupResult, null, 2)}
                          </pre>
                        </details>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground leading-6">
                        {t('admin.system.maintenance.cleanup.note')}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-center gap-4">
          <Button onClick={fetchConfigs} variant="outline" disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            {t('admin.system.refresh')}
          </Button>
        </div>
      </div>
    </DashboardLayout>
  )
}
