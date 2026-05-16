'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Award, Building2, Crown, Sparkles, Trophy, Users } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedNumber } from '@/lib/locale'

type LeaderboardUser = {
  rank: number
  id: string
  name: string
  avatarUrl: string | null
  vipLevel: string
  totalTransactions: number
  totalVolume: number
  badges: string[]
}

type LeaderboardSaraf = {
  rank: number
  id: string
  businessName: string
  rating: number
  totalTransactions: number
  city: string
  followers: number
  isPremium: boolean
}

type LeaderboardResponse = {
  users: {
    byTransactions: LeaderboardUser[]
    byVolume: LeaderboardUser[]
  }
  sarafs: {
    byRating: LeaderboardSaraf[]
    byFollowers: LeaderboardSaraf[]
  }
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <Badge className="rounded-full border-0 bg-amber-500 px-3 py-1 text-white">
        <Crown className="mr-1 h-3.5 w-3.5" />
        #1
      </Badge>
    )
  }

  if (rank === 2) {
    return (
      <Badge className="rounded-full border-0 bg-slate-500 px-3 py-1 text-white">
        <Award className="mr-1 h-3.5 w-3.5" />
        #2
      </Badge>
    )
  }

  if (rank === 3) {
    return (
      <Badge className="rounded-full border-0 bg-orange-600 px-3 py-1 text-white">
        <Trophy className="mr-1 h-3.5 w-3.5" />
        #3
      </Badge>
    )
  }

  return <Badge className="rounded-full px-3 py-1">#{rank}</Badge>
}

export default function CommunityLeaderboardPage() {
  const { language } = useLanguage()
  const [data, setData] = useState<LeaderboardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/community/leaderboard?limit=10', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Failed to load leaderboard')
        return response.json()
      })
      .then((result) => setData(result))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [])

  const leaderboardPulse = useMemo(() => {
    const topUser = data?.users.byTransactions[0]
    const topSaraf = data?.sarafs.byRating[0]
    const topFollowerSaraf = data?.sarafs.byFollowers[0]

    return [
      {
        label: pick(language, 'رهبر کاربران', 'Top user', 'مخکښ کارن'),
        value: topUser?.name || '—',
      },
      {
        label: pick(language, 'بیشترین حجم', 'Highest volume', 'لوړ حجم'),
        value: topUser ? `${formatLocalizedNumber(Math.round(topUser.totalVolume), language)} AFN` : '—',
      },
      {
        label: pick(language, 'بهترین صراف', 'Top saraf', 'غوره صراف'),
        value: topSaraf?.businessName || '—',
      },
      {
        label: pick(language, 'بیشترین دنبال‌کننده', 'Most followers', 'ډېر تعقيبوونکي'),
        value: topFollowerSaraf ? formatLocalizedNumber(topFollowerSaraf.followers, language) : '—',
      },
    ]
  }, [data, language])

  const renderUserList = (users: LeaderboardUser[]) => (
    <div className="space-y-3">
      {users.map((user, index) => (
        <div
          key={user.id}
          className="group relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_90px_-55px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-950/65"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(251,191,36,0.08),transparent_34%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-sm font-black text-white dark:from-slate-200 dark:to-white dark:text-slate-950">
                {index + 1 < 10 ? `0${index + 1}` : index + 1}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RankBadge rank={user.rank} />
                  <div className="text-lg font-black text-slate-900 dark:text-white">{user.name}</div>
                  {user.vipLevel !== 'NONE' ? <Badge className="rounded-full">{user.vipLevel}</Badge> : null}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {formatLocalizedNumber(user.totalTransactions, language)}{' '}
                  {pick(language, 'تراکنش', 'transactions', 'لېږدونه')} ·{' '}
                  {formatLocalizedNumber(Math.round(user.totalVolume), language)} AFN
                </div>
                <div className="flex flex-wrap gap-2">
                  {user.badges.map((badge) => (
                    <Badge key={badge} variant="outline" className="rounded-full">
                      {badge}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/community/users/${user.id}`}>
                {pick(language, 'مشاهده پروفایل', 'View profile', 'پروفايل وګورئ')}
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )

  const renderSarafList = (sarafs: LeaderboardSaraf[]) => (
    <div className="space-y-3">
      {sarafs.map((saraf, index) => (
        <div
          key={saraf.id}
          className="group relative overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/85 p-5 shadow-[0_24px_70px_-55px_rgba(15,23,42,0.55)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_40px_90px_-55px_rgba(15,23,42,0.55)] dark:border-white/10 dark:bg-slate-950/65"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,197,94,0.08),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_34%)]" />
          <div className="relative flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 text-sm font-black text-white">
                {index + 1 < 10 ? `0${index + 1}` : index + 1}
              </div>
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <RankBadge rank={saraf.rank} />
                  <div className="text-lg font-black text-slate-900 dark:text-white">{saraf.businessName}</div>
                  {saraf.isPremium ? (
                    <Badge className="rounded-full border-0 bg-gradient-to-r from-amber-400 to-orange-500 text-white">
                      {pick(language, 'ویژه', 'Premium', 'پريميم')}
                    </Badge>
                  ) : null}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {saraf.city} · {formatLocalizedNumber(saraf.totalTransactions, language)}{' '}
                  {pick(language, 'تراکنش', 'transactions', 'لېږدونه')} ·{' '}
                  {formatLocalizedNumber(saraf.followers, language)} {pick(language, 'دنبال‌کننده', 'followers', 'تعقيبوونکي')}
                </div>
                <div className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-200">
                  {pick(language, 'امتیاز', 'Rating', 'درجه')}: {saraf.rating.toFixed(1)}
                </div>
              </div>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link href={`/sarafs/${saraf.id}`}>
                {pick(language, 'مشاهده صراف', 'View saraf', 'صراف وګورئ')}
              </Link>
            </Button>
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-20">
        <section className="relative overflow-hidden rounded-[34px] border border-white/55 bg-[linear-gradient(135deg,#09090b_0%,#172554_38%,#9333ea_100%)] px-6 py-8 text-white shadow-[0_45px_120px_-55px_rgba(76,29,149,0.75)] md:px-10 md:py-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(167,139,250,0.2),transparent_34%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] bg-[size:28px_28px] opacity-25" />
          <div className="relative grid gap-8 xl:grid-cols-[1.15fr_0.85fr] xl:items-end">
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-amber-100 backdrop-blur-xl">
                <Sparkles className="h-4 w-4" />
                {pick(language, 'رتبه‌بندی زنده', 'Live rankings', 'ژوندۍ درجه بندي')}
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                  {pick(language, 'جدول رتبه‌بندی جامعه', 'Community leaderboards', 'د ټولنې درجه بندي')}
                  <span className="mt-2 block text-violet-200">
                    {pick(language, 'اعتماد، فعالیت و اعتبار در یک نمای premium', 'Trust, activity, and credibility in one premium view', 'باور، فعاليت او اعتبار په يو پريميم نما کې')}
                  </span>
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-slate-200 md:text-base">
                  {pick(
                    language,
                    'این صفحه فقط یک لیست نیست؛ vitrine اجتماعی سیستم است. کاربران فعال، صرافان قابل‌اعتماد و رشد واقعی جامعه از همین‌جا دیده می‌شود.',
                    'This is more than a list. It is the social showcase of the platform, where active users, trusted sarafs, and real momentum become visible.',
                    'دا يوازې لېست نه دی؛ دا د سيستم ټولنيزه ښودګاه ده چې فعال کارنان، باوري صرافان او ريښتينی پرمختګ پکې ښکاري.'
                  )}
                </p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-2">
              {leaderboardPulse.map((item) => (
                <div key={item.label} className="rounded-[24px] border border-white/10 bg-white/10 px-4 py-4 backdrop-blur-xl">
                  <div className="text-xs text-slate-300">{item.label}</div>
                  <div className="mt-2 text-lg font-black text-white">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <Card className="overflow-hidden rounded-[32px] border border-slate-200/70 bg-white/85 shadow-[0_30px_80px_-50px_rgba(15,23,42,0.4)] backdrop-blur-2xl dark:border-white/10 dark:bg-slate-950/70">
          <CardContent className="space-y-6 p-4 md:p-6">
            <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-[28px] border border-slate-200/70 bg-[linear-gradient(135deg,rgba(15,23,42,0.98),rgba(30,41,59,0.96))] p-6 text-white dark:border-white/10">
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-200">
                    <Users className="h-4 w-4" />
                    {pick(language, 'منطق رتبه‌بندی', 'How rankings work', 'د درجې بندۍ منطق')}
                  </div>
                  <h2 className="text-2xl font-black">
                    {pick(language, 'داده‌های واقعی، نمای روشن', 'Real data, clean presentation', 'ريښتينی معلومات، روښانه نما')}
                  </h2>
                  <p className="text-sm leading-7 text-slate-300">
                    {pick(
                      language,
                      'رتبه‌ها از فعالیت واقعی، حجم، امتیاز و دنبال‌کننده‌ها محاسبه می‌شوند و همزمان به تنظیمات حریم خصوصی احترام می‌گذارند.',
                      'The rankings are calculated from real activity, volume, ratings, and followers while still respecting privacy controls.',
                      'درجې د ريښتيني فعاليت، حجم، امتیاز او تعقيبوونکو له مخې حسابېږي او د محرمیت درناوی هم کوي.'
                    )}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'کاربران', 'Users', 'کارنان')}
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {formatLocalizedNumber(data?.users.byTransactions.length || 0, language)}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {pick(language, 'نمایش فعال‌ترین کاربران براساس تراکنش و حجم', 'Top users by transfers and volume', 'تر ټولو فعال کارنان د لېږدونو او حجم له مخې')}
                  </p>
                </div>
                <div className="rounded-[28px] border border-slate-200/70 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {pick(language, 'صرافان', 'Sarafs', 'صرافان')}
                  </div>
                  <div className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
                    {formatLocalizedNumber(data?.sarafs.byRating.length || 0, language)}
                  </div>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {pick(language, 'مرتب‌سازی بر اساس امتیاز و دنبال‌کننده', 'Sorted by rating and followers', 'د امتیاز او تعقيبوونکو له مخې مرتب شوي')}
                  </p>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="rounded-[28px] border border-dashed border-slate-300/80 bg-slate-50/80 px-6 py-16 text-center text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {pick(language, 'در حال بارگذاری رتبه‌بندی...', 'Loading leaderboard...', 'درجه بندي بارېږي...')}
              </div>
            ) : !data ? (
              <div className="rounded-[28px] border border-dashed border-slate-300/80 bg-slate-50/80 px-6 py-16 text-center text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                {pick(language, 'رتبه‌بندی در حال حاضر در دسترس نیست.', 'Leaderboard is unavailable right now.', 'درجه بندي اوس مهال شتون نه لري.')}
              </div>
            ) : (
              <Tabs defaultValue="users-transactions" className="space-y-6">
                <TabsList className="grid h-auto w-full grid-cols-2 gap-2 rounded-[24px] bg-slate-100/90 p-2 dark:bg-slate-900/80 md:grid-cols-4">
                  <TabsTrigger value="users-transactions" className="rounded-[18px] py-3 text-xs font-semibold md:text-sm">
                    <Users className="mr-2 h-4 w-4" />
                    {pick(language, 'کاربران بر اساس انتقال', 'Users by transfers', 'کارنان د لېږدونو له مخې')}
                  </TabsTrigger>
                  <TabsTrigger value="users-volume" className="rounded-[18px] py-3 text-xs font-semibold md:text-sm">
                    <Users className="mr-2 h-4 w-4" />
                    {pick(language, 'کاربران بر اساس حجم', 'Users by volume', 'کارنان د حجم له مخې')}
                  </TabsTrigger>
                  <TabsTrigger value="sarafs-rating" className="rounded-[18px] py-3 text-xs font-semibold md:text-sm">
                    <Building2 className="mr-2 h-4 w-4" />
                    {pick(language, 'صرافان بر اساس امتیاز', 'Sarafs by rating', 'صرافان د امتیاز له مخې')}
                  </TabsTrigger>
                  <TabsTrigger value="sarafs-followers" className="rounded-[18px] py-3 text-xs font-semibold md:text-sm">
                    <Building2 className="mr-2 h-4 w-4" />
                    {pick(language, 'صرافان بر اساس دنبال‌کننده', 'Sarafs by followers', 'صرافان د تعقيبوونکو له مخې')}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users-transactions">{renderUserList(data.users.byTransactions)}</TabsContent>
                <TabsContent value="users-volume">{renderUserList(data.users.byVolume)}</TabsContent>
                <TabsContent value="sarafs-rating">{renderSarafList(data.sarafs.byRating)}</TabsContent>
                <TabsContent value="sarafs-followers">{renderSarafList(data.sarafs.byFollowers)}</TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}
