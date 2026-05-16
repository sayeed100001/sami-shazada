'use client'

import { useState, useEffect } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { CreditCard, DollarSign, Clock, CheckCircle } from 'lucide-react'
import { useLanguage } from '@/hooks/useLanguage'

interface CreditRequest {
  id: string
  amount: number
  price: number
  status: string
  paymentMethod: string
  discountAmount: number
  createdAt: string
  saraf: {
    businessName: string
    user: {
      name: string
      email: string
    }
  }
}

export default function CreditRequestsPage() {
  const { t } = useLanguage()
  const [requests, setRequests] = useState<CreditRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('PENDING')

  useEffect(() => {
    fetchRequests()
  }, [filter])

  const fetchRequests = async () => {
    try {
      const res = await fetch(`/api/admin/credit?status=${filter}`)
      const data = await res.json()
      setRequests(data.transactions || [])
    } catch (error) {
      toast.error('خطا در دریافت درخواستها')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/credit/approve/${id}`, {
        method: 'POST'
      })

      if (res.ok) {
        toast.success('درخواست تایید شد')
        fetchRequests()
      } else {
        toast.error('خطا در تایید درخواست')
      }
    } catch (error) {
      toast.error('خطا در تایید درخواست')
    }
  }

  const handleReject = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/credit/reject/${id}`, {
        method: 'POST'
      })

      if (res.ok) {
        toast.success('درخواست رد شد')
        fetchRequests()
      } else {
        toast.error('خطا در رد درخواست')
      }
    } catch (error) {
      toast.error('خطا در رد درخواست')
    }
  }

  const getStatusBadge = (status: string) => {
    const variants: any = {
      PENDING: 'secondary',
      APPROVED: 'default',
      REJECTED: 'destructive'
    }
    const labels: any = {
      PENDING: 'در انتظار',
      APPROVED: 'تایید شده',
      REJECTED: 'رد شده'
    }
    return <Badge variant={variants[status] || 'default'}>{labels[status] || status}</Badge>
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <CreditCard className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('admin.creditRequests')}</h1>
            </div>
            <p className="text-cyan-50 text-lg">{t('admin.creditRequests.subtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl"></div>
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filter === 'PENDING' ? 'default' : 'outline'}
            onClick={() => setFilter('PENDING')}
            className="gap-2"
          >
            <Clock className="h-4 w-4" />
            در انتظار
          </Button>
          <Button
            variant={filter === 'APPROVED' ? 'default' : 'outline'}
            onClick={() => setFilter('APPROVED')}
            className="gap-2"
          >
            <CheckCircle className="h-4 w-4" />
            تایید شده
          </Button>
          <Button
            variant={filter === 'REJECTED' ? 'default' : 'outline'}
            onClick={() => setFilter('REJECTED')}
          >
            رد شده
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="glass-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">در انتظار</p>
                  <p className="text-2xl font-bold">{requests.filter(r => r.status === 'PENDING').length}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 rounded-xl">
                  <Clock className="h-8 w-8 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">تایید شده</p>
                  <p className="text-2xl font-bold">{requests.filter(r => r.status === 'APPROVED').length}</p>
                </div>
                <div className="p-3 bg-green-500/10 rounded-xl">
                  <CheckCircle className="h-8 w-8 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="glass-card hover-lift">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مجموع درآمد</p>
                  <p className="text-2xl font-bold">${requests.filter(r => r.status === 'APPROVED').reduce((sum, r) => sum + r.price, 0).toFixed(2)}</p>
                </div>
                <div className="p-3 bg-blue-500/10 rounded-xl">
                  <DollarSign className="h-8 w-8 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="text-center py-8">در حال بارگذاری...</div>
        ) : (
          <div className="grid gap-4">
            {requests.map((request) => (
              <Card key={request.id} className="glass-card hover-lift">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle>{request.saraf.businessName}</CardTitle>
                      <p className="text-sm text-muted-foreground">
                        {request.saraf.user.name} - {request.saraf.user.email}
                      </p>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">مقدار کریدیت</p>
                      <p className="text-lg font-bold">{request.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">قیمت</p>
                      <p className="text-lg font-bold">${request.price.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">تخفیف</p>
                      <p className="text-lg font-bold">${request.discountAmount?.toFixed(2) || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">روش پرداخت</p>
                      <p className="text-lg">{request.paymentMethod || '-'}</p>
                    </div>
                  </div>

                  {request.status === 'PENDING' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        onClick={() => handleApprove(request.id)}
                        variant="default"
                      >
                        تایید
                      </Button>
                      <Button variant="destructive" onClick={() => handleReject(request.id)}>
                        رد
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
