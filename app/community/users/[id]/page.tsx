'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Calendar, Share2, TrendingUp } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AchievementStrip } from '@/components/social/AchievementStrip'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'
import { formatLocalizedDate, formatLocalizedNumber } from '@/lib/locale'
import type { ActivityFeedItem, SocialAchievement } from '@/lib/social-features'

type PublicProfile = {
  id: string
  name: string
  avatarUrl: string | null
  createdAt: string
  vipLevel: string
  totalTransactions: number
  totalCompletedVolume: number
  followingCount: number
  referralCount: number
  visibility: {
    profileVisible: boolean
    activityVisible: boolean
    dataSharing: boolean
  }
  achievements: SocialAchievement[]
  activity: ActivityFeedItem[]
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

function initials(value: string) {
  return value
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatActivityStatus(status: string | undefined, language: Language) {
  if (!status) return ''

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

export default function PublicCommunityUserPage() {
  const { language } = useLanguage()
  const params = useParams()
  const userId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : ''
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    fetch(`/api/community/users/${userId}`, { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) throw new Error('Profile not available')
        return response.json()
      })
      .then((result) => setProfile(result))
      .catch((error) => console.error(error))
      .finally(() => setLoading(false))
  }, [userId])

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Button variant="outline" asChild>
          <Link href="/community/leaderboard">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {pick(language, 'بازگشت به رتبه‌بندی', 'Back to leaderboard', 'درجه بندۍ ته ستنیدل')}
          </Link>
        </Button>

        {loading ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">{pick(language, 'در حال بارگذاری پروفایل...', 'Loading profile...', 'پروفایل بارېږي...')}</CardContent></Card>
        ) : !profile ? (
          <Card><CardContent className="py-16 text-center text-muted-foreground">{pick(language, 'این پروفایل عمومی در دسترس نیست.', 'This public profile is not available.', 'دا عامه پروفایل شتون نه لري.')}</CardContent></Card>
        ) : (
          <>
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-600 p-8 text-white">
                <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-white/30">
                      <AvatarImage src={profile.avatarUrl || undefined} alt={profile.name} />
                      <AvatarFallback className="bg-white/20 text-white">{initials(profile.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h1 className="text-3xl font-black">{profile.name}</h1>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        {profile.vipLevel !== 'NONE' ? <Badge className="bg-white/20 text-white">{profile.vipLevel}</Badge> : null}
                        <Badge className="bg-white/20 text-white">
                          <Calendar className="h-3.5 w-3.5 mr-1" />
                          {pick(language, 'عضویت از', 'Joined', 'غړیتوب له')} {formatLocalizedDate(profile.createdAt, language, { year: 'numeric', month: 'long', day: 'numeric' })}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl font-bold">{formatLocalizedNumber(profile.totalTransactions, language)}</div>
                      <div className="text-sm text-white/80">{pick(language, 'انتقال‌ها', 'Transfers', 'لېږدونه')}</div>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl font-bold">{formatLocalizedNumber(Math.round(profile.totalCompletedVolume), language)}</div>
                      <div className="text-sm text-white/80">{pick(language, 'حجم', 'Volume', 'حجم')}</div>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl font-bold">{formatLocalizedNumber(profile.followingCount, language)}</div>
                      <div className="text-sm text-white/80">{pick(language, 'دنبال‌شوندگان', 'Following', 'تعقیب')}</div>
                    </div>
                    <div className="rounded-2xl bg-white/15 p-4 text-center backdrop-blur-sm">
                      <div className="text-2xl font-bold">{formatLocalizedNumber(profile.referralCount, language)}</div>
                      <div className="text-sm text-white/80">{pick(language, 'معرفی‌ها', 'Referrals', 'معرفۍ')}</div>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{pick(language, 'دستاوردها', 'Achievements', 'لاسته راوړنې')}</CardTitle>
              </CardHeader>
              <CardContent>
                <AchievementStrip achievements={profile.achievements} unlockedOnly />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{pick(language, 'خوراک فعالیت عمومی', 'Public activity feed', 'عامه فعالیتي فیډ')}</CardTitle>
              </CardHeader>
              <CardContent>
                {profile.activity.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground">{pick(language, 'در حال حاضر فعالیت عمومی‌ای به اشتراک گذاشته نشده است.', 'No public activity is shared right now.', 'اوس مهال هېڅ عامه فعالیت نه دی شریک شوی.')}</div>
                ) : (
                  <div className="space-y-3">
                    {profile.activity.map((activity) => (
                      <div key={activity.id} className="rounded-2xl border p-4">
                        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                          <div className="space-y-1">
                            <div className="font-semibold">{activity.description}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatLocalizedDate(activity.timestamp, language, {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                            {activity.sarafName ? (
                              <div className="text-sm text-muted-foreground">{pick(language, 'صراف', 'Saraf', 'صراف')}: {activity.sarafName}</div>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{formatActivityStatus(activity.status, language)}</Badge>
                            {typeof activity.amount === 'number' && activity.currency ? (
                              <Badge variant="secondary">
                                <TrendingUp className="h-3.5 w-3.5 mr-1" />
                                {formatLocalizedNumber(Math.round(activity.amount), language)} {activity.currency}
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <Share2 className="h-3.5 w-3.5 mr-1" />
                                {pick(language, 'مبلغ خصوصی', 'Private amount', 'خصوصي مقدار')}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
