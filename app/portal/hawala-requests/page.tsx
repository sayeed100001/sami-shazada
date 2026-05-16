'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Ban,
  CheckCircle,
  Clock,
  Inbox,
  MapPin,
  MessageCircle,
  Phone,
  Send,
  User,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/locale'

interface HawalaRequest {
  id: string
  referenceCode: string
  senderId: string | null
  status: string
  fromAmount: number
  toAmount: number
  fromCurrency: string
  toCurrency: string
  rate: number
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  receiverCity: string
  receiverCountry: string
  notes: string
  createdAt: string
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export default function SarafHawalaRequestsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const [requests, setRequests] = useState<HawalaRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRequest, setSelectedRequest] = useState<HawalaRequest | null>(null)
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [showRejectDialog, setShowRejectDialog] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [blacklistingRequestId, setBlacklistingRequestId] = useState<string | null>(null)
  const [startingChatRequestId, setStartingChatRequestId] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [pendingPayouts, setPendingPayouts] = useState(0)
  const limit = 20

  useEffect(() => {
    if (session?.user?.role !== 'SARAF') {
      router.push('/')
      return
    }

    void Promise.all([fetchRequests(), fetchPendingPayouts()])
  }, [page, router, session])

  const fetchRequests = async () => {
    try {
      const params = new URLSearchParams({ page: page.toString(), limit: limit.toString() })
      const response = await fetch(`/api/portal/hawala/requests?${params}`)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests || [])
        setTotalPages(data.pagination?.pages || 1)
      }
    } catch (error) {
      console.error('Failed to fetch requests:', error)
      toast.error(
        pick(
          language,
          'خطا در دریافت درخواست‌ها',
          'Failed to load requests',
          'د غوښتنو په اخيستلو کې ستونزه'
        )
      )
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingPayouts = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '1',
        status: 'PENDING',
        type: 'received',
      })
      const response = await fetch(`/api/portal/hawala?${params}`)
      if (!response.ok) return
      const data = await response.json()
      const total = data?.pagination?.total
      setPendingPayouts(typeof total === 'number' ? total : 0)
    } catch (error) {
      console.error('Failed to fetch payout count:', error)
    }
  }

  const handleApprove = async () => {
    if (!selectedRequest) return
    setProcessing(true)
    try {
      const response = await fetch('/api/portal/hawala/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRequest.id }),
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(
          error.error ||
            pick(language, 'خطا در تایید درخواست', 'Approval failed', 'د تاييد بهير کې ستونزه')
        )
      }
      toast.success(
        pick(
          language,
          'درخواست با موفقیت تایید شد و برای پرداخت به شعبه مقصد ارسال شد',
          'Request approved and routed to the destination branch for payout',
          'غوښتنه تاييد او د ورکړې لپاره د مقصد څانګې ته ولېږدول شوه'
        )
      )
      setShowApproveDialog(false)
      setSelectedRequest(null)
      await Promise.all([fetchRequests(), fetchPendingPayouts()])
    } catch (error) {
      console.error('Approve error:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : pick(language, 'خطا در تایید درخواست', 'Approval failed', 'د تاييد بهير کې ستونزه')
      )
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async () => {
    if (!selectedRequest) return
    setProcessing(true)
    try {
      const response = await fetch('/api/portal/hawala/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId: selectedRequest.id }),
      })
      if (!response.ok) {
        throw new Error(
          pick(language, 'خطا در رد درخواست', 'Rejection failed', 'د رد بهير کې ستونزه')
        )
      }
      toast.success(pick(language, 'درخواست رد شد', 'Request rejected', 'غوښتنه رد شوه'))
      setShowRejectDialog(false)
      setSelectedRequest(null)
      await fetchRequests()
    } catch (error) {
      console.error('Reject error:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : pick(language, 'خطا در رد درخواست', 'Rejection failed', 'د رد بهير کې ستونزه')
      )
    } finally {
      setProcessing(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statuses = {
      PENDING: {
        label: pick(language, 'در انتظار', 'Pending', 'په انتظار کې'),
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      },
      COMPLETED: {
        label: pick(language, 'پردازش‌شده قدیمی', 'Legacy processed', 'پخوانی پروسس شوی'),
        color: 'bg-sky-100 text-sky-800',
        icon: CheckCircle,
      },
      CANCELLED: {
        label: pick(language, 'رد شده', 'Rejected', 'رد شوی'),
        color: 'bg-red-100 text-red-800',
        icon: XCircle,
      },
    }
    const item = statuses[status as keyof typeof statuses] || statuses.PENDING
    const Icon = item.icon
    return (
      <Badge className={item.color}>
        <Icon className="mr-1 h-3 w-3" />
        {item.label}
      </Badge>
    )
  }

  const pendingRequests = requests.filter((request) => request.status === 'PENDING')
  const legacyProcessedRequests = requests.filter((request) => request.status === 'COMPLETED')
  const rejectedRequests = requests.filter((request) => request.status === 'CANCELLED')

  const handleBlacklistSender = async (request: HawalaRequest) => {
    if (!request.senderPhone) {
      toast.error(
        pick(
          language,
          'شماره تماس فرستنده موجود نیست',
          'Sender phone is unavailable',
          'د لېږونکي د تماس شمېره نشته'
        )
      )
      return
    }

    const confirmed = window.confirm(
      pick(
        language,
        `شماره ${request.senderPhone} برای این صراف در بلک لیست ثبت شود؟`,
        `Blacklist ${request.senderPhone} for this saraf?`,
        `د دې صراف لپاره ${request.senderPhone} په بلک لېست کې ثبت شي؟`
      )
    )

    if (!confirmed) return

    setBlacklistingRequestId(request.id)
    try {
      const response = await fetch('/api/portal/blacklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'PHONE',
          value: request.senderPhone,
          reason: `Sender blacklisted from hawala request ${request.referenceCode}`,
        }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok && response.status !== 409) {
        throw new Error(payload?.error || 'Failed to blacklist sender')
      }

      if (response.status === 409) {
        toast.info(
          pick(
            language,
            'این شماره قبلاً در بلک لیست ثبت شده است',
            'This phone is already blacklisted',
            'دا شمېره مخکې له مخکې په بلک لېست کې ده'
          )
        )
        return
      }

      toast.success(
        pick(
          language,
          'کاربر در بلک لیست ثبت شد',
          'User blacklisted successfully',
          'کاروونکی په بلک لېست کې ثبت شو'
        )
      )
    } catch (error) {
      console.error('Blacklist sender error:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : pick(
              language,
              'ثبت بلک لیست با خطا مواجه شد',
              'Failed to blacklist sender',
              'د بلک لېست ثبتولو کې ستونزه'
            )
      )
    } finally {
      setBlacklistingRequestId(null)
    }
  }

  const handleStartChat = async (request: HawalaRequest) => {
    if (!request.senderId) {
      toast.error(
        pick(
          language,
          'شناسه کاربر برای شروع گفتگو در دسترس نیست',
          'User information is unavailable for chat',
          'د چټ لپاره د کاروونکي معلومات نشته'
        )
      )
      return
    }

    setStartingChatRequestId(request.id)
    try {
      const response = await fetch('/api/saraf-chat/direct-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: request.senderId }),
      })

      const payload = await response.json().catch(() => null)
      if (!response.ok || !payload?.sessionId) {
        throw new Error(payload?.error || 'Failed to start chat')
      }

      router.push(`/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(payload.sessionId)}`)
    } catch (error) {
      console.error('Start chat error:', error)
      toast.error(
        error instanceof Error
          ? error.message
          : pick(language, 'شروع گفتگو با خطا مواجه شد', 'Failed to start chat', 'د چټ په پيل کې ستونزه')
      )
    } finally {
      setStartingChatRequestId(null)
    }
  }

  const RequestCard = ({ request }: { request: HawalaRequest }) => (
    <Card className="glass-card hover-lift border-0">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="font-mono text-lg">{request.referenceCode}</CardTitle>
            <CardDescription className="text-xs">
              {formatLocalizedDate(request.createdAt, language, {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </CardDescription>
          </div>
          {getStatusBadge(request.status)}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-900/20">
            <p className="mb-1 text-xs text-muted-foreground">
              {pick(language, 'مبلغ ارسالی', 'Sent amount', 'لېږل شوې اندازه')}
            </p>
            <p className="text-lg font-bold">
              {formatLocalizedNumber(request.fromAmount, language)} {request.fromCurrency}
            </p>
          </div>
          <div className="rounded-lg bg-green-50 p-3 dark:bg-green-900/20">
            <p className="mb-1 text-xs text-muted-foreground">
              {pick(language, 'مبلغ دریافتی', 'Receiving amount', 'ترلاسه کېدونکې اندازه')}
            </p>
            <p className="text-lg font-bold">
              {formatLocalizedNumber(request.toAmount, language)} {request.toCurrency}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{pick(language, 'فرستنده', 'Sender', 'لېږونکی')}:</span>
            <span>{request.senderName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{request.senderPhone}</span>
          </div>
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">{pick(language, 'گیرنده', 'Receiver', 'ترلاسه کوونکی')}:</span>
            <span>{request.receiverName}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span>
              {request.receiverCity}, {request.receiverCountry}
            </span>
          </div>
        </div>

        {request.notes ? (
          <div className="rounded-lg bg-muted p-3 text-sm">
            <p className="text-muted-foreground">{request.notes}</p>
          </div>
        ) : null}

        {request.status === 'PENDING' ? (
          <div className="space-y-2 pt-2">
            <div className="flex gap-2">
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => void handleStartChat(request)}
                disabled={startingChatRequestId === request.id}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                {startingChatRequestId === request.id
                  ? pick(language, 'در حال باز کردن گفتگو...', 'Opening chat...', 'چټ پرانيستل کېږي...')
                  : pick(language, 'گفتگو با کاربر', 'Chat with user', 'له کاروونکي سره چټ')}
              </Button>
              <Button
                className="flex-1"
                variant="outline"
                onClick={() => void handleBlacklistSender(request)}
                disabled={blacklistingRequestId === request.id}
              >
                <Ban className="mr-2 h-4 w-4" />
                {blacklistingRequestId === request.id
                  ? pick(language, 'در حال ثبت...', 'Saving...', 'ثبتېږي...')
                  : pick(language, 'بلک لیست کاربر', 'Blacklist user', 'کاروونکی بلک لېست کړئ')}
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => {
                  setSelectedRequest(request)
                  setShowApproveDialog(true)
                }}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {pick(language, 'تایید و ارسال', 'Approve and route', 'تاييد او لېږل')}
              </Button>
              <Button
                className="flex-1 border-red-600 text-red-600 hover:bg-red-50"
                variant="outline"
                onClick={() => {
                  setSelectedRequest(request)
                  setShowRejectDialog(true)
                }}
              >
                <XCircle className="mr-2 h-4 w-4" />
                {pick(language, 'رد درخواست', 'Reject request', 'غوښتنه ردول')}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 p-6 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <div className="mb-8 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 p-8 text-white shadow-xl">
        <div className="mb-4 flex items-center gap-4">
          <Link href="/portal">
            <Button className="text-white hover:bg-white/20" size="sm" variant="ghost">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {pick(language, 'بازگشت', 'Back', 'بېرته')}
            </Button>
          </Link>
        </div>
        <h1 className="mb-2 text-4xl font-bold">
          {pick(language, 'درخواست‌های حواله', 'Hawala requests', 'د حوالې غوښتنې')}
        </h1>
        <p className="text-lg text-amber-50">
          {pick(
            language,
            'مدیریت درخواست‌های حواله از کاربران',
            'Manage incoming hawala requests from users',
            'د کاروونکو راتلونکې حوالې غوښتنې اداره کړئ'
          )}
        </p>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="glass-card hover-lift border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-yellow-500 to-amber-500 shadow-lg">
                  <Clock className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {pick(language, 'در انتظار', 'Pending', 'په انتظار کې')}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    {formatLocalizedNumber(pendingRequests.length, language)}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="glass-card hover-lift border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 shadow-lg">
                  <Send className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {pick(language, 'در انتظار پرداخت', 'Pending payouts', 'د ورکړې په تمه')}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    {formatLocalizedNumber(pendingPayouts, language)}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="glass-card hover-lift border-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-red-500 to-rose-500 shadow-lg">
                  <XCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {pick(language, 'رد شده', 'Rejected', 'رد شوی')}
                  </CardTitle>
                  <div className="text-3xl font-bold">
                    {formatLocalizedNumber(rejectedRequests.length, language)}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        <Card className="glass-card border-0">
          <CardContent className="flex flex-col gap-4 py-5 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-white">
                {pick(
                  language,
                  'درخواست تاییدشده دیگر در این صف نمی‌ماند',
                  'Approved requests leave this queue',
                  'تاييد شوې غوښتنې نور په دې قطار کې نه پاتې کېږي'
                )}
              </div>
              <div className="mt-1 text-sm text-muted-foreground">
                {pick(
                  language,
                  'بعد از تایید، درخواست به حواله واقعی تبدیل می‌شود و در بخش حواله‌های در انتظار پرداخت دیده می‌شود.',
                  'After approval, the request becomes a real hawala and appears in the payout hawala flow.',
                  'له تاييد وروسته غوښتنه اصلي حواله ګرځي او د ورکړې په انتظار حواله کې ښکاري.'
                )}
              </div>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/portal/hawala">
                {pick(language, 'رفتن به حواله‌ها', 'Open hawala payouts', 'حوالو ته لاړ شئ')}
                <ArrowRight className="mr-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Tabs className="space-y-4" defaultValue="pending">
          <TabsList>
            <TabsTrigger value="pending">
              {pick(language, 'در انتظار', 'Pending', 'په انتظار کې')} ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="rejected">
              {pick(language, 'رد شده', 'Rejected', 'رد شوی')} ({rejectedRequests.length})
            </TabsTrigger>
            {legacyProcessedRequests.length > 0 ? (
              <TabsTrigger value="legacy">
                {pick(language, 'پردازش قدیمی', 'Legacy', 'پخوانی')}
              </TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent className="space-y-4" value="pending">
            {pendingRequests.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="py-12 text-center">
                  <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
                  <p className="text-muted-foreground">
                    {pick(language, 'درخواست جدیدی وجود ندارد', 'No new requests found', 'نوې غوښتنه نشته')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {pendingRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent className="space-y-4" value="rejected">
            {rejectedRequests.length === 0 ? (
              <Card className="glass-card border-0">
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {pick(
                      language,
                      'درخواست رد‌شده‌ای وجود ندارد',
                      'No rejected requests found',
                      'رد شوې غوښتنه نشته'
                    )}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {rejectedRequests.map((request) => (
                  <RequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent className="space-y-4" value="legacy">
            <Card className="glass-card border-0">
              <CardContent className="py-5 text-sm text-muted-foreground">
                {pick(
                  language,
                  'این‌ها رکوردهای قدیمی هستند. در جریان فعلی، درخواست تاییدشده از این صف خارج و به حواله واقعی تبدیل می‌شود.',
                  'These are legacy records. In the current flow, an approved request leaves this queue and becomes a real hawala.',
                  'دا زاړه ریکارډونه دي. په اوسني جریان کې تاييد شوې غوښتنه له دې قطاره وځي او اصلي حواله ګرځي.'
                )}
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {legacyProcessedRequests.map((request) => (
                <RequestCard key={request.id} request={request} />
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {totalPages > 1 ? (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              disabled={page === 1}
              variant="outline"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              {pick(language, 'قبلی', 'Previous', 'مخکینی')}
            </Button>
            <span className="flex items-center px-4 text-sm">
              {pick(language, 'صفحه', 'Page', 'پاڼه')} {formatLocalizedNumber(page, language)}{' '}
              {pick(language, 'از', 'of', 'له')} {formatLocalizedNumber(totalPages, language)}
            </span>
            <Button
              disabled={page === totalPages}
              variant="outline"
              onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
            >
              {pick(language, 'بعدی', 'Next', 'راتلونکی')}
            </Button>
          </div>
        ) : null}
      </div>

      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pick(language, 'تایید و ارسال حواله', 'Approve and route hawala', 'حواله تاييد او لېږل')}
            </DialogTitle>
            <DialogDescription>
              {pick(
                language,
                'آیا مطمئن هستید که کاربر مراجعه کرده و پول را پرداخت کرده است؟',
                'Confirm that the sender has visited the office and completed payment.',
                'ډاډه ياست چې لېږونکي دفتر ته راغلی او پيسې يې ورکړې دي؟'
              )}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest ? (
            <div className="space-y-2 text-sm">
              <p>
                <strong>{pick(language, 'کد پیگیری', 'Tracking code', 'د تعقيب کوډ')}:</strong>{' '}
                {selectedRequest.referenceCode}
              </p>
              <p>
                <strong>{pick(language, 'فرستنده', 'Sender', 'لېږونکی')}:</strong>{' '}
                {selectedRequest.senderName}
              </p>
              <p>
                <strong>{pick(language, 'مبلغ', 'Amount', 'مقدار')}:</strong>{' '}
                {formatLocalizedNumber(selectedRequest.fromAmount, language)}{' '}
                {selectedRequest.fromCurrency}
              </p>
            </div>
          ) : null}
          <DialogFooter>
            <Button disabled={processing} variant="outline" onClick={() => setShowApproveDialog(false)}>
              {pick(language, 'انصراف', 'Cancel', 'لغوه')}
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" disabled={processing} onClick={handleApprove}>
              {processing
                ? pick(language, 'در حال پردازش...', 'Processing...', 'د پروسس په حال کې...')
                : pick(language, 'تایید و ارسال', 'Approve and route', 'تاييد او لېږل')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {pick(language, 'رد درخواست', 'Reject request', 'غوښتنه ردول')}
            </DialogTitle>
            <DialogDescription>
              {pick(
                language,
                'آیا مطمئن هستید که می‌خواهید این درخواست را رد کنید؟',
                'Are you sure you want to reject this request?',
                'ډاډه ياست چې دا غوښتنه رد کړئ؟'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={processing} variant="outline" onClick={() => setShowRejectDialog(false)}>
              {pick(language, 'انصراف', 'Cancel', 'لغوه')}
            </Button>
            <Button disabled={processing} variant="destructive" onClick={handleReject}>
              {processing
                ? pick(language, 'در حال پردازش...', 'Processing...', 'د پروسس په حال کې...')
                : pick(language, 'رد درخواست', 'Reject request', 'غوښتنه ردول')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
