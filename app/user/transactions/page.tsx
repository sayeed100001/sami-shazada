'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Eye, Filter, MessageCircle, Search, Sparkles } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnhancedSarafChatWidget } from '@/components/chat/EnhancedSarafChatWidget'
import { TransactionShareDialog } from '@/components/social/TransactionShareDialog'
import { useLanguage } from '@/hooks/useLanguage'

interface Transaction {
  id: string
  referenceCode: string
  type: string
  status: string
  fromCurrency: string
  toCurrency: string
  fromAmount: number
  toAmount: number
  rate: number
  fee: number
  senderName: string
  receiverName: string
  receiverCity: string
  createdAt: string
  completedAt?: string
  saraf?: {
    id: string
    businessName: string
    businessPhone?: string
    businessAddress?: string
    rating: number
    isActive: boolean
    isPremium: boolean
    user: { name: string }
  }
}

interface TransactionResponse {
  transactions: Transaction[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

type Language = 'fa' | 'en' | 'ps'

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export default function UserTransactionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { language } = useLanguage()
  const activeLanguage = language as Language
  const [data, setData] = useState<TransactionResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [typeFilter, setTypeFilter] = useState('ALL')
  const [searchTerm, setSearchTerm] = useState('')
  const [chatSaraf, setChatSaraf] = useState<Transaction['saraf'] | null>(null)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      router.push('/auth/signin')
    }
  }, [router, session, status])

  const fetchTransactions = async () => {
    if (!session?.user?.id) return

    setIsLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
      })

      if (statusFilter !== 'ALL') params.append('status', statusFilter)
      if (typeFilter !== 'ALL') params.append('type', typeFilter)

      const response = await fetch(`/api/user/transactions?${params}`)
      if (response.ok) {
        const result = await response.json()
        setData(result)
      }
    } catch (error) {
      console.error('Failed to fetch transactions:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [session, page, statusFilter, typeFilter])

  const filteredTransactions = useMemo(
    () =>
      data?.transactions.filter((transaction) => {
        const term = searchTerm.toLowerCase()
        return (
          transaction.referenceCode.toLowerCase().includes(term) ||
          transaction.senderName.toLowerCase().includes(term) ||
          transaction.receiverName.toLowerCase().includes(term)
        )
      }) || [],
    [data?.transactions, searchTerm]
  )

  if (status === 'loading' || !session) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const getStatusBadge = (statusValue: string) => {
    switch (statusValue) {
      case 'COMPLETED':
        return <Badge className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">{pick(activeLanguage, 'تکمیل شده', 'Completed', 'بشپړ شوی')}</Badge>
      case 'PENDING':
        return <Badge className="rounded-full bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">{pick(activeLanguage, 'در انتظار', 'Pending', 'په انتظار کې')}</Badge>
      case 'CANCELLED':
        return <Badge className="rounded-full bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-200">{pick(activeLanguage, 'لغو شده', 'Cancelled', 'لغوه شوی')}</Badge>
      case 'WITHDRAWN':
        return <Badge className="rounded-full bg-slate-100 text-slate-800 dark:bg-white/10 dark:text-slate-200">{pick(activeLanguage, 'برداشت شده', 'Withdrawn', 'ايستل شوی')}</Badge>
      default:
        return <Badge variant="secondary" className="rounded-full">{statusValue}</Badge>
    }
  }

  const getTypeBadge = (typeValue: string) => {
    switch (typeValue) {
      case 'HAWALA':
        return <Badge variant="outline" className="rounded-full">{pick(activeLanguage, 'حواله', 'Hawala', 'حواله')}</Badge>
      case 'HAWALA_REQUEST':
        return <Badge variant="outline" className="rounded-full">{pick(activeLanguage, 'درخواست حواله', 'Hawala request', 'د حوالې غوښتنه')}</Badge>
      case 'EXCHANGE':
        return <Badge variant="outline" className="rounded-full">{pick(activeLanguage, 'تبدیل ارز', 'Exchange', 'د اسعارو تبادله')}</Badge>
      case 'CRYPTO':
        return <Badge variant="outline" className="rounded-full">{pick(activeLanguage, 'ارز دیجیتال', 'Crypto', 'ډيجیټل اسعار')}</Badge>
      default:
        return <Badge variant="outline" className="rounded-full">{typeValue}</Badge>
    }
  }

  const summaryCards = [
    {
      label: pick(activeLanguage, 'کل آیتم‌ها', 'Total items', 'ټول توکي'),
      value: data?.pagination.total || 0,
    },
    {
      label: pick(activeLanguage, 'نمایش فعلی', 'Visible now', 'اوس ښکاره'),
      value: filteredTransactions.length,
    },
    {
      label: pick(activeLanguage, 'صفحه فعلی', 'Current page', 'اوسنۍ پاڼه'),
      value: page,
    },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <section className="relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(135deg,#111827_0%,#1d4ed8_42%,#0f766e_100%)] px-6 py-8 text-white shadow-[0_45px_120px_-55px_rgba(29,78,216,0.75)] md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(45,212,191,0.2),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />
          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                {pick(activeLanguage, 'تاریخچه هوشمند', 'Transaction timeline', 'هوښيار تاريخچه')}
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  {pick(activeLanguage, 'تاریخچه تراکنش‌ها', 'Transaction history', 'د راکړې ورکړې تاريخچه')}
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  {pick(
                    activeLanguage,
                    'تمامی درخواست‌ها، وضعیت‌ها، کدهای پیگیری و راه‌های ارتباطی با صراف در یک نمای تمیز و حرفه‌ای جمع شده‌اند.',
                    'Every request, status, tracking code, and saraf connection path is organized into one clean operational view.',
                    'ټولې غوښتنې، حالتونه، د تعقيب کوډونه او له صراف سره د اړيکې لارې په يو روښانه او مسلکي نما کې راټولې شوې دي.'
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Button asChild className="h-11 rounded-full bg-white px-6 text-sm font-bold text-slate-900 hover:bg-slate-100">
                  <Link href="/user">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {pick(activeLanguage, 'بازگشت به داشبورد', 'Back to dashboard', 'ډشبورډ ته ستنېدل')}
                  </Link>
                </Button>
                <Button variant="outline" className="h-11 rounded-full border-white/20 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/15">
                  <Download className="mr-2 h-4 w-4" />
                  {pick(activeLanguage, 'دانلود گزارش', 'Download report', 'راپور ښکته کړئ')}
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-3">
              {summaryCards.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                  <div className="text-xs text-slate-300">{item.label}</div>
                  <div className="mt-2 text-2xl font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr_0.7fr]">
              <div className="xl:col-span-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder={pick(activeLanguage, 'جستجو براساس کد پیگیری، نام فرستنده یا گیرنده...', 'Search by code, sender, or receiver...', 'د تعقيب کوډ، لېږونکي يا ترلاسه کوونکي له مخې ولټوئ...')}
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    className="h-12 rounded-2xl border-slate-200/80 bg-slate-50/80 pl-10 dark:border-white/10 dark:bg-white/5"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  <SelectValue placeholder={pick(activeLanguage, 'وضعیت', 'Status', 'حالت')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{pick(activeLanguage, 'همه وضعیت‌ها', 'All statuses', 'ټول حالتونه')}</SelectItem>
                  <SelectItem value="PENDING">{pick(activeLanguage, 'در انتظار', 'Pending', 'په انتظار کې')}</SelectItem>
                  <SelectItem value="COMPLETED">{pick(activeLanguage, 'تکمیل شده', 'Completed', 'بشپړ شوی')}</SelectItem>
                  <SelectItem value="CANCELLED">{pick(activeLanguage, 'لغو شده', 'Cancelled', 'لغوه شوی')}</SelectItem>
                  <SelectItem value="WITHDRAWN">{pick(activeLanguage, 'برداشت شده', 'Withdrawn', 'ايستل شوی')}</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-12 rounded-2xl border-slate-200/80 bg-slate-50/80 dark:border-white/10 dark:bg-white/5">
                  <SelectValue placeholder={pick(activeLanguage, 'نوع تراکنش', 'Transaction type', 'د راکړې ورکړې ډول')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">{pick(activeLanguage, 'همه انواع', 'All types', 'ټول ډولونه')}</SelectItem>
                  <SelectItem value="HAWALA">{pick(activeLanguage, 'حواله', 'Hawala', 'حواله')}</SelectItem>
                  <SelectItem value="HAWALA_REQUEST">{pick(activeLanguage, 'درخواست حواله', 'Hawala request', 'د حوالې غوښتنه')}</SelectItem>
                  <SelectItem value="EXCHANGE">{pick(activeLanguage, 'تبدیل ارز', 'Exchange', 'د اسعارو تبادله')}</SelectItem>
                  <SelectItem value="CRYPTO">{pick(activeLanguage, 'ارز دیجیتال', 'Crypto', 'ډيجیټل اسعار')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {isLoading ? (
              <div className="rounded-[28px] border border-dashed border-slate-300/80 bg-slate-50/80 px-6 py-16 text-center text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {pick(activeLanguage, 'در حال بارگذاری...', 'Loading...', 'بارېږي...')}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="rounded-[30px] border border-dashed border-slate-300/80 bg-slate-50/80 px-6 py-16 text-center dark:border-white/10 dark:bg-white/5">
                <Filter className="mx-auto mb-4 h-12 w-12 text-slate-400" />
                <div className="text-xl font-black text-slate-900 dark:text-white">
                  {pick(activeLanguage, 'تراکنشی یافت نشد', 'No transactions found', 'هيڅ معامله ونه موندل شوه')}
                </div>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-7 text-slate-500 dark:text-slate-300">
                  {pick(activeLanguage, 'فیلترها را تغییر دهید یا اولین درخواست خود را ثبت کنید تا timeline شما شکل بگیرد.', 'Adjust the filters or create your first request to start building your timeline.', 'فلټرونه بدل کړئ يا خپله لومړۍ غوښتنه ثبت کړئ څو ستاسې timeline پيل شي.')}
                </p>
                <Button variant="outline" className="mt-5 rounded-full px-6" asChild>
                  <Link href="/hawala">{pick(activeLanguage, 'ثبت اولین تراکنش', 'Create first transaction', 'لومړۍ معامله ثبت کړئ')}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="relative overflow-hidden rounded-[30px] border border-slate-200/70 bg-slate-50/80 p-5 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.5)] transition-all duration-300 hover:-translate-y-1 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.06),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.06),transparent_34%)]" />
                    <div className="relative space-y-4">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            {getTypeBadge(transaction.type)}
                            {getStatusBadge(transaction.status)}
                            <Badge variant="outline" className="rounded-full">
                              {transaction.referenceCode}
                            </Badge>
                          </div>
                          <div>
                            <div className="text-xl font-black text-slate-900 dark:text-white">
                              {transaction.fromAmount.toLocaleString()} {transaction.fromCurrency} → {transaction.toAmount.toLocaleString()} {transaction.toCurrency}
                            </div>
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                              {pick(activeLanguage, 'نرخ', 'Rate', 'نرخ')}: {transaction.rate.toLocaleString()} · {pick(activeLanguage, 'کارمزد', 'Fee', 'فیس')}:{' '}
                              {transaction.fee.toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full border border-slate-200/70 bg-white/70 dark:border-white/10 dark:bg-white/5">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-3">
                        <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {pick(activeLanguage, 'فرستنده و گیرنده', 'Parties', 'لېږونکی او ترلاسه کوونکی')}
                          </div>
                          <div className="mt-3 font-semibold text-slate-900 dark:text-white">{transaction.senderName}</div>
                          <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            {pick(activeLanguage, 'به', 'To', 'تر')}: {transaction.receiverName} · {transaction.receiverCity}
                          </div>
                        </div>
                        <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {pick(activeLanguage, 'زمان', 'Timeline', 'وخت')}
                          </div>
                          <div className="mt-3 font-semibold text-slate-900 dark:text-white">
                            {new Date(transaction.createdAt).toLocaleDateString('fa-IR')}
                          </div>
                          {transaction.completedAt ? (
                            <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                              {pick(activeLanguage, 'تکمیل', 'Completed', 'بشپړ')}: {new Date(transaction.completedAt).toLocaleDateString('fa-IR')}
                            </div>
                          ) : null}
                        </div>
                        <div className="rounded-[22px] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                            {pick(activeLanguage, 'مسیر بعدی', 'Next move', 'راتلونکی ګام')}
                          </div>
                          <div className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {transaction.status === 'PENDING'
                              ? pick(activeLanguage, 'درخواست هنوز باز است و می‌توانید با صراف در تماس باشید.', 'This request is still open and you can coordinate with the saraf.', 'غوښتنه لا هم خلاصه ده او تاسې له صراف سره همغږي کولی شئ.')
                              : pick(activeLanguage, 'این مورد در تاریخچه شما ثبت شده و برای ارجاع‌های بعدی آماده است.', 'This item is recorded and ready for future reference.', 'دا مورد ستاسو په تاريخچه کې ثبت دی او د راتلونکو مراجعو لپاره چمتو دی.')}
                          </div>
                        </div>
                      </div>

                      {transaction.saraf ? (
                        <div className="rounded-[24px] border border-slate-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-white/5">
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                                {pick(activeLanguage, 'صراف مسئول', 'Assigned saraf', 'مسؤل صراف')}
                              </div>
                              <div className="mt-2 text-base font-black text-slate-900 dark:text-white">
                                {transaction.saraf.businessName}
                              </div>
                              <div className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                                {transaction.saraf.user.name}
                              </div>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <TransactionShareDialog
                                transactionId={transaction.id}
                                defaultTitle={`${transaction.referenceCode} update`}
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                className="rounded-full"
                                onClick={() => setChatSaraf(transaction.saraf || null)}
                              >
                                <MessageCircle className="mr-2 h-4 w-4" />
                                {pick(activeLanguage, 'گفتگو با صراف', 'Chat with saraf', 'له صراف سره خبرې')}
                              </Button>
                              <Button size="sm" variant="outline" className="rounded-full" asChild>
                                <Link href={`/sarafs/${transaction.saraf.id}`}>
                                  {pick(activeLanguage, 'مشاهده صراف', 'View saraf', 'صراف وګورئ')}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {data && data.pagination.totalPages > 1 ? (
              <div className="flex flex-col gap-3 border-t border-slate-200/70 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <Button variant="outline" className="rounded-full" onClick={() => setPage(page - 1)} disabled={page === 1}>
                  {pick(activeLanguage, 'قبلی', 'Previous', 'مخکینی')}
                </Button>
                <div className="text-sm text-slate-500 dark:text-slate-300">
                  {pick(activeLanguage, 'صفحه', 'Page', 'پاڼه')} {page} {pick(activeLanguage, 'از', 'of', 'له')} {data.pagination.totalPages}
                </div>
                <Button
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setPage(page + 1)}
                  disabled={page === data.pagination.totalPages}
                >
                  {pick(activeLanguage, 'بعدی', 'Next', 'بل')}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {chatSaraf ? (
        <EnhancedSarafChatWidget
          sarafId={chatSaraf.id}
          sarafInfo={{
            id: chatSaraf.id,
            businessName: chatSaraf.businessName,
            businessPhone: chatSaraf.businessPhone,
            businessAddress: chatSaraf.businessAddress,
            rating: chatSaraf.rating,
            isActive: chatSaraf.isActive,
            isPremium: chatSaraf.isPremium,
          }}
          onClose={() => setChatSaraf(null)}
        />
      ) : null}
    </DashboardLayout>
  )
}
