'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import type { PortalStoryGroup } from '@/lib/portal-internal-chat-types'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

interface PortalStoryStripProps {
  groups: PortalStoryGroup[]
  currentUserId?: string | null
  language: string
  onCreate: () => void
  onOpenGroup: (groupId: string) => void
}

export function PortalStoryStrip({ groups, currentUserId, language, onCreate, onOpenGroup }: PortalStoryStripProps) {
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const own = groups.find((group) => group.user.id === currentUserId) || null
  const ordered = [
    ...(own ? [own] : []),
    ...groups.filter((group) => group.user.id !== currentUserId),
  ]

  const isRTL = language === 'fa' || language === 'ps'

  return (
    <ScrollArea className="w-full whitespace-nowrap" dir={isRTL ? 'rtl' : 'ltr'}>
      <div className="flex gap-3 pb-2">
        <button
          type="button"
          onClick={onCreate}
          className="flex w-[72px] shrink-0 flex-col items-center gap-2"
        >
          <div className="relative grid h-14 w-14 place-items-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-[0_18px_40px_-26px_rgba(79,70,229,0.65)]">
            <Plus className="h-5 w-5" />
          </div>
          <span className="max-w-full truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{pick('استوری', 'Story', 'سټوري')}</span>
        </button>

        {ordered.map((group) => {
          const hasUnseen = !group.allSeen
          return (
            <button
              key={group.user.id}
              type="button"
              onClick={() => onOpenGroup(group.user.id)}
              className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            >
              <div
                className={cn(
                  'rounded-full p-[2px]',
                  hasUnseen ? 'bg-[conic-gradient(from_90deg,#8b5cf6,#6366f1,#38bdf8,#8b5cf6)]' : 'bg-slate-200 dark:bg-white/10'
                )}
              >
                <Avatar className="h-14 w-14 border-2 border-white dark:border-slate-950">
                  {group.user.avatarUrl ? <AvatarImage src={group.user.avatarUrl} alt={group.user.name} /> : null}
                  <AvatarFallback className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100">{group.user.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
              </div>
              <span className="max-w-full truncate text-[11px] font-medium text-slate-700 dark:text-slate-200">{group.user.name}</span>
            </button>
          )
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  )
}
