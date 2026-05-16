'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Check, Zap, Crown, Rocket, ArrowLeft, Package } from 'lucide-react'

type PackageType = 'PRO' | 'PREMIUM' | 'ENTERPRISE'

interface SubscriptionPackage {
  type: PackageType
  name: string
  price: number
  basePrice?: number
  overridePrice?: number | null
  features: string[]
  highlightFeature?: string | null
  description?: string | null
}

interface CurrentPackage {
  type: string | null
  expiry?: string | null
}

interface SubscriptionHistoryItem {
  id: string
  packageType: string
  status: string
  requestedAt: string
}

const packageIcons: Record<PackageType, typeof Zap> = {
  PRO: Zap,
  PREMIUM: Crown,
  ENTERPRISE: Rocket,
}

const packageColors: Record<PackageType, string> = {
  PRO: 'from-blue-500 to-blue-600',
  PREMIUM: 'from-purple-500 to-purple-600',
  ENTERPRISE: 'from-amber-500 to-amber-600',
}

export default function SubscriptionPage() {
  const [loading, setLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [packages, setPackages] = useState<SubscriptionPackage[]>([])
  const [currentPackage, setCurrentPackage] = useState<CurrentPackage | null>(null)
  const [creditBalance, setCreditBalance] = useState(0)
  const [history, setHistory] = useState<SubscriptionHistoryItem[]>([])

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setIsFetching(true)
      const [statsRes, subsRes] = await Promise.all([
        fetch('/api/portal/stats'),
        fetch('/api/portal/subscription/request'),
      ])

      const statsData = await statsRes.json()
      const subsData = await subsRes.json()

      setCreditBalance(statsData.creditBalance || 0)
      setCurrentPackage(subsData.current || null)
      setPackages(Array.isArray(subsData.packages) ? subsData.packages : [])
      setHistory(Array.isArray(subsData.history) ? subsData.history : [])
    } catch (error) {
      console.error('Error fetching subscription data:', error)
      toast.error('خطا در بارگذاری اطلاعات اشتراک')
    } finally {
      setIsFetching(false)
    }
  }

  const handleRequest = async (packageType: PackageType, price: number) => {
    setLoading(true)
    try {
      const res = await fetch('/api/portal/subscription/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ packageType }),
      })

      const data = await res.json().catch(() => null)
      if (res.ok) {
        if (data?.needsTopUp) {
          toast.warning(`درخواست ثبت شد. برای فعال‌سازی باید حداقل ${data?.requiredCredits ?? price} کریدیت داشته باشید.`)
        } else {
          toast.success('درخواست پکیج ثبت شد و در انتظار تایید است')
        }
        fetchData()
      } else {
        toast.error(data?.error || 'خطا در ثبت درخواست')
      }
    } catch (error) {
      toast.error('خطا در ثبت درخواست')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'ACTIVE') return <Badge variant="default">فعال</Badge>
    if (status === 'PENDING') return <Badge variant="secondary">در انتظار</Badge>
    if (status === 'EXPIRED') return <Badge variant="outline">منقضی</Badge>
    if (status === 'CANCELLED') return <Badge variant="destructive">رد شده</Badge>
    return <Badge variant="outline">{status}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="space-y-8 p-4 sm:p-6">
        <div className="bg-gradient-to-r from-violet-500 via-purple-500 to-indigo-500 text-white rounded-2xl p-8 shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <Link href="/portal">
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    بازگشت
                  </Button>
                </Link>
              </div>
              <h1 className="text-4xl font-bold mb-2">پکیج‌های اشتراک</h1>
              <p className="text-violet-50 text-lg">پکیج مناسب کسب‌وکار خود را انتخاب کنید</p>
            </div>

            <Card className="glass-card border-0 w-full max-w-xs">
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">موجودی کریدیت</p>
                <p className="text-3xl font-bold text-green-600">{creditBalance}</p>
                <Button variant="link" className="p-0 h-auto" asChild>
                  <Link href="/portal/credit">خرید کریدیت</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {currentPackage?.type && (
          <Card className="glass-card border-2 border-purple-500">
            <CardHeader>
              <CardTitle>پکیج فعلی شما</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold">{currentPackage.type}</p>
                  {currentPackage.expiry && (
                    <p className="text-sm text-muted-foreground">
                      انقضا: {new Date(currentPackage.expiry).toLocaleDateString('fa-IR')}
                    </p>
                  )}
                </div>
                <Badge variant="default" className="text-lg px-4 py-2">فعال</Badge>
              </div>
            </CardContent>
          </Card>
        )}

        {isFetching ? (
          <div className="text-center py-12">در حال بارگذاری...</div>
        ) : packages.length === 0 ? (
          <Card className="glass-card border-0">
            <CardContent className="py-12 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هیچ پکیج فعالی برای نمایش وجود ندارد.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {packages.map((pkg) => {
              const Icon = packageIcons[pkg.type]
              const isCurrentPackage = currentPackage?.type === pkg.type
              const isFeatured = Boolean(pkg.highlightFeature)
              const hasOverride =
                typeof pkg.overridePrice === 'number' &&
                Number.isFinite(pkg.overridePrice) &&
                typeof pkg.basePrice === 'number' &&
                Number.isFinite(pkg.basePrice) &&
                pkg.overridePrice !== pkg.basePrice

              return (
                <Card
                  key={pkg.type}
                  className={`glass-card hover-lift relative overflow-hidden transition-all border-0 ${
                    isFeatured ? 'ring-2 ring-purple-500 scale-[1.02]' : ''
                  } ${isCurrentPackage ? 'opacity-60' : ''}`}
                >
                  {isFeatured && (
                    <div className="absolute top-0 right-0 bg-purple-600 text-white px-4 py-1 text-sm font-bold rounded-bl-lg">
                      {pkg.highlightFeature}
                    </div>
                  )}

                  <CardHeader>
                    <div className={`w-16 h-16 rounded-full bg-gradient-to-br ${packageColors[pkg.type]} flex items-center justify-center mb-4`}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                    <CardDescription>
                      <span className="text-4xl font-bold text-foreground">{pkg.price}</span>
                      <span className="text-muted-foreground"> کریدیت/ماه</span>
                      {hasOverride && (
                        <span className="ml-2 text-sm text-muted-foreground line-through">{pkg.basePrice}</span>
                      )}
                    </CardDescription>
                    {pkg.description && (
                      <p className="text-sm text-muted-foreground">{pkg.description}</p>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <ul className="space-y-3">
                      {pkg.features.map((feature, index) => (
                        <li key={`${pkg.type}-${index}`} className="flex items-start gap-2">
                          <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => handleRequest(pkg.type, pkg.price)}
                      disabled={loading || isCurrentPackage}
                      className="w-full bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700"
                      size="lg"
                      variant={isFeatured ? 'default' : 'outline'}
                    >
                      {isCurrentPackage
                        ? 'پکیج فعلی'
                        : creditBalance < pkg.price
                          ? 'ثبت درخواست (نیاز به کریدیت)'
                          : 'انتخاب پکیج'}
                    </Button>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {history.length > 0 && (
          <Card className="glass-card border-0">
            <CardHeader>
              <CardTitle>تاریخچه درخواست‌ها</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history.map((item) => (
                  <div key={item.id} className="flex justify-between items-center p-3 border rounded">
                    <div>
                      <p className="font-bold">{item.packageType}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(item.requestedAt).toLocaleDateString('fa-IR')}
                      </p>
                    </div>
                    {getStatusBadge(item.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  )
}
