'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import type { PortalStoryGroup } from '@/lib/portal-internal-chat-types'
import { cn } from '@/lib/utils'
import { ChevronLeft, ChevronRight, Eye, Heart, Loader2, Send, Trash2, Users, X, Laugh, Meh, Frown, Sparkles } from 'lucide-react'

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface StoryStat {
  user: {
    id: string
    name: string
    avatarUrl: string | null
    role: string
  }
  at: string
  type?: string
}

interface PortalStoryViewerProps {
  groups: PortalStoryGroup[]
  activeGroupId: string | null
  language: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelectGroup: (groupId: string | null) => void
  onSeen: (storyId: string) => void
  onLike?: (storyId: string, liked: boolean, type?: string | null) => void
  onReply?: (storyId: string, text: string) => void
  onDelete?: (storyId: string) => void
  currentUserId?: string | null
}

const STORY_PROGRESS_MS = 6000

export function PortalStoryViewer({
  groups,
  activeGroupId,
  language,
  open,
  onOpenChange,
  onSelectGroup,
  onSeen,
  onLike,
  onReply,
  onDelete,
  currentUserId,
}: PortalStoryViewerProps) {
  const [storyIndex, setStoryIndex] = useState(0)
  const [liking, setLiking] = useState(false)
  const [replyDraft, setReplyDraft] = useState('')
  const [replySending, setReplySending] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)
  const [stats, setStats] = useState<{ views: StoryStat[]; likes: StoryStat[] } | null>(null)
  const [progress, setProgress] = useState(0)
  const lastOpenedGroupIdRef = useRef<string | null>(null)
  const progressTimerRef = useRef<number | null>(null)
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  const activeGroupIndex = useMemo(
    () => groups.findIndex((group) => group.user.id === activeGroupId),
    [activeGroupId, groups]
  )
  const activeGroup = activeGroupIndex >= 0 ? groups[activeGroupIndex] : null
  const activeStory = (activeGroup?.stories[storyIndex] || null) as any

  const fetchStats = async () => {
    if (!activeStory || activeGroup?.user.id !== currentUserId) return
    setStatsLoading(true)
    try {
      const response = await fetch(`/api/portal/internal-chat/stories/${activeStory.id}`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch story stats:', error)
    } finally {
      setStatsLoading(false)
    }
  }

  const toggleLike = async (type: string = 'LIKE') => {
    if (!activeStory || liking) return
    setLiking(true)
    try {
      const response = await fetch(`/api/portal/internal-chat/stories/${activeStory.id}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      })
      if (response.ok) {
        const data = await response.json()
        if (onLike) onLike(activeStory.id, data.liked, data.type)
      }
    } catch (error) {
      console.error('Failed to like story:', error)
    } finally {
      setLiking(false)
    }
  }

  const getReactionIcon = (type?: string, className?: string) => {
    switch (type) {
      case 'LOVE': return <Heart className={cn(className, "text-pink-500 fill-current")} />
      case 'HAHA': return <Laugh className={cn(className, "text-amber-400")} />
      case 'WOW': return <Sparkles className={cn(className, "text-blue-400")} />
      case 'SAD': return <Frown className={cn(className, "text-indigo-400")} />
      default: return <Heart className={cn(className, activeStory?.liked ? "text-pink-500 fill-current" : "text-white")} />
    }
  }

  const handleReply = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeStory || !replyDraft.trim() || replySending || !onReply) return
    
    setReplySending(true)
    try {
      await onReply(activeStory.id, replyDraft.trim())
      setReplyDraft('')
    } finally {
      setReplySending(false)
    }
  }
  const backgroundClass = activeStory?.backgroundStyle === 'ocean'
    ? 'bg-[radial-gradient(circle_at_top,#0f766e_0%,#155e75_38%,#0f172a_100%)]'
    : activeStory?.backgroundStyle === 'sunset'
      ? 'bg-[radial-gradient(circle_at_top,#fb7185_0%,#f97316_38%,#431407_100%)]'
      : activeStory?.backgroundStyle === 'graphite'
        ? 'bg-[radial-gradient(circle_at_top,#475569_0%,#111827_50%,#020617_100%)]'
        : 'bg-[radial-gradient(circle_at_top,#6366f1_0%,#7c3aed_35%,#0f172a_100%)]'

  useEffect(() => {
    if (!open || !activeGroupId) return
    if (lastOpenedGroupIdRef.current === activeGroupId) return
    const targetGroup = groups.find((group) => group.user.id === activeGroupId)
    if (!targetGroup) return
    const nextIndex = targetGroup.stories.findIndex((story) => !story.seen)
    setStoryIndex(nextIndex >= 0 ? nextIndex : 0)
    lastOpenedGroupIdRef.current = activeGroupId
  }, [activeGroupId, groups, open])

  useEffect(() => {
    if (open) return
    lastOpenedGroupIdRef.current = null
    setShowStats(false)
    setStats(null)
  }, [open])

  useEffect(() => {
    setShowStats(false)
    setStats(null)
  }, [storyIndex])

  useEffect(() => {
    if (!open || !activeStory) return
    onSeen(activeStory.id)
  }, [activeStory, onSeen, open])

  useEffect(() => {
    if (!open || !activeGroup || !activeStory || showStats || replyDraft || replySending) {
      if (progressTimerRef.current) {
        window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
      return
    }

    setProgress(0)
    const startTime = Date.now()
    const interval = 50 // update every 50ms

    progressTimerRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime
      const currentProgress = Math.min((elapsed / STORY_PROGRESS_MS) * 100, 100)
      setProgress(currentProgress)

      if (currentProgress >= 100) {
        if (progressTimerRef.current) window.clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
        goNext()
      }
    }, interval)

    return () => {
      if (progressTimerRef.current) window.clearInterval(progressTimerRef.current)
    }
  }, [activeStory, open, showStats])

  function goPrevious() {
    if (!activeGroup) return
    if (storyIndex > 0) {
      setStoryIndex((previous) => previous - 1)
      return
    }
    if (activeGroupIndex > 0) {
      const previousGroup = groups[activeGroupIndex - 1]
      onSelectGroup(previousGroup.user.id)
    }
  }

  function goNext() {
    if (!activeGroup) return
    if (storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex((previous) => previous + 1)
      return
    }
    if (activeGroupIndex < groups.length - 1) {
      onSelectGroup(groups[activeGroupIndex + 1].user.id)
      return
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-slate-200/70 bg-transparent p-0 shadow-none sm:rounded-[32px]">
        <DialogTitle className="sr-only">
          {activeGroup ? `${activeGroup.user.name}'s Stories` : 'Story Viewer'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          View and interact with user stories.
        </DialogDescription>
        {activeGroup && activeStory ? (
          <div className="relative overflow-hidden rounded-[32px] border border-white/10 bg-slate-950 shadow-[0_50px_120px_-42px_rgba(2,6,23,0.8)]">
            <div className="absolute inset-x-0 top-0 z-20 flex gap-1 px-5 pt-5">
              {activeGroup.stories.map((story, index) => (
                <div key={story.id} className="h-1 flex-1 overflow-hidden rounded-full bg-white/15">
                  <div
                    className={cn(
                      'h-full rounded-full bg-white transition-all duration-75',
                      index < storyIndex ? 'w-full' : index === storyIndex ? 'w-0' : 'w-0'
                    )}
                    style={index === storyIndex ? { width: `${progress}%` } : {}}
                  />
                </div>
              ))}
            </div>

            <div className={cn('relative min-h-[70vh] px-5 pb-6 pt-16 text-white sm:px-8', backgroundClass)}>
              <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.45),rgba(2,6,23,0.08)_24%,rgba(2,6,23,0.58))]" />

              <div className="relative z-10 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar className="h-12 w-12 border border-white/20">
                    {activeGroup.user.avatarUrl ? <AvatarImage src={activeGroup.user.avatarUrl} alt={activeGroup.user.name} /> : null}
                    <AvatarFallback className="bg-white/10 text-white">{activeGroup.user.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{activeGroup.user.name}</div>
                    <p className="truncate text-xs text-white/75">
                      {new Intl.DateTimeFormat(
                        language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF',
                        { hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric' }
                      ).format(new Date(activeStory.createdAt))}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 relative z-[60]">
                  <div 
                    className={cn(
                      "hidden items-center gap-4 rounded-full bg-black/25 px-3 py-1 text-xs text-white/80 sm:flex",
                      activeGroup.user.id === currentUserId && "cursor-pointer hover:bg-black/40 transition-colors"
                    )}
                    onClick={() => {
                      if (activeGroup.user.id === currentUserId) {
                        setShowStats(true)
                        void fetchStats()
                      }
                    }}
                  >
                    <div className="flex items-center gap-1">
                      <Eye className="h-3.5 w-3.5" />
                      {activeStory.viewCount}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        className={cn(
                          'transition-colors hover:text-white',
                          activeStory.liked ? 'text-pink-500' : 'text-white/80'
                        )}
                        onClick={(e) => {
                          e.stopPropagation()
                          void toggleLike(activeStory.likedType || 'LIKE')
                        }}
                        disabled={liking}
                      >
                        {liking ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          getReactionIcon(activeStory.likedType, "h-3.5 w-3.5")
                        )}
                      </button>
                      <span className="font-medium">{activeStory.likeCount || 0}</span>
                    </div>
                  </div>
                  {activeGroup.user.id === currentUserId && onDelete ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-full text-white hover:bg-white/10 hover:text-white"
                      onClick={() => onDelete(activeStory.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => onOpenChange(false)}
                    className="relative z-[100] h-10 w-10 rounded-full text-white hover:bg-white/10 hover:text-white"
                  >
                    <X className="h-6 w-6" />
                  </Button>
                </div>
              </div>

              <div className="relative z-10 flex min-h-[56vh] items-center justify-center py-8">
                {activeStory.mediaUrl ? (
                  <img
                    src={activeStory.mediaUrl}
                    alt={activeStory.caption || 'Story media'}
                    className="max-h-[56vh] w-full rounded-[28px] border border-white/15 object-cover shadow-[0_32px_80px_-42px_rgba(15,23,42,0.8)]"
                  />
                ) : (
                  <div className="mx-auto max-w-2xl text-center">
                    <p className="text-4xl font-black leading-[1.4] tracking-tight sm:text-5xl">
                      {activeStory.caption || pick('استوری متنی', 'Text story', 'متني سټوري')}
                    </p>
                  </div>
                )}
              </div>

              {activeStory.caption && activeStory.mediaUrl ? (
                <div className="relative z-10 mx-auto max-w-2xl rounded-[28px] border border-white/12 bg-black/20 px-5 py-4 text-center text-sm leading-7 backdrop-blur-md">
                  {activeStory.caption}
                </div>
              ) : null}

              <button
                type="button"
                className="absolute inset-y-0 left-0 z-10 hidden w-20 items-center justify-start pl-3 text-white/80 transition hover:text-white sm:flex"
                onClick={goPrevious}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                className="absolute inset-y-0 right-0 z-10 hidden w-20 items-center justify-end pr-3 text-white/80 transition hover:text-white sm:flex"
                onClick={goNext}
              >
                <ChevronRight className="h-6 w-6" />
              </button>

              <div className="relative z-10 mt-6 flex items-center justify-between sm:hidden">
                <Button type="button" variant="secondary" className="rounded-full" onClick={goPrevious}>
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  {pick('قبلی', 'Previous', 'مخکینی')}
                </Button>
                <Button type="button" variant="secondary" className="rounded-full" onClick={goNext}>
                  {pick('بعدی', 'Next', 'بل')}
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              {/* Interaction Bar */}
              <div className="relative z-10 mt-8 flex items-center gap-3">
                <form onSubmit={handleReply} className="flex flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={replyDraft}
                      onChange={(e) => setReplyDraft(e.target.value)}
                      placeholder={pick('ارسال پاسخ...', 'Send a reply...', 'ځواب واستوئ...')}
                      className="w-full rounded-full border border-white/20 bg-black/30 px-5 py-3 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:bg-black/40 focus:outline-none focus:ring-0 backdrop-blur-md"
                    />
                    <button
                      type="submit"
                      disabled={!replyDraft.trim() || replySending}
                      className="absolute inset-y-1.5 left-1.5 flex aspect-square items-center justify-center rounded-full bg-violet-600 text-white transition-all hover:bg-violet-500 disabled:opacity-50 sm:left-2 sm:inset-y-2"
                    >
                      {replySending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className={cn("h-4 w-4", language !== 'en' && "rotate-180")} />
                      )}
                    </button>
                  </div>
                </form>

                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'group flex h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-black/30 transition-all hover:bg-black/40 backdrop-blur-md',
                        activeStory.liked ? 'text-pink-500 border-pink-500/30 bg-pink-500/10' : 'text-white'
                      )}
                      disabled={liking}
                    >
                      {liking ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        getReactionIcon(activeStory.likedType, "h-5 w-5 transition-transform group-hover:scale-110")
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto rounded-full border-white/10 bg-black/80 p-1 backdrop-blur-md" side="top" align="end" sideOffset={10}>
                    <div className="flex items-center gap-1">
                      {[
                        { type: 'LIKE', icon: <Heart className="h-5 w-5 text-white" /> },
                        { type: 'LOVE', icon: <Heart className="h-5 w-5 text-pink-500 fill-current" /> },
                        { type: 'HAHA', icon: <Laugh className="h-5 w-5 text-amber-400" /> },
                        { type: 'WOW', icon: <Sparkles className="h-5 w-5 text-blue-400" /> },
                        { type: 'SAD', icon: <Frown className="h-5 w-5 text-indigo-400" /> },
                      ].map((reaction) => (
                        <button
                          key={reaction.type}
                          type="button"
                          className={cn(
                            "flex h-10 w-10 items-center justify-center rounded-full transition-all hover:bg-white/10 hover:scale-110",
                            activeStory.likedType === reaction.type && "bg-white/20"
                          )}
                          onClick={() => void toggleLike(reaction.type)}
                        >
                          {reaction.icon}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {showStats && activeGroup.user.id === currentUserId && (
              <div className="absolute inset-0 z-30 flex flex-col bg-slate-950/95 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-10 duration-300">
                <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <Users className="h-5 w-5 text-violet-400" />
                    <h3 className="text-lg font-bold text-white">
                      {pick('آمار استوری', 'Story statistics', 'د سټوري احصایه')}
                    </h3>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-full text-white hover:bg-white/10"
                    onClick={() => setShowStats(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                  {statsLoading ? (
                    <div className="flex h-full flex-col items-center justify-center gap-3 text-white/60">
                      <Loader2 className="h-8 w-8 animate-spin" />
                      <p className="text-sm">{pick('در حال دریافت اطلاعات...', 'Loading stats...', 'د معلوماتو ترلاسه کول...')}</p>
                    </div>
                  ) : stats ? (
                    <div className="space-y-8">
                      {/* Likes Section */}
                      <section>
                        <div className="mb-4 flex items-center gap-2 text-pink-500">
                          <Heart className="h-4 w-4 fill-current" />
                          <h4 className="text-sm font-bold uppercase tracking-wider">
                            {pick('لایک‌ها', 'Likes', 'لایکونه')} ({stats.likes.length})
                          </h4>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {stats.likes.map((like) => (
                            <div key={like.user.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3">
                                <div className="relative">
                                  <Avatar className="h-10 w-10 border border-white/10">
                                    {like.user.avatarUrl ? <AvatarImage src={like.user.avatarUrl} alt={like.user.name} /> : null}
                                    <AvatarFallback className="bg-white/10 text-white text-xs">{like.user.name.slice(0, 1)}</AvatarFallback>
                                  </Avatar>
                                  <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 border border-white/10">
                                    {getReactionIcon(like.type, "h-3 w-3")}
                                  </div>
                                </div>
                                <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">{like.user.name}</p>
                                <p className="text-[10px] text-white/50">
                                  {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fa-AF', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }).format(new Date(like.at))}
                                </p>
                              </div>
                            </div>
                          ))}
                          {!stats.likes.length && (
                            <p className="col-span-full py-4 text-center text-sm text-white/40 italic">
                              {pick('هنوز لایکی ثبت نشده است', 'No likes yet', 'لا تر اوسه لایک نشته')}
                            </p>
                          )}
                        </div>
                      </section>

                      {/* Views Section */}
                      <section>
                        <div className="mb-4 flex items-center gap-2 text-sky-400">
                          <Eye className="h-4 w-4" />
                          <h4 className="text-sm font-bold uppercase tracking-wider">
                            {pick('بازدیدها', 'Views', 'کتنې')} ({stats.views.length})
                          </h4>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {stats.views.map((view) => (
                            <div key={view.user.id} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/5 p-3">
                              <Avatar className="h-10 w-10 border border-white/10">
                                {view.user.avatarUrl ? <AvatarImage src={view.user.avatarUrl} alt={view.user.name} /> : null}
                                <AvatarFallback className="bg-white/10 text-white text-xs">{view.user.name.slice(0, 1)}</AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">{view.user.name}</p>
                                <p className="text-[10px] text-white/50">
                                  {new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'fa-AF', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }).format(new Date(view.at))}
                                </p>
                              </div>
                            </div>
                          ))}
                          {!stats.views.length && (
                            <p className="col-span-full py-4 text-center text-sm text-white/40 italic">
                              {pick('هنوز بازدیدی ثبت نشده است', 'No views yet', 'لا تر اوسه کتنه نشته')}
                            </p>
                          )}
                        </div>
                      </section>
                    </div>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
