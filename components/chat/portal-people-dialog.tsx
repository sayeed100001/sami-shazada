'use client'

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type {
  PortalConnectionRequest,
  PortalContact,
  PortalDirectoryEntry,
} from '@/lib/portal-internal-chat-types'
import { cn } from '@/lib/utils'
import {
  Building2,
  Check,
  Clock3,
  Compass,
  Loader2,
  MessageCircle,
  Search,
  UserCheck,
  UserPlus,
  UserRound,
  Users,
  Workflow,
  X,
} from 'lucide-react'

interface PortalPeopleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  language: string
  currentUserRole?: string
  loading: boolean
  search: string
  onSearchChange: (value: string) => void
  directory: PortalDirectoryEntry[]
  incomingRequests: PortalConnectionRequest[]
  outgoingRequests: PortalConnectionRequest[]
  actionBusyId?: string | null
  onStartChat: (contact: PortalContact) => void
  onStartSupportChat?: (targetUserId: string) => void
  onRequestConnection: (targetId: string) => void
  onAcceptRequest: (requestId: string) => void
  onDeclineRequest: (requestId: string) => void
  onCancelRequest: (requestId: string) => void
}

export function PortalPeopleDialog({
  open,
  onOpenChange,
  language,
  currentUserRole,
  loading,
  search,
  onSearchChange,
  directory,
  incomingRequests,
  outgoingRequests,
  actionBusyId,
  onStartChat,
  onStartSupportChat,
  onRequestConnection,
  onAcceptRequest,
  onDeclineRequest,
  onCancelRequest,
}: PortalPeopleDialogProps) {
  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  const roleMeta = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: pick('مدیر سیستم', 'Admin', 'اډمین'),
          icon: Compass,
          className:
            'border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-200',
        }
      case 'USER':
        return {
          label: pick('مشتری', 'Customer', 'مشتری'),
          icon: UserRound,
          className:
            'border-slate-300/60 bg-slate-50 text-slate-700 dark:border-slate-300/20 dark:bg-slate-500/10 dark:text-slate-200',
        }
      case 'SARAF':
        return {
          label: pick('صراف', 'Saraf', 'صراف'),
          icon: Building2,
          className:
            'border-cyan-300/60 bg-cyan-50 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-500/10 dark:text-cyan-200',
        }
      case 'BRANCH_MANAGER':
        return {
          label: pick('مدیر شعبه', 'Branch Manager', 'د څانګې مدیر'),
          icon: Workflow,
          className:
            'border-sky-300/60 bg-sky-50 text-sky-800 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-200',
        }
      case 'BRANCH_STAFF':
        return {
          label: pick('کارمند شعبه', 'Branch Staff', 'د څانګې کارکوونکی'),
          icon: Users,
          className:
            'border-violet-300/60 bg-violet-50 text-violet-800 dark:border-violet-300/20 dark:bg-violet-500/10 dark:text-violet-200',
        }
      default:
        return {
          label: pick('مخاطب', 'Contact', 'مخاطب'),
          icon: UserRound,
          className:
            'border-slate-300/60 bg-slate-50 text-slate-700 dark:border-slate-300/20 dark:bg-slate-500/10 dark:text-slate-200',
        }
    }
  }

  const personContext = (person: PortalContact) => {
    const branches = [...(person.managedBranchNames || []), ...(person.staffBranchNames || [])]
      .filter(Boolean)
      .join(language === 'en' ? ', ' : '، ')

    if (person.role === 'ADMIN') {
      return pick('نمای مدیریتی سراسری', 'Global administrative view', 'نړیوال اداري لید')
    }
    if (person.role === 'SARAF' && person.sarafName) {
      return pick(`شبکه ${person.sarafName}`, `${person.sarafName} network`, `د ${person.sarafName} شبکه`)
    }
    if (person.role === 'BRANCH_MANAGER' && branches) {
      return pick(`مدیر: ${branches}`, `Manager: ${branches}`, `مدیر: ${branches}`)
    }
    if (person.role === 'BRANCH_STAFF' && branches) {
      return pick(`کارمند: ${branches}`, `Staff: ${branches}`, `کارکوونکی: ${branches}`)
    }
    return person.email
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-4xl">
        <div className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,249,255,0.96))] shadow-[0_40px_140px_-70px_rgba(15,23,42,0.5)] dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(17,24,39,0.98),rgba(30,41,59,0.98))]">
          <DialogHeader className="border-b border-violet-200/30 bg-[radial-gradient(circle_at_top_left,#8b5cf6_0%,#6d28d9_35%,#312e81_100%)] px-6 py-6 text-left text-white">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold">
              <Compass className="h-3.5 w-3.5" />
              {pick('مرکز کشف افراد', 'People discovery', 'د خلکو لټون')}
            </div>
            <DialogTitle className="mt-3 text-2xl font-black">
              {pick('جست‌وجو، درخواست ارتباط، و شروع گفت‌وگو', 'Search, connect, and start chats', 'ولټوئ، وصل شئ، او چټ پیل کړئ')}
            </DialogTitle>
            <DialogDescription className="max-w-3xl text-white/75">
              {pick(
                'می‌توانید مستقیم چت را شروع کنید. برای دیدن استوری‌ها و ساختن گروه خارج از شبکه فعلی، اول باید درخواست ارتباط پذیرفته شود.',
                'Direct chat can start immediately. Stories and groups outside your current network unlock only after a connection request is accepted.',
                'مستقیم چټ سمدستي پیلولی شئ. له اوسنۍ شبکې بهر سټورۍ او ډلې یوازې د منل شوې اړیکې غوښتنې وروسته فعالېږي.'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-0 lg:grid-cols-[320px_minmax(0,1fr)]">
            <aside className="border-b border-slate-200/80 bg-slate-50/80 px-5 py-5 dark:border-white/10 dark:bg-black/10 lg:border-b-0 lg:border-r">
              <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {pick('درخواست‌های ورودی', 'Incoming', 'راتلونکې غوښتنې')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{incomingRequests.length}</div>
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {pick('درخواست‌های ارسالی', 'Outgoing', 'لېږل شوې غوښتنې')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">{outgoingRequests.length}</div>
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                    {pick('ارتباط‌های فعال', 'Connected', 'فعاله اړیکې')}
                  </div>
                  <div className="mt-2 text-3xl font-black text-slate-950 dark:text-white">
                    {directory.filter((entry) => entry.connectionStatus === 'CONNECTED').length}
                  </div>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">
                  {pick('درخواست‌های تازه', 'Fresh requests', 'نوې غوښتنې')}
                </div>
                <div className="space-y-3">
                  {incomingRequests.slice(0, 4).map((request) => {
                    const meta = roleMeta(request.requester.role)
                    const Icon = meta.icon
                    const busy = !!actionBusyId && actionBusyId === request.id

                    return (
                      <div
                        key={request.id}
                        className="rounded-[22px] border border-slate-200/80 bg-white/90 p-3 dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex items-start gap-3">
                          <Avatar className="h-10 w-10">
                            {request.requester.avatarUrl ? (
                              <AvatarImage src={request.requester.avatarUrl} alt={request.requester.name} />
                            ) : null}
                            <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                              <Icon className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-semibold text-slate-900 dark:text-white">
                              {request.requester.name}
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                              {personContext(request.requester)}
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            className="flex-1 rounded-full"
                            disabled={busy}
                            onClick={() => onAcceptRequest(request.id)}
                          >
                            {busy ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="mr-2 h-4 w-4" />
                            )}
                            {pick('پذیرش', 'Accept', 'منل')}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            disabled={busy}
                            onClick={() => onDeclineRequest(request.id)}
                          >
                            <X className="mr-2 h-4 w-4" />
                            {pick('رد', 'Decline', 'رد')}
                          </Button>
                        </div>
                      </div>
                    )
                  })}

                  {!incomingRequests.length ? (
                    <div className="rounded-[22px] border border-dashed border-slate-200/80 px-4 py-6 text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      {pick('فعلاً درخواست تازه‌ای ندارید.', 'No incoming requests right now.', 'اوس تازه غوښتنې نه لرئ.')}
                    </div>
                  ) : null}
                </div>
              </div>
            </aside>

            <section className="px-5 py-5">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={pick('جست‌وجوی صراف، شعبه، یا همکار...', 'Search saraf, branch, or teammate...', 'صراف، څانګه، یا همکار ولټوئ...')}
                  className="h-12 rounded-2xl border-slate-200/80 bg-slate-50/70 pl-10 dark:border-white/10 dark:bg-white/5"
                />
              </div>

              <ScrollArea className="mt-5 h-[65vh] pr-2">
                <div className="space-y-3">
                  {directory.map((entry) => {
                    const meta = roleMeta(entry.role)
                    const Icon = meta.icon
                    const busy = !!actionBusyId && (actionBusyId === entry.id || actionBusyId === entry.requestId)
                    const adminSupportRoute = currentUserRole === 'ADMIN' && entry.role === 'USER'
                    const allowsConnectionFlow = entry.role !== 'ADMIN' && !adminSupportRoute
                    const canStartDirectChat =
                      !adminSupportRoute &&
                      allowsConnectionFlow &&
                      (entry.connectionStatus === 'CONNECTED' || entry.connectionStatus === 'NONE')

                    return (
                      <div
                        key={entry.id}
                        className="rounded-[26px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_48px_-36px_rgba(15,23,42,0.3)] dark:border-white/10 dark:bg-white/5"
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <Avatar className="h-12 w-12 rounded-[18px]">
                              {entry.avatarUrl ? <AvatarImage src={entry.avatarUrl} alt={entry.name} /> : null}
                              <AvatarFallback className="rounded-[18px] bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-100">
                                <Icon className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="truncate text-sm font-semibold text-slate-950 dark:text-white">
                                  {entry.name}
                                </span>
                                <Badge variant="outline" className={cn('rounded-full', meta.className)}>
                                  {meta.label}
                                </Badge>
                                {entry.connectionStatus === 'CONNECTED' && allowsConnectionFlow ? (
                                  <Badge className="rounded-full bg-gradient-to-r from-violet-500 to-indigo-600 text-white">
                                    <UserCheck className="mr-1 h-3 w-3" />
                                    {pick('متصل', 'Connected', 'نښلول شوی')}
                                  </Badge>
                                ) : null}
                                {!allowsConnectionFlow ? (
                                  <Badge variant="outline" className="rounded-full">
                                    {pick('نمایش مدیریتی', 'Admin visibility', 'اداري لید')}
                                  </Badge>
                                ) : null}
                                {entry.connectionStatus === 'PENDING_OUTGOING' ? (
                                  <Badge variant="outline" className="rounded-full">
                                    <Clock3 className="mr-1 h-3 w-3" />
                                    {pick('در انتظار', 'Pending', 'په تمه')}
                                  </Badge>
                                ) : null}
                              </div>
                              <p className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{entry.email}</p>
                              <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                                {personContext(entry)}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {adminSupportRoute && onStartSupportChat ? (
                              <Button type="button" className="rounded-full" onClick={() => onStartSupportChat(entry.id)}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                {pick('باز کردن پشتیبانی', 'Open support', 'ملاتړ پرانیزئ')}
                              </Button>
                            ) : null}
                            {canStartDirectChat ? (
                              <Button type="button" className="rounded-full" onClick={() => onStartChat(entry)}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                {entry.connectionStatus === 'CONNECTED'
                                  ? pick('شروع چت', 'Start chat', 'چټ پیل')
                                  : pick('چت مستقیم', 'Direct chat', 'مستقیم چټ')}
                              </Button>
                            ) : null}

                            {entry.connectionStatus === 'NONE' && allowsConnectionFlow ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                disabled={busy}
                                onClick={() => onRequestConnection(entry.id)}
                              >
                                {busy ? (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                  <UserPlus className="mr-2 h-4 w-4" />
                                )}
                                {pick('درخواست ارتباط', 'Request connection', 'د اړیکې غوښتنه')}
                              </Button>
                            ) : null}

                            {entry.connectionStatus === 'PENDING_INCOMING' && entry.requestId && allowsConnectionFlow ? (
                              <>
                                <Button
                                  type="button"
                                  className="rounded-full"
                                  disabled={busy}
                                  onClick={() => onAcceptRequest(entry.requestId || '')}
                                >
                                  {busy ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="mr-2 h-4 w-4" />
                                  )}
                                  {pick('پذیرش', 'Accept', 'منل')}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  className="rounded-full"
                                  disabled={busy}
                                  onClick={() => onDeclineRequest(entry.requestId || '')}
                                >
                                  <X className="mr-2 h-4 w-4" />
                                  {pick('رد', 'Decline', 'رد')}
                                </Button>
                              </>
                            ) : null}

                            {entry.connectionStatus === 'PENDING_OUTGOING' && entry.requestId && allowsConnectionFlow ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="rounded-full"
                                disabled={busy}
                                onClick={() => onCancelRequest(entry.requestId || '')}
                              >
                                <X className="mr-2 h-4 w-4" />
                                {pick('لغو درخواست', 'Cancel request', 'غوښتنه لغوه کړئ')}
                              </Button>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    )
                  })}

                  {!directory.length && !loading ? (
                    <div className="rounded-[24px] border border-dashed border-slate-200/80 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/10 dark:text-slate-400">
                      {pick('کاربر قابل نمایشی پیدا نشد.', 'No portal users matched this search.', 'هیڅ مناسب کاروونکی ونه موندل شو.')}
                    </div>
                  ) : null}
                </div>
              </ScrollArea>
            </section>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
