'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import type { PortalContact, PortalInternalChat, PortalInternalMessage, PortalStoryGroup } from '@/lib/portal-internal-chat-types'
import { cn } from '@/lib/utils'
import { Building2, Clock3, Image as ImageIcon, Mail, Mic, Paperclip, Phone, Shield, UserRound, Users, Workflow } from 'lucide-react'

interface PortalProfileSheetProps {
  activeChat: PortalInternalChat | null
  peers: PortalContact[]
  messages: PortalInternalMessage[]
  storyGroup?: PortalStoryGroup | null
  language: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenStory?: () => void
}

export function PortalProfileSheet({
  activeChat,
  peers,
  messages,
  storyGroup,
  language,
  open,
  onOpenChange,
  onOpenStory,
}: PortalProfileSheetProps) {
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const focalPerson = peers[0] || null
  const mediaItems = messages.filter((message) => !!message.fileUrl)
  const visualItems = mediaItems.filter((message) => /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(message.fileUrl || ''))
  const audioItems = mediaItems.filter((message) => /\.(webm|ogg|mp3|m4a)(\?.*)?$/i.test(message.fileUrl || ''))
  const documentItems = mediaItems.filter((message) => !!message.fileUrl && !visualItems.includes(message) && !audioItems.includes(message))

  const roleMeta = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: pick('مدیر سیستم', 'Admin', 'اډمین'), icon: Shield, className: 'border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-200' }
      case 'SARAF':
        return { label: pick('صراف', 'Saraf', 'صراف'), icon: Building2, className: 'border-cyan-300/60 bg-cyan-50 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-500/10 dark:text-cyan-200' }
      case 'BRANCH_MANAGER':
        return { label: pick('مدیر شعبه', 'Branch Manager', 'د څانګې مدیر'), icon: Workflow, className: 'border-sky-300/60 bg-sky-50 text-sky-800 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-200' }
      case 'BRANCH_STAFF':
        return { label: pick('کارمند شعبه', 'Branch Staff', 'د څانګې کارکوونکی'), icon: Users, className: 'border-violet-300/60 bg-violet-50 text-violet-800 dark:border-violet-300/20 dark:bg-violet-500/10 dark:text-violet-200' }
      default:
        return { label: pick('مخاطب', 'Contact', 'مخاطب'), icon: UserRound, className: 'border-slate-300/60 bg-slate-50 text-slate-700 dark:border-slate-300/20 dark:bg-slate-500/10 dark:text-slate-200' }
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return pick('نامشخص', 'Unknown', 'ناڅرګند')
    return new Intl.DateTimeFormat(
      language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF',
      { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    ).format(new Date(value))
  }

  const title = activeChat?.name?.trim() || (focalPerson ? focalPerson.name : pick('پروفایل گفتگو', 'Chat profile', 'د چیټ پروفایل'))
  const subtitle = activeChat?.type === 'GROUP'
    ? pick('اطلاعات گروه، اعضا، استوری‌ها و فایل‌های مشترک', 'Group details, stories, and shared files', 'د ډلې معلومات، سټورۍ، او شریک فایلونه')
    : pick('نمای کامل مخاطب، استوری و فایل‌های مشترک', 'Full contact view, stories, and shared media', 'د مخاطب بشپړ لید، سټورۍ، او شریک رسنۍ')
  const focalRole = focalPerson ? roleMeta(focalPerson.role) : null
  const RoleIcon = focalRole?.icon || Users
  const lastSeenAt = activeChat?.participants.find((participant) => participant.userId === focalPerson?.id)?.lastSeen || focalPerson?.lastLogin || null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-l border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,255,0.95))] p-0 text-slate-950 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.98),rgba(17,24,39,0.98))] dark:text-white sm:max-w-lg"
      >
        <SheetHeader className="border-b border-slate-200/80 px-6 py-5 text-left dark:border-white/10">
          <SheetTitle className="text-xl font-black">{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-96px)]">
          <div className="space-y-6 px-6 py-6">
            <section className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_24px_80px_-46px_rgba(15,23,42,0.35)] dark:border-white/10 dark:bg-white/5">
              <div className="flex items-start gap-4">
                <Avatar className="h-20 w-20 rounded-[28px]">
                  {focalPerson?.avatarUrl ? <AvatarImage src={focalPerson.avatarUrl} alt={focalPerson.name} /> : null}
                  <AvatarFallback className="rounded-[28px] bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                    {focalPerson ? <RoleIcon className="h-8 w-8" /> : <Users className="h-8 w-8" />}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {focalRole ? <Badge variant="outline" className={focalRole.className}>{focalRole.label}</Badge> : null}
                    {storyGroup?.stories.length ? <Badge className="bg-violet-600 text-white">{storyGroup.stories.length} {pick('استوری فعال', 'active stories', 'فعاله سټورۍ')}</Badge> : null}
                  </div>
                  <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {focalPerson?.sarafName
                      ? pick(`شبکه: ${focalPerson.sarafName}`, `Network: ${focalPerson.sarafName}`, `شبکه: ${focalPerson.sarafName}`)
                      : activeChat?.type === 'GROUP'
                        ? pick('گفتگوی گروهی برای هماهنگی شبکه و عملیات', 'Group conversation for network operations', 'د شبکې او عملیاتو لپاره ډله ییز چیټ')
                        : pick('کانال مستقیم برای پیگیری و هماهنگی سریع', 'Direct line for quick coordination', 'د چټکې همغږۍ لپاره مستقیم لاین')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {storyGroup?.stories.length ? (
                      <Button type="button" size="sm" className="rounded-full" onClick={onOpenStory}>
                        {pick('دیدن استوری', 'View story', 'سټوري وګورئ')}
                      </Button>
                    ) : null}
                    <Badge variant="outline" className="rounded-full">{pick('آخرین فعالیت', 'Last active', 'وروستۍ فعاله')}</Badge>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(lastSeenAt)}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="grid gap-3 sm:grid-cols-3">
              {[
                { label: pick('اعضا', 'Participants', 'ګډونوال'), value: activeChat?.participants.length || peers.length || 0, icon: Users },
                { label: pick('رسانه', 'Media', 'رسنۍ'), value: visualItems.length, icon: ImageIcon },
                { label: pick('ویس نوت', 'Voice notes', 'غږیز یادښتونه'), value: audioItems.length, icon: Mic },
              ].map((item) => (
                <div key={item.label} className="rounded-[24px] border border-slate-200/80 bg-white/85 p-4 dark:border-white/10 dark:bg-white/5">
                  <item.icon className="h-4 w-4 text-slate-500 dark:text-slate-300" />
                  <div className="mt-3 text-2xl font-black">{item.value}</div>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{item.label}</p>
                </div>
              ))}
            </section>

            {focalPerson ? (
              <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-white/5">
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{pick('اطلاعات تماس', 'Contact details', 'د اړیکو معلومات')}</h3>
                <div className="mt-4 space-y-3 text-sm">
                  <div className="flex items-center gap-3"><Mail className="h-4 w-4 text-slate-500" /><span className="truncate">{focalPerson.email}</span></div>
                  {focalPerson.phone || focalPerson.sarafPhone ? <div className="flex items-center gap-3"><Phone className="h-4 w-4 text-slate-500" /><span>{focalPerson.phone || focalPerson.sarafPhone}</span></div> : null}
                  {focalPerson.sarafName ? <div className="flex items-center gap-3"><Building2 className="h-4 w-4 text-slate-500" /><span>{focalPerson.sarafName}</span></div> : null}
                  {(focalPerson.managedBranchNames?.length || focalPerson.staffBranchNames?.length) ? (
                    <div className="flex items-start gap-3">
                      <Workflow className="mt-0.5 h-4 w-4 text-slate-500" />
                      <span className="leading-7">
                        {[...(focalPerson.managedBranchNames || []), ...(focalPerson.staffBranchNames || [])].join(language === 'en' ? ', ' : '، ')}
                      </span>
                    </div>
                  ) : null}
                  <div className="flex items-center gap-3"><Clock3 className="h-4 w-4 text-slate-500" /><span>{formatDate(focalPerson.lastLogin)}</span></div>
                </div>
              </section>
            ) : null}

            <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-white/5">
              <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{pick('فایل‌ها و رسانه‌های مشترک', 'Shared files and media', 'شریک فایلونه او رسنۍ')}</h3>
              <div className="mt-4 grid gap-3">
                {visualItems.slice(-4).reverse().map((item) => (
                  <a key={item.id} href={item.fileUrl || '#'} target="_blank" rel="noopener noreferrer" className="overflow-hidden rounded-[22px] border border-slate-200/80 bg-slate-950/5 dark:border-white/10 dark:bg-white/5">
                    <img src={item.fileUrl || ''} alt={item.fileName || 'Shared media'} className="h-36 w-full object-cover" />
                  </a>
                ))}
                {!visualItems.length ? (
                  <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                    {pick('هنوز رسانه مشترکی در این گفتگو ثبت نشده است.', 'No shared media has been sent in this chat yet.', 'لا تر اوسه په دې چیټ کې ګډه رسنۍ نه ده لېږل شوې.')}
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/10">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Mic className="h-4 w-4" />{pick('ویس نوت‌ها', 'Voice notes', 'غږیز یادښتونه')}</div>
                  <p className="mt-2 text-2xl font-black">{audioItems.length}</p>
                </div>
                <div className="rounded-[22px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-black/10">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Paperclip className="h-4 w-4" />{pick('اسناد', 'Documents', 'سندونه')}</div>
                  <p className="mt-2 text-2xl font-black">{documentItems.length}</p>
                </div>
              </div>
            </section>

            {peers.length > 1 ? (
              <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 dark:border-white/10 dark:bg-white/5">
                <h3 className="text-sm font-bold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">{pick('اعضای گفتگو', 'Chat participants', 'د چیټ ګډونوال')}</h3>
                <div className="mt-4 space-y-3">
                  {peers.map((peer) => {
                    const meta = roleMeta(peer.role)
                    const Icon = meta.icon
                    return (
                      <div key={peer.id} className="flex items-center gap-3 rounded-[22px] border border-slate-200/80 px-3 py-3 dark:border-white/10">
                        <Avatar className="h-11 w-11">
                          {peer.avatarUrl ? <AvatarImage src={peer.avatarUrl} alt={peer.name} /> : null}
                          <AvatarFallback className="bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-200"><Icon className="h-4 w-4" /></AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="truncate font-semibold">{peer.name}</div>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">{peer.email}</p>
                        </div>
                        <Badge variant="outline" className={cn('whitespace-nowrap', meta.className)}>{meta.label}</Badge>
                      </div>
                    )
                  })}
                </div>
              </section>
            ) : null}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
