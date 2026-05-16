'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Building, Star, Phone, MapPin, ArrowLeft, Clock, MessageCircle, Send, MoreVertical, ArrowRightLeft } from 'lucide-react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { GuestSarafChatWidget } from '@/components/chat/GuestSarafChatWidget'
import { SarafVoting } from '@/components/saraf/SarafVoting'
import { HawalaRequestForm } from '@/components/hawala/VisitorHawalaForm'
import { UserExchangeRequestForm } from '@/components/exchange/UserExchangeRequestForm'
import { SarafFollowButton } from '@/components/social/SarafFollowButton'
import { useLanguage } from '@/hooks/useLanguage'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface SarafDetail {
  id: string
  businessName: string
  businessAddress: string
  businessPhone: string
  hawalaFeePercent: number
  exchangeFeePercent: number
  rating: number
  totalTransactions: number
  followerCount: number
  isActive: boolean
  isPremium: boolean
  description: string | null
  workingHours: string | null
  services: string[]
  branches: {
    id: string
    name: string
    address: string
    city: string
    country: string
    phone: string
  }[]
  rates: {
    fromCurrency: string
    toCurrency: string
    buyRate: number
    sellRate: number
    lastUpdate: string
  }[]
  reviews: {
    id: string
    userName: string
    rating: number
    comment: string
    date: string
  }[]
  stats: {
    completedTransactions: number
    averageResponseTime: string | null
    customerSatisfaction: number
  }
}

export default function SarafDetailPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const params = useParams()
  const router = useRouter()
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [saraf, setSaraf] = useState<SarafDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [showHawalaForm, setShowHawalaForm] = useState(false)
  const [showExchangeForm, setShowExchangeForm] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('openChat') === 'true') {
      setShowChat(true)
    }
    if (params.get('openHawala') === 'true') {
      setShowHawalaForm(true)
    }
    if (params.get('openExchange') === 'true') {
      setShowExchangeForm(true)
    }
    if (
      params.get('openChat') === 'true' ||
      params.get('openHawala') === 'true' ||
      params.get('openExchange') === 'true'
    ) {
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    if (!showChat || !saraf || !session?.user) return
    setShowChat(false)
    void openMessengerChat()
  }, [saraf, session?.user, showChat])

  const handleWhatsAppContact = () => {
    if (saraf?.businessPhone) {
      const message = encodeURIComponent(`سلام، از طریق سرای شهزاده با شما تماس گرفتم. میخواهم در مورد نرخهای شما اطلاعات بگیرم.`)
      window.open(`https://wa.me/${saraf.businessPhone.replace(/[^0-9]/g, '')}?text=${message}`, '_blank')
    }
  }

  const openMessengerChat = async () => {
    if (!saraf) return

    if (!session?.user) {
      setShowChat(true)
      return
    }

    try {
      const response = await fetch('/api/saraf-chat/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sarafId: saraf.id }),
      })

      const data = await response.json().catch(() => null)
      const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : ''
      router.push(
        sessionId
          ? `/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(sessionId)}`
          : '/portal/internal-chat?tab=customers'
      )
    } catch (error) {
      console.error('Failed to open portal messenger:', error)
      router.push('/portal/internal-chat?tab=customers')
    }
  }

  useEffect(() => {
    const fetchSarafDetail = async () => {
      if (!id) return
      try {
        const response = await fetch(`/api/sarafs/${id}`)
        if (response.ok) {
          const data = await response.json()
          setSaraf(data)
        } else {
          console.error('Failed to fetch saraf details')
        }
      } catch (error) {
        console.error('Failed to fetch saraf details:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchSarafDetail()
  }, [id])

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (!saraf) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">صرافی یافت نشد</h2>
          <Button asChild>
            <Link href="/sarafs">بازگشت به فهرست صرافان</Link>
          </Button>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 sm:gap-4 mb-4 sm:mb-6">
          <Button variant="outline" size="sm" asChild className="text-xs sm:text-sm">
            <Link href="/sarafs">
              <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              بازگشت
            </Link>
          </Button>
        </div>

        {/* Main Info */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
              <div className="flex items-start gap-2 sm:gap-3 flex-1">
                <Building className="h-6 w-6 sm:h-8 sm:w-8 text-primary flex-shrink-0 mt-1" />
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-lg sm:text-xl lg:text-2xl break-words">{saraf.businessName}</CardTitle>
                  <div className="flex flex-wrap items-center gap-1 sm:gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      {renderStars(saraf.rating)}
                    </div>
                    <span className="font-medium persian-numbers text-sm">{saraf.rating}</span>
                    <Badge variant={saraf.isActive ? 'default' : 'secondary'} className="text-xs">
                      {saraf.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                    {saraf.isPremium && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600 text-xs">
                        ممتاز
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <SarafFollowButton
                  sarafId={saraf.id}
                  sarafName={saraf.businessName}
                  initialFollowerCount={saraf.followerCount}
                  className="w-full sm:w-auto"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      size="sm"
                      className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto text-xs sm:text-sm"
                    >
                      <MoreVertical className="h-4 w-4 mr-1 sm:mr-2" />
                      ارتباط با صراف
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-xl">
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                      onClick={() => {
                        void openMessengerChat()
                      }}
                    >
                      <div className="flex items-center gap-3 py-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                          <Send className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">چت درون برنامهای</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">گفتگوی مستقیم با صراف</div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                      onClick={handleWhatsAppContact}
                    >
                      <div className="flex items-center gap-3 py-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                          <MessageCircle className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">واتساپ</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">ارسال پیام در واتساپ</div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="cursor-pointer hover:bg-emerald-50 dark:hover:bg-emerald-900/20 focus:bg-emerald-50 dark:focus:bg-emerald-900/20"
                      onClick={() => window.open(`tel:${saraf.businessPhone}`)}
                    >
                      <div className="flex items-center gap-3 py-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-white" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-white text-sm">تماس تلفنی</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{saraf.businessPhone}</div>
                        </div>
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowExchangeForm(true)}
                  className="w-full sm:w-auto text-xs sm:text-sm"
                >
                  <ArrowRightLeft className="h-4 w-4 mr-1 sm:mr-2" />
                  ثبت درخواست تبادله
                </Button>

                <Button 
                  size="sm"
                  onClick={() => setShowHawalaForm(true)}
                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 w-full sm:w-auto text-xs sm:text-sm animate-pulse"
                >
                  <Send className="h-4 w-4 mr-1 sm:mr-2" />
                  ثبت درخواست حواله
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <div className="space-y-2 sm:space-y-3">
                <div className="flex items-start gap-2 text-muted-foreground text-sm">
                  <MapPin className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span className="break-words">{saraf.businessAddress}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Phone className="h-4 w-4 flex-shrink-0" />
                  <span className="persian-numbers">{saraf.businessPhone}</span>
                </div>
                {saraf.workingHours ? (
                  <div className="flex items-center gap-2 text-muted-foreground text-sm">
                    <Clock className="h-4 w-4 flex-shrink-0" />
                    <span>{saraf.workingHours}</span>
                  </div>
                ) : null}
              </div>
              
              <div className="text-center p-3 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold persian-numbers">{saraf.stats.completedTransactions}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">تراکنش تکمیل شده</div>
              </div>
              
              <div className="text-center p-3 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold persian-numbers">{saraf.stats.customerSatisfaction}%</div>
                <div className="text-xs sm:text-sm text-muted-foreground">رضایت مشتریان</div>
              </div>

              <div className="text-center p-3 sm:p-0">
                <div className="text-xl sm:text-2xl font-bold persian-numbers">{saraf.followerCount}</div>
                <div className="text-xs sm:text-sm text-muted-foreground">دنبال‌کننده</div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-6">
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <div className="text-sm text-muted-foreground">فیصد حواله فعلی</div>
                <div className="mt-2 text-2xl font-bold persian-numbers">{saraf.hawalaFeePercent}%</div>
              </div>
              <div className="rounded-xl border bg-muted/30 p-4 text-center">
                <div className="text-sm text-muted-foreground">فیصد تبادله فعلی</div>
                <div className="mt-2 text-2xl font-bold persian-numbers">{saraf.exchangeFeePercent}%</div>
              </div>
            </div>
            
            {saraf.description ? (
              <div className="mt-6 pt-6 border-t">
                <p className="text-muted-foreground">{saraf.description}</p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="rates" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
            <TabsTrigger value="rates" className="text-xs sm:text-sm p-2 sm:p-3">نرخهای ارز</TabsTrigger>
            <TabsTrigger value="services" className="text-xs sm:text-sm p-2 sm:p-3">خدمات</TabsTrigger>
            <TabsTrigger value="reviews" className="text-xs sm:text-sm p-2 sm:p-3">نظرات</TabsTrigger>
            <TabsTrigger value="stats" className="text-xs sm:text-sm p-2 sm:p-3">آمار</TabsTrigger>
          </TabsList>

          <TabsContent value="rates">
            <Card>
              <CardHeader>
                <CardTitle>نرخهای فعلی ارز</CardTitle>
                <CardDescription>آخرین نرخهای خرید و فروش همراه با فیصدهای فعال این صراف</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="text-muted-foreground">فیصد حواله</div>
                    <div className="mt-1 font-semibold persian-numbers">{saraf.hawalaFeePercent}%</div>
                  </div>
                  <div className="rounded-lg border bg-muted/30 p-3 text-sm">
                    <div className="text-muted-foreground">فیصد تبادله</div>
                    <div className="mt-1 font-semibold persian-numbers">{saraf.exchangeFeePercent}%</div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                  {saraf.rates.map((rate) => (
                    <Card key={`${rate.fromCurrency}-${rate.toCurrency}`}>
                      <CardContent className="p-3 sm:p-4">
                        <div className="text-center">
                          <div className="font-semibold text-base sm:text-lg mb-2">
                            {rate.fromCurrency}/{rate.toCurrency}
                          </div>
                          <div className="space-y-1 sm:space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-green-600">خرید:</span>
                              <span className="font-mono persian-numbers">{rate.buyRate}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-red-600">فروش:</span>
                              <span className="font-mono persian-numbers">{rate.sellRate}</span>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground mt-2">
                            آخرین بروزرسانی: {new Date(rate.lastUpdate).toLocaleTimeString('fa-IR')}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle>خدمات ارائه شده</CardTitle>
              </CardHeader>
                <CardContent>
                  {saraf.services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                    {saraf.services.map((service) => (
                      <div key={service} className="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 border rounded-lg text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                        <span className="break-words">{service}</span>
                      </div>
                      ))}
                    </div>
                  ) : (
                  <p className="text-sm text-muted-foreground">
                    {language === 'fa'
                      ? 'هنوز فهرست خدمات اختصاصی برای این صراف منتشر نشده است.'
                      : language === 'en'
                        ? 'No custom service list has been published for this saraf yet.'
                        : 'د دې صراف لپاره لا تر اوسه د ځانګړو خدمتونو لېست نه دی خپور شوی.'}
                  </p>
                  )}
                </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reviews">
            <SarafVoting sarafId={saraf.id} />
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="text-2xl sm:text-3xl font-bold persian-numbers mb-2">
                    {saraf.stats.completedTransactions}
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground">تراکنش تکمیل شده</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="text-2xl sm:text-3xl font-bold persian-numbers mb-2">
                    {saraf.stats.averageResponseTime || 'N/A'}
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground">متوسط زمان پاسخ</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4 sm:p-6 text-center">
                  <div className="text-2xl sm:text-3xl font-bold persian-numbers mb-2">
                    {saraf.stats.customerSatisfaction}%
                  </div>
                  <div className="text-sm sm:text-base text-muted-foreground">رضایت مشتریان</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
      
      {showChat && saraf && !session?.user ? (
        <GuestSarafChatWidget
          sarafId={saraf.id}
          sarafInfo={{
            businessName: saraf.businessName,
            businessPhone: saraf.businessPhone,
            businessAddress: saraf.businessAddress,
          }}
          onClose={() => setShowChat(false)}
        />
      ) : null}
      
      {/* Hawala Request Dialog */}
      <Dialog open={showHawalaForm} onOpenChange={setShowHawalaForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ثبت درخواست حواله</DialogTitle>
            <DialogDescription className="sr-only">
              فرم ثبت درخواست حواله جدید
            </DialogDescription>
          </DialogHeader>
          {saraf && (
            <HawalaRequestForm 
              sarafId={saraf.id} 
              sarafName={saraf.businessName}
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={showExchangeForm} onOpenChange={setShowExchangeForm}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>ثبت درخواست تبادله</DialogTitle>
            <DialogDescription className="sr-only">
              فرم ثبت درخواست تبادله ارز
            </DialogDescription>
          </DialogHeader>
          {saraf && (
            <UserExchangeRequestForm
              fixedSarafId={saraf.id}
              fixedSarafName={saraf.businessName}
              fixedSarafPhone={saraf.businessPhone}
              fixedSarafBranches={saraf.branches}
            />
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
