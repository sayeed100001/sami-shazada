'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Package, Pencil, Power, Save } from 'lucide-react'

interface PackageConfig {
  id: string
  type: 'PRO' | 'PREMIUM' | 'ENTERPRISE'
  name: string
  price: number
  credits: number
  maxBranches: number
  features: string[]
  isActive: boolean
  displayOrder: number
  description?: string | null
  highlightFeature?: string | null
}

const EMPTY_PACKAGE: PackageConfig = {
  id: '',
  type: 'PRO',
  name: '',
  price: 0,
  credits: 0,
  maxBranches: 1,
  features: [],
  isActive: true,
  displayOrder: 0,
  description: '',
  highlightFeature: '',
}

export default function AdminPackagesPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [packages, setPackages] = useState<PackageConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingPackage, setEditingPackage] = useState<PackageConfig | null>(null)
  const [showDialog, setShowDialog] = useState(false)

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
    fetchPackages()
  }, [status, session, router])

  const fetchPackages = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/packages')
      const data = await response.json().catch(() => null)

      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to fetch packages')
      }

      setPackages(Array.isArray(data.packages) ? data.packages : [])
    } catch (error) {
      console.error('Failed to fetch packages:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در بارگذاری پکیج‌ها')
      setPackages([])
    } finally {
      setLoading(false)
    }
  }

  const openEditModal = (pkg: PackageConfig) => {
    setEditingPackage({
      ...pkg,
      description: pkg.description || '',
      highlightFeature: pkg.highlightFeature || '',
    })
    setShowDialog(true)
  }

  const handleToggleActive = async (pkg: PackageConfig) => {
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: pkg.type, isActive: !pkg.isActive }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to update package status')
      }

      toast.success(`پکیج ${!pkg.isActive ? 'فعال' : 'غیرفعال'} شد`)
      fetchPackages()
    } catch (error) {
      console.error('Failed to toggle package status:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در بروزرسانی وضعیت پکیج')
    }
  }

  const handleSavePackage = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingPackage) return

    setSaving(true)
    try {
      const response = await fetch('/api/admin/packages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingPackage,
          features: editingPackage.features,
          description: editingPackage.description || null,
          highlightFeature: editingPackage.highlightFeature || null,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to save package')
      }

      toast.success(data.message || 'پکیج ذخیره شد')
      setShowDialog(false)
      setEditingPackage(null)
      fetchPackages()
    } catch (error) {
      console.error('Error saving package:', error)
      toast.error(error instanceof Error ? error.message : 'خطا در ذخیره پکیج')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Package className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">مدیریت پکیج‌ها</h1>
            </div>
            <p className="text-indigo-50 text-lg">پکیج‌های اشتراک صرافان که در پورتل نمایش داده می‌شوند</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
            <Card key={pkg.id} className={`glass-card border-0 ${pkg.isActive ? '' : 'opacity-70'}`}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{pkg.name}</CardTitle>
                    <CardDescription>{pkg.type}</CardDescription>
                  </div>
                  <Badge variant={pkg.isActive ? 'default' : 'secondary'}>
                    {pkg.isActive ? 'فعال' : 'غیرفعال'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-3xl font-bold">{pkg.price}</p>
                  <p className="text-sm text-muted-foreground">کریدیت / ماه</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-muted-foreground">کریدیت</p>
                    <p className="font-medium">{pkg.credits}</p>
                  </div>
                  <div className="rounded-lg bg-muted p-3">
                    <p className="text-muted-foreground">حداکثر شعبه</p>
                    <p className="font-medium">{pkg.maxBranches === -1 ? 'نامحدود' : pkg.maxBranches}</p>
                  </div>
                </div>

                {pkg.highlightFeature && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
                    {pkg.highlightFeature}
                  </div>
                )}

                {pkg.description && (
                  <p className="text-sm text-muted-foreground">{pkg.description}</p>
                )}

                <div className="space-y-2">
                  {pkg.features.map((feature, index) => (
                    <div key={`${pkg.id}-${index}`} className="text-sm">
                      - {feature}
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button className="flex-1" variant="outline" onClick={() => openEditModal(pkg)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    ویرایش
                  </Button>
                  <Button className="flex-1" variant="outline" onClick={() => handleToggleActive(pkg)}>
                    <Power className="h-4 w-4 mr-2" />
                    {pkg.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>ویرایش پکیج</DialogTitle>
              <DialogDescription>تغییرات این صفحه مستقیماً در پورتل صراف اعمال می‌شود.</DialogDescription>
            </DialogHeader>

            {editingPackage && (
              <form onSubmit={handleSavePackage} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="package-name">نام پکیج</Label>
                    <Input
                      id="package-name"
                      value={editingPackage.name}
                      onChange={(event) => setEditingPackage({ ...editingPackage, name: event.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="package-price">قیمت</Label>
                    <Input
                      id="package-price"
                      type="number"
                      value={editingPackage.price}
                      onChange={(event) => setEditingPackage({ ...editingPackage, price: Number(event.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="package-credits">کریدیت</Label>
                    <Input
                      id="package-credits"
                      type="number"
                      value={editingPackage.credits}
                      onChange={(event) => setEditingPackage({ ...editingPackage, credits: Number(event.target.value) || 0 })}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="package-branches">حداکثر شعبه</Label>
                    <Input
                      id="package-branches"
                      type="number"
                      value={editingPackage.maxBranches}
                      onChange={(event) => setEditingPackage({ ...editingPackage, maxBranches: Number(event.target.value) || 0 })}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="package-highlight">ویژگی برجسته</Label>
                  <Input
                    id="package-highlight"
                    value={editingPackage.highlightFeature || ''}
                    onChange={(event) => setEditingPackage({ ...editingPackage, highlightFeature: event.target.value })}
                  />
                </div>

                <div>
                  <Label htmlFor="package-description">توضیحات</Label>
                  <Textarea
                    id="package-description"
                    value={editingPackage.description || ''}
                    onChange={(event) => setEditingPackage({ ...editingPackage, description: event.target.value })}
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="package-features">ویژگی‌ها (هر خط یک مورد)</Label>
                  <Textarea
                    id="package-features"
                    value={editingPackage.features.join('\n')}
                    onChange={(event) =>
                      setEditingPackage({
                        ...editingPackage,
                        features: event.target.value
                          .split('\n')
                          .map((feature) => feature.trim())
                          .filter(Boolean),
                      })
                    }
                    rows={6}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>
                    انصراف
                  </Button>
                  <Button type="submit" disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? 'در حال ذخیره...' : 'ذخیره'}
                  </Button>
                </div>
              </form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )
}
