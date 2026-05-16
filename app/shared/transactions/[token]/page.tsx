'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Building2, Calendar, Share2, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/locale'

type SharedTransaction = {
  title: string
  note: string | null
  createdAt: string
  expiresAt: string | null
  views: number
  owner: {
    name: string
    avatarUrl: string | null
    profileUrl: string | null
  }
  transaction: {
    type: string
    status: string
    createdAt: string
    completedAt: string | null
    fromCurrency: string
    toCurrency: string
    fromAmount: number | null
    toAmount: number | null
    rate: number | null
    senderName: string
    receiverName: string
    receiverCity: string
    saraf: {
      id: string
      businessName: string
      businessPhone: string
    } | null
  }
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function formatTransactionType(type: string, language: Language) {
  switch (type) {
    case 'HAWALA':
      return pick(language, 'حواله', 'Hawala', 'حواله')
    case 'EXCHANGE':
      return pick(language, 'تبادله', 'Exchange', 'تبادله')
    default:
      return type
  }
}

function formatTransactionStatus(status: string, language: Language) {
  switch (status) {
    case 'COMPLETED':
      return pick(language, 'تکمیل شده', 'Completed', 'بشپړ شوی')
    case 'PENDING':
      return pick(language, 'در انتظار', 'Pending', 'په انتظار کې')
    case 'CANCELLED':
      return pick(language, 'لغو شده', 'Cancelled', 'لغوه شوی')
    case 'REJECTED':
      return pick(language, 'رد شده', 'Rejected', 'رد شوی')
    case 'APPROVED':
      return pick(language, 'تایید شده', 'Approved', 'تایید شوی')
    default:
      return status
  }
}

export default function SharedTransactionPage() {
  const { language } = useLanguage()
  const params = useParams()
  const token = typeof params?.token === 'string' ? params.token : Array.isArray(params?.token) ? params.token[0] : ''
  const [share, setShare] = useState<SharedTransaction | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return

    fetch(`/api/public/transaction-shares/${token}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Share not found')
        return response.json()
      })
      .then((result) => setShare(result))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-4xl space-y-6">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {pick(language, 'بازگشت به خانه', 'Back to home', 'کور ته ستنیدل')}
          </Link>
        </Button>

        {loading ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">{pick(language, 'به‌روزرسانی اشتراکی در حال بارگذاری است...', 'Loading shared update...', 'شریک شوی تازه معلومات بارېږي...')}</CardContent></Card>
        ) : !share ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">{pick(language, 'این لینک اشتراک‌گذاری در دسترس نیست یا منقضی شده است.', 'This share link is unavailable or expired.', 'دا د شریکولو لینک شتون نه لري یا پای ته رسېدلی دی.')}</CardContent></Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-600 p-8 text-white">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h1 className="text-3xl font-black">{share.title}</h1>
                    <div className="mt-2 flex flex-wrap gap-2 text-sm text-white/85">
                      <span className="inline-flex items-center gap-1"><Calendar className="h-4 w-4" />{formatLocalizedDate(share.createdAt, language, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="inline-flex items-center gap-1"><Share2 className="h-4 w-4" />{formatLocalizedNumber(share.views, language)} {pick(language, 'بازدید', 'views', 'لیدنې')}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" />{pick(language, 'اشتراک توسط', 'Shared by', 'شریک شوی د')} {share.owner.name}</span>
                    </div>
                  </div>
                  {share.owner.profileUrl ? (
                    <Button asChild variant="secondary">
                      <Link href={share.owner.profileUrl}>{pick(language, 'مشاهده پروفایل', 'View profile', 'پروفایل وګورئ')}</Link>
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>

            {share.note ? (
              <Card>
                <CardHeader><CardTitle>{pick(language, 'یادداشت', 'Note', 'یادښت')}</CardTitle></CardHeader>
                <CardContent>{share.note}</CardContent>
              </Card>
            ) : null}

            <Card>
              <CardHeader>
                <CardTitle>{pick(language, 'به‌روزرسانی تراکنش', 'Transaction update', 'د لېږد تازه معلومات')}</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{pick(language, 'نوع', 'Type', 'ډول')}</div>
                  <div className="font-semibold">{formatTransactionType(share.transaction.type, language)}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{pick(language, 'وضعیت', 'Status', 'حالت')}</div>
                  <div className="font-semibold">{formatTransactionStatus(share.transaction.status, language)}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{pick(language, 'فرستنده', 'Sender', 'لېږونکی')}</div>
                  <div className="font-semibold">{share.transaction.senderName}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{pick(language, 'گیرنده', 'Receiver', 'ترلاسه کوونکی')}</div>
                  <div className="font-semibold">{share.transaction.receiverName}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{pick(language, 'مقصد', 'Destination', 'مقصد')}</div>
                  <div className="font-semibold">{share.transaction.receiverCity}</div>
                </div>
                <div className="rounded-xl border p-4">
                  <div className="text-sm text-muted-foreground">{pick(language, 'مبالغ', 'Amounts', 'مقدارونه')}</div>
                  {typeof share.transaction.fromAmount === 'number' && typeof share.transaction.toAmount === 'number' ? (
                    <div className="font-semibold">
                      {formatLocalizedNumber(share.transaction.fromAmount, language)} {share.transaction.fromCurrency} {'->'} {formatLocalizedNumber(share.transaction.toAmount, language)} {share.transaction.toCurrency}
                    </div>
                  ) : (
                    <div className="font-semibold">{pick(language, 'خصوصی', 'Private', 'خصوصي')}</div>
                  )}
                </div>
              </CardContent>
            </Card>

            {share.transaction.saraf ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {pick(language, 'جزئیات صراف', 'Saraf details', 'د صراف جزییات')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-semibold">{share.transaction.saraf.businessName}</div>
                    <div className="text-sm text-muted-foreground">{share.transaction.saraf.businessPhone}</div>
                  </div>
                  <Button asChild variant="outline">
                    <Link href={`/sarafs/${share.transaction.saraf.id}`}>{pick(language, 'باز کردن صفحه صراف', 'Open saraf page', 'د صراف پاڼه پرانیزئ')}</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : null}

            {share.expiresAt ? (
              <div className="text-center text-sm text-muted-foreground">
                {pick(language, 'این لینک اشتراک‌گذاری در', 'This share link expires on', 'دا شریکولو لینک په')} {formatLocalizedDate(share.expiresAt, language, { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })} {pick(language, 'منقضی می‌شود.', '.', 'پای ته رسېږي.')}
              </div>
            ) : null}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
