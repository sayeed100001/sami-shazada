'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ManagedImageUploadField } from '@/components/shared/managed-image-upload-field'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { IMAGE_UPLOAD_LIMITS } from '@/lib/image-upload-limits'
import { Palette, Type, Image, Layout, Save, RotateCcw } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

const AVAILABLE_FONTS = [
  'Helvetica',
  'Vazirmatn',
  'Estedad',
  'IRANSans',
  'Samim',
  'Shabnam',
  'Yekan',
  'Inter',
  'Arial',
  'Tahoma'
]

export default function ThemeManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const { theme: currentTheme, refreshTheme } = useTheme()
  
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState<any>({})

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
    if (currentTheme) {
      setTheme(currentTheme)
    }
  }, [currentTheme])

  const handleSave = async () => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/admin/theme', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme })
      })

      const data = await response.json()

      if (data.success) {
        toast({
          title: 'موفقیت',
          description: 'تنظیمات ظاهری با موفقیت ذخیره شد',
        })
        await refreshTheme()
        window.location.reload()
      } else {
        throw new Error(data.error)
      }
    } catch (error) {
      toast({
        title: 'خطا',
        description: 'خطا در ذخیره تنظیمات',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    const defaults = {
      THEME_PRIMARY_COLOR: '#6366f1',
      THEME_SECONDARY_COLOR: '#8b5cf6',
      THEME_ACCENT_COLOR: '#ec4899',
      THEME_BACKGROUND_COLOR: '#ffffff',
      THEME_TEXT_COLOR: '#1f2937',
      THEME_FONT_PRIMARY: 'Helvetica',
      THEME_FONT_HEADINGS: 'Helvetica',
      THEME_SIDEBAR_POSITION: 'right',
      THEME_HEADER_STYLE: 'fixed',
      THEME_BORDER_RADIUS: '8',
      THEME_SPACING: '16'
    }
    setTheme({ ...theme, ...defaults })
  }

  if (status === 'loading') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">مدیریت ظاهر سیستم</h1>
            <p className="text-muted-foreground">تنظیمات رنگ، فونت، لوگو و ظاهر کلی سیستم</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleReset} variant="outline">
              <RotateCcw className="h-4 w-4 ml-2" />
              بازگشت به پیشفرض
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              <Save className="h-4 w-4 ml-2" />
              {loading ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
            </Button>
          </div>
        </div>

        {/* رنگها */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              رنگبندی سیستم
            </CardTitle>
            <CardDescription>رنگهای اصلی سیستم را تنظیم کنید</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label>رنگ اصلی (Primary)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.THEME_PRIMARY_COLOR || '#6366f1'}
                  onChange={(e) => setTheme({ ...theme, THEME_PRIMARY_COLOR: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={theme.THEME_PRIMARY_COLOR || '#6366f1'}
                  onChange={(e) => setTheme({ ...theme, THEME_PRIMARY_COLOR: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>رنگ ثانویه (Secondary)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.THEME_SECONDARY_COLOR || '#8b5cf6'}
                  onChange={(e) => setTheme({ ...theme, THEME_SECONDARY_COLOR: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={theme.THEME_SECONDARY_COLOR || '#8b5cf6'}
                  onChange={(e) => setTheme({ ...theme, THEME_SECONDARY_COLOR: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>رنگ تاکیدی (Accent)</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.THEME_ACCENT_COLOR || '#ec4899'}
                  onChange={(e) => setTheme({ ...theme, THEME_ACCENT_COLOR: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={theme.THEME_ACCENT_COLOR || '#ec4899'}
                  onChange={(e) => setTheme({ ...theme, THEME_ACCENT_COLOR: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>رنگ پسزمینه</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.THEME_BACKGROUND_COLOR || '#ffffff'}
                  onChange={(e) => setTheme({ ...theme, THEME_BACKGROUND_COLOR: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={theme.THEME_BACKGROUND_COLOR || '#ffffff'}
                  onChange={(e) => setTheme({ ...theme, THEME_BACKGROUND_COLOR: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>رنگ متن</Label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={theme.THEME_TEXT_COLOR || '#1f2937'}
                  onChange={(e) => setTheme({ ...theme, THEME_TEXT_COLOR: e.target.value })}
                  className="w-20 h-10"
                />
                <Input
                  type="text"
                  value={theme.THEME_TEXT_COLOR || '#1f2937'}
                  onChange={(e) => setTheme({ ...theme, THEME_TEXT_COLOR: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* فونتها */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Type className="h-5 w-5" />
              فونتها
            </CardTitle>
            <CardDescription>فونتهای مورد استفاده در سیستم را انتخاب کنید</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>فونت اصلی متن</Label>
              <select
                value={theme.THEME_FONT_PRIMARY || 'Helvetica'}
                onChange={(e) => setTheme({ ...theme, THEME_FONT_PRIMARY: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                {AVAILABLE_FONTS.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>فونت عناوین</Label>
              <select
                value={theme.THEME_FONT_HEADINGS || 'Helvetica'}
                onChange={(e) => setTheme({ ...theme, THEME_FONT_HEADINGS: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                {AVAILABLE_FONTS.map(font => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {/* لوگو */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              لوگو و تصاویر
            </CardTitle>
            <CardDescription>لوگوهای سیستم را تنظیم کنید</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ManagedImageUploadField
              label="لوگوی اصلی"
              value={theme.THEME_LOGO_MAIN || '/logo.png'}
              onChange={(value) => setTheme({ ...theme, THEME_LOGO_MAIN: value })}
              scope="theme-logo-main"
              maxSizeBytes={IMAGE_UPLOAD_LIMITS.brandingLogo.maxBytes}
              maxSizeLabel={IMAGE_UPLOAD_LIMITS.brandingLogo.label}
              helperText="لوگوی اصلی theme از managed upload storage تغذیه می‌شود."
              previewAlt="Theme main logo"
              uploadLabel="آپلود لوگو"
              clearLabel="حذف"
              emptyLabel="هنوز لوگویی بارگذاری نشده است"
              uploadSuccessMessage="لوگوی اصلی theme آپلود شد."
              previewHeightClassName="h-28"
            />

            <ManagedImageUploadField
              label="Favicon"
              value={theme.THEME_LOGO_FAVICON || '/favicon.ico'}
              onChange={(value) => setTheme({ ...theme, THEME_LOGO_FAVICON: value })}
              scope="theme-logo-favicon"
              accept="image/png,image/jpeg,image/webp,image/x-icon,image/vnd.microsoft.icon"
              maxSizeBytes={IMAGE_UPLOAD_LIMITS.brandingFavicon.maxBytes}
              maxSizeLabel={IMAGE_UPLOAD_LIMITS.brandingFavicon.label}
              helperText="Favicon theme در Vercel Blob یا storage مدیریت‌شده ذخیره می‌شود."
              previewAlt="Theme favicon"
              uploadLabel="آپلود favicon"
              clearLabel="حذف"
              emptyLabel="هنوز faviconی بارگذاری نشده است"
              uploadSuccessMessage="Favicon theme آپلود شد."
              previewHeightClassName="h-28"
            />

            <ManagedImageUploadField
              label="لوگوی Dark Mode"
              value={theme.THEME_LOGO_DARK || '/logo-dark.png'}
              onChange={(value) => setTheme({ ...theme, THEME_LOGO_DARK: value })}
              scope="theme-logo-dark"
              maxSizeBytes={IMAGE_UPLOAD_LIMITS.brandingLogo.maxBytes}
              maxSizeLabel={IMAGE_UPLOAD_LIMITS.brandingLogo.label}
              helperText="لوگوی dark mode هم از همان managed upload path استفاده می‌کند."
              previewAlt="Theme dark logo"
              uploadLabel="آپلود لوگوی dark"
              clearLabel="حذف"
              emptyLabel="هنوز لوگوی dark بارگذاری نشده است"
              uploadSuccessMessage="لوگوی dark theme آپلود شد."
              previewHeightClassName="h-28"
            />
          </CardContent>
        </Card>

        {/* Layout */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layout className="h-5 w-5" />
              چیدمان و ظاهر
            </CardTitle>
            <CardDescription>تنظیمات چیدمان و ظاهر کلی</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label>موقعیت Sidebar</Label>
              <select
                value={theme.THEME_SIDEBAR_POSITION || 'right'}
                onChange={(e) => setTheme({ ...theme, THEME_SIDEBAR_POSITION: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="right">راست (RTL)</option>
                <option value="left">چپ (LTR)</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>نوع Header</Label>
              <select
                value={theme.THEME_HEADER_STYLE || 'fixed'}
                onChange={(e) => setTheme({ ...theme, THEME_HEADER_STYLE: e.target.value })}
                className="w-full p-2 border rounded-md"
              >
                <option value="fixed">ثابت</option>
                <option value="static">استاتیک</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label>شعاع گوشهها (px)</Label>
              <Input
                type="number"
                value={theme.THEME_BORDER_RADIUS || '8'}
                onChange={(e) => setTheme({ ...theme, THEME_BORDER_RADIUS: e.target.value })}
                min="0"
                max="24"
              />
            </div>

            <div className="space-y-2">
              <Label>فاصلهگذاری (px)</Label>
              <Input
                type="number"
                value={theme.THEME_SPACING || '16'}
                onChange={(e) => setTheme({ ...theme, THEME_SPACING: e.target.value })}
                min="8"
                max="32"
              />
            </div>
          </CardContent>
        </Card>

        {/* اطلاعات سایت */}
        <Card>
          <CardHeader>
            <CardTitle>اطلاعات سایت</CardTitle>
            <CardDescription>اطلاعات عمومی سایت</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>نام سایت</Label>
              <Input
                type="text"
                value={theme.SITE_NAME || 'سرای شهزاده'}
                onChange={(e) => setTheme({ ...theme, SITE_NAME: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>توضیحات سایت</Label>
              <Input
                type="text"
                value={theme.SITE_DESCRIPTION || 'پلتفورم جامع مالی افغانستان'}
                onChange={(e) => setTheme({ ...theme, SITE_DESCRIPTION: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>ایمیل تماس</Label>
              <Input
                type="email"
                value={theme.CONTACT_EMAIL || 'info@saray.af'}
                onChange={(e) => setTheme({ ...theme, CONTACT_EMAIL: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>شماره تماس</Label>
              <Input
                type="text"
                value={theme.CONTACT_PHONE || '+93700000000'}
                onChange={(e) => setTheme({ ...theme, CONTACT_PHONE: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {/* پیشنمایش */}
        <Card>
          <CardHeader>
            <CardTitle>پیشنمایش</CardTitle>
            <CardDescription>نمایش تغییرات اعمال شده</CardDescription>
          </CardHeader>
          <CardContent>
            <div 
              className="p-6 rounded-lg border-2"
              style={{
                backgroundColor: theme.THEME_BACKGROUND_COLOR,
                color: theme.THEME_TEXT_COLOR,
                borderRadius: `${theme.THEME_BORDER_RADIUS}px`,
                fontFamily: theme.THEME_FONT_PRIMARY
              }}
            >
              <h2 
                className="text-2xl font-bold mb-4"
                style={{
                  color: theme.THEME_PRIMARY_COLOR,
                  fontFamily: theme.THEME_FONT_HEADINGS
                }}
              >
                {theme.SITE_NAME || 'سرای شهزاده'}
              </h2>
              <p className="mb-4">{theme.SITE_DESCRIPTION || 'پلتفورم جامع مالی افغانستان'}</p>
              <div className="flex gap-2">
                <Button style={{ backgroundColor: theme.THEME_PRIMARY_COLOR }}>
                  دکمه اصلی
                </Button>
                <Button style={{ backgroundColor: theme.THEME_SECONDARY_COLOR }}>
                  دکمه ثانویه
                </Button>
                <Button style={{ backgroundColor: theme.THEME_ACCENT_COLOR }}>
                  دکمه تاکیدی
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

