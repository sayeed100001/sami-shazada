'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Building, Phone, MapPin, Mail, User, Save } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

interface SarafProfile {
  id: string
  businessName: string
  businessPhone: string
  businessAddress: string
  businessLicense: string
  status: string
  rating: number
  isPremium: boolean
  premiumExpiresAt?: string
  user: {
    name: string
    email: string
  }
}

export default function SarafProfilePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<SarafProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    businessName: '',
    businessPhone: '',
    businessAddress: '',
    businessLicense: ''
  })
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
      return
    }
    if (session.user.role !== 'SARAF') {
      router.push('/')
      return
    }
  }, [session, status, router])

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/portal/profile')
      if (response.ok) {
        const data = await response.json()
        setProfile(data)
        setFormData({
          businessName: data.businessName || '',
          businessPhone: data.businessPhone || '',
          businessAddress: data.businessAddress || '',
          businessLicense: data.businessLicense || ''
        })
      }
    } catch (error) {
      console.error('Failed to fetch profile:', error)
      toast.error('خطا در بارگذاری پروفایل')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.role === 'SARAF') {
      fetchProfile()
    }
  }, [session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/portal/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        toast.success('پروفایل بروزرسانی شد')
        fetchProfile()
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('خطا در بروزرسانی پروفایل')
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('رمز عبور جدید و تکرار آن یکسان نیست')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('رمز عبور باید حداقل 8 کاراکتر باشد')
      return
    }

    setChangingPassword(true)

    try {
      const response = await fetch('/api/portal/profile/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      })

      const data = await response.json()

      if (response.ok) {
        toast.success('رمز عبور با موفقیت تغییر کرد')
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      } else {
        throw new Error(data.error || 'Failed to change password')
      }
    } catch (error) {
      console.error('Failed to change password:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در تغییر رمز عبور')
    } finally {
      setChangingPassword(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return <Badge className="bg-green-100 text-green-800">تایید شده</Badge>
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">در انتظار تایید</Badge>
      case 'REJECTED':
        return <Badge className="bg-red-100 text-red-800">رد شده</Badge>
      case 'SUSPENDED':
        return <Badge className="bg-gray-100 text-gray-800">تعلیق شده</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  if (status === 'loading' || loading) {
    return <div>در حال بارگذاری...</div>
  }

  if (!session || session.user.role !== 'SARAF') {
    return <div>دسترسی غیرمجاز</div>
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        {/* Modern Header with Gradient */}
        <div className="bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-500 text-white rounded-2xl p-8 mb-8 shadow-xl">
          <div className="flex items-center gap-4 mb-4">
            <Button variant="ghost" size="icon" asChild className="text-white hover:bg-white/20">
              <Link href="/portal">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
          </div>
          <h1 className="text-4xl font-bold mb-2">پروفایل صرافی</h1>
          <p className="text-indigo-50 text-lg">مدیریت اطلاعات کسب و کار شما</p>
        </div>

        <div className="space-y-6 px-2">

        {profile && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Status Card */}
            <Card className="glass-card hover-lift border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  وضعیت حساب
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>وضعیت:</span>
                  {getStatusBadge(profile.status)}
                </div>
                
                <div className="flex items-center justify-between">
                  <span>امتیاز:</span>
                  <Badge variant="outline">{profile.rating.toFixed(1)}</Badge>
                </div>
                
                <div className="flex items-center justify-between">
                  <span>نوع حساب:</span>
                  <Badge variant={profile.isPremium ? 'default' : 'secondary'}>
                    {profile.isPremium ? 'پریمیوم' : 'عادی'}
                  </Badge>
                </div>

                {profile.isPremium && profile.premiumExpiresAt && (
                  <div className="text-sm text-muted-foreground">
                    انقضاء پریمیوم: {new Date(profile.premiumExpiresAt).toLocaleDateString('fa-IR')}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Form */}
            <Card className="glass-card hover-lift border-0 lg:col-span-2">
              <CardHeader>
                <CardTitle>اطلاعات کسب و کار</CardTitle>
                <CardDescription>
                  اطلاعات صرافی خود را بروزرسانی کنید
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="businessName">نام کسب و کار *</Label>
                      <Input
                        id="businessName"
                        value={formData.businessName}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                        required
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="businessPhone">تلفن کسب و کار *</Label>
                      <Input
                        id="businessPhone"
                        value={formData.businessPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="businessAddress">آدرس کسب و کار *</Label>
                    <Textarea
                      id="businessAddress"
                      value={formData.businessAddress}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                      rows={3}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessLicense">شماره مجوز کسب و کار</Label>
                    <Input
                      id="businessLicense"
                      value={formData.businessLicense}
                      onChange={(e) => setFormData(prev => ({ ...prev, businessLicense: e.target.value }))}
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button type="submit" disabled={saving} className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700">
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Account Information */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              اطلاعات حساب کاربری
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-sm text-muted-foreground">نام کاربری</Label>
                <p className="font-medium">{session.user.name}</p>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground">ایمیل</Label>
                <p className="font-medium">{session.user.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="glass-card border-0">
          <CardHeader>
            <CardTitle>تغییر رمز عبور</CardTitle>
            <CardDescription>
              برای امنیت بیشتر، رمز عبور خود را به صورت دوره‌ای تغییر دهید
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <Label htmlFor="currentPassword">رمز عبور فعلی *</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="newPassword">رمز عبور جدید *</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>

                <div>
                  <Label htmlFor="confirmPassword">تکرار رمز عبور جدید *</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={8}
                  />
                </div>
              </div>

              <Alert>
                <AlertDescription>
                  رمز عبور باید حداقل 8 کاراکتر و شامل حروف بزرگ، کوچک، عدد و کاراکتر خاص باشد
                </AlertDescription>
              </Alert>

              <div className="flex justify-end">
                <Button type="submit" disabled={changingPassword} variant="outline">
                  {changingPassword ? 'در حال تغییر...' : 'تغییر رمز عبور'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}