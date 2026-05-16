'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useTheme } from 'next-themes'
import { Bell, Building2, Download, Eye, EyeOff, Gift, Globe, Palette, Save, Settings, Shield, Smartphone, Upload, User } from 'lucide-react'
import { toast } from 'sonner'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/locale'

type ActiveSession = { id: string; createdAt: string; lastSeenAt: string; ipAddress: string; userAgent: string; revokedAt?: string | null; isCurrent: boolean }
type UserSettingsState = { notifications: { email: boolean; push: boolean; sms: boolean; priceAlerts: boolean; newsUpdates: boolean }; privacy: { profileVisible: boolean; activityVisible: boolean; dataSharing: boolean }; preferences: { language: string; currency: string; timezone: string; dateFormat: string } }
type SettingsResponse = { user?: UserSettingsState; profile?: { name: string; email: string; phone: string | null; avatarUrl: string | null; role: string; isActive: boolean; isVerified: boolean; createdAt: string; lastLogin: string | null }; security?: { twoFactorEnabled?: boolean; activeSessions?: ActiveSession[] } }
type UserStatsSnapshot = { monthly: { transactionCount: number; discountSaved: number }; rewards: { activeCount: number; freeTransfersAvailable: number }; lifetimeDiscountSaved: number }
type SarafProfileBackup = { businessName: string; businessPhone: string; businessAddress: string; businessLicense: string }
type SarafSettingsBackupPayload = {
  format: 'saray-shazada-saraf-settings-v1'
  exportedAt: string
  accountProfile: { name: string; phone: string }
  userSettings: UserSettingsState
  sarafProfile: SarafProfileBackup
}

const DEFAULT_SETTINGS: UserSettingsState = {
  notifications: { email: true, push: false, sms: false, priceAlerts: true, newsUpdates: false },
  privacy: { profileVisible: true, activityVisible: false, dataSharing: false },
  preferences: { language: 'fa', currency: 'AFN', timezone: 'Asia/Kabul', dateFormat: 'persian' },
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatDate(value: string | null | undefined, language: Language) {
  return value
    ? formatLocalizedDate(value, language, { year: 'numeric', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }) ||
        pick(language, 'در دسترس نیست', 'Unavailable', 'شتون نه لري')
    : pick(language, 'در دسترس نیست', 'Unavailable', 'شتون نه لري')
}

function getRoleLabel(role: string, language: Language) {
  switch (role) {
    case 'ADMIN':
      return pick(language, 'مدیر سیستم', 'System Admin', 'سیستم مدیر')
    case 'SARAF':
      return pick(language, 'صراف', 'Saraf', 'صراف')
    case 'BRANCH_MANAGER':
      return pick(language, 'مدیر شعبه', 'Branch manager', 'د څانګې مدیر')
    case 'BRANCH_STAFF':
      return pick(language, 'کارمند شعبه', 'Branch staff', 'د څانګې کارکوونکی')
    default:
      return pick(language, 'کاربر', 'User', 'کارن')
  }
}

export default function SettingsPage() {
  const { data: session, update } = useSession()
  const { theme, setTheme } = useTheme()
  const { language, setLanguage } = useLanguage()
  const [showPassword, setShowPassword] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [loadingSessions, setLoadingSessions] = useState(false)
  const [profileData, setProfileData] = useState({ name: '', email: '', phone: '', avatarUrl: '', currentPassword: '', newPassword: '', confirmPassword: '' })
  const [settings, setSettings] = useState<UserSettingsState>(DEFAULT_SETTINGS)
  const [account, setAccount] = useState<SettingsResponse['profile'] | null>(null)
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([])
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [stats, setStats] = useState<UserStatsSnapshot | null>(null)
  const [sarafBackupLoading, setSarafBackupLoading] = useState(false)
  const sarafBackupInputRef = useRef<HTMLInputElement | null>(null)

  const loadSessions = async () => {
    setLoadingSessions(true)
    try {
      const response = await fetch('/api/settings/sessions', { cache: 'no-store' })
      const data = await response.json()
      setActiveSessions(data.sessions || [])
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return
    const load = async () => {
      const [settingsResponse, statsResponse] = await Promise.all([fetch('/api/settings', { cache: 'no-store' }), fetch('/api/user/stats', { cache: 'no-store' })])
      if (settingsResponse.ok) {
        const data = (await settingsResponse.json()) as SettingsResponse
        if (data.user) {
          setSettings(data.user)
          if (data.user.preferences?.language && data.user.preferences.language !== language) {
            setLanguage(data.user.preferences.language as Language)
          }
        }
        if (data.profile) {
          setAccount(data.profile)
          setProfileData((prev) => ({ ...prev, name: data.profile?.name || '', email: data.profile?.email || '', phone: data.profile?.phone || '', avatarUrl: data.profile?.avatarUrl || '' }))
        }
        setTwoFactorEnabled(Boolean(data.security?.twoFactorEnabled))
        setActiveSessions(data.security?.activeSessions || [])
      }
      if (statsResponse.ok) setStats((await statsResponse.json()) as UserStatsSnapshot)
    }
    void load()
  }, [language, session?.user?.id, setLanguage])

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch('/api/user/profile/avatar', { method: 'POST', body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || pick(language, 'آپلود آواتار ناموفق بود', 'Avatar upload failed', 'د انځور پورته کول ناکام شول'))
      setProfileData((prev) => ({ ...prev, avatarUrl: data.avatarUrl }))
      await update()
      toast.success(pick(language, 'آواتار با موفقیت آپلود شد', 'Avatar uploaded successfully', 'انځور په بریالیتوب پورته شو'))
    } catch (error) {
      console.error('Avatar upload error:', error)
      toast.error(error instanceof Error ? error.message : pick(language, 'آپلود آواتار ناموفق بود', 'Avatar upload failed', 'د انځور پورته کول ناکام شول'))
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }

  const handleAvatarRemove = async () => {
    setUploadingAvatar(true)
    try {
      const response = await fetch('/api/user/profile/avatar', { method: 'DELETE' })
      if (!response.ok) throw new Error(pick(language, 'حذف آواتار ناموفق بود', 'Avatar removal failed', 'د انځور لیرې کول ناکام شول'))
      setProfileData((prev) => ({ ...prev, avatarUrl: '' }))
      await update()
      toast.success(pick(language, 'آواتار با موفقیت حذف شد', 'Avatar removed successfully', 'انځور په بریالیتوب لیرې شو'))
    } catch (error) {
      console.error('Avatar remove error:', error)
      toast.error(error instanceof Error ? error.message : pick(language, 'حذف آواتار ناموفق بود', 'Avatar removal failed', 'د انځور لیرې کول ناکام شول'))
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    try {
      if (profileData.newPassword && profileData.newPassword !== profileData.confirmPassword) {
        toast.error(pick(language, 'رمز عبور جدید و تکرار آن یکسان نیست', 'New password and confirmation do not match', 'نوی پټنوم او تایید یې سره برابر نه دي'))
        return
      }
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { name: profileData.name, phone: profileData.phone, currentPassword: profileData.currentPassword || undefined, newPassword: profileData.newPassword || undefined }, user: settings }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error || pick(language, 'ذخیره تنظیمات ناموفق بود', 'Failed to save settings', 'امستنې خوندي نه شوې'))
      setLanguage(settings.preferences.language as Language)
      await update()
      toast.success(pick(language, 'تنظیمات با موفقیت ذخیره شد', 'Settings saved successfully', 'امستنې په بریالیتوب خوندي شوې'))
      if (profileData.newPassword) await loadSessions()
    } catch (error) {
      console.error('Settings save error:', error)
      toast.error(error instanceof Error ? error.message : pick(language, 'ذخیره تنظیمات ناموفق بود', 'Failed to save settings', 'امستنې خوندي نه شوې'))
    }
  }

  const revokeSessions = async (scope?: string) => {
    try {
      const path = scope ? '/api/settings/sessions?scope=others' : undefined
      const response = await fetch(path || '', { method: 'DELETE' })
      if (!response.ok) throw new Error(pick(language, 'لغو نشست ناموفق بود', 'Failed to revoke session', 'د ناستې لغوه کول ناکام شول'))
      await loadSessions()
      toast.success(scope ? pick(language, 'همه نشست‌های دیگر لغو شدند', 'All other sessions were revoked', 'نورې ټولې ناستې لغوه شوې') : pick(language, 'نشست با موفقیت لغو شد', 'Session revoked successfully', 'ناسته په بریالیتوب لغوه شوه'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : pick(language, 'لغو نشست ناموفق بود', 'Failed to revoke session', 'د ناستې لغوه کول ناکام شول'))
    }
  }

  const revokeSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/settings/sessions/${sessionId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error(pick(language, 'لغو نشست ناموفق بود', 'Failed to revoke session', 'د ناستې لغوه کول ناکام شول'))
      await loadSessions()
      toast.success(pick(language, 'نشست با موفقیت لغو شد', 'Session revoked successfully', 'ناسته په بریالیتوب لغوه شوه'))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : pick(language, 'لغو نشست ناموفق بود', 'Failed to revoke session', 'د ناستې لغوه کول ناکام شول'))
    }
  }

  const isSarafAccount = (account?.role || session?.user?.role) === 'SARAF'
  const otherSessions = activeSessions.filter((item) => !item.isCurrent && !item.revokedAt).length
  const themeOptions = [
    { value: 'light', label: pick(language, 'روشن', 'Light', 'روښانه') },
    { value: 'dark', label: pick(language, 'تاریک', 'Dark', 'تیاره') },
    { value: 'system', label: pick(language, 'سیستم', 'System', 'سیستم') },
  ]

  const downloadSarafSettingsBackup = async () => {
    if (!isSarafAccount) return

    setSarafBackupLoading(true)
    try {
      const response = await fetch('/api/portal/profile', { cache: 'no-store' })
      const data = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(data?.error || pick(language, 'دریافت تنظیمات صرافی ناموفق بود', 'Failed to load saraf settings', 'د صراف تنظیماتو ترلاسه کول ناکام شول'))
      }

      const payload: SarafSettingsBackupPayload = {
        format: 'saray-shazada-saraf-settings-v1',
        exportedAt: new Date().toISOString(),
        accountProfile: {
          name: profileData.name || '',
          phone: profileData.phone || '',
        },
        userSettings: settings,
        sarafProfile: {
          businessName: String(data.businessName || ''),
          businessPhone: String(data.businessPhone || ''),
          businessAddress: String(data.businessAddress || ''),
          businessLicense: String(data.businessLicense || ''),
        },
      }

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `saraf-settings-backup-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)

      toast.success(pick(language, 'بکاپ تنظیمات صرافی دانلود شد', 'Saraf settings backup downloaded', 'د صراف امستنو بکاپ ښکته شو'))
    } catch (error) {
      console.error('Saraf settings backup download error:', error)
      toast.error(error instanceof Error ? error.message : pick(language, 'دانلود بکاپ ناموفق بود', 'Backup download failed', 'د بکاپ ښکته کول ناکام شول'))
    } finally {
      setSarafBackupLoading(false)
    }
  }

  const restoreSarafSettingsBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !isSarafAccount) return

    setSarafBackupLoading(true)
    try {
      const raw = await file.text()
      const payload = JSON.parse(raw) as Partial<SarafSettingsBackupPayload>

      if (
        payload.format !== 'saray-shazada-saraf-settings-v1' ||
        !payload.userSettings ||
        !payload.sarafProfile ||
        !payload.accountProfile
      ) {
        throw new Error(pick(language, 'فایل بکاپ معتبر نیست', 'Backup file is invalid', 'د بکاپ فایل معتبر نه دی'))
      }

      const [settingsResponse, sarafResponse] = await Promise.all([
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            profile: {
              name: payload.accountProfile.name,
              phone: payload.accountProfile.phone,
            },
            user: payload.userSettings,
          }),
        }),
        fetch('/api/portal/profile', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload.sarafProfile),
        }),
      ])

      const settingsResult = await settingsResponse.json().catch(() => null)
      const sarafResult = await sarafResponse.json().catch(() => null)

      if (!settingsResponse.ok) {
        throw new Error(settingsResult?.error || pick(language, 'بازیابی تنظیمات حساب ناموفق بود', 'Failed to restore account settings', 'د حساب امستنې بېرته راګرځول ناکام شول'))
      }

      if (!sarafResponse.ok) {
        throw new Error(sarafResult?.error || pick(language, 'بازیابی تنظیمات صرافی ناموفق بود', 'Failed to restore saraf settings', 'د صراف امستنې بېرته راګرځول ناکام شول'))
      }

      setSettings(payload.userSettings)
      setProfileData((prev) => ({
        ...prev,
        name: payload.accountProfile?.name || '',
        phone: payload.accountProfile?.phone || '',
      }))
      setLanguage(payload.userSettings.preferences.language as Language)
      await update()

      toast.success(pick(language, 'بکاپ تنظیمات صرافی با موفقیت بازیابی شد', 'Saraf settings backup restored successfully', 'د صراف امستنو بکاپ په بریالیتوب بېرته راګرځول شو'))
    } catch (error) {
      console.error('Saraf settings backup restore error:', error)
      toast.error(error instanceof Error ? error.message : pick(language, 'بازیابی بکاپ ناموفق بود', 'Backup restore failed', 'د بکاپ بېرته راګرځول ناکام شول'))
    } finally {
      event.target.value = ''
      setSarafBackupLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-blue-900/20 dark:to-indigo-900/20">
        <div className="relative mb-8 overflow-hidden rounded-2xl bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 p-8 text-white shadow-xl">
          <div className="relative z-10 text-center">
            <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20"><Settings className="h-8 w-8" /></div>
            <h1 className="mb-2 text-4xl font-bold">{pick(language, 'تنظیمات', 'Settings', 'امستنې')}</h1>
            <p className="text-lg text-white/90">{pick(language, 'مدیریت پروفایل واقعی، ترجیحات، جوایز و امنیت حساب شما.', 'Manage your real account profile, preferences, rewards, and security.', 'د خپل اصلي حساب پروفایل، غوره توبونه، انعامونه او امنیت اداره کړئ.')}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><User className="h-5 w-5" />{pick(language, 'اطلاعات حساب', 'Account information', 'د حساب معلومات')}</CardTitle><CardDescription>{pick(language, 'اطلاعات پروفایل و رمز عبور خود را به‌روزرسانی کنید.', 'Update your saved profile information and password.', 'خپل خوندي شوي پروفایل معلومات او پټنوم نوي کړئ.')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="name">{pick(language, 'نام کامل', 'Full name', 'بشپړ نوم')}</Label><Input id="name" value={profileData.name} onChange={(event) => setProfileData((prev) => ({ ...prev, name: event.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="email">{pick(language, 'ایمیل', 'Email', 'برېښنالیک')}</Label><Input id="email" type="email" value={profileData.email} disabled /></div>
                </div>
                <div className="space-y-2"><Label htmlFor="phone">{pick(language, 'شماره تلفن', 'Phone number', 'د تلیفون شمېره')}</Label><Input id="phone" type="tel" value={profileData.phone} onChange={(event) => setProfileData((prev) => ({ ...prev, phone: event.target.value }))} placeholder="+93700000000" /></div>
                <div className="rounded-xl border border-border/60 p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-muted text-2xl font-bold">{profileData.avatarUrl ? <img src={profileData.avatarUrl} alt={pick(language, 'آواتار پروفایل', 'Profile avatar', 'د پروفایل انځور')} className="h-full w-full object-cover" /> : (profileData.name || session?.user?.name || 'U').charAt(0).toUpperCase()}</div>
                    <div className="space-y-2">
                      <p className="font-medium">{pick(language, 'آواتار پروفایل', 'Profile avatar', 'د پروفایل انځور')}</p>
                      <Input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
                      <p className="text-xs text-muted-foreground">{pick(language, 'آواتار آپلودشده به‌صورت امن ذخیره و به حساب شما متصل می‌شود.', 'Uploaded avatars are stored securely and linked to your account automatically.', 'پورته شوی انځور په خوندي ډول ساتل کېږي او ستاسې حساب سره نښلول کېږي.')}</p>
                      {profileData.avatarUrl ? <Button type="button" variant="outline" size="sm" onClick={handleAvatarRemove} disabled={uploadingAvatar}>{pick(language, 'حذف آواتار', 'Remove avatar', 'انځور لیرې کول')}</Button> : null}
                    </div>
                  </div>
                </div>
                <Separator />
                <div className="space-y-2">
                  <Label htmlFor="current-password">{pick(language, 'رمز عبور فعلی', 'Current password', 'اوسنی پټنوم')}</Label>
                  <div className="relative">
                    <Input id="current-password" type={showPassword ? 'text' : 'password'} value={profileData.currentPassword} onChange={(event) => setProfileData((prev) => ({ ...prev, currentPassword: event.target.value }))} />
                    <Button type="button" variant="ghost" size="icon" className="absolute left-2 top-1/2 h-8 w-8 -translate-y-1/2" onClick={() => setShowPassword((prev) => !prev)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="space-y-2"><Label htmlFor="new-password">{pick(language, 'رمز عبور جدید', 'New password', 'نوی پټنوم')}</Label><Input id="new-password" type="password" value={profileData.newPassword} onChange={(event) => setProfileData((prev) => ({ ...prev, newPassword: event.target.value }))} /></div>
                  <div className="space-y-2"><Label htmlFor="confirm-password">{pick(language, 'تکرار رمز عبور', 'Confirm password', 'د پټنوم تایید')}</Label><Input id="confirm-password" type="password" value={profileData.confirmPassword} onChange={(event) => setProfileData((prev) => ({ ...prev, confirmPassword: event.target.value }))} /></div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Bell className="h-5 w-5" />{pick(language, 'اعلانات', 'Notifications', 'خبرتیاوې')}</CardTitle><CardDescription>{pick(language, 'انتخاب کنید سیستم چگونه شما را باخبر کند.', 'Choose how the platform should notify you.', 'وټاکئ چې سیستم څنګه خبر درکړي.')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><Label>{pick(language, 'هشدارهای ایمیلی', 'Email alerts', 'برېښنالیکي خبرتیاوې')}</Label><p className="text-sm text-muted-foreground">{pick(language, 'هشدارهای حساب را از طریق ایمیل دریافت کنید.', 'Receive account alerts by email.', 'د حساب خبرتیاوې په برېښنالیک ترلاسه کړئ.')}</p></div><Switch checked={settings.notifications.email} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, email: value } }))} /></div>
                <div className="flex items-center justify-between"><div><Label>{pick(language, 'اعلان مرورگر', 'Browser push', 'د براوزر خبرتیاوې')}</Label><p className="text-sm text-muted-foreground">{pick(language, 'اعلان‌های مرورگر را نمایش بده.', 'Show browser notifications.', 'د براوزر خبرتیاوې وښایئ.')}</p></div><Switch checked={settings.notifications.push} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, push: value } }))} /></div>
                <div className="flex items-center justify-between"><div><Label>{pick(language, 'به‌روزرسانی پیامکی', 'SMS updates', 'پیامکي تازه معلومات')}</Label><p className="text-sm text-muted-foreground">{pick(language, 'برای رویدادهای مهم پیامک دریافت کنید.', 'Receive SMS for important events.', 'د مهمو پېښو لپاره SMS ترلاسه کړئ.')}</p></div><Switch checked={settings.notifications.sms} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, notifications: { ...prev.notifications, sms: value } }))} /></div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{pick(language, 'حریم خصوصی', 'Privacy', 'محرمیت')}</CardTitle><CardDescription>{pick(language, 'کنترل نمایش پروفایل و اشتراک‌گذاری داده‌ها.', 'Control profile visibility and data sharing.', 'د پروفایل لید او د معلوماتو شریکول کنټرول کړئ.')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><div><Label>{pick(language, 'پروفایل عمومی', 'Public profile', 'عامه پروفایل')}</Label><p className="text-sm text-muted-foreground">{pick(language, 'اجازه بده پروفایل شما برای دیگران قابل مشاهده باشد.', 'Allow your profile to be visible to others.', 'ستاسې پروفایل دې نورو ته ښکاره وي.')}</p></div><Switch checked={settings.privacy.profileVisible} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, privacy: { ...prev.privacy, profileVisible: value } }))} /></div>
                <div className="flex items-center justify-between"><div><Label>{pick(language, 'نمایش فعالیت', 'Activity visibility', 'د فعالیت ښکاره کول')}</Label><p className="text-sm text-muted-foreground">{pick(language, 'فعالیت‌های اخیر در نمای پروفایل دیده شود.', 'Allow recent activity to appear in profile views.', 'وروستي فعالیتونه دې په پروفایل کې ښکاره شي.')}</p></div><Switch checked={settings.privacy.activityVisible} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, privacy: { ...prev.privacy, activityVisible: value } }))} /></div>
                <div className="flex items-center justify-between"><div><Label>{pick(language, 'اشتراک‌گذاری داده', 'Data sharing', 'د معلوماتو شریکول')}</Label><p className="text-sm text-muted-foreground">{pick(language, 'داده‌های ناشناس برای بهبود سیستم به اشتراک گذاشته شود.', 'Share anonymous usage data to improve the platform.', 'د سیستم د ښه کولو لپاره بې نومه معلومات شریک کړئ.')}</p></div><Switch checked={settings.privacy.dataSharing} onCheckedChange={(value) => setSettings((prev) => ({ ...prev, privacy: { ...prev.privacy, dataSharing: value } }))} /></div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Palette className="h-5 w-5" />{pick(language, 'ظاهر', 'Appearance', 'بڼه')}</CardTitle></CardHeader>
              <CardContent><div className="space-y-2"><Label>{pick(language, 'تم', 'Theme', 'رنګ بڼه')}</Label><Select value={theme} onValueChange={setTheme}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{themeOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></div></CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" />{pick(language, 'زبان و منطقه', 'Language and region', 'ژبه او سیمه')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{pick(language, 'زبان', 'Language', 'ژبه')}</Label>
                  <Select value={settings.preferences.language} onValueChange={(value) => { setSettings((prev) => ({ ...prev, preferences: { ...prev.preferences, language: value } })); setLanguage(value as Language) }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="fa">{pick(language, 'دری', 'Dari', 'دري')}</SelectItem><SelectItem value="en">{pick(language, 'انگلیسی', 'English', 'انګلیسي')}</SelectItem><SelectItem value="ps">{pick(language, 'پشتو', 'Pashto', 'پښتو')}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{pick(language, 'ارز', 'Currency', 'پیسه')}</Label>
                  <Select value={settings.preferences.currency} onValueChange={(value) => setSettings((prev) => ({ ...prev, preferences: { ...prev.preferences, currency: value } }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="AFN">Afghani (AFN)</SelectItem><SelectItem value="USD">US Dollar (USD)</SelectItem><SelectItem value="EUR">Euro (EUR)</SelectItem></SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle>{pick(language, 'وضعیت حساب', 'Account status', 'د حساب حالت')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between"><span className="text-sm">{pick(language, 'نقش', 'Role', 'دنده')}</span><Badge variant={account?.role === 'ADMIN' ? 'destructive' : account?.role === 'SARAF' ? 'default' : 'secondary'}>{getRoleLabel(account?.role || session?.user?.role || 'USER', language)}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm">{pick(language, 'تایید', 'Verification', 'تایید')}</span><Badge variant={account?.isVerified ? 'default' : 'outline'}>{account?.isVerified ? pick(language, 'تایید شده', 'Verified', 'تایید شوی') : pick(language, 'در انتظار', 'Pending', 'په انتظار کې')}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm">{pick(language, 'عضویت از', 'Member since', 'غړیتوب له')}</span><span className="text-sm text-muted-foreground">{formatDate(account?.createdAt, language)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm">{pick(language, 'آخرین ورود', 'Last login', 'وروستی ننوتل')}</span><span className="text-sm text-muted-foreground">{formatDate(account?.lastLogin, language)}</span></div>
                <div className="flex items-center justify-between"><span className="text-sm">{pick(language, 'احراز هویت دومرحله‌ای', 'Two-factor authentication', 'دوه پړاوه تایید')}</span><Badge variant={twoFactorEnabled ? 'default' : 'outline'}>{twoFactorEnabled ? pick(language, 'فعال', 'Enabled', 'فعال') : pick(language, 'غیرفعال', 'Disabled', 'غیرفعال')}</Badge></div>
                <div className="flex items-center justify-between"><span className="text-sm">{pick(language, 'وضعیت حساب', 'Account state', 'د حساب حالت')}</span><Badge variant={account?.isActive === false ? 'outline' : 'default'}>{account?.isActive === false ? pick(language, 'غیرفعال', 'Inactive', 'غیرفعال') : pick(language, 'فعال', 'Active', 'فعال')}</Badge></div>
              </CardContent>
            </Card>

            {isSarafAccount ? (
              <Card className="glass-card border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5" />{pick(language, 'بکاپ و بازیابی', 'Backup and recovery', 'بکاپ او بېرته راګرځول')}</CardTitle>
                  <CardDescription>{pick(language, 'از تنظیمات صرافی و ترجیحات همین حساب یک نسخه JSON بگیرید و در صورت نیاز همان را بازیابی کنید.', 'Download a JSON backup of this saraf account settings and restore it when needed.', 'د همدې صراف حساب له امستنو څخه JSON بکاپ واخلئ او د اړتیا پر مهال یې بېرته راګرځوئ.')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <input
                    ref={sarafBackupInputRef}
                    type="file"
                    accept="application/json"
                    className="hidden"
                    onChange={restoreSarafSettingsBackup}
                  />
                  <Button variant="outline" className="w-full" onClick={() => void downloadSarafSettingsBackup()} disabled={sarafBackupLoading}>
                    <Download className="mr-2 h-4 w-4" />
                    {pick(language, 'دانلود بکاپ تنظیمات', 'Download settings backup', 'د امستنو بکاپ ښکته کړئ')}
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => sarafBackupInputRef.current?.click()} disabled={sarafBackupLoading}>
                    <Upload className="mr-2 h-4 w-4" />
                    {pick(language, 'بازیابی از فایل بکاپ', 'Restore from backup file', 'له بکاپ فایل څخه بېرته راګرځول')}
                  </Button>
                  <Button asChild variant="ghost" className="w-full">
                    <Link href="/portal/profile">{pick(language, 'باز کردن پروفایل صرافی', 'Open saraf profile', 'د صراف پروفایل پرانیزئ')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Gift className="h-5 w-5" />{pick(language, 'جوایز و صرفه‌جویی', 'Rewards and savings', 'انعامونه او سپما')}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-sm text-muted-foreground">{pick(language, 'انتقالات ماهانه', 'Monthly transfers', 'میاشتني لېږدونه')}</p><p className="text-xl font-bold">{formatLocalizedNumber(stats?.monthly.transactionCount || 0, language)}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-sm text-muted-foreground">{pick(language, 'صرفه‌جویی ماهانه', 'Monthly discount saved', 'میاشتنۍ سپما')}</p><p className="text-xl font-bold">{formatLocalizedNumber(stats?.monthly.discountSaved || 0, language)} AFN</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-sm text-muted-foreground">{pick(language, 'جوایز فعال', 'Active rewards', 'فعال انعامونه')}</p><p className="text-xl font-bold">{formatLocalizedNumber(stats?.rewards.activeCount || 0, language)}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-sm text-muted-foreground">{pick(language, 'انتقالات رایگان', 'Free transfers available', 'وړیا لېږدونه')}</p><p className="text-xl font-bold">{formatLocalizedNumber(stats?.rewards.freeTransfersAvailable || 0, language)}</p></div>
                <div className="rounded-lg bg-muted/40 p-3"><p className="text-sm text-muted-foreground">{pick(language, 'صرفه‌جویی کل', 'Lifetime savings', 'ټوله سپما')}</p><p className="text-xl font-bold">{formatLocalizedNumber(stats?.lifetimeDiscountSaved || 0, language)} AFN</p></div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Shield className="h-5 w-5" />{pick(language, 'نشست‌های فعال', 'Active sessions', 'فعالې ناستې')}</CardTitle><CardDescription>{pick(language, 'نشست‌های فعال این حساب را بررسی کنید.', 'Review current sessions for this account.', 'د دې حساب اوسنۍ ناستې وګورئ.')}</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                <Button variant="outline" className="w-full" onClick={() => revokeSessions('others')} disabled={loadingSessions || otherSessions === 0}>{pick(language, 'لغو همه نشست‌های دیگر', 'Revoke all other sessions', 'نورې ټولې ناستې لغوه کړئ')}</Button>
                <div className="space-y-3">
                  {loadingSessions ? <p className="text-sm text-muted-foreground">{pick(language, 'در حال بارگذاری نشست‌های فعال...', 'Loading active sessions...', 'فعالې ناستې بارېږي...')}</p> : activeSessions.length === 0 ? <p className="text-sm text-muted-foreground">{pick(language, 'هنوز نشست فعالی ثبت نشده است.', 'No active sessions recorded yet.', 'لا تر اوسه کومه فعاله ناسته نه ده ثبت شوې.')}</p> : activeSessions.map((activeSession) => (
                    <div key={activeSession.id} className="space-y-2 rounded-lg border border-border/60 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="space-y-1"><p className="truncate text-sm font-medium">{activeSession.userAgent || pick(language, 'کاربر ناشناخته', 'Unknown client', 'نامعلوم مراجع')}</p><p className="text-xs text-muted-foreground">IP: {activeSession.ipAddress || pick(language, 'نامشخص', 'unknown', 'نامعلوم')}</p></div>
                        <Badge variant={activeSession.isCurrent ? 'default' : 'secondary'}>{activeSession.isCurrent ? pick(language, 'فعلی', 'Current', 'اوسنۍ') : pick(language, 'فعال', 'Active', 'فعاله')}</Badge>
                      </div>
                      <div className="space-y-1 text-xs text-muted-foreground"><p>{pick(language, 'شروع', 'Started', 'پیل')}: {formatDate(activeSession.createdAt, language)}</p><p>{pick(language, 'آخرین فعالیت', 'Last activity', 'وروستی فعالیت')}: {formatDate(activeSession.lastSeenAt, language)}</p></div>
                      {!activeSession.isCurrent && !activeSession.revokedAt ? <Button variant="ghost" size="sm" className="w-full" onClick={() => revokeSession(activeSession.id)}>{pick(language, 'لغو این نشست', 'Revoke this session', 'دا ناسته لغوه کړئ')}</Button> : null}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card border-0 shadow-lg">
              <CardHeader><CardTitle className="flex items-center gap-2"><Smartphone className="h-5 w-5" />{pick(language, 'اپلیکیشن موبایل', 'Mobile app', 'موبایل اپ')}</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-muted-foreground">{pick(language, 'صفحه اپ موبایل و اطلاعات دانلود را باز کنید.', 'Open the live mobile app page and download information.', 'د موبایل اپ پاڼه او د کښته کولو معلومات پرانیزئ.')}</p>
                <Button asChild variant="outline" className="w-full"><Link href="/mobile-app">{pick(language, 'باز کردن صفحه اپ موبایل', 'Open mobile app page', 'د موبایل اپ پاڼه پرانیزئ')}</Link></Button>
                <Button asChild variant="outline" className="w-full"><Link href="/mobile-app#download">{pick(language, 'باز کردن بخش دانلود', 'Open download section', 'د کښته کولو برخه پرانیزئ')}</Link></Button>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="mt-8 flex justify-center"><Button onClick={handleSave} size="lg" className="px-8"><Save className="mr-2 h-4 w-4" />{pick(language, 'ذخیره تنظیمات', 'Save settings', 'امستنې خوندي کړئ')}</Button></div>
      </div>
    </DashboardLayout>
  )
}
