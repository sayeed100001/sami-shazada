'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { PortalStoryGroup } from '@/lib/portal-internal-chat-types'
import { cn } from '@/lib/utils'
import { Plus, Sparkles } from 'lucide-react'

interface PortalStoryRailProps {
  groups: PortalStoryGroup[]
  currentUserId?: string | null
  maxActiveStoriesPerUser: number
  language: string
  onCreateStory: () => void
  onOpenGroup: (groupId: string) => void
}

export function PortalStoryRail({
  groups,
  currentUserId,
  maxActiveStoriesPerUser,
  language,
  onCreateStory,
  onOpenGroup,
}: PortalStoryRailProps) {
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const ownGroup = groups.find((group) => group.user.id === currentUserId) || null
  const otherGroups = groups.filter((group) => group.user.id !== currentUserId)

  return (
    <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,249,255,0.94))] px-4 py-4 shadow-[0_24px_80px_-52px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(17,24,39,0.96),rgba(30,41,59,0.96))] sm:px-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50/80 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
            <Sparkles className="h-3.5 w-3.5" />
            {pick('استوری‌های زنده شبکه', 'Live network stories', 'د شبکې ژوندۍ سټورۍ')}
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
            {pick('استوری‌ها ۲۴ ساعت فعال می‌مانند و برای شبکه مجاز همین پیام‌رسان نمایش داده می‌شوند.', 'Stories stay live for 24 hours and only appear to the permitted network for this messenger.', 'سټورۍ ۲۴ ساعته ژوندۍ پاتې کېږي او یوازې د همدې پیغام رسوونکي مجاز شبکې ته ښکاري.')}
          </p>
        </div>
        <Badge variant="outline" className="rounded-full border-slate-200/80 bg-white/90 px-3 py-1 dark:border-white/10 dark:bg-white/5">
          {pick('سقف هر کاربر', 'Per-user cap', 'د هر کارونکي حد')} · {maxActiveStoriesPerUser}
        </Badge>
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="flex gap-3 pb-3">
          <button
            type="button"
            onClick={onCreateStory}
            className="group flex w-[108px] shrink-0 flex-col items-center gap-3 rounded-[28px] border border-dashed border-slate-300/80 bg-slate-50/80 px-3 py-4 text-center transition hover:border-violet-300 hover:bg-violet-50/80 dark:border-white/15 dark:bg-white/5 dark:hover:border-violet-400/30 dark:hover:bg-violet-500/10"
          >
            <div className="relative flex h-16 w-16 items-center justify-center rounded-[24px] bg-[linear-gradient(135deg,#4f46e5,#7c3aed)] text-white shadow-[0_20px_45px_-25px_rgba(79,70,229,0.85)]">
              <Plus className="h-6 w-6 transition group-hover:scale-110" />
            </div>
            <div className="space-y-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white">{pick('استوری من', 'My story', 'زما سټوري')}</div>
              <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                {ownGroup?.stories.length
                  ? pick(`${ownGroup.stories.length} استوری فعال`, `${ownGroup.stories.length} live stories`, `${ownGroup.stories.length} فعاله سټورۍ`)
                  : pick('متن یا تصویر کوتاه منتشر کنید', 'Post a short text or image', 'لنډ متن یا انځور خپور کړئ')}
              </p>
            </div>
          </button>

          {[ownGroup, ...otherGroups].filter(Boolean).map((group) => {
            if (!group) return null
            const hasUnseen = !group.allSeen
            return (
              <button
                key={group.user.id}
                type="button"
                onClick={() => onOpenGroup(group.user.id)}
                className="flex w-[112px] shrink-0 flex-col items-center gap-3 rounded-[28px] border border-slate-200/70 bg-white/85 px-3 py-4 text-center transition hover:-translate-y-0.5 hover:border-violet-300/70 hover:shadow-[0_18px_44px_-28px_rgba(79,70,229,0.5)] dark:border-white/10 dark:bg-white/5 dark:hover:border-violet-400/30"
              >
                <div className={cn('rounded-[26px] p-[3px]', hasUnseen ? 'bg-[linear-gradient(135deg,#8b5cf6,#22c55e)]' : 'bg-slate-200 dark:bg-white/10')}>
                  <Avatar className="h-16 w-16 border-2 border-white dark:border-slate-950">
                    {group.user.avatarUrl ? <AvatarImage src={group.user.avatarUrl} alt={group.user.name} /> : null}
                    <AvatarFallback className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100">{group.user.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                </div>
                <div className="space-y-1">
                  <div className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-white">{group.user.name}</div>
                  <p className="line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                    {group.user.sarafName || pick('استوری داخلی', 'Internal story', 'داخلي سټوري')}
                  </p>
                  <Badge className={cn('rounded-full px-2 py-0.5 text-[10px]', hasUnseen ? 'bg-violet-600 text-white' : 'bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-200')}>
                    {hasUnseen
                      ? pick(`${group.unseenCount} جدید`, `${group.unseenCount} new`, `${group.unseenCount} نوي`)
                      : pick('دیده شده', 'Seen', 'کتل شوې')}
                  </Badge>
                </div>
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </section>
  )
}
