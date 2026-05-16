'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import {
  Check,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  Forward,
  MapPin,
  MoreVertical,
  Pause,
  Play,
  Reply,
  Star,
  Trash2,
  Volume2,
} from 'lucide-react'
import type { PortalInternalMessage } from '@/lib/portal-internal-chat-types'

interface EnhancedMessageBubbleProps {
  message: PortalInternalMessage
  isMine: boolean
  language: string
  currentUserId: string | null
  canDelete?: boolean
  onReply?: (message: PortalInternalMessage) => void
  onForward?: (message: PortalInternalMessage) => void
  onStar?: (messageId: string) => void
  onDelete?: (messageId: string) => void
  onReact?: (messageId: string, emoji: string) => void
  onCopy?: (text: string) => void
}

const QUICK_REACTIONS = ['👍', '❤️', '😊', '😂', '😮', '😢', '🙏', '🔥']

function AudioPlayer({ url, isMine, language }: { url: string; isMine: boolean; language: string }) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const togglePlay = () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)
    const handleTimeUpdate = () => setCurrentTime(audio.currentTime)
    const handleLoadedMetadata = () => setDuration(audio.duration)
    const handleEnded = () => {
      setIsPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('play', handlePlay)
    audio.addEventListener('pause', handlePause)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('ended', handleEnded)

    return () => {
      audio.removeEventListener('play', handlePlay)
      audio.removeEventListener('pause', handlePause)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('ended', handleEnded)
    }
  }, [])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  return (
    <div className={cn(
      'flex items-center gap-3 min-w-[200px] sm:min-w-[240px] rounded-2xl p-2.5',
      isMine ? 'bg-white/10' : 'bg-slate-100 dark:bg-slate-800'
    )}>
      <audio ref={audioRef} src={url} preload="metadata" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          'h-10 w-10 shrink-0 rounded-full',
          isMine ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-violet-500 text-white hover:bg-violet-600'
        )}
        onClick={togglePlay}
      >
        {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 ml-0.5" />}
      </Button>
      <div className="flex flex-1 flex-col gap-1.5 min-w-0">
        <Slider
          value={[currentTime]}
          max={duration || 100}
          step={0.1}
          onValueChange={([value]) => {
            if (audioRef.current) audioRef.current.currentTime = value
          }}
          className="cursor-pointer"
        />
        <div className="flex items-center justify-between text-[10px] opacity-70">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
      <Volume2 className="h-4 w-4 shrink-0 opacity-50" />
    </div>
  )
}

export function EnhancedMessageBubble({
  message,
  isMine,
  language,
  currentUserId,
  canDelete = isMine,
  onReply,
  onForward,
  onStar,
  onDelete,
  onReact,
  onCopy,
}: EnhancedMessageBubbleProps) {
  const [showReactions, setShowReactions] = useState(false)
  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  const isVisualAttachment =
    !!message.fileUrl &&
    (message.fileName === 'GIF' ||
      /\.(gif|png|jpe?g|webp)(\?.*)?$/i.test(message.fileUrl))
  const isAudioAttachment =
    !!message.fileUrl && /\.(webm|ogg|mp3|m4a)(\?.*)?$/i.test(message.fileUrl)
  const locationUrlMatch = message.message.match(/https?:\/\/(?:www\.)?google\.com\/maps\?q=-?\d+(?:\.\d+)?,-?\d+(?:\.\d+)?/i)
  const locationUrl = locationUrlMatch?.[0] || null
  const textContent = locationUrl ? message.message.replace(locationUrl, '').trim() : message.message

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString(
      language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF',
      { hour: '2-digit', minute: '2-digit' }
    )
  }

  const myReaction = message.reactions?.find((r) => r.userId === currentUserId)
  const otherReactions = message.reactions?.filter((r) => r.userId !== currentUserId) || []
  const reactionCounts = otherReactions.reduce(
    (acc, r) => {
      acc[r.emoji] = (acc[r.emoji] || 0) + 1
      return acc
    },
    {} as Record<string, number>
  )

  return (
    <div
      className={cn(
        'group relative flex gap-2 transition-all duration-200',
        isMine ? 'justify-end' : 'justify-start'
      )}
      onMouseEnter={() => setShowReactions(false)}
    >
      <div
        className={cn(
          'relative max-w-[88%] sm:max-w-[82%]',
          'rounded-[18px] shadow-lg transition-all duration-200',
          isMine
            ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white'
            : 'border border-slate-200/50 bg-white/82 text-slate-900 backdrop-blur-md dark:border-white/10 dark:bg-slate-950/55 dark:text-white'
        )}
      >
        {/* Reply Preview */}
        {message.replyToMessage && (
          <div
            className={cn(
              'mb-2 rounded-t-[18px] border-l-4 px-4 pt-3',
              isMine
                ? 'border-white/40 bg-white/10'
                : 'border-violet-400/60 bg-violet-500/10'
            )}
          >
            <p className="text-xs font-semibold opacity-90">
              {message.replyToSenderName}
            </p>
            <p className="mt-1 line-clamp-2 text-xs opacity-75">
              {message.replyToMessage}
            </p>
          </div>
        )}

        {/* Message Content */}
        <div className="px-4 py-3">
          {!isMine && (
            <p className="mb-1 text-xs font-semibold opacity-70">
              {message.senderName}
            </p>
          )}

          {message.forwardedFromId && !message.deletedAt ? (
            <p
              className={cn(
                'mb-1 flex items-center gap-1 text-[11px] font-semibold opacity-80',
                isMine ? 'text-white/80' : 'text-violet-700 dark:text-violet-200'
              )}
            >
              <Forward className="h-3 w-3" />
              {pick('ارسال‌شده', 'Forwarded', 'لېږل شوی')}
            </p>
          ) : null}

          {textContent && (
            <p className="whitespace-pre-wrap break-words text-sm leading-7">
              {textContent}
            </p>
          )}

          {locationUrl ? (
            <a
              href={locationUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'mt-3 flex items-center justify-between gap-3 rounded-2xl border px-3 py-3 transition hover:translate-y-[-1px]',
                isMine
                  ? 'border-white/15 bg-white/10 text-white hover:bg-white/14'
                  : 'border-violet-200/60 bg-violet-50/90 text-violet-950 hover:bg-violet-100 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-100 dark:hover:bg-violet-500/15'
              )}
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={cn(
                    'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                    isMine ? 'bg-white/15' : 'bg-violet-500/15 text-violet-700 dark:text-violet-200'
                  )}
                >
                  <MapPin className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {pick('موقعیت زنده', 'Shared location', 'شریک شوی ځای')}
                  </div>
                  <div className="truncate text-xs opacity-75">
                    {pick('باز کردن در نقشه', 'Open in maps', 'په نقشه کې پرانیزئ')}
                  </div>
                </div>
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 opacity-75" />
            </a>
          ) : null}

          {/* Visual Attachments */}
          {isVisualAttachment && message.fileUrl && (
            <a
              href={message.fileUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 block overflow-hidden rounded-2xl border border-white/10 transition-transform hover:scale-[1.02]"
            >
              <img
                src={message.fileUrl}
                alt={message.fileName || 'Attachment'}
                className="max-h-72 w-full object-cover"
                loading="lazy"
              />
            </a>
          )}

          {/* Audio Attachments */}
          {isAudioAttachment && message.fileUrl && (
            <div className="mt-3">
              <AudioPlayer url={message.fileUrl} isMine={isMine} language={language} />
            </div>
          )}

          {/* Time and Status */}
          <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] opacity-75">
            {message.isStarred && <Star className="h-3 w-3 fill-current" />}
            <span>{formatTime(message.createdAt)}</span>
            {isMine && (
              <>
                {message.status === 'read' && (
                  <CheckCheck className="h-3.5 w-3.5 text-blue-300" />
                )}
                {message.status === 'delivered' && (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                {message.status === 'sent' && <Check className="h-3.5 w-3.5" />}
              </>
            )}
          </div>
        </div>

        {/* Reactions Display */}
        {(myReaction || Object.keys(reactionCounts).length > 0) && (
          <div
            className={cn(
              'absolute -bottom-2 flex gap-1',
              isMine ? 'right-2' : 'left-2'
            )}
          >
            {myReaction && (
              <div className="flex h-6 items-center rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-blue-600 px-2 text-xs shadow-lg dark:border-slate-800">
                {myReaction.emoji}
              </div>
            )}
            {Object.entries(reactionCounts).map(([emoji, count]) => (
              <div
                key={emoji}
                className="flex h-6 items-center gap-1 rounded-full border-2 border-white bg-slate-100 px-2 text-xs shadow-lg dark:border-slate-800 dark:bg-slate-700"
              >
                <span>{emoji}</span>
                {count > 1 && (
                  <span className="text-[10px] font-semibold">{count}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Quick Reactions Popup */}
        {showReactions && (
          <div
            className={cn(
              'absolute -top-12 z-10 flex gap-1 rounded-full border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-800',
              isMine ? 'right-0' : 'left-0'
            )}
          >
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  onReact?.(message.id, emoji)
                  setShowReactions(false)
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full text-lg transition-transform hover:scale-110 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Message Actions */}
      <div
        className={cn(
          'flex items-center gap-1 transition-opacity opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
          isMine ? 'order-first' : 'order-last'
        )}
      >
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700"
          onClick={() => setShowReactions(!showReactions)}
        >
          <span className="text-base">😊</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full bg-white/90 hover:bg-white dark:bg-slate-800/90 dark:hover:bg-slate-700"
            >
              <MoreVertical className="h-6 w-6" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={isMine ? 'end' : 'start'}>
            <DropdownMenuItem onClick={() => onReply?.(message)}>
              <Reply className="mr-2 h-5 w-5" />
              {pick('پاسخ', 'Reply', 'ځواب')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onForward?.(message)}>
              <Forward className="mr-2 h-5 w-5" />
              {pick('ارسال مجدد', 'Forward', 'بیا لېږل')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onStar?.(message.id)}>
              <Star
                className={cn(
                  'mr-2 h-4 w-4',
                  message.isStarred && 'fill-current text-yellow-500'
                )}
              />
              {message.isStarred
                ? pick('حذف ستاره', 'Unstar', 'ستوری لرې کول')
                : pick('ستاره', 'Star', 'ستوری')}
            </DropdownMenuItem>
            {message.fileUrl && (
              <DropdownMenuItem
                onClick={() => {
                  // Prefer opening in a new tab; user can download from there.
                  window.open(message.fileUrl!, '_blank', 'noopener,noreferrer')
                }}
              >
                <Download className="mr-2 h-5 w-5" />
                {pick('دانلود', 'Download', 'ډاونلوډ')}
              </DropdownMenuItem>
            )}
            {(textContent || locationUrl) && (
              <DropdownMenuItem onClick={() => onCopy?.(locationUrl ? `${textContent}\n${locationUrl}`.trim() : textContent)}>
                <Copy className="mr-2 h-5 w-5" />
                {pick('کپی', 'Copy', 'کاپي')}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                onClick={() => onDelete?.(message.id)}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-5 w-5" />
                {pick('حذف', 'Delete', 'حذف')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}
