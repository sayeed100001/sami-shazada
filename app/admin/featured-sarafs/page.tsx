'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Star, Building } from 'lucide-react'
import { toast } from 'sonner'

interface Saraf {
  id: string
  businessName: string
  businessAddress: string
  rating: number
  isFeatured: boolean
  isPremium: boolean
  status: string
}

export default function FeaturedSarafsPage() {
  const [sarafs, setSarafs] = useState<Saraf[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSarafs()
  }, [])

  const fetchSarafs = async () => {
    try {
      const response = await fetch('/api/admin/sarafs?status=APPROVED&limit=500')
      if (!response.ok) throw new Error('Failed')
      const data = await response.json()
      setSarafs(data.sarafs || [])
    } catch (error) {
      toast.error('خطا در بارگذاری')
      setSarafs([])
    } finally {
      setLoading(false)
    }
  }

  const toggleFeatured = async (sarafId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/sarafs/${sarafId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isFeatured: !currentStatus })
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        throw new Error(payload?.error || 'Failed')
      }

      toast.success(currentStatus ? 'حذف شد' : 'اضافه شد')
      fetchSarafs()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'خطا')
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-yellow-500 via-amber-500 to-yellow-600 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Star className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">مدیریت صرافان داشبورد</h1>
            </div>
            <p className="text-yellow-50 text-lg">صرافان نمایش داده شده در صفحه اصلی</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl"></div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>صرافان ({sarafs.filter(s => s.status === 'APPROVED').length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">بارگذاری...</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">نام</TableHead>
                      <TableHead className="min-w-[200px] hidden md:table-cell">آدرس</TableHead>
                      <TableHead className="min-w-[100px] hidden sm:table-cell">امتیاز</TableHead>
                      <TableHead className="min-w-[100px]">داشبورد</TableHead>
                      <TableHead className="min-w-[100px]">عملیات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sarafs.filter(s => s.status === 'APPROVED').map((saraf) => (
                      <TableRow key={saraf.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            <span className="font-medium">{saraf.businessName}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="truncate max-w-[200px] block">{saraf.businessAddress}</span>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-400 fill-current" />
                            {saraf.rating.toFixed(1)}
                          </div>
                        </TableCell>
                        <TableCell>
                          {saraf.isFeatured ? (
                            <Badge className="bg-green-100 text-green-800">فعال</Badge>
                          ) : (
                            <Badge variant="secondary">غیرفعال</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant={saraf.isFeatured ? 'destructive' : 'default'}
                            onClick={() => toggleFeatured(saraf.id, saraf.isFeatured)}
                            className="min-w-[44px] h-9"
                          >
                            {saraf.isFeatured ? 'حذف' : 'افزودن'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
