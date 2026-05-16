'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MessageSquare, Search, Send, Trash2, Eye, User, Clock, Paperclip, Image, Download, Settings, Save, ShieldCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useLanguage } from '@/hooks/useLanguage'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { POLLING_INTERVALS } from '@/lib/polling'

interface ChatSession {
  id: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string
    email: string
    role: string
    isActive: boolean
  }
  messages: Array<{
    id: string
    message: string
    timestamp: string
    senderRole: string
    isRead: boolean
  }>
  _count: {
    messages: number
  }
}

interface ChatMessage {
  id: string
  sessionId: string
  senderId: string
  senderName: string
  senderRole: string
  message: string
  fileUrl?: string
  timestamp: string
  isRead: boolean
  sender: {
    id: string
    name: string
    email: string
    role: string
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  pages: number
}

export default function AdminChatPage() {
  const { data: session } = useSession()
  const searchParams = useSearchParams()
  const { t } = useLanguage()
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [activeTab, setActiveTab] = useState(searchParams?.get('tab') || 'sessions')
  const [showChatDialog, setShowChatDialog] = useState(false)
  const [newMessage, setNewMessage] = useState('')
  const [sendingMessage, setSendingMessage] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [messengerSettings, setMessengerSettings] = useState({
    maxUploadBytes: 300 * 1024,
    maxImageBytes: 300 * 1024,
    maxAudioBytes: 300 * 1024,
    maxDocumentBytes: 300 * 1024,
    maxRecordingSec: 18,
    audioBitsPerSec: 24000,
    maxStoriesPerUser: 8,
    storyTTLHours: 24,
    welcomeMessageFa: 'سلام {name} عزیز! چگونه میتوانیم به شما کمک کنیم؟',
    welcomeMessageEn: 'Hello {name}! How can we help you?',
    offlineAutoReply: 'ممنون از پیام شما. در اسرع وقت پاسخگو خواهیم بود.',
    maxResponseTimeMin: 30,
  })
  const [savingSettings, setSavingSettings] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchSessions()
    fetchMessengerSettings()
  }, [pagination.page, search, statusFilter])

  const fetchMessengerSettings = async () => {
    try {
      const response = await fetch('/api/admin/chat/settings')
      if (response.ok) {
        const data = await response.json()
        setMessengerSettings(data)
      }
    } catch (error) {
      console.error('Failed to fetch messenger settings:', error)
    }
  }

  const handleUpdateSettings = async () => {
    setSavingSettings(true)
    try {
      const response = await fetch('/api/admin/chat/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messengerSettings),
      })
      if (response.ok) {
        toast.success('تنظیمات پیام‌رسان با موفقیت بروزرسانی شد')
      } else {
        throw new Error('Failed to update settings')
      }
    } catch (error) {
      toast.error('خطا در بروزرسانی تنظیمات')
    } finally {
      setSavingSettings(false)
    }
  }

  // Handle URL session parameter
  useEffect(() => {
    const sessionParam = searchParams?.get('session')
    if (sessionParam && sessions.length > 0) {
      const targetSession = sessions.find(s => s.id === sessionParam)
      if (targetSession) {
        setSelectedSession(targetSession)
        setShowChatDialog(true)
      }
    }
  }, [searchParams, sessions])

  useEffect(() => {
    if (selectedSession) {
      void fetchMessages(selectedSession.id)
    }
  }, [selectedSession])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status: statusFilter
      })

      const response = await fetch(`/api/admin/chat/sessions?${params}`)
      if (!response.ok) throw new Error('Failed to fetch sessions')

      const data = await response.json()
      setSessions(data.sessions || [])
      if (data.pagination) {
        setPagination({
          page: data.pagination.currentPage || 1,
          limit: pagination.limit,
          total: data.pagination.totalCount || 0,
          pages: data.pagination.totalPages || 0
        })
      } else {
        setPagination({
          page: 1,
          limit: 10,
          total: 0,
          pages: 0
        })
      }
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
      setError('خطا در بارگذاری جلسات چت')
      setSessions([])
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        pages: 0
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async (sessionId: string) => {
    setMessagesLoading(true)
    try {
      const response = await fetch(`/api/admin/chat/messages/${sessionId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')

      const data = await response.json()
      setMessages(data)
      setError('')
    } catch (error) {
      console.error('Failed to fetch messages:', error)
      setError('خطا در بارگذاری پیامها')
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }

  useAdaptivePolling(
    async () => {
      if (selectedSession) {
        await fetchMessages(selectedSession.id)
      }
    },
    {
      enabled: !!selectedSession,
      activeIntervalMs: POLLING_INTERVALS.chatMessagesActiveMs,
      idleIntervalMs: POLLING_INTERVALS.chatMessagesIdleMs,
      hiddenIntervalMs: false,
      runImmediately: false,
    }
  )

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if ((!newMessage.trim() && !selectedFile) || !selectedSession || sendingMessage) return

    setSendingMessage(true)
    let fileUrl = null

    try {
      // Handle file upload if present
      if (selectedFile) {
        const formData = new FormData()
        formData.append('file', selectedFile)
        
        try {
          const uploadResponse = await fetch('/api/upload', {
            method: 'POST',
            body: formData
          })
          
          if (uploadResponse.ok) {
            const uploadData = await uploadResponse.json()
            fileUrl = uploadData.url
          }
        } catch (uploadError) {
          console.warn('File upload failed:', uploadError)
        }
      }

      const response = await fetch('/api/admin/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: selectedSession.id,
          message: newMessage.trim(),
          fileUrl
        })
      })

      if (!response.ok) throw new Error('Failed to send message')

      const result = await response.json()
      setMessages(prev => [...prev, result.message])
      setNewMessage('')
      setSelectedFile(null)
      toast.success('پیام ارسال شد')
      
      // Refresh sessions to update last message
      fetchSessions()
    } catch (error) {
      toast.error('خطا در ارسال پیام')
    } finally {
      setSendingMessage(false)
    }
  }

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('آیا از حذف این جلسه چت اطمینان دارید؟')) return

    try {
      const response = await fetch(`/api/admin/chat/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete session')

      toast.success('جلسه چت حذف شد')
      fetchSessions()
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null)
        setShowChatDialog(false)
      }
    } catch (error) {
      toast.error('خطا در حذف جلسه چت')
    }
  }

  const openChatDialog = (session: ChatSession) => {
    setSelectedSession(session)
    setShowChatDialog(true)
  }

  const getStatusBadge = (isActive: boolean) => (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? 'فعال' : 'غیرفعال'}
    </Badge>
  )

  const getRoleBadge = (role: string) => {
    const variants = {
      ADMIN: 'destructive',
      SARAF: 'default',
      USER: 'secondary'
    }
    const labels = {
      ADMIN: 'مدیر',
      SARAF: 'صراف',
      USER: 'کاربر'
    }
    return (
      <Badge variant={variants[role as keyof typeof variants] as any}>
        {labels[role as keyof typeof labels]}
      </Badge>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 sm:p-6">
        {/* Modern Header with Gradient */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-500 p-8 text-white shadow-xl">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <MessageSquare className="h-8 w-8" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">{t('admin.chat')}</h1>
            </div>
            <p className="text-rose-50 text-lg">{t('admin.chat.subtitle')}</p>
          </div>
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl"></div>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="sessions" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              جلسات چت
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              تنظیمات پیام‌رسان
            </TabsTrigger>
          </TabsList>

          <TabsContent value="sessions" className="space-y-6">
            {/* Filters */}
            <Card>
              <CardHeader>
                <CardTitle>فیلترها</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="جستجو بر اساس نام یا ایمیل کاربر..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">همه جلسات</SelectItem>
                      <SelectItem value="ACTIVE">فعال</SelectItem>
                      <SelectItem value="INACTIVE">غیرفعال</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Chat Sessions Table */}
            <Card>
              <CardHeader>
                <CardTitle>جلسات چت ({pagination.total})</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">در حال بارگذاری...</div>
                ) : (
                  <div className="space-y-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>کاربر</TableHead>
                          <TableHead>نقش</TableHead>
                          <TableHead>وضعیت</TableHead>
                          <TableHead>تعداد پیام</TableHead>
                          <TableHead>آخرین پیام</TableHead>
                          <TableHead>تاریخ ایجاد</TableHead>
                          <TableHead>عملیات</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sessions.map((session) => (
                          <TableRow key={session.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{session.user.name}</div>
                                <div className="text-sm text-muted-foreground">{session.user.email}</div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(session.user.role)}</TableCell>
                            <TableCell>{getStatusBadge(session.isActive)}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{session._count.messages}</Badge>
                            </TableCell>
                            <TableCell>
                              {session.messages[0] ? (
                                <div className="max-w-xs">
                                  <div className="text-sm truncate">{session.messages[0].message}</div>
                                  <div className="text-xs text-muted-foreground">
                                    {new Date(session.messages[0].timestamp).toLocaleDateString('fa-IR')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">بدون پیام</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(session.createdAt).toLocaleDateString('fa-IR')}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openChatDialog(session)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDeleteSession(session.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Pagination */}
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-muted-foreground">
                        نمایش {((pagination.page - 1) * pagination.limit) + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total} جلسه
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page <= 1}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                        >
                          قبلی
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagination.page >= pagination.pages}
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                        >
                          بعدی
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            {/* Messenger Limits */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-violet-500" />
                      مدیریت محدودیت‌ها و تنظیمات پیام‌رسان
                    </CardTitle>
                    <CardDescription>
                      در این بخش می‌توانید محدودیت‌های آپلود و سایر پارامترهای فنی سیستم پیام‌رسان را مدیریت کنید.
                    </CardDescription>
                  </div>
                  <Button onClick={handleUpdateSettings} disabled={savingSettings}>
                    {savingSettings ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    ذخیره تغییرات
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-8 md:grid-cols-2">
                  {/* Upload Limits */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Paperclip className="h-5 w-5 text-blue-500" />
                      محدودیت‌های آپلود (بایت)
                    </h3>
                    <div className="space-y-3">
                      <div className="grid gap-1.5">
                        <Label>حداکثر حجم فایل کلی</Label>
                        <Input
                          type="number"
                          value={messengerSettings.maxUploadBytes}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, maxUploadBytes: parseInt(e.target.value) })}
                        />
                        <p className="text-[10px] text-muted-foreground">مثال: 307200 برای 300 کیلوبایت</p>
                      </div>
                      <div className="grid gap-1.5">
                        <Label>حداکثر حجم تصاویر</Label>
                        <Input
                          type="number"
                          value={messengerSettings.maxImageBytes}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, maxImageBytes: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>حداکثر حجم صوت</Label>
                        <Input
                          type="number"
                          value={messengerSettings.maxAudioBytes}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, maxAudioBytes: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Other Settings */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Settings className="h-5 w-5 text-orange-500" />
                      تنظیمات فنی و استوری
                    </h3>
                    <div className="space-y-3">
                      <div className="grid gap-1.5">
                        <Label>حداکثر زمان ضبط صدا (ثانیه)</Label>
                        <Input
                          type="number"
                          value={messengerSettings.maxRecordingSec}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, maxRecordingSec: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>نرخ بیت صدا (bps)</Label>
                        <Input
                          type="number"
                          value={messengerSettings.audioBitsPerSec}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, audioBitsPerSec: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>حداکثر استوری فعال هر کاربر</Label>
                        <Input
                          type="number"
                          value={messengerSettings.maxStoriesPerUser}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, maxStoriesPerUser: parseInt(e.target.value) })}
                        />
                      </div>
                      <div className="grid gap-1.5">
                        <Label>زمان انقضای استوری (ساعت)</Label>
                        <Input
                          type="number"
                          value={messengerSettings.storyTTLHours}
                          onChange={(e) => setMessengerSettings({ ...messengerSettings, storyTTLHours: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Welcome & Auto-Reply */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-emerald-500" />
                  پیام خوش‌آمدگویی و پاسخ خودکار
                </CardTitle>
                <CardDescription>
                  پیام‌های خودکار هنگام شروع گفتگو یا خارج از ساعت کاری.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                        پیام خوش‌آمدگویی (فارسی)
                      </Label>
                      <Textarea
                        value={messengerSettings.welcomeMessageFa ?? 'سلام {name} عزیز! چگونه میتوانیم به شما کمک کنیم؟'}
                        onChange={(e) => setMessengerSettings({ ...messengerSettings, welcomeMessageFa: e.target.value })}
                        rows={3}
                        placeholder="از {name} برای نام کاربر استفاده کنید"
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-2">
                        <span className="inline-flex h-2 w-2 rounded-full bg-blue-500" />
                        پیام خوش‌آمدگویی (English)
                      </Label>
                      <Textarea
                        value={messengerSettings.welcomeMessageEn ?? 'Hello {name}! How can we help you?'}
                        onChange={(e) => setMessengerSettings({ ...messengerSettings, welcomeMessageEn: e.target.value })}
                        rows={3}
                        placeholder="Use {name} for user's name"
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="grid gap-1.5">
                      <Label className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-500" />
                        پاسخ خودکار خارج از ساعت کاری
                      </Label>
                      <Textarea
                        value={messengerSettings.offlineAutoReply ?? 'ممنون از پیام شما. در اسرع وقت پاسخگو خواهیم بود.'}
                        onChange={(e) => setMessengerSettings({ ...messengerSettings, offlineAutoReply: e.target.value })}
                        rows={3}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>حداکثر زمان انتظار برای پاسخ (دقیقه)</Label>
                      <Input
                        type="number"
                        value={messengerSettings.maxResponseTimeMin ?? 30}
                        onChange={(e) => setMessengerSettings({ ...messengerSettings, maxResponseTimeMin: parseInt(e.target.value) })}
                      />
                      <p className="text-[10px] text-muted-foreground">بعد از این زمان کاربر اطلاع‌رسانی می‌شود</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bulk Operations */}
            <Card>
              <CardHeader className="border-b bg-muted/30">
                <CardTitle className="flex items-center gap-2">
                  <Trash2 className="h-5 w-5 text-red-500" />
                  عملیات دسته‌جمعی و پاکسازی
                </CardTitle>
                <CardDescription>
                  ابزارهای مدیریتی برای پاکسازی و صادرات داده‌ها.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="border-border/70 bg-background shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Download className="h-5 w-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-semibold">خروجی CSV</p>
                          <p className="text-xs text-muted-foreground">دانلود تمام گفتگوها</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={async () => {
                          try {
                            const r = await fetch('/api/admin/chat/sessions?status=ALL&limit=1000')
                            const data = await r.json()
                            const rows = (data.sessions || []).map((s: any) => `${s.user.name},${s.user.email},${s._count?.messages ?? 0},${s.isActive},${s.updatedAt}`)
                            const csv = 'Name,Email,Messages,Active,LastUpdated\n' + rows.join('\n')
                            const blob = new Blob([csv], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url; a.download = 'chat-sessions.csv'; a.click()
                            URL.revokeObjectURL(url)
                            toast.success('فایل CSV دانلود شد')
                          } catch { toast.error('خطا در خروجی') }
                        }}
                      >
                        دانلود خروجی
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 bg-background shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Trash2 className="h-5 w-5 text-orange-500" />
                        <div>
                          <p className="text-sm font-semibold">حذف غیرفعال‌ها</p>
                          <p className="text-xs text-muted-foreground">حذف جلسات بسته شده</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:hover:bg-orange-950"
                        onClick={async () => {
                          if (!confirm('آیا از حذف تمام جلسات غیرفعال مطمئنید؟')) return
                          try {
                            const r = await fetch('/api/admin/chat/sessions?status=ALL&limit=1000')
                            const data = await r.json()
                            const inactive = (data.sessions || []).filter((s: any) => !s.isActive)
                            let deleted = 0
                            for (const s of inactive) {
                              const dr = await fetch(`/api/admin/chat/sessions/${s.id}`, { method: 'DELETE' })
                              if (dr.ok) deleted++
                            }
                            toast.success(`${deleted} جلسه غیرفعال حذف شد`)
                          } catch { toast.error('خطا در حذف') }
                        }}
                      >
                        پاکسازی غیرفعالها
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-border/70 bg-background shadow-none">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Eye className="h-5 w-5 text-green-500" />
                        <div>
                          <p className="text-sm font-semibold">خواندن همه</p>
                          <p className="text-xs text-muted-foreground">علامت‌گذاری تمام پیامها</p>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        className="w-full text-green-600 border-green-200 hover:bg-green-50 dark:border-green-800 dark:hover:bg-green-950"
                        onClick={async () => {
                          try {
                            const r = await fetch('/api/admin/chat/sessions?status=ALL&limit=1000')
                            const data = await r.json()
                            for (const s of (data.sessions || [])) {
                              await fetch(`/api/admin/chat/messages/${s.id}?markRead=1`)
                            }
                            toast.success('تمام پیامها خوانده شد')
                          } catch { toast.error('خطا') }
                        }}
                      >
                        خواندن همه پیامها
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Chat Dialog */}
      <Dialog open={showChatDialog} onOpenChange={setShowChatDialog}>
        <DialogContent className="max-w-4xl h-[600px] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              چت با {selectedSession?.user.name}
            </DialogTitle>
            <DialogDescription>
              {selectedSession?.user.email}
            </DialogDescription>
            <div className="mt-2">
              {selectedSession && getRoleBadge(selectedSession.user.role || 'USER')}
            </div>
          </DialogHeader>

          <div className="flex-1 flex flex-col min-h-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 border dark:border-gray-700 rounded bg-white dark:bg-gray-900">
              {messagesLoading ? (
                <div className="text-center py-8">در حال بارگذاری پیامها...</div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.senderRole === 'ADMIN' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] p-3 rounded-lg text-sm ${
                        message.senderRole === 'ADMIN'
                          ? 'bg-blue-600 dark:bg-blue-700 text-white'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-xs">
                          {message.senderName}
                        </span>
                        {getRoleBadge(message.senderRole)}
                      </div>
                      {message.message && <p className="mb-2">{message.message}</p>}
                      {message.fileUrl && (
                        <div className="mt-2 p-2 bg-white/10 rounded border">
                          {message.fileUrl.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                            <div className="relative">
                              <img 
                                src={message.fileUrl} 
                                alt="تصویر"
                                className="max-w-full h-auto rounded cursor-pointer"
                                onClick={() => window.open(message.fileUrl, '_blank')}
                              />
                              <Button 
                                size="sm" 
                                variant="secondary"
                                className="absolute top-2 right-2"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = message.fileUrl!
                                  link.download = 'image'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Paperclip className="h-4 w-4" />
                                <span className="text-xs">فایل</span>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => {
                                  const link = document.createElement('a')
                                  link.href = message.fileUrl!
                                  link.download = 'file'
                                  document.body.appendChild(link)
                                  link.click()
                                  document.body.removeChild(link)
                                }}
                              >
                                دانلود
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                      <p className="text-xs opacity-70 mt-1">
                        {new Date(message.timestamp).toLocaleString('fa-IR')}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="mt-4 space-y-3">
              {selectedFile && (
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <span className="text-sm">{selectedFile.name}</span>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
              <div>
                <Label htmlFor="message">پیام جدید</Label>
                <Textarea
                  id="message"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  rows={3}
                  disabled={sendingMessage}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={sendingMessage}
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    ضمیمه فایل
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,.pdf,.doc,.docx,.txt"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </div>
                <Button type="submit" disabled={sendingMessage || (!newMessage.trim() && !selectedFile)}>
                  <Send className="mr-2 h-4 w-4" />
                  {sendingMessage ? 'در حال ارسال...' : 'ارسال پیام'}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  )
}
