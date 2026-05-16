'use client'

import './whatsapp-styles.css'
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { PortalProfileSheet } from '@/components/chat/portal-profile-sheet'
import { PortalPeopleDialog } from '@/components/chat/portal-people-dialog'
import { AdminSupportDashboard } from '@/components/chat/AdminSupportDashboard'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { SarafDashboard } from '@/components/chat/SarafDashboard'
import { PortalStoryViewer } from '@/components/chat/portal-story-viewer'
import { PortalStoryStrip } from '@/components/chat/portal-story-strip'
import { EnhancedMessageBubble } from '@/components/chat/enhanced-message-bubble'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { useAdaptivePolling } from '@/hooks/useAdaptivePolling'
import { useLanguage } from '@/hooks/useLanguage'
import { preparePortalChatUpload } from '@/lib/portal-chat-upload-client'
import {
  PORTAL_CHAT_AUDIO_BITS_PER_SECOND,
  PORTAL_CHAT_MAX_RECORDING_SECONDS,
  PORTAL_CHAT_MAX_UPLOAD_BYTES,
  formatPortalUploadLimit,
} from '@/lib/portal-chat-upload'
import {
  checkVoiceRecordingSupport,
  getSupportedMimeType,
  getPreferredAudioExtension,
  requestMicrophoneAccess,
} from '@/lib/voice-recording-handler'
import type {
  PortalConnectionRequest,
  PortalContact as Person,
  PortalDirectoryEntry,
  PortalInternalChat as InternalChat,
  PortalInternalMessage as InternalMessage,
  PortalNotificationItem as NotificationItem,
  PortalStoryGroup,
} from '@/lib/portal-internal-chat-types'
import { cn } from '@/lib/utils'
import { Archive, ArchiveRestore, BellRing, Building2, Check, ChevronDown, ChevronLeft, Clock3, Film, ImagePlus, Info, Loader2, MapPin, MessageCircle, Mic, MoreVertical, Palette, Paperclip, Plus, RefreshCw, Search, Send, Shield, Sparkles, StopCircle, Trash2, UserCheck, UserPlus, UserRound, Users, Volume2, VolumeX, Workflow, X } from 'lucide-react'

type PortalTab = 'customers' | 'operations' | 'announcements'
type InternalContact = Person
type ChatTheme = 'midnight' | 'violet' | 'forest' | 'sunset' | 'ocean' | 'graphite' | 'lavender' | 'crimson'
type RetentionPreset = 'ALL' | '24H' | '7D' | '30D'
type StoredChatPreference = { archived?: boolean; muted?: boolean; theme?: ChatTheme; clearBefore?: string | null; retention?: RetentionPreset }
type UploadedPortalMedia = { url: string; filename: string; kind: 'image' | 'audio' | 'document' }
type GifEntry = { id: string; url: string; previewUrl: string; title: string; tags: string[] }
type GifItem = { id: string; url: string; previewUrl: string; title: string }

const TARGET_WAV_SAMPLE_RATE = 8000

function downsampleBuffer(input: Float32Array, inputSampleRate: number, outputSampleRate: number) {
  if (outputSampleRate >= inputSampleRate) return input
  const sampleRateRatio = inputSampleRate / outputSampleRate
  const outputLength = Math.max(1, Math.round(input.length / sampleRateRatio))
  const output = new Float32Array(outputLength)
  let offsetResult = 0
  let offsetInput = 0
  while (offsetResult < outputLength) {
    const nextOffsetInput = Math.min(input.length, Math.round((offsetResult + 1) * sampleRateRatio))
    let accum = 0
    let count = 0
    for (let i = offsetInput; i < nextOffsetInput; i += 1) {
      accum += input[i] ?? 0
      count += 1
    }
    output[offsetResult] = count ? accum / count : 0
    offsetResult += 1
    offsetInput = nextOffsetInput
  }
  return output
}

function encodeWavPcm16(samples: Float32Array, sampleRate: number) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // PCM header size
  view.setUint16(20, 1, true) // PCM format
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i += 1) {
    const s = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}

const FALLBACK_GIFS: GifEntry[] = [
  {
    id: 'fallback-1',
    url: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/200w.gif',
    title: 'Hello',
    tags: ['hello', 'hi', 'wave'],
  },
  {
    id: 'fallback-2',
    url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/200w.gif',
    title: 'Thanks',
    tags: ['thanks', 'thank', 'appreciate'],
  },
  {
    id: 'fallback-3',
    url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/200w.gif',
    title: 'OK',
    tags: ['ok', 'okay', 'done'],
  },
  {
    id: 'fallback-4',
    url: 'https://media.giphy.com/media/5GoVLqeAOo6PK/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/5GoVLqeAOo6PK/200w.gif',
    title: 'Great',
    tags: ['great', 'nice', 'cool'],
  },
  {
    id: 'fallback-5',
    url: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/3o7aD2saalBwwftBIY/200w.gif',
    title: 'Loading',
    tags: ['loading', 'wait'],
  },
  {
    id: 'fallback-6',
    url: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif',
    previewUrl: 'https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/200w.gif',
    title: 'Love',
    tags: ['love', 'heart'],
  },
]

const CHAT_PREFS_PREFIX = 'portal-internal-chat-prefs'
const QUICK_REPLIES_PREFIX = 'portal-internal-chat-quick-replies'
const chatThemePanelClasses: Record<ChatTheme, string> = {
  midnight: 'bg-[radial-gradient(circle_at_top,#1e293b_0%,#0f172a_48%,#020617_100%)]',
  violet: 'bg-[radial-gradient(circle_at_top,#312e81_0%,#4c1d95_35%,#0f172a_100%)]',
  forest: 'bg-[radial-gradient(circle_at_top,#0f766e_0%,#1d4ed8_38%,#020617_100%)]',
  sunset: 'bg-[radial-gradient(circle_at_top,#7c2d12_0%,#431407_45%,#020617_100%)]',
  ocean: 'bg-[radial-gradient(circle_at_top,#0c4a6e_0%,#082f49_48%,#020617_100%)]',
  graphite: 'bg-[radial-gradient(circle_at_top,#334155_0%,#1e293b_50%,#020617_100%)]',
  lavender: 'bg-[radial-gradient(circle_at_top,#4c1d95_0%,#2e1065_48%,#020617_100%)]',
  crimson: 'bg-[radial-gradient(circle_at_top,#7f1d1d_0%,#450a0a_50%,#020617_100%)]',
}
const retentionWindowMs: Record<Exclude<RetentionPreset, 'ALL'>, number> = {
  '24H': 24 * 60 * 60 * 1000,
  '7D': 7 * 24 * 60 * 60 * 1000,
  '30D': 30 * 24 * 60 * 60 * 1000,
}
const formatDate = (value: string, language: string, withDate = true) =>
  new Intl.DateTimeFormat(language === 'en' ? 'en-US' : language === 'ps' ? 'ps-AF' : 'fa-AF', withDate ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' } : { hour: '2-digit', minute: '2-digit' }).format(new Date(value))

export default function InternalChatPage() {
  const { data: session } = useSession()
  const { language } = useLanguage()
  const router = useRouter()
  const searchParams = useSearchParams()
  const canHandleCustomers = session?.user?.role === 'SARAF' || session?.user?.role === 'USER'
  const canUseSarafConversations = session?.user?.role === 'USER'
  const canModerateMessages = session?.user?.role === 'ADMIN'
  const isAdmin = session?.user?.role === 'ADMIN'
  const isOwnerSaraf = session?.user?.role === 'SARAF'
  const currentUserId = session?.user?.id ?? null
  const requestedTab = searchParams.get('tab')
  const initialSessionId = searchParams.get('sessionId')
  const isRTL = language === 'fa' || language === 'ps'

  const [tab, setTab] = useState<PortalTab>('customers')
  const [search, setSearch] = useState('')
  const [chats, setChats] = useState<InternalChat[]>([])
  const [contacts, setContacts] = useState<InternalContact[]>([])
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
  const [messages, setMessages] = useState<InternalMessage[]>([])
  const [replyTo, setReplyTo] = useState<InternalMessage | null>(null)
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false)
  const [forwardingMessage, setForwardingMessage] = useState<InternalMessage | null>(null)
  const [forwardTargetChatId, setForwardTargetChatId] = useState<string | null>(null)
  const [forwardSearch, setForwardSearch] = useState('')
  const [forwardSending, setForwardSending] = useState(false)
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false)
  const [hasOlderMessages, setHasOlderMessages] = useState(true)
  const [isAtBottom, setIsAtBottom] = useState(true)
  const [draft, setDraft] = useState('')
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [createType, setCreateType] = useState<'DIRECT' | 'GROUP' | 'BRANCH_TO_BRANCH'>('DIRECT')
  const [createName, setCreateName] = useState('')
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([])
  const [workspaceLoading, setWorkspaceLoading] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list')
  const [gifUrl, setGifUrl] = useState('')
  const [gifSearch, setGifSearch] = useState('')
  const [trendingGifs, setTrendingGifs] = useState<GifItem[]>([])
  const [searchedGifs, setSearchedGifs] = useState<GifItem[]>([])
  const [gifLoading, setGifLoading] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifProvider, setGifProvider] = useState<'GIPHY' | 'FALLBACK'>('GIPHY')
  const [manualLocationOpen, setManualLocationOpen] = useState(false)
  const [manualLocationDraft, setManualLocationDraft] = useState('')
  const [manualLocationSending, setManualLocationSending] = useState(false)
  const [messageSearch, setMessageSearch] = useState('')
  const [showChatSearch, setShowChatSearch] = useState(false)
  const [quickReplyDraft, setQuickReplyDraft] = useState('')
  const [quickReplies, setQuickReplies] = useState<string[]>([])
  const [uploadingMedia, setUploadingMedia] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null)
  const [chatPrefs, setChatPrefs] = useState<Record<string, StoredChatPreference>>({})
  const [storyGroups, setStoryGroups] = useState<PortalStoryGroup[]>([])
  const [storyViewerUserId, setStoryViewerUserId] = useState<string | null>(null)
  const [storyCreateOpen, setStoryCreateOpen] = useState(false)
  const [storyCaption, setStoryCaption] = useState('')
  const [storyBackgroundStyle, setStoryBackgroundStyle] = useState<'amethyst' | 'ocean' | 'sunset' | 'graphite'>('amethyst')
  const [storyMediaUrl, setStoryMediaUrl] = useState('')
  const [storySubmitting, setStorySubmitting] = useState(false)
  const [storyUploading, setStoryUploading] = useState(false)
  const [profileSheetOpen, setProfileSheetOpen] = useState(false)
  const [maxActiveStoriesPerUser, setMaxActiveStoriesPerUser] = useState(8)
  const [peopleOpen, setPeopleOpen] = useState(false)
  const [directorySearch, setDirectorySearch] = useState('')
  const [connectionDirectory, setConnectionDirectory] = useState<PortalDirectoryEntry[]>([])
  const [incomingRequests, setIncomingRequests] = useState<PortalConnectionRequest[]>([])
  const [outgoingRequests, setOutgoingRequests] = useState<PortalConnectionRequest[]>([])
  const [connectionsLoading, setConnectionsLoading] = useState(false)
  const [connectionActionUserId, setConnectionActionUserId] = useState<string | null>(null)
  const [adminBroadcastDraft, setAdminBroadcastDraft] = useState('')
  const [adminBroadcastSending, setAdminBroadcastSending] = useState(false)
  const [adminSupportSessionId, setAdminSupportSessionId] = useState<string | null>(initialSessionId)
  const [messengerSettings, setMessengerSettings] = useState<{
    maxUploadBytes: number
    maxImageBytes: number
    maxAudioBytes: number
    maxDocumentBytes: number
    maxRecordingSec: number
    audioBitsPerSec: number
    maxStoriesPerUser: number
    storyTTLHours: number
  }>({
    maxUploadBytes: PORTAL_CHAT_MAX_UPLOAD_BYTES,
    maxImageBytes: PORTAL_CHAT_MAX_UPLOAD_BYTES,
    maxAudioBytes: PORTAL_CHAT_MAX_UPLOAD_BYTES,
    maxDocumentBytes: PORTAL_CHAT_MAX_UPLOAD_BYTES,
    maxRecordingSec: PORTAL_CHAT_MAX_RECORDING_SECONDS,
    audioBitsPerSec: PORTAL_CHAT_AUDIO_BITS_PER_SECOND,
    maxStoriesPerUser: 8,
    storyTTLHours: 24,
  })
  const chatPrefsStorageKey = useMemo(() => (currentUserId ? `${CHAT_PREFS_PREFIX}:${currentUserId}` : null), [currentUserId])
  const quickRepliesStorageKey = useMemo(() => (currentUserId ? `${QUICK_REPLIES_PREFIX}:${currentUserId}:${language}` : null), [currentUserId, language])
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const composerFormRef = useRef<HTMLFormElement | null>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const storyFileInputRef = useRef<HTMLInputElement | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const recordingChunksRef = useRef<Blob[]>([])
  const recordingStreamRef = useRef<MediaStream | null>(null)
  const wavRecorderRef = useRef<{
    audioContext: AudioContext
    processor: ScriptProcessorNode
    source: MediaStreamAudioSourceNode
    gain: GainNode
    stream: MediaStream
    chunks: Float32Array[]
  } | null>(null)
  const messagesScrollAreaRef = useRef<HTMLDivElement | null>(null)
  const messagesBottomAnchorRef = useRef<HTMLDivElement | null>(null)
  const pendingPrependRestoreRef = useRef<{ scrollTop: number; scrollHeight: number } | null>(null)
  const lastMessageCursorRef = useRef<Record<string, string>>({})
  const [isMdUp, setIsMdUp] = useState(false)

  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)
  const customerTabLabel = isAdmin
    ? pick('پشتیبانی', 'Support', 'ملاتړ')
    : canUseSarafConversations
      ? pick('صرافان', 'Sarafs', 'صرافان')
      : pick('مشتریان', 'Customers', 'مشتریان')
  const defaultQuickReplies = useMemo(
    () => [
      pick('پیام دریافت شد. در حال بررسی هستم.', 'Received. I am reviewing it now.', 'پیغام ترلاسه شو. اوس یې ګورم.'),
      pick('لطفاً کد یا شماره مرجع را همین‌جا بفرستید.', 'Please send the reference code here.', 'مهرباني وکړئ د راجع کوډ همدلته راولېږئ.'),
      pick('این مورد با شعبه و مدیریت هماهنگ می‌شود.', 'This is being coordinated with the branch and management.', 'دا موضوع له څانګې او مدیریت سره همغږي کېږي.'),
      pick('تایید شد. نتیجه نهایی را همین چت می‌فرستم.', 'Confirmed. I will send the final update in this chat.', 'تایید شو. وروستۍ نتیجه به په همدې چیټ کې درولېږم.'),
    ],
    [language]
  )
  const recordingLabel = recordingSeconds >= 60 ? `${Math.floor(recordingSeconds / 60)}:${String(recordingSeconds % 60).padStart(2, '0')}` : `0:${String(recordingSeconds).padStart(2, '0')}`
  const themeLabel = (theme: ChatTheme) => {
    if (theme === 'violet') return pick('بنفش', 'Violet', 'ارغواني')
    if (theme === 'forest') return pick('نیلی', 'Sapphire', 'نیلي')
    if (theme === 'sunset') return pick('غروب', 'Sunset', 'ماښام')
    if (theme === 'ocean') return pick('اقیانوس', 'Ocean', 'سمندر')
    if (theme === 'graphite') return pick('گرافیت', 'Graphite', 'ګرافایټ')
    if (theme === 'lavender') return pick('اسطوخودوس', 'Lavender', 'اسطوخودوس')
    if (theme === 'crimson') return pick('زرشکی', 'Crimson', 'ارغواني')
    return pick('سرمه‌ای', 'Midnight', 'شپېنی')
  }
  const storyBackgroundLabel = (theme: 'amethyst' | 'ocean' | 'sunset' | 'graphite') => {
    if (theme === 'ocean') return pick('اقیانوس', 'Ocean', 'سمندر')
    if (theme === 'sunset') return pick('غروب', 'Sunset', 'ماښام')
    if (theme === 'graphite') return pick('گرافیت', 'Graphite', 'ګرافایټ')
    return pick('آمتیست', 'Amethyst', 'ارغواني ډبره')
  }
  const retentionLabel = (preset: RetentionPreset) => {
    if (preset === '24H') return pick('۲۴ ساعت', '24 hours', '۲۴ ساعته')
    if (preset === '7D') return pick('۷ روز', '7 days', '۷ ورځې')
    if (preset === '30D') return pick('۳۰ روز', '30 days', '۳۰ ورځې')
    return pick('همه پیام‌ها', 'All messages', 'ټول پیغامونه')
  }
  const getChatPreference = (chatId?: string | null) => (chatId ? chatPrefs[chatId] || {} : {})
  const updateChatPreference = (chatId: string, updates: StoredChatPreference) => {
    setChatPrefs((previous) => ({
      ...previous,
      [chatId]: {
        ...previous[chatId],
        ...updates,
      },
    }))
  }
  const appendQuickReply = (value: string) => setDraft((previous) => previous ? `${previous.trim()}\n${value}` : value)
  const roleMeta = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return { label: pick('مدیر سیستم', 'Admin', 'اډمین'), badge: 'border-amber-300/60 bg-amber-50 text-amber-800 dark:border-amber-300/20 dark:bg-amber-500/10 dark:text-amber-200', icon: Shield }
      case 'SARAF':
        return { label: pick('صراف', 'Saraf', 'صراف'), badge: 'border-cyan-300/60 bg-cyan-50 text-cyan-800 dark:border-cyan-300/20 dark:bg-cyan-500/10 dark:text-cyan-200', icon: Building2 }
      case 'BRANCH_MANAGER':
        return { label: pick('مدیر شعبه', 'Branch Manager', 'د څانګې مدیر'), badge: 'border-sky-300/60 bg-sky-50 text-sky-800 dark:border-sky-300/20 dark:bg-sky-500/10 dark:text-sky-200', icon: Workflow }
      case 'BRANCH_STAFF':
        return { label: pick('کارمند شعبه', 'Branch Staff', 'د څانګې کارکوونکی'), badge: 'border-violet-300/60 bg-violet-50 text-violet-800 dark:border-violet-300/20 dark:bg-violet-500/10 dark:text-violet-200', icon: Users }
      case 'USER':
        return { label: pick('مشتری', 'Customer', 'مشتری'), badge: 'border-slate-300/60 bg-slate-50 text-slate-700 dark:border-slate-300/20 dark:bg-slate-500/10 dark:text-slate-200', icon: UserRound }
      default:
        return { label: role, badge: 'border-slate-300/60 bg-slate-50 text-slate-700 dark:border-slate-300/20 dark:bg-slate-500/10 dark:text-slate-200', icon: UserRound }
    }
  }
  const personContext = (person: Person) => {
    const branches = [...(person.managedBranchNames || []), ...(person.staffBranchNames || [])].filter(Boolean).join(language === 'en' ? ', ' : '، ')
    if (person.role === 'ADMIN') return pick('مدیریت مرکزی سیستم', 'Central system administration', 'د سیستم مرکزي اداره')
    if (person.role === 'SARAF' && person.sarafName) return pick(`شبکه صرافی ${person.sarafName}`, `${person.sarafName} exchange network`, `د ${person.sarafName} صرافي شبکه`)
    if (person.role === 'BRANCH_MANAGER' && branches) return pick(`مدیر شعبه: ${branches}`, `Manager of: ${branches}`, `د څانګې مدیر: ${branches}`)
    if (person.role === 'BRANCH_STAFF' && branches) return pick(`کارمند شعبه: ${branches}`, `Staff in: ${branches}`, `د څانګې کارکوونکی: ${branches}`)
    return person.email
  }
  const peers = (chat: InternalChat) => chat.participants.map((participant) => participant.user).filter((user) => user.id !== currentUserId)
  const chatTitle = (chat: InternalChat) => chat.name?.trim() || (peers(chat).length ? peers(chat).map((user) => user.name).join(language === 'en' ? ', ' : '، ') : pick('گفت‌وگوی داخلی', 'Internal chat', 'داخلي چیټ'))
  const chatSubtitle = (chat: InternalChat) => {
    if (chat.type === 'GROUP') return pick(`${peers(chat).length} عضو در این گروه`, `${peers(chat).length} participants in this group`, `په دې ډله کې ${peers(chat).length} ګډونوال`)
    if (chat.type === 'BRANCH_TO_BRANCH') return pick('هماهنگی شعبه و شبکه', 'Branch and network coordination', 'د څانګې او شبکې همغږي')
    return peers(chat)[0] ? personContext(peers(chat)[0]) : pick('گفت‌وگوی داخلی', 'Internal chat', 'داخلي چیټ')
  }

  const selectedChat = useMemo(() => chats.find((chat) => chat.id === selectedChatId) || null, [chats, selectedChatId])
  const hasActiveChat = !!selectedChatId
  const selectedChatPeers = useMemo(() => (selectedChat ? peers(selectedChat) : []), [selectedChat])
  const selectedChatPreference = useMemo(() => getChatPreference(selectedChatId), [chatPrefs, selectedChatId])
  const selectedStoryGroup = useMemo(
    () => storyGroups.find((group) => group.user.id === selectedChatPeers[0]?.id) || null,
    [selectedChatPeers, storyGroups]
  )
  const unreadInternal = useMemo(() => chats.reduce((sum, chat) => sum + chat.unreadCount, 0), [chats])
  const filteredChats = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    return chats.filter((chat) => {
      const matchesVisibility = showArchived ? !!getChatPreference(chat.id).archived : !getChatPreference(chat.id).archived
      if (!matchesVisibility) return false
      if (!normalized) return true
      return [chat.name || '', ...chat.participants.map((participant) => participant.user.name), ...chat.participants.map((participant) => participant.user.email), ...chat.participants.map((participant) => participant.user.role), ...chat.participants.map((participant) => participant.user.sarafName || '')].join(' ').toLowerCase().includes(normalized)
    })
  }, [chats, chatPrefs, search, showArchived])
  const forwardTargets = useMemo(() => {
    const normalized = forwardSearch.trim().toLowerCase()
    return chats
      .filter((chat) => chat.id !== selectedChatId)
      .filter((chat) => {
        if (!normalized) return true
        return `${chatTitle(chat)} ${chatSubtitle(chat)}`.toLowerCase().includes(normalized)
      })
  }, [chats, forwardSearch, selectedChatId])
  const filteredContacts = useMemo(() => {
    const normalized = search.trim().toLowerCase()
    if (!normalized) return contacts
    return contacts.filter((contact) => [contact.name, contact.email, contact.role, contact.sarafName || '', ...(contact.managedBranchNames || []), ...(contact.staffBranchNames || [])].join(' ').toLowerCase().includes(normalized))
  }, [contacts, search])
  const directStartContacts = useMemo(
    () => filteredContacts.filter((contact) => !(isAdmin && contact.role === 'USER')),
    [filteredContacts, isAdmin]
  )
  const branchNetworkContacts = useMemo(
    () => contacts.filter((contact) => contact.role === 'BRANCH_MANAGER' || contact.role === 'BRANCH_STAFF'),
    [contacts]
  )
  const createDialogContacts = useMemo(() => {
    let nextContacts = filteredContacts

    if (isAdmin) {
      nextContacts = nextContacts.filter((contact) => contact.role !== 'USER')
    }

    if (createType === 'BRANCH_TO_BRANCH') {
      nextContacts = nextContacts.filter(
        (contact) => contact.role === 'BRANCH_MANAGER' || contact.role === 'BRANCH_STAFF'
      )
    }

    return nextContacts
  }, [createType, filteredContacts, isAdmin])
  const filteredDirectory = useMemo(() => {
    const normalized = directorySearch.trim().toLowerCase()
    if (!normalized) return connectionDirectory
    return connectionDirectory.filter((entry) =>
      [
        entry.name,
        entry.email,
        entry.role,
        entry.sarafName || '',
        ...(entry.managedBranchNames || []),
        ...(entry.staffBranchNames || []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalized)
    )
  }, [connectionDirectory, directorySearch])
  const connectedPeople = useMemo(
    () => connectionDirectory.filter((entry) => entry.connectionStatus === 'CONNECTED').slice(0, 8),
    [connectionDirectory]
  )
  const pendingRequestCount = incomingRequests.length + outgoingRequests.length
  const visibleMessages = useMemo(() => {
    const clearBefore = selectedChatPreference.clearBefore ? new Date(selectedChatPreference.clearBefore).getTime() : null
    const retentionWindow = selectedChatPreference.retention && selectedChatPreference.retention !== 'ALL' ? retentionWindowMs[selectedChatPreference.retention] : null
    const normalizedSearch = messageSearch.trim().toLowerCase()
    return messages.filter((message) => {
      const createdAt = new Date(message.createdAt).getTime()
      if (clearBefore && createdAt <= clearBefore) return false
      if (retentionWindow && Date.now() - createdAt > retentionWindow) return false
      if (normalizedSearch && !`${message.senderName} ${message.message} ${message.fileName || ''}`.toLowerCase().includes(normalizedSearch)) return false
      return true
    })
  }, [messageSearch, messages, selectedChatPreference])

  useEffect(() => {
    if (!chatPrefsStorageKey) {
      setChatPrefs({})
      return
    }
    try {
      const raw = window.localStorage.getItem(chatPrefsStorageKey)
      setChatPrefs(raw ? JSON.parse(raw) : {})
    } catch {
      setChatPrefs({})
    }
  }, [chatPrefsStorageKey])

  useEffect(() => {
    if (!chatPrefsStorageKey) return
    window.localStorage.setItem(chatPrefsStorageKey, JSON.stringify(chatPrefs))
  }, [chatPrefs, chatPrefsStorageKey])

  useEffect(() => {
    if (!quickRepliesStorageKey) {
      setQuickReplies(defaultQuickReplies)
      return
    }
    try {
      const raw = window.localStorage.getItem(quickRepliesStorageKey)
      const nextValue = raw ? JSON.parse(raw) : defaultQuickReplies
      setQuickReplies(Array.isArray(nextValue) && nextValue.length ? nextValue : defaultQuickReplies)
    } catch {
      setQuickReplies(defaultQuickReplies)
    }
  }, [defaultQuickReplies, quickRepliesStorageKey])

  useEffect(() => {
    if (!quickRepliesStorageKey) return
    window.localStorage.setItem(quickRepliesStorageKey, JSON.stringify(quickReplies))
  }, [quickReplies, quickRepliesStorageKey])

  useEffect(() => {
    if (requestedTab === 'operations' || requestedTab === 'announcements' || requestedTab === 'customers') {
      setTab(requestedTab)
      return
    }
    setTab(isAdmin || canHandleCustomers || canUseSarafConversations ? 'customers' : 'operations')
  }, [canHandleCustomers, canUseSarafConversations, isAdmin, requestedTab])

  useEffect(() => {
    setAdminSupportSessionId(initialSessionId)
  }, [initialSessionId])

  useEffect(() => {
    const resetPageScroll = () => {
      const scrollingElement = document.scrollingElement
      if (scrollingElement) {
        scrollingElement.scrollTop = 0
      }
      document.documentElement.scrollTop = 0
      document.body.scrollTop = 0
    }

    resetPageScroll()
    const frame = window.requestAnimationFrame(resetPageScroll)
    return () => window.cancelAnimationFrame(frame)
  }, [mobileView, tab])

  useEffect(() => {
    const viewport = getMessagesViewport()
    if (!viewport) return

    const onScroll = () => {
      const remaining = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight
      setIsAtBottom(remaining < 64)
    }

    onScroll()
    viewport.addEventListener('scroll', onScroll, { passive: true })
    return () => viewport.removeEventListener('scroll', onScroll)
  }, [mobileView, selectedChatId, tab])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia('(min-width: 768px)')
    const update = () => setIsMdUp(mq.matches)
    update()

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update)
      return () => mq.removeEventListener('change', update)
    }

    // Safari fallback
    // eslint-disable-next-line deprecation/deprecation
    mq.addListener(update)
    // eslint-disable-next-line deprecation/deprecation
    return () => mq.removeListener(update)
  }, [])

  useEffect(() => {
    const viewport = getMessagesViewport()
    if (!viewport) return

    const restore = pendingPrependRestoreRef.current
    if (restore) {
      pendingPrependRestoreRef.current = null
      requestAnimationFrame(() => {
        const nextViewport = getMessagesViewport()
        if (!nextViewport) return
        const delta = nextViewport.scrollHeight - restore.scrollHeight
        nextViewport.scrollTop = restore.scrollTop + delta
      })
      return
    }

    if (isAtBottom) {
      requestAnimationFrame(() => scrollToBottom('auto'))
    }
  }, [isAtBottom, messages.length, mobileView, selectedChatId, tab])

  async function fetchWorkspace() {
    if (!session?.user?.id) return
    setWorkspaceLoading(true)
    try {
      const response = await fetch('/api/portal/internal-chat', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to load internal chat')
      const nextChats = data?.chats || []
      setChats(nextChats)
      setContacts(data?.contacts || [])
      setSelectedChatId((previous) => (previous && nextChats.some((chat: InternalChat) => chat.id === previous) ? previous : nextChats[0]?.id || null))
    } finally {
      setWorkspaceLoading(false)
    }
  }

  async function fetchMessages(
    chatId: string,
    options?: { mode?: 'initial' | 'poll' }
  ) {
    const mode = options?.mode ?? 'initial'
    const cursor = lastMessageCursorRef.current[chatId]

    const qs = new URLSearchParams()
    if (mode === 'poll') {
      if (cursor) {
        qs.set('after', cursor)
        qs.set('limit', '120')
      } else {
        qs.set('limit', '30')
      }
    } else {
      qs.set('limit', '60')
      qs.set('markRead', '1')
    }

    const response = await fetch(`/api/portal/internal-chat/messages/${chatId}?${qs.toString()}`, { cache: 'no-store' })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to load messages')
    const incoming: InternalMessage[] = data?.messages || []

    const newest = incoming[incoming.length - 1]?.createdAt
    if (newest) {
      lastMessageCursorRef.current[chatId] = newest
    }

    if (mode === 'poll') {
      if (!incoming.length) return
      setMessages((previous) => {
        const seen = new Set(previous.map((m) => m.id))
        const appended = incoming.filter((m) => !seen.has(m.id))
        return appended.length ? [...previous, ...appended] : previous
      })
      return
    }

    setMessages(incoming)
    setHasOlderMessages(incoming.length >= 60)
    setReplyTo(null)
    setIsAtBottom(true)
  }

  function getMessagesViewport() {
    const root = messagesScrollAreaRef.current
    if (!root || !root.isConnected || root.getClientRects().length === 0) return null
    const viewport = root.querySelector('[data-radix-scroll-area-viewport]') as HTMLDivElement | null
    if (!viewport || viewport.getClientRects().length === 0) return null
    return viewport
  }

  function scrollToBottom(behavior: ScrollBehavior = 'auto') {
    const viewport = getMessagesViewport()
    if (!viewport) return
    viewport.scrollTo({ top: viewport.scrollHeight, behavior })
  }

  async function loadOlderMessages() {
    if (!selectedChatId || loadingOlderMessages || !hasOlderMessages) return
    const oldest = messages[0]?.createdAt
    if (!oldest) {
      setHasOlderMessages(false)
      return
    }

    const viewport = getMessagesViewport()
    if (viewport) {
      pendingPrependRestoreRef.current = {
        scrollTop: viewport.scrollTop,
        scrollHeight: viewport.scrollHeight,
      }
    }

    setLoadingOlderMessages(true)
    try {
      const response = await fetch(`/api/portal/internal-chat/messages/${selectedChatId}?limit=50&before=${encodeURIComponent(oldest)}`, { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to load older messages')
      const older = data?.messages || []
      if (!older.length) {
        setHasOlderMessages(false)
        return
      }
      setMessages((previous) => [...older, ...previous])
      if (older.length < 50) setHasOlderMessages(false)
    } finally {
      setLoadingOlderMessages(false)
    }
  }

  async function fetchNotifications() {
    if (!session?.user?.id) return
    const response = await fetch('/api/notifications', { cache: 'no-store' })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to load notifications')
    setNotifications(data?.notifications || [])
    setUnreadNotifications(data?.unreadCount || 0)
  }

  async function fetchStories() {
    if (!session?.user?.id) return
    const response = await fetch('/api/portal/internal-chat/stories', { cache: 'no-store' })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to load stories')
    setStoryGroups(data?.storyGroups || [])
    setMaxActiveStoriesPerUser(data?.maxActiveStoriesPerUser || 8)
  }

  async function fetchConnections() {
    if (!session?.user?.id) return
    setConnectionsLoading(true)
    try {
      const response = await fetch('/api/portal/internal-chat/requests', { cache: 'no-store' })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to load connection requests')
      setConnectionDirectory(data?.directory || [])
      setIncomingRequests(data?.incomingRequests || [])
      setOutgoingRequests(data?.outgoingRequests || [])
    } finally {
      setConnectionsLoading(false)
    }
  }

  async function sendConnectionRequest(targetId: string) {
    setConnectionActionUserId(targetId)
    try {
      const response = await fetch('/api/portal/internal-chat/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to create connection request')
      await Promise.all([fetchConnections(), fetchWorkspace(), fetchStories()])
      toast.success(
        data?.status === 'ACCEPTED'
          ? pick('درخواست قبلی پذیرفته شد و اتصال فعال است.', 'The existing request was accepted and the connection is now active.', 'پخوانی غوښتنه ومنل شوه او اړیکه فعاله ده.')
          : pick('درخواست ارتباط ارسال شد.', 'Connection request sent.', 'د اړیکې غوښتنه واستول شوه.')
      )
    } finally {
      setConnectionActionUserId(null)
    }
  }

  async function updateConnectionRequest(requestId: string, action: 'accept' | 'decline' | 'cancel') {
    setConnectionActionUserId(requestId)
    try {
      const response = await fetch(`/api/portal/internal-chat/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to update connection request')
      await Promise.all([fetchConnections(), fetchWorkspace(), fetchStories()])
      toast.success(
        action === 'accept'
          ? pick('درخواست پذیرفته شد.', 'Request accepted.', 'غوښتنه ومنل شوه.')
          : action === 'decline'
            ? pick('درخواست رد شد.', 'Request declined.', 'غوښتنه رد شوه.')
            : pick('درخواست لغو شد.', 'Request cancelled.', 'غوښتنه لغوه شوه.')
      )
    } finally {
      setConnectionActionUserId(null)
    }
  }

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedChatId || !draft.trim()) return
    const payload: Record<string, unknown> = { chatId: selectedChatId, message: draft.trim() }
    if (replyTo?.id) payload.replyToId = replyTo.id
    const response = await fetch('/api/portal/internal-chat/send', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to send message')
    const sentMessage = data?.message as InternalMessage | undefined
    setDraft('')
    setReplyTo(null)
    if (sentMessage?.id && sentMessage.chatId === selectedChatId) {
      lastMessageCursorRef.current[selectedChatId] = sentMessage.createdAt
      setMessages((previous) => {
        if (previous.some((m) => m.id === sentMessage.id)) return previous
        return [...previous, sentMessage]
      })
      setChats((previous) => {
        const idx = previous.findIndex((chat) => chat.id === selectedChatId)
        if (idx === -1) return previous
        const updated = { ...previous[idx], updatedAt: sentMessage.createdAt, messages: [sentMessage], unreadCount: 0 }
        const next = previous.slice()
        next.splice(idx, 1)
        next.unshift(updated)
        return next
      })
      return
    }
    await fetchWorkspace().catch(() => undefined)
  }

  async function forwardMessageToChat(targetChatId: string) {
    if (!forwardingMessage || !targetChatId) return
    setForwardSending(true)
    try {
      const response = await fetch('/api/portal/internal-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: targetChatId,
          forwardedFromId: forwardingMessage.id,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to forward message')
      toast.success(pick('پیام ارسال شد', 'Message forwarded', 'پیغام ولېږل شو'))
      setForwardDialogOpen(false)
      setForwardingMessage(null)
      setForwardTargetChatId(null)
      setForwardSearch('')
      await fetchWorkspace().catch(() => undefined)
    } finally {
      setForwardSending(false)
    }
  }

  async function patchMessage(messageId: string, payload: Record<string, unknown>) {
    const response = await fetch(`/api/portal/internal-chat/message/${messageId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to update message')
    return data?.message as InternalMessage
  }

  async function deleteMessage(messageId: string) {
    const updated = await patchMessage(messageId, { action: 'DELETE' })
    setMessages((previous) => previous.map((message) => (message.id === messageId ? updated : message)))
    await fetchWorkspace().catch(() => undefined)
  }

  async function reactToMessage(messageId: string, emoji: string) {
    const updated = await patchMessage(messageId, { action: 'REACT', emoji })
    setMessages((previous) => previous.map((message) => (message.id === messageId ? updated : message)))
  }

  async function sendGifAttachment(rawUrl?: string) {
    if (!selectedChatId) {
      throw new Error(pick('ابتدا یک گفتگو را انتخاب کنید.', 'Select a chat first.', 'لومړی یو چټ وټاکئ.'))
    }
    const normalized = (rawUrl ?? gifUrl).trim()
    if (!normalized) return
    if (!/^https?:\/\//i.test(normalized)) {
      throw new Error(pick('آدرس GIF باید با http:// یا https:// شروع شود', 'GIF URL must start with http:// or https://', 'د GIF پته باید له http:// یا https:// سره پیل شي'))
    }
    const response = await fetch('/api/portal/internal-chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId: selectedChatId, fileUrl: normalized, fileName: 'GIF' }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to send GIF')
    const sentMessage = data?.message as InternalMessage | undefined
    setGifUrl('')
    if (sentMessage?.id && sentMessage.chatId === selectedChatId) {
      lastMessageCursorRef.current[selectedChatId] = sentMessage.createdAt
      setMessages((previous) => (previous.some((m) => m.id === sentMessage.id) ? previous : [...previous, sentMessage]))
      setChats((previous) => {
        const idx = previous.findIndex((chat) => chat.id === selectedChatId)
        if (idx === -1) return previous
        const updated = { ...previous[idx], updatedAt: sentMessage.createdAt, messages: [sentMessage], unreadCount: 0 }
        const next = previous.slice()
        next.splice(idx, 1)
        next.unshift(updated)
        return next
      })
    } else {
      await fetchWorkspace().catch(() => undefined)
    }
  }

  async function sendLocationMessage() {
    if (!selectedChatId) {
      throw new Error(pick('ابتدا یک گفتگو را انتخاب کنید.', 'Select a chat first.', 'لومړی یو چټ وټاکئ.'))
    }
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      toast.error(pick('این مرورگر موقعیت را پشتیبانی نمی‌کند. لینک موقعیت را دستی ارسال کنید.', 'This browser does not support location. Send a location link manually.', 'په دې براوزر کې موقعیت نه شته. لینک په لاس واستوئ.'))
      setManualLocationOpen(true)
      return
    }

    let position: GeolocationPosition
    try {
      position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60_000,
        })
      })
    } catch (error) {
      if (typeof GeolocationPositionError !== 'undefined' && error instanceof GeolocationPositionError) {
        if (error.code === error.PERMISSION_DENIED) {
          toast.error(pick('اجازه موقعیت رد شده است. می‌توانید لینک موقعیت را دستی ارسال کنید.', 'Location permission was denied. You can send a location link manually.', 'د موقعیت اجازه رد شوې ده. تاسې کولی شئ لینک په لاس واستوئ.'))
          setManualLocationOpen(true)
          return
        }

        if (error.code === error.TIMEOUT) {
          toast.error(pick('دریافت موقعیت زمان‌بر شد. می‌توانید لینک موقعیت را دستی ارسال کنید.', 'Location timed out. You can send a location link manually.', 'موقعیت ډېر وخت ونیو. لینک په لاس واستوئ.'))
          setManualLocationOpen(true)
          return
        }
      }

      toast.error(pick('ارسال موقعیت انجام نشد. می‌توانید لینک موقعیت را دستی ارسال کنید.', 'Unable to share location. You can send a location link manually.', 'د موقعیت لېږل ترسره نه شول. لینک په لاس واستوئ.'))
      setManualLocationOpen(true)
      return
    }

    const lat = position.coords.latitude.toFixed(6)
    const lng = position.coords.longitude.toFixed(6)
    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`
    const locationLabel = pick(`موقعیت: ${lat} ، ${lng}`, `Location: ${lat}, ${lng}`, `ځای: ${lat} ، ${lng}`)

    const response = await fetch('/api/portal/internal-chat/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: selectedChatId,
        message: `${locationLabel}\n${mapsUrl}`,
      }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to send location')
    const sentMessage = data?.message as InternalMessage | undefined
    if (sentMessage?.id && sentMessage.chatId === selectedChatId) {
      lastMessageCursorRef.current[selectedChatId] = sentMessage.createdAt
      setMessages((previous) => (previous.some((m) => m.id === sentMessage.id) ? previous : [...previous, sentMessage]))
      setChats((previous) => {
        const idx = previous.findIndex((chat) => chat.id === selectedChatId)
        if (idx === -1) return previous
        const updated = { ...previous[idx], updatedAt: sentMessage.createdAt, messages: [sentMessage], unreadCount: 0 }
        const next = previous.slice()
        next.splice(idx, 1)
        next.unshift(updated)
        return next
      })
    } else {
      await fetchWorkspace().catch(() => undefined)
    }
  }

  async function sendManualLocationMessage(raw?: string) {
    if (!selectedChatId) {
      throw new Error(pick('ابتدا یک گفتگو را انتخاب کنید.', 'Select a chat first.', 'لومړی یو چټ وټاکئ.'))
    }

    const value = (raw ?? manualLocationDraft).trim()
    if (!value) return

    setManualLocationSending(true)
    try {
      let url = value
      const coordMatch = value.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/)
      if (!/^https?:\/\//i.test(value)) {
        if (coordMatch) {
          url = `https://www.google.com/maps?q=${coordMatch[1]},${coordMatch[2]}`
        } else {
          url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`
        }
      }

      const label = pick('موقعیت:', 'Location:', 'ځای:')
      const response = await fetch('/api/portal/internal-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChatId,
          message: `${label} ${value}\n${url}`,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to send location')

      setManualLocationDraft('')
      setManualLocationOpen(false)

      const sentMessage = data?.message as InternalMessage | undefined
      if (sentMessage?.id && sentMessage.chatId === selectedChatId) {
        lastMessageCursorRef.current[selectedChatId] = sentMessage.createdAt
        setMessages((previous) => (previous.some((m) => m.id === sentMessage.id) ? previous : [...previous, sentMessage]))
        setChats((previous) => {
          const idx = previous.findIndex((chat) => chat.id === selectedChatId)
          if (idx === -1) return previous
          const updated = { ...previous[idx], updatedAt: sentMessage.createdAt, messages: [sentMessage], unreadCount: 0 }
          const next = previous.slice()
          next.splice(idx, 1)
          next.unshift(updated)
          return next
        })
      } else {
        await fetchWorkspace().catch(() => undefined)
      }
    } finally {
      setManualLocationSending(false)
    }
  }

  async function uploadPortalMedia(file: File) {
    const preparedFile = await preparePortalChatUpload(file)
    const formData = new FormData()
    formData.append('file', preparedFile)
    const response = await fetch('/api/portal/internal-chat/upload', {
      method: 'POST',
      body: formData,
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to upload media')
    return data as UploadedPortalMedia
  }

  async function markChatRead(chatId: string) {
    if (!session?.user?.id) return
    await fetch(`/api/portal/internal-chat/messages/${chatId}?limit=1&markRead=1`, { cache: 'no-store' }).catch(() => undefined)
    setChats((previous) => previous.map((chat) => (chat.id === chatId ? { ...chat, unreadCount: 0 } : chat)))
    if (selectedChatId === chatId) {
      setMessages((previous) =>
        previous.map((message) =>
          message.senderId !== session.user.id && message.isRead === false ? { ...message, isRead: true } : message
        )
      )
    }
  }

  async function createStory() {
    if (!storyCaption.trim() && !storyMediaUrl.trim()) {
      throw new Error(pick('برای استوری حداقل متن یا تصویر لازم است', 'A story needs text or an image', 'سټوري لږ تر لږه متن یا انځور غواړي'))
    }

    setStorySubmitting(true)
    try {
      const response = await fetch('/api/portal/internal-chat/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          caption: storyCaption.trim(),
          mediaUrl: storyMediaUrl.trim() || undefined,
          mediaType: storyMediaUrl.trim() && /\.gif(\?.*)?$/i.test(storyMediaUrl.trim()) ? 'GIF' : storyMediaUrl.trim() ? 'IMAGE' : undefined,
          backgroundStyle: storyBackgroundStyle,
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to create story')
      setStoryCreateOpen(false)
      setStoryCaption('')
      setStoryMediaUrl('')
      setStoryBackgroundStyle('amethyst')
      await fetchStories()
      toast.success(pick('استوری منتشر شد', 'Story posted', 'سټوري خپره شوه'))
    } finally {
      setStorySubmitting(false)
      if (storyFileInputRef.current) storyFileInputRef.current.value = ''
    }
  }

  async function uploadStoryMedia(file: File) {
    setStoryUploading(true)
    try {
      const upload = await uploadPortalMedia(file)
      if (upload.kind !== 'image') {
        throw new Error(pick('در استوری فقط تصویر یا GIF مجاز است', 'Stories only allow images or GIFs', 'په سټوري کې یوازې انځور یا GIF اجازه لري'))
      }
      setStoryMediaUrl(upload.url)
    } finally {
      setStoryUploading(false)
    }
  }

  async function handleStoryMediaSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await uploadStoryMedia(file)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to upload story media')
    }
  }

  async function markStorySeen(storyId: string) {
    const targetGroup = storyGroups.find((group) => group.stories.some((story) => story.id === storyId))
    const targetStory = targetGroup?.stories.find((story) => story.id === storyId)
    if (!targetStory || targetStory.seen || targetGroup?.user.id === currentUserId) return

    setStoryGroups((previous) => previous.map((group) => (
      group.user.id === targetGroup?.user.id
        ? {
            ...group,
            unseenCount: Math.max(group.unseenCount - 1, 0),
            allSeen: group.stories.every((story) => story.id === storyId || story.seen),
            stories: group.stories.map((story) => story.id === storyId ? { ...story, seen: true } : story),
          }
        : group
    )))

    void fetch(`/api/portal/internal-chat/stories/${storyId}/view`, { method: 'POST' }).catch(() => undefined)
  }

  function handleStoryLike(storyId: string, liked: boolean, type?: string | null) {
    setStoryGroups((previous) => previous.map((group) => ({
      ...group,
      stories: group.stories.map((story) => story.id === storyId ? { 
        ...story, 
        liked, 
        likedType: type,
        likeCount: (story.likeCount || 0) + (liked && story.liked === false ? 1 : !liked && story.liked === true ? -1 : 0) 
      } : story),
    })))
  }

  async function handleStoryReply(storyId: string, text: string) {
    const group = storyGroups.find((g) => g.stories.some((s) => s.id === storyId))
    if (!group) return

    try {
      const response = await fetch('/api/portal/internal-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'DIRECT', participantIds: [group.user.id] }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to start chat for reply')
      
      const chatId = data?.chat?.id
      if (!chatId) return

      const sendResponse = await fetch('/api/portal/internal-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          chatId, 
          message: `${pick('پاسخ به استوری:', 'Replied to story:', 'سټوري ته ځواب:')}\n\n${text}` 
        }),
      })
      
      if (!sendResponse.ok) throw new Error('Failed to send reply message')
      
      toast.success(pick('پاسخ شما ارسال شد', 'Reply sent', 'ستاسو ځواب واستول شو'))
      await fetchWorkspace()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send reply')
    }
  }

  async function deleteStory(storyId: string) {
    const response = await fetch(`/api/portal/internal-chat/stories/${storyId}`, { method: 'DELETE' })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to delete story')
    setStoryGroups((previous) => previous
      .map((group) => ({
        ...group,
        stories: group.stories.filter((story) => story.id !== storyId),
      }))
      .filter((group) => group.stories.length > 0)
    )
    setStoryViewerUserId((previous) => {
      const currentGroup = storyGroups.find((group) => group.user.id === previous)
      if (currentGroup && currentGroup.stories.length === 1 && currentGroup.stories[0].id === storyId) return null
      return previous
    })
    toast.success(pick('استوری حذف شد', 'Story deleted', 'سټوري حذف شوه'))
  }

  async function sendUploadedMedia(file: File) {
    if (!selectedChatId) {
      throw new Error(pick('ابتدا یک گفتگو را انتخاب کنید.', 'Select a chat first.', 'لومړی یو چټ وټاکئ.'))
    }
    setUploadingMedia(true)
    try {
      const upload = await uploadPortalMedia(file)
      const response = await fetch('/api/portal/internal-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: selectedChatId, fileUrl: upload.url, fileName: upload.filename }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to send media')
      const sentMessage = data?.message as InternalMessage | undefined
      if (sentMessage?.id && sentMessage.chatId === selectedChatId) {
        lastMessageCursorRef.current[selectedChatId] = sentMessage.createdAt
        setMessages((previous) => (previous.some((m) => m.id === sentMessage.id) ? previous : [...previous, sentMessage]))
        setChats((previous) => {
          const idx = previous.findIndex((chat) => chat.id === selectedChatId)
          if (idx === -1) return previous
          const updated = { ...previous[idx], updatedAt: sentMessage.createdAt, messages: [sentMessage], unreadCount: 0 }
          const next = previous.slice()
          next.splice(idx, 1)
          next.unshift(updated)
          return next
        })
      } else {
        await fetchWorkspace().catch(() => undefined)
      }
      toast.success(pick('فایل ارسال شد', 'Media sent', 'فایل ولېږل شو'))
    } finally {
      setUploadingMedia(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleAttachmentSelection(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      await sendUploadedMedia(file)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send media')
    }
  }

  async function stopWavRecordingAndSend() {
    const active = wavRecorderRef.current
    if (!active) return
    wavRecorderRef.current = null

    try {
      active.processor.disconnect()
    } catch {}
    try {
      active.source.disconnect()
    } catch {}
    try {
      active.gain.disconnect()
    } catch {}
    active.processor.onaudioprocess = null

    const activeStream = recordingStreamRef.current || active.stream
    recordingStreamRef.current = null
    activeStream?.getTracks().forEach((track) => track.stop())

    setIsRecording(false)
    setRecordingSeconds(0)
    mediaRecorderRef.current = null
    recordingChunksRef.current = []

    const totalLength = active.chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    if (!totalLength) {
      toast.error(pick('فایل صوتی ایجاد نشد. دوباره تلاش کنید.', 'No audio clip was captured. Try again.', 'هېڅ غږيز فایل جوړ نه شو. بیا هڅه وکړئ.'))
      try {
        await active.audioContext.close()
      } catch {}
      return
    }

    const merged = new Float32Array(totalLength)
    let offset = 0
    for (const chunk of active.chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }

    const downsampled = downsampleBuffer(merged, active.audioContext.sampleRate, TARGET_WAV_SAMPLE_RATE)
    const wavBlob = encodeWavPcm16(downsampled, TARGET_WAV_SAMPLE_RATE)
    const voiceFile = new File([wavBlob], `voice-note-${Date.now()}.wav`, {
      type: 'audio/wav',
      lastModified: Date.now(),
    })

    try {
      await active.audioContext.close()
    } catch {}

    if (voiceFile.size > messengerSettings.maxAudioBytes) {
      toast.error(
        pick(
          `ویس نوت باید کمتر از ${formatPortalUploadLimit(messengerSettings.maxAudioBytes)} بماند. لطفاً کوتاه‌تر ضبط کنید.`,
          `Voice notes must stay under ${formatPortalUploadLimit(messengerSettings.maxAudioBytes)}. Record a shorter note.`,
          `غږيز یادښت باید تر ${formatPortalUploadLimit(messengerSettings.maxAudioBytes)} کم وي. مهرباني وکړئ لنډ یې ثبت کړئ.`
        )
      )
      return
    }

    try {
      await sendUploadedMedia(voiceFile)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to send voice note')
    }
  }

  async function startWavRecording(stream: MediaStream) {
    const AudioContextCtor = (window as any).AudioContext || (window as any).webkitAudioContext
    if (!AudioContextCtor) {
      stream.getTracks().forEach((track) => track.stop())
      recordingStreamRef.current = null
      toast.error(pick('مرورگر شما از ضبط صدا پشتیبانی نمی‌کند', 'Your browser does not support voice recording', 'ستاسو براوزر د غږ ثبتولو ملاتړ نه کوي'))
      return
    }

    const audioContext: AudioContext = new AudioContextCtor()
    try {
      await audioContext.resume()
    } catch {}

    const source = audioContext.createMediaStreamSource(stream)
    const processor = audioContext.createScriptProcessor(4096, 1, 1)
    const gain = audioContext.createGain()
    gain.gain.value = 0
    const chunks: Float32Array[] = []

    processor.onaudioprocess = (event) => {
      const channel = event.inputBuffer.getChannelData(0)
      chunks.push(new Float32Array(channel))
    }

    source.connect(processor)
    processor.connect(gain)
    gain.connect(audioContext.destination)

    wavRecorderRef.current = { audioContext, processor, source, gain, stream, chunks }
    setIsRecording(true)
    setRecordingStartTime(Date.now())
    toast.message(pick('ضبط صدا شروع شد', 'Recording started', 'غږ ثبت پیل شو'))
  }

  async function handleVoiceRecordingToggle() {
    if (!selectedChatId) {
      throw new Error(pick('ابتدا یک گفتگو را انتخاب کنید.', 'Select a chat first.', 'لومړی یو چټ وټاکئ.'))
    }

    console.log('[Voice] Toggling recording. Current state:', isRecording)

    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('[Voice] Stopping MediaRecorder...')
        mediaRecorderRef.current.stop()
        return
      }
      if (wavRecorderRef.current) {
        console.log('[Voice] Stopping WAV recorder...')
        await stopWavRecordingAndSend()
      }
      return
    }

    const { supported, error: supportError } = await checkVoiceRecordingSupport()
    if (!supported || supportError) {
      console.error('[Voice] Recording not supported:', supportError)
      toast.error(supportError?.userMessage[language] || 'Recording not supported')
      return
    }

    console.log('[Voice] Requesting microphone access...')
    const { stream, error: micError } = await requestMicrophoneAccess()
    if (!stream || micError) {
      console.error('[Voice] Microphone access failed:', micError)
      toast.error(micError?.userMessage[language] || 'Microphone access failed')
      return
    }

    recordingStreamRef.current = stream
    recordingChunksRef.current = []
    setRecordingSeconds(0)

    if (typeof window === 'undefined' || typeof window.MediaRecorder === 'undefined') {
      await startWavRecording(stream)
      return
    }

    const requestedMimeType = getSupportedMimeType()
    console.log('[Voice] Using requested MIME type:', requestedMimeType || '(browser default)')

    let recorder: MediaRecorder
    try {
      recorder = requestedMimeType
        ? new MediaRecorder(stream, { mimeType: requestedMimeType, audioBitsPerSecond: PORTAL_CHAT_AUDIO_BITS_PER_SECOND })
        : new MediaRecorder(stream, { audioBitsPerSecond: PORTAL_CHAT_AUDIO_BITS_PER_SECOND })
    } catch (error) {
      console.warn('[Voice] Failed to create MediaRecorder with MIME type, retrying with defaults:', error)
      try {
        recorder = new MediaRecorder(stream, { audioBitsPerSecond: PORTAL_CHAT_AUDIO_BITS_PER_SECOND })
      } catch (fallbackError) {
        console.error('[Voice] Failed to create MediaRecorder with defaults; falling back to WAV recorder:', fallbackError)
        await startWavRecording(stream)
        return
      }
    }

    mediaRecorderRef.current = recorder
    
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('[Voice] Data available chunk received. Size:', event.data.size)
        recordingChunksRef.current.push(event.data)
      }
    }

    recorder.onerror = () => {
      console.error('[Voice] MediaRecorder error')
      const activeStream = recordingStreamRef.current
      recordingStreamRef.current = null
      activeStream?.getTracks().forEach((track) => track.stop())
      recordingChunksRef.current = []
      mediaRecorderRef.current = null
      setIsRecording(false)
      setRecordingSeconds(0)
      toast.error(pick('ضبط صدا با خطا متوقف شد.', 'Voice recording stopped because of a recording error.', 'د غږ ثبت د خطا له امله ودرید.'))
    }

    recorder.onstop = async () => {
      console.log('[Voice] Recording stopped. Total chunks:', recordingChunksRef.current.length)
      
      const activeStream = recordingStreamRef.current
      recordingStreamRef.current = null
      activeStream?.getTracks().forEach((track) => {
        track.stop()
        console.log('[Voice] Track stopped:', track.label)
      })
      
      setIsRecording(false)
      setRecordingSeconds(0)
      mediaRecorderRef.current = null

      if (recordingChunksRef.current.length === 0) {
        console.warn('[Voice] No audio data captured')
        toast.error(pick('فایل صوتی ایجاد نشد. دوباره تلاش کنید.', 'No audio clip was captured. Try again.', 'هیڅ غږیز فایل جوړ نه شو. بیا هڅه وکړئ.'))
        return
      }

      const finalMime = recorder.mimeType || requestedMimeType || 'audio/webm'
      const extension = getPreferredAudioExtension(finalMime)
      const normalizedMime = finalMime.split(';')[0].trim() || `audio/${extension}`
      console.log('[Voice] Preparing file with extension:', extension)

      const voiceFile = new File(recordingChunksRef.current, `voice-note-${Date.now()}.${extension}`, {
        type: normalizedMime,
        lastModified: Date.now(),
      })
      
      recordingChunksRef.current = []

      console.log('[Voice] File created. Name:', voiceFile.name, 'Size:', voiceFile.size)
      
      if (voiceFile.size < 100) {
        console.warn('[Voice] File is too small, likely empty')
        toast.error('Recording was too short or empty')
        return
      }

      if (voiceFile.size > messengerSettings.maxAudioBytes) {
        toast.error(
          pick(
            `ویس نوت باید کمتر از ${formatPortalUploadLimit(messengerSettings.maxAudioBytes)} بماند. لطفاً کوتاه‌تر ضبط کنید.`,
            `Voice notes must stay under ${formatPortalUploadLimit(messengerSettings.maxAudioBytes)}. Record a shorter note.`,
            `غږیز یادښت باید تر ${formatPortalUploadLimit(messengerSettings.maxAudioBytes)} کم وي. مهرباني وکړئ لنډ یې ثبت کړئ.`
          )
        )
        return
      }

      try {
        await sendUploadedMedia(voiceFile)
        console.log('[Voice] Voice note sent successfully')
      } catch (error) {
        console.error('[Voice] Failed to send voice note:', error)
        toast.error(error instanceof Error ? error.message : 'Failed to send voice note')
      }
    }

    recorder.onstart = () => {
      console.log('[Voice] Recorder started')
      setIsRecording(true)
      setRecordingStartTime(Date.now())
      toast.message(pick('ضبط صدا شروع شد', 'Recording started', 'غږ ثبت پیل شو'))
    }

    console.log('[Voice] Calling recorder.start(500)')
    recorder.start(500)
  }

  function saveQuickReply() {
    const nextValue = quickReplyDraft.trim()
    if (!nextValue) return
    setQuickReplies((previous) => Array.from(new Set([nextValue, ...previous])).slice(0, 8))
    setQuickReplyDraft('')
  }

  async function createChat() {
    if (!selectedContactIds.length) throw new Error(pick('حداقل یک مخاطب را انتخاب کنید', 'Select at least one participant', 'لږ تر لږه یو ګډونوال وټاکئ'))
    if (createType === 'GROUP' && !createName.trim()) throw new Error(pick('نام گروه الزامی است', 'Group name is required', 'د ډلې نوم اړین دی'))
    const response = await fetch('/api/portal/internal-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: createType, name: createType === 'GROUP' ? createName.trim() : undefined, participantIds: selectedContactIds }) })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to create chat')
    await fetchWorkspace()
    setSelectedChatId(data?.chat?.id || null)
    setMobileView('detail')
    setCreateOpen(false)
    setCreateType('DIRECT')
    setCreateName('')
    setSelectedContactIds([])
  }

  async function startDirectChat(contact: InternalContact) {
    const response = await fetch('/api/portal/internal-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'DIRECT', participantIds: [contact.id] }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to start direct chat')
    await fetchWorkspace()
    setSelectedChatId(data?.chat?.id || null)
    setMobileView('detail')
    setTab('operations')
  }

  async function startAdminSupportChat(targetUserId: string) {
    if (!isAdmin) {
      throw new Error(pick('این گزینه فقط برای مدیریت سیستم فعال است.', 'This action is available only to admins.', 'دا کړنه یوازې د اډمین لپاره فعاله ده.'))
    }

    const response = await fetch('/api/admin/chat/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId }),
    })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to open support session')

    setAdminSupportSessionId(data?.sessionId || null)
    setPeopleOpen(false)
    setTab('customers')
    if (data?.sessionId) {
      router.replace(`/portal/internal-chat?tab=customers&sessionId=${encodeURIComponent(data.sessionId)}`)
    }
  }

  function selectEntireBranchNetwork() {
    setCreateType('BRANCH_TO_BRANCH')
    setSelectedContactIds(branchNetworkContacts.map((contact) => contact.id))
  }

  async function markAllRead() {
    const response = await fetch('/api/notifications/mark-read', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }) })
    const data = await response.json().catch(() => null)
    if (!response.ok) throw new Error(data?.error || 'Failed to mark notifications as read')
    setNotifications((previous) => previous.map((item) => ({ ...item, read: true })))
    setUnreadNotifications(0)
  }

  async function sendAdminBroadcast() {
    if (!isAdmin) {
      throw new Error(pick('این بخش فقط برای مدیر سیستم فعال است.', 'This control is available only to admins.', 'دا کنټرول یوازې د اډمین لپاره فعال دی.'))
    }

    const message = adminBroadcastDraft.trim()
    if (!message) {
      throw new Error(pick('متن پیام همگانی را وارد کنید.', 'Enter a broadcast message first.', 'لومړی د عام پیغام متن ولیکئ.'))
    }

    setAdminBroadcastSending(true)
    try {
      const response = await fetch('/api/admin/chat/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          targetRole: 'ALL',
        }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || 'Failed to send broadcast message')

      setAdminBroadcastDraft('')
      toast.success(
        pick(
          `پیام همگانی ارسال شد${typeof data?.totalSent === 'number' ? ` (${data.totalSent})` : ''}.`,
          `Broadcast sent${typeof data?.totalSent === 'number' ? ` (${data.totalSent})` : ''}.`,
          `عام پیغام واستول شو${typeof data?.totalSent === 'number' ? ` (${data.totalSent})` : ''}.`
        )
      )
      await fetchNotifications().catch(() => undefined)
    } finally {
      setAdminBroadcastSending(false)
    }
  }

  async function fetchMessengerSettings() {
    try {
      const response = await fetch('/api/admin/chat/settings', { cache: 'no-store' })
      if (!response.ok) return
      const data = await response.json()
      setMessengerSettings({
        maxUploadBytes: data.maxUploadBytes || PORTAL_CHAT_MAX_UPLOAD_BYTES,
        maxImageBytes: data.maxImageBytes || PORTAL_CHAT_MAX_UPLOAD_BYTES,
        maxAudioBytes: data.maxAudioBytes || PORTAL_CHAT_MAX_UPLOAD_BYTES,
        maxDocumentBytes: data.maxDocumentBytes || PORTAL_CHAT_MAX_UPLOAD_BYTES,
        maxRecordingSec: data.maxRecordingSec || PORTAL_CHAT_MAX_RECORDING_SECONDS,
        audioBitsPerSec: data.audioBitsPerSec || PORTAL_CHAT_AUDIO_BITS_PER_SECOND,
        maxStoriesPerUser: data.maxStoriesPerUser || 8,
        storyTTLHours: data.storyTTLHours || 24,
      })
    } catch (error) {
      console.error('Failed to fetch messenger settings:', error)
    }
  }

  useEffect(() => {
    if (!session?.user?.id) return
    // Load minimal global data once per session.
    void fetchNotifications().catch(() => undefined)
    void fetchMessengerSettings()
  }, [session?.user?.id])

  useEffect(() => {
    if (!session?.user?.id) return
    if (tab === 'operations') {
      void fetchWorkspace().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load internal chat'))
      void fetchStories().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load stories'))
    }
    if (tab === 'announcements') {
      void fetchNotifications().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load notifications'))
    }
  }, [session?.user?.id, tab])

  useEffect(() => {
    if (!selectedChatId) {
      setMessages([])
      setMobileView('list')
      return
    }
    setGifUrl('')
    setMessageSearch('')
    void fetchMessages(selectedChatId, { mode: 'initial' }).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load messages'))
  }, [selectedChatId])

  useEffect(() => {
    if (storyViewerUserId && !storyGroups.some((group) => group.user.id === storyViewerUserId)) {
      setStoryViewerUserId(null)
    }
  }, [storyGroups, storyViewerUserId])

  useEffect(() => {
    if (!session?.user?.id) return
    if (tab !== 'operations') return
    // Lazy-load connection directory only when the dialog is open.
    if (!peopleOpen) return
    void fetchConnections().catch(() => undefined)
  }, [peopleOpen, session?.user?.id, tab])

  useEffect(() => {
    if (!isRecording) return
    const timer = window.setInterval(() => {
      setRecordingSeconds((previous) => {
        if (previous + 1 >= PORTAL_CHAT_MAX_RECORDING_SECONDS) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop()
          } else if (wavRecorderRef.current) {
            void stopWavRecordingAndSend()
          }
        }
        return previous + 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [isRecording])

  useEffect(() => () => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    } catch {}

    const wavActive = wavRecorderRef.current
    wavRecorderRef.current = null
    if (wavActive) {
      try {
        wavActive.processor.disconnect()
      } catch {}
      try {
        wavActive.source.disconnect()
      } catch {}
      try {
        wavActive.gain.disconnect()
      } catch {}
      wavActive.stream.getTracks().forEach((track) => track.stop())
      void wavActive.audioContext.close().catch(() => undefined)
    }
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop())
  }, [])

  const pollingEnabled = !!session?.user?.id
  const operationsPollingEnabled = pollingEnabled && tab === 'operations'
  const announcementsPollingEnabled = pollingEnabled
  const chatPanelVisible = operationsPollingEnabled && !!selectedChatId && (isMdUp || mobileView === 'detail')

  // Significantly reduce serverless invocations: use slow polling and only when needed.
  useAdaptivePolling(() => fetchWorkspace().catch(() => undefined), {
    enabled: operationsPollingEnabled,
    activeIntervalMs: 180_000,
    idleIntervalMs: 600_000,
    hiddenIntervalMs: 900_000,
    runImmediately: false,
  })

  useAdaptivePolling(() => (chatPanelVisible && selectedChatId ? fetchMessages(selectedChatId, { mode: 'poll' }).catch(() => undefined) : Promise.resolve()), {
    enabled: chatPanelVisible,
    activeIntervalMs: 60_000,
    idleIntervalMs: 180_000,
    hiddenIntervalMs: 600_000,
    runImmediately: false,
  })

  const notificationsActiveInterval = tab === 'announcements' ? 120_000 : 900_000
  const notificationsIdleInterval = tab === 'announcements' ? 300_000 : 1_800_000

  useAdaptivePolling(() => fetchNotifications().catch(() => undefined), {
    enabled: announcementsPollingEnabled,
    activeIntervalMs: notificationsActiveInterval,
    idleIntervalMs: notificationsIdleInterval,
    hiddenIntervalMs: 1_800_000,
    runImmediately: false,
  })

  async function fetchTrendingGifs() {
    setGifLoading(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'
      const response = await fetch(`https://api.giphy.com/v1/gifs/trending?api_key=${encodeURIComponent(apiKey)}&limit=100&rating=g`)
      if (!response.ok) throw new Error(`GIPHY:${response.status}`)
      const data = await response.json().catch(() => null)
      const items = Array.isArray(data?.data)
        ? data.data
            .map((gif: any) => ({
              id: String(gif?.id || ''),
              url: String(gif?.images?.original?.url || gif?.images?.downsized_large?.url || gif?.images?.downsized?.url || gif?.images?.fixed_height?.url || ''),
              previewUrl: String(
                gif?.images?.fixed_width_small?.url ||
                  gif?.images?.fixed_height_small?.url ||
                  gif?.images?.preview_gif?.url ||
                  gif?.images?.downsized?.url ||
                  gif?.images?.original?.url ||
                  ''
              ),
              title: String(gif?.title || 'GIF'),
            }))
            .filter((gif: any) => gif.id && gif.url && gif.previewUrl)
        : []

      if (!items.length) throw new Error('GIPHY:EMPTY')
      setGifProvider('GIPHY')
      setTrendingGifs(items)
    } catch (error) {
      console.error('Failed to fetch trending GIFs:', error)
      setGifProvider('FALLBACK')
      setTrendingGifs(FALLBACK_GIFS.map(({ id, url, previewUrl, title }) => ({ id, url, previewUrl, title })))
    } finally {
      setGifLoading(false)
    }
  }

  async function searchGifs(query: string) {
    if (!query.trim()) {
      setSearchedGifs([])
      return
    }
    const normalized = query.trim().toLowerCase()
    if (gifProvider === 'FALLBACK') {
      setSearchedGifs(
        FALLBACK_GIFS.filter((gif) => `${gif.title} ${gif.tags.join(' ')}`.toLowerCase().includes(normalized)).map(
          ({ id, url, previewUrl, title }) => ({ id, url, previewUrl, title })
        )
      )
      return
    }
    setGifLoading(true)
    try {
      const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY || 'dc6zaTOxFJmzC'
      const response = await fetch(
        `https://api.giphy.com/v1/gifs/search?api_key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&limit=100&rating=g`
      )
      if (!response.ok) throw new Error(`GIPHY:${response.status}`)
      const data = await response.json().catch(() => null)
      const items = Array.isArray(data?.data)
        ? data.data
            .map((gif: any) => ({
              id: String(gif?.id || ''),
              url: String(gif?.images?.original?.url || gif?.images?.downsized_large?.url || gif?.images?.downsized?.url || gif?.images?.fixed_height?.url || ''),
              previewUrl: String(
                gif?.images?.fixed_width_small?.url ||
                  gif?.images?.fixed_height_small?.url ||
                  gif?.images?.preview_gif?.url ||
                  gif?.images?.downsized?.url ||
                  gif?.images?.original?.url ||
                  ''
              ),
              title: String(gif?.title || 'GIF'),
            }))
            .filter((gif: any) => gif.id && gif.url && gif.previewUrl)
        : []
      setSearchedGifs(items)
    } catch (error) {
      console.error('Failed to search GIFs:', error)
      setGifProvider('FALLBACK')
      setTrendingGifs((prev) =>
        prev.length ? prev : FALLBACK_GIFS.map(({ id, url, previewUrl, title }) => ({ id, url, previewUrl, title }))
      )
      setSearchedGifs(
        FALLBACK_GIFS.filter((gif) => `${gif.title} ${gif.tags.join(' ')}`.toLowerCase().includes(normalized)).map(
          ({ id, url, previewUrl, title }) => ({ id, url, previewUrl, title })
        )
      )
    } finally {
      setGifLoading(false)
    }
  }

  useEffect(() => {
    if (showGifPicker && !trendingGifs.length) {
      void fetchTrendingGifs()
    }
  }, [showGifPicker])

  useEffect(() => {
    if (!gifSearch.trim()) {
      setSearchedGifs([])
      return
    }
    const timer = setTimeout(() => {
      void searchGifs(gifSearch)
    }, 500)
    return () => clearTimeout(timer)
  }, [gifSearch])

  return (
    <DashboardLayout>
      {/* Use rem-based sizing so global ui-scale can shrink/enlarge this page consistently. */}
      <div className="flex w-full flex-1 flex-col overflow-hidden min-h-0 text-[0.76rem] sm:text-[0.82rem]">
        <Tabs value={tab} onValueChange={(value) => setTab(value as PortalTab)} className="flex h-full w-full flex-1 flex-col overflow-hidden min-h-0">
          
          <TabsContent value="customers" className="flex flex-1 flex-col overflow-hidden min-h-0">
            {isAdmin ? (
              <AdminSupportDashboard initialSessionId={adminSupportSessionId} />
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                {canHandleCustomers ? (
                  <SarafDashboard initialSessionId={initialSessionId} />
                ) : (
                  <Card className="border-border/70 bg-background/90">
                    <CardContent className="px-6 py-12 text-center text-muted-foreground">
                      {pick(
                        'گفت‌وگوهای مشتریان فقط برای حساب اصلی صراف فعال هستند. شما همچنان می‌توانید از تب داخلی و اعلان‌ها استفاده کنید.',
                        'Customer conversations are available only to the main saraf account. You can still use the internal and announcement tabs.',
                        'د مشتریانو خبرې یوازې د اصلي صراف حساب لپاره فعالې دي. تاسو لا هم د داخلي او اعلانونو ټبونه کارولی شئ.'
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent id="portal-operations-panel" value="operations" className="flex flex-1 flex-col overflow-hidden min-h-0">
            <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
              <Dialog open={storyCreateOpen} onOpenChange={setStoryCreateOpen}>
                <DialogContent className="sm:max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{pick('استوری جدید شبکه', 'New network story', 'د شبکې نوې سټوري')}</DialogTitle>
                    <DialogDescription>
                      {pick(
                        'متن، تصویر یا GIF را اضافه کنید. ویدیو غیرفعال است و تصاویر قبل از آپلود فشرده می‌شوند.',
                        'Share text, an image, or a GIF. Video is disabled and images are compressed before upload.',
                        'متن، انځور یا GIF شریک کړئ. ویدیو بنده ده او انځورونه د اپلوډ مخکې فشرده کېږي.'
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-5">
                    <div className="rounded-[28px] border border-border/70 bg-muted/30 p-4">
                      <div className="mb-3 flex flex-wrap gap-2">
                        {(['amethyst', 'ocean', 'sunset', 'graphite'] as const).map((theme) => (
                          <Button
                            key={theme}
                            type="button"
                            variant={storyBackgroundStyle === theme ? 'default' : 'outline'}
                            size="sm"
                            className="rounded-full"
                            onClick={() => setStoryBackgroundStyle(theme)}
                          >
                            {storyBackgroundLabel(theme)}
                          </Button>
                        ))}
                      </div>
                      <div className={cn(
                        'flex min-h-[220px] items-center justify-center rounded-[28px] border border-white/10 px-6 py-8 text-center text-white shadow-[0_24px_80px_-48px_rgba(15,23,42,0.45)]',
                        storyBackgroundStyle === 'ocean'
                          ? 'bg-[radial-gradient(circle_at_top,#0f766e_0%,#155e75_38%,#0f172a_100%)]'
                          : storyBackgroundStyle === 'sunset'
                            ? 'bg-[radial-gradient(circle_at_top,#fb7185_0%,#f97316_38%,#431407_100%)]'
                            : storyBackgroundStyle === 'graphite'
                              ? 'bg-[radial-gradient(circle_at_top,#475569_0%,#111827_50%,#020617_100%)]'
                              : 'bg-[radial-gradient(circle_at_top,#6366f1_0%,#7c3aed_35%,#0f172a_100%)]'
                      )}>
                        {storyMediaUrl ? (
                          <img src={storyMediaUrl} alt={storyCaption || 'Story preview'} className="max-h-[220px] w-full rounded-[24px] object-cover" />
                        ) : (
                          <p className="max-w-xl text-2xl font-black leading-[1.5] sm:text-3xl">
                            {storyCaption || pick('یک پیام کوتاه یا تصویر برای شبکه منتشر کنید', 'Post a short text or image to your network', 'خپل شبکې ته لنډ متن یا انځور خپور کړئ')}
                          </p>
                        )}
                      </div>
                    </div>

                    <Textarea
                      value={storyCaption}
                      onChange={(event) => setStoryCaption(event.target.value)}
                      placeholder={pick('متن کوتاه استوری...', 'Story caption...', 'د سټوري لنډ متن...')}
                      className="min-h-[120px] rounded-[24px]"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <Button type="button" variant="outline" onClick={() => storyFileInputRef.current?.click()} disabled={storyUploading}>
                        {storyUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ImagePlus className="mr-2 h-4 w-4" />}
                        {pick('انتخاب تصویر یا GIF', 'Choose image or GIF', 'انځور یا GIF وټاکئ')}
                      </Button>
                      {storyMediaUrl ? (
                        <Button type="button" variant="ghost" onClick={() => setStoryMediaUrl('')}>
                          {pick('حذف رسانه', 'Remove media', 'رسنۍ لرې کول')}
                        </Button>
                      ) : null}
                      <span className="text-xs text-muted-foreground">
                        {pick(`استوری فقط متن، تصویر یا GIF دارد. ویدیو بسته مانده و تصویرها قبل از آپلود تا حدود ${formatPortalUploadLimit(messengerSettings.maxImageBytes)} فشرده می‌شوند.`, `Stories support text, images, and GIFs only. Video stays disabled, and images are compressed toward ${formatPortalUploadLimit(messengerSettings.maxImageBytes)} before upload.`, `سټورۍ یوازې متن، انځور، او GIF مني. ویډیو بنده ساتل شوې او انځورونه له اپلوډ مخکې د ${formatPortalUploadLimit(messengerSettings.maxImageBytes)} شاوخوا ته کمېږي.`)}
                      </span>
                    </div>
                    <input ref={storyFileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleStoryMediaSelection} />

                    <div className="flex justify-end gap-2">
                      <Button type="button" variant="outline" onClick={() => { setStoryCreateOpen(false); setStoryCaption(''); setStoryMediaUrl('') }}>
                        {pick('لغو', 'Cancel', 'لغوه')}
                      </Button>
                      <Button type="button" onClick={() => { void createStory().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to create story')) }} disabled={storySubmitting}>
                        {storySubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {pick('انتشار استوری', 'Publish story', 'سټوري خپرول')}
                      </Button>
                    </div>
                    </div>
                  </DialogContent>
                </Dialog>
              <div className="grid h-full min-h-0 flex-1 gap-3 overflow-hidden lg:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(320px,380px)_minmax(0,1fr)]">
              <Card className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/40 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-slate-900/40', mobileView === 'detail' ? 'hidden md:flex' : 'flex')}>
                <CardHeader className="space-y-3 border-b border-white/20 bg-gradient-to-br from-white/50 to-white/30 p-4 backdrop-blur-xl dark:border-white/10 dark:from-slate-800/50 dark:to-slate-900/30">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-lg font-black text-slate-900 dark:text-white sm:text-xl">{pick('گفت‌وگوها', 'Chats', 'چیټونه')}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="ghost" size="icon" className="rounded-full hover:bg-violet-500/10" onClick={() => { void fetchWorkspace().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to load internal chat')) }}><RefreshCw className={`h-4 w-4 ${workspaceLoading ? 'animate-spin' : ''}`} /></Button>
                      <Button type="button" variant="ghost" size="icon" className="relative rounded-full hover:bg-violet-500/10" onClick={() => setPeopleOpen(true)}><Users className="h-4 w-4" />{pendingRequestCount > 0 ? <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 px-1 text-[10px] font-bold text-white shadow-lg">{pendingRequestCount}</span> : null}</Button>
                      <Button type="button" size="icon" className="rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:brightness-110" onClick={() => setStoryCreateOpen(true)}><Plus className="h-4 w-4" /></Button>
                      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild><Button type="button" size="icon" className="rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg hover:shadow-xl hover:brightness-110"><MessageCircle className="h-4 w-4" /></Button></DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>{pick('گفت‌وگوی داخلی جدید', 'New internal chat', 'نوی داخلي چیټ')}</DialogTitle>
                            <DialogDescription>
                              {pick(
                                'برای شروع، نوع گفت‌وگو را انتخاب و اعضا را مشخص کنید.',
                                'Choose a chat type and select participants to start.',
                                'د پیل لپاره ډول وټاکئ او ګډونوال انتخاب کړئ.'
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="grid gap-2 sm:grid-cols-3">{(['DIRECT', 'GROUP', 'BRANCH_TO_BRANCH'] as const).map((value) => <Button key={value} type="button" variant={createType === value ? 'default' : 'outline'} onClick={() => { setCreateType(value); setSelectedContactIds([]); if (value !== 'GROUP') setCreateName('') }}>{value === 'DIRECT' ? pick('مستقیم', 'Direct', 'مستقیم') : value === 'GROUP' ? pick('گروهی', 'Group', 'ډله') : pick('شعبه / شریک', 'Branch / partner', 'څانګه / شریک')}</Button>)}</div>
                            {createType === 'GROUP' ? <Input value={createName} onChange={(event) => setCreateName(event.target.value)} placeholder={pick('نام گروه', 'Group name', 'د ډلې نوم')} /> : null}
                            {isOwnerSaraf && createType === 'BRANCH_TO_BRANCH' ? (
                              <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/70 px-3 py-3 text-sm">
                                <span className="text-muted-foreground">
                                  {pick('برای گروه شبکه، همه مدیران و کارمندان شعبه را یکجا انتخاب کنید.', 'Select all branch managers and staff in one step.', 'د شبکې ډلې لپاره ټول د څانګو مدیران او کارکوونکي په یوه ګام وټاکئ.')}
                                </span>
                                <Button type="button" variant="outline" size="sm" onClick={selectEntireBranchNetwork}>
                                  {pick('انتخاب همه شعب', 'Select all branches', 'ټولې څانګې وټاکئ')}
                                </Button>
                              </div>
                            ) : null}
                            <div className="rounded-2xl border border-border/70"><ScrollArea className="h-80 p-3"><div className="space-y-3">{createDialogContacts.map((contact) => {
                              const meta = roleMeta(contact.role)
                              const Icon = meta.icon
                              const checked = selectedContactIds.includes(contact.id)
                              return <label key={contact.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/70 p-3 transition-colors hover:bg-muted/40"><Checkbox checked={checked} onCheckedChange={() => setSelectedContactIds((previous) => createType === 'GROUP' ? checked ? previous.filter((id) => id !== contact.id) : [...previous, contact.id] : checked ? [] : [contact.id])} /><div className="flex min-w-0 flex-1 items-start gap-3"><Avatar className="h-11 w-11">{contact.avatarUrl ? <AvatarImage src={contact.avatarUrl} alt={contact.name} /> : null}<AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200"><Icon className="h-5 w-5" /></AvatarFallback></Avatar><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="truncate font-semibold text-slate-900 dark:text-white">{contact.name}</span><Badge variant="outline" className={meta.badge}>{meta.label}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{contact.email}</p><p className="mt-1 text-xs leading-6 text-muted-foreground">{personContext(contact)}</p></div></div></label>
                            })}</div></ScrollArea></div>
                            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setSelectedContactIds([]); setCreateType('DIRECT'); setCreateName('') }}>{pick('لغو', 'Cancel', 'لغوه')}</Button><Button type="button" onClick={() => { void createChat().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to create chat')) }}>{pick('ایجاد گفتگو', 'Create chat', 'چیټ جوړول')}</Button></div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-background/80 px-3 py-2">
                    <PortalStoryStrip
                      groups={storyGroups}
                      currentUserId={currentUserId}
                      language={language}
                      onCreate={() => setStoryCreateOpen(true)}
                      onOpenGroup={(groupId) => setStoryViewerUserId(groupId)}
                    />
                  </div>

                  <div className="relative">
                    <Search
                      className={cn(
                        'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground',
                        isRTL ? 'right-3' : 'left-3'
                      )}
                    />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder={pick('جست‌وجو…', 'Search…', 'لټون…')}
                      className={cn('h-10 rounded-2xl border-border bg-background', isRTL ? 'pr-10' : 'pl-10')}
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant={!showArchived ? 'default' : 'outline'} size="sm" onClick={() => setShowArchived(false)}>{pick('گفتگوهای فعال', 'Active chats', 'فعال چیټونه')}</Button>
                    <Button type="button" variant={showArchived ? 'default' : 'outline'} size="sm" onClick={() => setShowArchived(true)}>{pick('بایگانی', 'Archived', 'ارشيف')}</Button>
                  </div>
                  {search.trim() && directStartContacts.length ? <div className="space-y-2 rounded-2xl border border-border bg-background/80 p-3 backdrop-blur-md">
                    <div className="space-y-2">{directStartContacts.slice(0, 5).map((contact) => {
                      const meta = roleMeta(contact.role)
                      const Icon = meta.icon
                      return <div key={`quick-${contact.id}`} className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/90 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-3"><Avatar className="h-10 w-10">{contact.avatarUrl ? <AvatarImage src={contact.avatarUrl} alt={contact.name} /> : null}<AvatarFallback className="bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-200"><Icon className="h-4 w-4" /></AvatarFallback></Avatar><div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{contact.name}</p><p className="truncate text-xs text-muted-foreground">{personContext(contact)}</p></div></div>
                        <Button type="button" variant="outline" size="sm" onClick={() => { void startDirectChat(contact).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to start direct chat')) }}>{pick('چت', 'Chat', 'چیټ')}</Button>
                      </div>
                    })}</div>
                  </div> : null}
                </CardHeader>
                <CardContent className="flex min-h-0 flex-1 flex-col overflow-hidden pt-0">
                  <ScrollArea className="min-h-0 flex-1">
                    <div className="space-y-1 pr-1">
                      {filteredChats.map((chat) => {
                        const peer = peers(chat)[0]
                        const pref = getChatPreference(chat.id)
                        const muted = !!pref.muted
                        const selected = selectedChatId === chat.id
                        const preview = chat.messages[0]?.message || pick('هنوز پیامی ثبت نشده است', 'No message yet', 'لا تر اوسه پیغام نشته')

                        return (
                          <div
                            key={chat.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => { setSelectedChatId(chat.id); setMobileView('detail') }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' || event.key === ' ') {
                                event.preventDefault()
                                setSelectedChatId(chat.id)
                                setMobileView('detail')
                              }
                            }}
                            className={cn(
                              'flex w-full cursor-pointer items-center gap-3 rounded-2xl border px-3 py-3 text-left transition outline-none',
                              'focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                              selected
                                ? 'border-violet-200/80 bg-violet-50/80 shadow-[0_18px_48px_-30px_rgba(109,40,217,0.35)] dark:border-violet-400/20 dark:bg-violet-500/10'
                                : 'border-border/70 bg-background/80 backdrop-blur-md hover:border-violet-200/70 hover:bg-violet-50/50 dark:bg-white/5 dark:hover:border-violet-400/20 dark:hover:bg-violet-500/5'
                            )}
                          >
                            <Avatar className="h-12 w-12">
                              {peer?.avatarUrl ? <AvatarImage src={peer.avatarUrl || ''} alt={peer.name} /> : null}
                              <AvatarFallback className="bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                                {chat.type === 'GROUP' ? <Users className="h-5 w-5" /> : chat.type === 'BRANCH_TO_BRANCH' ? <Workflow className="h-5 w-5" /> : <MessageCircle className="h-5 w-5" />}
                              </AvatarFallback>
                            </Avatar>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-3">
                                <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                                  {chatTitle(chat)}
                                </p>
                                <span className={cn('shrink-0 text-[11px]', chat.unreadCount > 0 ? 'text-violet-700 dark:text-violet-200' : 'text-muted-foreground')}>
                                  {formatDate(chat.updatedAt, language, false)}
                                </span>
                              </div>
                              <div className="mt-1 flex items-center justify-between gap-3 overflow-visible">
                                <p className="truncate text-sm text-muted-foreground">
                                  {preview}
                                </p>
                                <div className="flex shrink-0 items-center gap-2 overflow-visible">
                                  {muted ? <VolumeX className="h-4 w-4 text-muted-foreground" /> : null}
                                  {chat.unreadCount > 0 ? (
                                    <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-violet-600 px-1.5 text-[11px] font-bold text-white">
                                      {chat.unreadCount}
                                    </span>
                                  ) : null}
                                  <div className="relative z-20">
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild>
                                        <button
                                          type="button"
                                          className="rounded-full p-2 text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
                                          onClick={(event) => {
                                            event.stopPropagation()
                                          }}
                                          onPointerDown={(event) => {
                                            event.stopPropagation()
                                          }}
                                          aria-label={pick('گزینه‌ها', 'Options', 'غوراوي')}
                                          title={pick('گزینه‌ها', 'Options', 'غوراوي')}
                                        >
                                          <MoreVertical className="h-4 w-4" />
                                        </button>
                                      </DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className="w-64">
                                        <DropdownMenuLabel>{pick('گزینه‌ها', 'Options', 'غوراوي')}</DropdownMenuLabel>
                                        <DropdownMenuItem
                                          onClick={() => {
                                            setSelectedChatId(chat.id)
                                            setMobileView('detail')
                                            setProfileSheetOpen(true)
                                          }}
                                        >
                                          <Info className="mr-2 h-4 w-4" />
                                          {pick('اطلاعات گفتگو', 'Chat info', 'د چیټ معلومات')}
                                        </DropdownMenuItem>
                                        {chat.unreadCount > 0 ? (
                                          <DropdownMenuItem onClick={() => { void markChatRead(chat.id) }}>
                                            <Check className="mr-2 h-4 w-4" />
                                            {pick('علامت‌گذاری خوانده‌شده', 'Mark as read', 'لوستل شوی وټاکئ')}
                                          </DropdownMenuItem>
                                        ) : null}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => updateChatPreference(chat.id, { muted: !pref.muted })}>
                                          {pref.muted ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
                                          {pref.muted ? pick('لغو بی‌صدا', 'Unmute', 'غږ بېرته فعالول') : pick('بی‌صدا', 'Mute', 'غلی')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateChatPreference(chat.id, { archived: !pref.archived })}>
                                          {pref.archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                          {pref.archived ? pick('بازگردانی', 'Restore', 'بېرته راګرځول') : pick('بایگانی', 'Archive', 'ارشيف')}
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => updateChatPreference(chat.id, { clearBefore: new Date().toISOString() })}>
                                          <Trash2 className="mr-2 h-4 w-4" />
                                          {pick('پاک‌سازی گفتگو', 'Clear chat', 'چیټ پاکول')}
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger>
                                            <Palette className="mr-2 h-4 w-4" />
                                            {pick('پس‌زمینه', 'Theme', 'شالید')}
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuSubContent>
                                            <DropdownMenuRadioGroup value={pref.theme || 'midnight'} onValueChange={(value) => updateChatPreference(chat.id, { theme: value as ChatTheme })}>
                                              {(['midnight', 'violet', 'forest', 'sunset', 'ocean', 'graphite', 'lavender', 'crimson'] as ChatTheme[]).map((theme) => (
                                                <DropdownMenuRadioItem key={theme} value={theme}>
                                                  {themeLabel(theme)}
                                                </DropdownMenuRadioItem>
                                              ))}
                                            </DropdownMenuRadioGroup>
                                          </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                        <DropdownMenuSub>
                                          <DropdownMenuSubTrigger>
                                            <Clock3 className="mr-2 h-4 w-4" />
                                            {pick('ماندگاری', 'Retention', 'ساتنه')}
                                          </DropdownMenuSubTrigger>
                                          <DropdownMenuSubContent>
                                            <DropdownMenuRadioGroup value={pref.retention || 'ALL'} onValueChange={(value) => updateChatPreference(chat.id, { retention: value as RetentionPreset })}>
                                              {(['ALL', '24H', '7D', '30D'] as RetentionPreset[]).map((preset) => (
                                                <DropdownMenuRadioItem key={preset} value={preset}>
                                                  {retentionLabel(preset)}
                                                </DropdownMenuRadioItem>
                                              ))}
                                            </DropdownMenuRadioGroup>
                                          </DropdownMenuSubContent>
                                        </DropdownMenuSub>
                                      </DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      {!filteredChats.length ? (
                        <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">
                          {showArchived
                            ? pick('هنوز گفتگوی بایگانی‌شده‌ای برای شما ثبت نشده است.', 'No archived chats for you yet.', 'لا تر اوسه ستاسې لپاره ارشیف شوی چیټ نشته.')
                            : pick('هنوز گفت‌وگوی داخلی ثبت نشده است. از دکمه ایجاد، یک گفت‌وگوی جدید بسازید.', 'No internal conversations yet. Use the create button to start one.', 'لا داخلي خبرې نشته. د جوړولو تڼۍ وکاروئ او نوی چیټ پیل کړئ.')}
                        </div>
                      ) : null}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              <Card className={cn('flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/40 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-slate-900/40', mobileView === 'list' ? 'hidden md:flex' : 'flex')}>
                <CardContent className="flex min-h-0 flex-1 flex-col p-0">
                  {selectedChat ? <>
                    <div className="relative border-b border-gray-200/40 bg-white backdrop-blur-xl dark:border-gray-700/40 dark:bg-gray-900 px-4 py-3 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="relative shrink-0">
                            <Avatar className="h-10 w-10 rounded-2xl border-2 border-white shadow-md">
                              {selectedChatPeers[0]?.avatarUrl ? <AvatarImage src={selectedChatPeers[0].avatarUrl} alt={selectedChatPeers[0].name} /> : null}
                              <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white font-semibold text-sm">
                                {selectedChat.type === 'GROUP' ? <Users className="h-4 w-4" /> : selectedChat.type === 'BRANCH_TO_BRANCH' ? <Workflow className="h-4 w-4" /> : <MessageCircle className="h-4 w-4" />}
                              </AvatarFallback>
                            </Avatar>
                            {/* Online status indicator */}
                            <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-white bg-green-500 shadow-sm"></div>
                          </div>
                          
                          <div className="flex items-center gap-2 md:hidden">
                            <Button 
                              type="button" 
                              variant="ghost" 
                              size="sm" 
                              className="h-8 w-8 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors" 
                              onClick={() => setMobileView('list')}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                          </div>
                          
                          <div className="flex flex-col min-w-0 flex-1">
                            <h2 className="truncate text-sm font-medium text-gray-900 dark:text-white">{chatTitle(selectedChat)}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{chatSubtitle(selectedChat)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            type="button"
                            variant="ghost"
                            className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 w-11 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                            onClick={() => setShowChatSearch((previous) => !previous)}
                            aria-label={pick('جست‌وجو', 'Search', 'لټون')}
                            title={pick('جست‌وجو', 'Search', 'لټون')}
                          >
                            <Search className="h-6 w-6" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                className="inline-flex items-center justify-center whitespace-nowrap text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 h-11 w-11 rounded-full text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label={pick('گزینه‌ها', 'Options', 'غوراوي')}
                                title={pick('گزینه‌ها', 'Options', 'غوراوي')}
                              >
                                <MoreVertical className="h-6 w-6" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-64">
                              <DropdownMenuLabel>{pick('گزینه‌ها', 'Options', 'غوراوي')}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => setProfileSheetOpen(true)}>
                                <Info className="mr-2 h-4 w-4" />
                                {pick('پروفایل گفتگو', 'Chat profile', 'د چیټ پروفایل')}
                              </DropdownMenuItem>
                              {selectedStoryGroup?.stories.length ? (
                                <DropdownMenuItem onClick={() => setStoryViewerUserId(selectedStoryGroup.user.id)}>
                                  <Sparkles className="mr-2 h-4 w-4" />
                                  {pick('دیدن استوری', 'View story', 'سټوري وګورئ')}
                                </DropdownMenuItem>
                              ) : null}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => updateChatPreference(selectedChat.id, { muted: !selectedChatPreference.muted })}>
                                {selectedChatPreference.muted ? <Volume2 className="mr-2 h-4 w-4" /> : <VolumeX className="mr-2 h-4 w-4" />}
                                {selectedChatPreference.muted ? pick('لغو بی‌صدا', 'Unmute', 'غږ بېرته فعالول') : pick('بی‌صدا', 'Mute', 'غلی')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => {
                                const nextArchived = !selectedChatPreference.archived
                                updateChatPreference(selectedChat.id, { archived: nextArchived })
                                setShowArchived(nextArchived)
                              }}>
                                {selectedChatPreference.archived ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
                                {selectedChatPreference.archived ? pick('بازگردانی', 'Restore', 'بېرته راګرځول') : pick('بایگانی', 'Archive', 'ارشيف')}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateChatPreference(selectedChat.id, { clearBefore: new Date().toISOString() })}>
                                <Trash2 className="mr-2 h-4 w-4" />
                                {pick('پاک‌سازی برای من', 'Clear for me', 'یوازې زما لپاره پاکول')}
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Palette className="mr-2 h-4 w-4" />
                                  {pick('پس‌زمینه', 'Theme', 'شالید')}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuRadioGroup value={selectedChatPreference.theme || 'midnight'} onValueChange={(value) => updateChatPreference(selectedChat.id, { theme: value as ChatTheme })}>
                                    {(['midnight', 'violet', 'forest', 'sunset', 'ocean', 'graphite', 'lavender', 'crimson'] as ChatTheme[]).map((theme) => (
                                      <DropdownMenuRadioItem key={theme} value={theme}>
                                        {themeLabel(theme)}
                                      </DropdownMenuRadioItem>
                                    ))}
                                  </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>

                              <DropdownMenuSub>
                                <DropdownMenuSubTrigger>
                                  <Clock3 className="mr-2 h-4 w-4" />
                                  {pick('ماندگاری', 'Retention', 'ساتنه')}
                                </DropdownMenuSubTrigger>
                                <DropdownMenuSubContent>
                                  <DropdownMenuRadioGroup value={selectedChatPreference.retention || 'ALL'} onValueChange={(value) => updateChatPreference(selectedChat.id, { retention: value as RetentionPreset })}>
                                    {(['ALL', '24H', '7D', '30D'] as RetentionPreset[]).map((preset) => (
                                      <DropdownMenuRadioItem key={preset} value={preset}>
                                        {retentionLabel(preset)}
                                      </DropdownMenuRadioItem>
                                    ))}
                                  </DropdownMenuRadioGroup>
                                </DropdownMenuSubContent>
                              </DropdownMenuSub>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      {showChatSearch ? (
                        <div className="mt-3">
                          <div className="relative">
                            <Search
                              className={cn(
                                'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground',
                                isRTL ? 'right-3' : 'left-3'
                              )}
                            />
                            <Input
                              value={messageSearch}
                              onChange={(event) => setMessageSearch(event.target.value)}
                              placeholder={pick('جست‌وجو در پیام‌های همین گفتگو', 'Search inside this chat', 'په همدې چیټ کې لټون')}
                              className={cn('h-11 rounded-2xl border-border bg-background', isRTL ? 'pr-9' : 'pl-9')}
                            />
                            {messageSearch ? (
                              <button
                                type="button"
                                onClick={() => setMessageSearch('')}
                                className={cn(
                                  'absolute top-1/2 -translate-y-1/2 rounded-full p-2 text-white/75 transition hover:bg-white/10 hover:text-white',
                                  isRTL ? 'left-2' : 'right-2'
                                )}
                                aria-label={pick('پاک‌کردن', 'Clear', 'پاکول')}
                                title={pick('پاک‌کردن', 'Clear', 'پاکول')}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    <div className="relative flex min-h-0 flex-1 flex-col">
                    <ScrollArea ref={messagesScrollAreaRef} className={cn('flex-1 whatsapp-chat-bg', selectedChatPreference.theme && chatThemePanelClasses[selectedChatPreference.theme])}>
                      <div className="min-h-full px-4 py-4 pb-20 sm:px-5">
                        <div className="flex justify-center pb-2">
                          {hasOlderMessages ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={loadingOlderMessages}
                              onClick={() =>
                                void loadOlderMessages().catch((error) =>
                                  toast.error(error instanceof Error ? error.message : 'Failed to load older messages')
                                )
                              }
                              className="rounded-full"
                            >
                              {loadingOlderMessages ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              ) : (
                                <RefreshCw className="mr-2 h-4 w-4" />
                              )}
                              {pick('بارگذاری پیام‌های قبلی', 'Load older', 'پخوانۍ پیغامونه')}
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {pick('آغاز گفتگو', 'Start of chat', 'د چیټ پیل')}
                            </span>
                          )}
                        </div>

                        <div className="space-y-3">
                          {visibleMessages.map((message) => {
                            const mine = message.senderId === currentUserId
                            const displayMessage = message.deletedAt
                              ? pick('پیام حذف شد', 'Message deleted', 'پیغام حذف شو')
                              : message.message

                            const display = message.deletedAt
                              ? { ...message, message: displayMessage, fileUrl: null, fileName: null }
                              : { ...message, message: displayMessage }

                            return (
                              <EnhancedMessageBubble
                                key={message.id}
                                message={display}
                                isMine={mine}
                                language={language}
                                currentUserId={currentUserId}
                                canDelete={mine || !!canModerateMessages}
                                onReply={(target) => {
                                  setReplyTo(target)
                                  setTimeout(() => composerTextareaRef.current?.focus(), 0)
                                }}
                                onForward={() => {
                                  setForwardingMessage(message)
                                  setForwardDialogOpen(true)
                                  setForwardTargetChatId(null)
                                  setForwardSearch('')
                                }}
                                onDelete={(id) =>
                                  void deleteMessage(id).catch((error) =>
                                    toast.error(error instanceof Error ? error.message : 'Failed to delete message')
                                  )
                                }
                                onReact={(id, emoji) =>
                                  void reactToMessage(id, emoji).catch((error) =>
                                    toast.error(error instanceof Error ? error.message : 'Failed to react')
                                  )
                                }
                                onCopy={(text) => {
                                  void navigator.clipboard.writeText(text).then(
                                    () => toast.success(pick('کپی شد', 'Copied', 'کاپي شو')),
                                    () => toast.error(pick('کپی شدنی نیست', 'Copy failed', 'کاپي نشو'))
                                  )
                                }}
                              />
                            )
                          })}

                          {!visibleMessages.length ? (
                            <div className="rounded-3xl border border-dashed border-black/15 bg-white/70 p-8 text-center text-sm text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-white/75">
                              {pick('در بازه فعلی پیامی برای نمایش باقی نمانده است.', 'No messages are visible in the current retention window.', 'په اوسني ساتنې موده کې د ښودلو لپاره پیغام نشته.')}
                            </div>
                          ) : null}
                          <div ref={messagesBottomAnchorRef} />
                        </div>
                      </div>
                    </ScrollArea>
                    {!isAtBottom ? (
                      <button
                        type="button"
                        onClick={() => scrollToBottom('smooth')}
                        className={cn(
                          'absolute bottom-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-border/70 bg-background/85 text-foreground shadow-[0_22px_55px_-35px_rgba(0,0,0,0.55)] backdrop-blur transition hover:bg-background',
                          language === 'en' ? 'right-4' : 'left-4'
                        )}
                        aria-label={pick('رفتن به آخر', 'Jump to latest', 'وروستي ته تلل')}
                        title={pick('رفتن به آخر', 'Jump to latest', 'وروستي ته تلل')}
                      >
                        <ChevronDown className="h-5 w-5" />
                      </button>
                    ) : null}
                    </div>

                    <form
                      onSubmit={(event) => { void sendMessage(event).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to send message')) }}
                      ref={composerFormRef}
                      className="whatsapp-input-area"
                    >
                      {replyTo ? (
                        <div className="mb-2 flex items-start justify-between gap-3 rounded-2xl border border-border/70 bg-background/80 px-3 py-2 backdrop-blur">
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-slate-900 dark:text-white">
                              {pick('پاسخ به', 'Replying to', 'ځواب')}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">
                              {replyTo.senderName}{' '}
                              <span className="opacity-70">·</span>{' '}
                              {replyTo.deletedAt
                                ? pick('پیام حذف شد', 'Message deleted', 'پیغام حذف شو')
                                : replyTo.message || replyTo.fileName || pick('پیوست', 'Attachment', 'ضمیمه')}
                            </p>
                          </div>
                          <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setReplyTo(null)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : null}

                      {isRecording ? (
                        <div className="mb-2 text-xs font-semibold text-red-600 dark:text-red-400">
                          {pick('در حال ضبط', 'Recording', 'ثبت روان دی')} · {recordingLabel}
                        </div>
                      ) : null}

                      {showGifPicker ? (
                        <div className="mb-2 space-y-3 rounded-2xl border border-border/70 bg-background/95 p-4 backdrop-blur-xl">
                          <div className="flex items-center justify-between gap-3">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{pick('انتخاب GIF', 'Choose GIF', 'GIF وټاکئ')}</h3>
                            <Button type="button" variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => { setShowGifPicker(false); setGifSearch(''); setSearchedGifs([]) }}>
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="relative">
                            <Search className={cn('pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
                            <Input
                              value={gifSearch}
                              onChange={(event) => setGifSearch(event.target.value)}
                              placeholder={pick('جستوجوی GIF...', 'Search GIFs...', 'GIF لټون...')}
                              className={cn('h-11 rounded-2xl border-border bg-background', isRTL ? 'pr-10' : 'pl-10')}
                            />
                          </div>
                          <ScrollArea className="h-[320px]">
                            {gifLoading ? (
                              <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
                              </div>
                            ) : (
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                                {(searchedGifs.length > 0 ? searchedGifs : trendingGifs).map((gif) => (
                                  <button
                                    key={gif.id}
                                    type="button"
                                    onClick={() => {
                                      setGifUrl(gif.url)
                                      setShowGifPicker(false)
                                      setGifSearch('')
                                      setSearchedGifs([])
                                      void sendGifAttachment(gif.url).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to send GIF'))
                                    }}
                                    className="group relative aspect-square overflow-hidden rounded-xl border border-border/70 bg-muted/40 transition hover:border-violet-500/40 hover:shadow-lg"
                                    title={gif.title}
                                  >
                                    <img src={gif.previewUrl || gif.url} alt={gif.title} className="h-full w-full object-cover" loading="lazy" />
                                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-t from-black/60 via-black/0 to-black/0 opacity-0 transition group-hover:opacity-100">
                                      <Send className="h-6 w-6 text-white drop-shadow-lg" />
                                    </div>
                                  </button>
                                ))}
                              </div>
                            )}
                            {!gifLoading && (searchedGifs.length === 0 && trendingGifs.length === 0) ? (
                              <div className="py-12 text-center text-sm text-muted-foreground">
                                {pick('GIF یافت نشد', 'No GIFs found', 'GIF ونه موندل شو')}
                              </div>
                            ) : null}
                          </ScrollArea>
                          <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <span>{pick('منبع', 'Source', 'سرچینه')}</span>
                              {gifProvider === 'GIPHY' ? (
                                <span className="font-bold text-violet-600 dark:text-violet-400">GIPHY</span>
                              ) : (
                                <span className="font-bold text-violet-600 dark:text-violet-400">{pick('کتابخانه داخلی', 'Built-in library', 'داخلي کتابتون')}</span>
                              )}
                            </div>
                            {gifProvider !== 'GIPHY' ? (
                              <span className="rounded-full border border-border/60 bg-background/60 px-2 py-0.5">
                                {pick('اینترنت/کلید GIF در دسترس نیست', 'GIF provider unavailable', 'د GIF سرچینه نشته')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ) : null}

                      <Dialog
                        open={manualLocationOpen}
                        onOpenChange={(open) => {
                          setManualLocationOpen(open)
                          if (!open) {
                            setManualLocationDraft('')
                          }
                        }}
                      >
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>{pick('ارسال موقعیت', 'Send location', 'موقعیت لېږل')}</DialogTitle>
                            <DialogDescription>
                              {pick(
                                'اگر مرورگر اجازه موقعیت نمی‌دهد، یک لینک Google Maps یا مختصات را اینجا وارد کنید.',
                                'If your browser cannot provide location, paste a Google Maps link or coordinates here.',
                                'که براوزر موقعیت نه ورکوي، دلته د Google Maps لینک یا مختصات ورکړئ.'
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-3">
                            <Textarea
                              value={manualLocationDraft}
                              onChange={(event) => setManualLocationDraft(event.target.value)}
                              placeholder={pick('مثال: 34.5281, 69.1723 یا https://maps.google.com/...', 'Example: 34.5281, 69.1723 or https://maps.google.com/...', 'بېلګه: 34.5281, 69.1723 یا https://maps.google.com/...')}
                              rows={3}
                            />
                            <div className="flex items-center justify-end gap-2">
                              <Button type="button" variant="outline" onClick={() => setManualLocationOpen(false)}>
                                {pick('انصراف', 'Cancel', 'لغوه')}
                              </Button>
                              <Button
                                type="button"
                                disabled={manualLocationSending || !manualLocationDraft.trim()}
                                onClick={() => {
                                  void sendManualLocationMessage().catch((error) =>
                                    toast.error(error instanceof Error ? error.message : 'Failed to send location')
                                  )
                                }}
                              >
                                {manualLocationSending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                <span className={manualLocationSending ? 'ml-2' : ''}>{pick('ارسال', 'Send', 'ولېږه')}</span>
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,audio/webm,audio/ogg,audio/mp4,audio/mpeg,audio/x-m4a,audio/aac,audio/wav,audio/x-wav,audio/wave"
                          className="hidden"
                          onChange={handleAttachmentSelection}
                        />

                      <div className="flex items-end gap-2">
                        <button
                          type="button"
                          className="whatsapp-attach-btn"
                          disabled={uploadingMedia || !hasActiveChat}
                          onClick={() => fileInputRef.current?.click()}
                          aria-label={pick('پیوست', 'Attachment', 'ضمیمه')}
                          title={pick('پیوست', 'Attachment', 'ضمیمه')}
                        >
                          {uploadingMedia ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
                        </button>

                        <button
                          type="button"
                          className="whatsapp-attach-btn"
                          disabled={!hasActiveChat}
                          onClick={() => setShowGifPicker((previous) => !previous)}
                          aria-label={pick('GIF', 'GIF', 'GIF')}
                          title={pick('انتخاب GIF', 'Choose GIF', 'GIF وټاکئ')}
                        >
                          <Film className="h-5 w-5" />
                        </button>

                        <button
                          type="button"
                          className="whatsapp-attach-btn"
                          disabled={uploadingMedia || !hasActiveChat}
                          onClick={() => { void sendLocationMessage().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to send location')) }}
                          aria-label={pick('موقعیت', 'Location', 'موقعیت')}
                          title={pick('ارسال موقعیت', 'Send location', 'موقعیت لېږل')}
                        >
                          <MapPin className="h-5 w-5" />
                        </button>

                        <textarea
                          ref={composerTextareaRef}
                          value={draft}
                          onChange={(event) => setDraft(event.target.value)}
                          placeholder={pick('پیام…', 'Message…', 'پیغام…')}
                          className="whatsapp-input-box flex-1"
                          disabled={!hasActiveChat}
                          rows={1}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' && !event.shiftKey) {
                              event.preventDefault()
                              composerFormRef.current?.requestSubmit()
                            }
                          }}
                        />

                        <button
                          type="button"
                          className={cn('whatsapp-voice-btn', isRecording ? 'whatsapp-recording' : '')}
                          disabled={uploadingMedia || !hasActiveChat}
                          onClick={() => { void handleVoiceRecordingToggle().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to record voice')) }}
                          aria-label={pick('ویس', 'Voice note', 'غږیز یادښت')}
                          title={pick('ویس نوت', 'Voice note', 'غږیز یادښت')}
                        >
                          {isRecording ? <StopCircle className="h-5 w-5 text-white" /> : <Mic className="h-5 w-5" />}
                        </button>

                        <button
                          type="submit"
                          className="whatsapp-send-btn"
                          disabled={!hasActiveChat || !draft.trim()}
                          aria-label={pick('ارسال', 'Send', 'لېږل')}
                          title={pick('ارسال', 'Send', 'لېږل')}
                        >
                          <Send className="h-5 w-5 text-white" />
                        </button>
                      </div>
                    </form>
                  </> : <div className="flex flex-1 items-center justify-center px-6 text-center text-muted-foreground">{pick('یک گفت‌وگوی داخلی را انتخاب کنید یا از بخش ایجاد، گفت‌وگوی جدید بسازید.', 'Choose an internal conversation or create a new one.', 'یوه داخلي خبرې وټاکئ یا له جوړولو برخې څخه نوی چیټ جوړ کړئ.')}</div>}
                </CardContent>
              </Card>
            </div>
            </div>

            <PortalStoryViewer
              groups={storyGroups}
              activeGroupId={storyViewerUserId}
              language={language}
              open={!!storyViewerUserId}
              onOpenChange={(open) => { if (!open) setStoryViewerUserId(null) }}
              onSelectGroup={setStoryViewerUserId}
              onSeen={markStorySeen}
              onLike={handleStoryLike}
              onReply={handleStoryReply}
              onDelete={(storyId) => { void deleteStory(storyId).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to delete story')) }}
              currentUserId={currentUserId}
            />

            <PortalProfileSheet
              activeChat={selectedChat}
              peers={selectedChatPeers}
              messages={messages}
              storyGroup={selectedStoryGroup}
              language={language}
              open={profileSheetOpen}
              onOpenChange={setProfileSheetOpen}
              onOpenStory={() => {
                if (selectedStoryGroup) {
                  setStoryViewerUserId(selectedStoryGroup.user.id)
                  setProfileSheetOpen(false)
                }
              }}
            />

            <PortalPeopleDialog
              open={peopleOpen}
              onOpenChange={setPeopleOpen}
              language={language}
              currentUserRole={session?.user?.role}
              loading={connectionsLoading}
              search={directorySearch}
              onSearchChange={setDirectorySearch}
              directory={filteredDirectory}
              incomingRequests={incomingRequests}
              outgoingRequests={outgoingRequests}
              actionBusyId={connectionActionUserId}
              onStartChat={(contact) => {
                void startDirectChat(contact).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to start direct chat'))
                setPeopleOpen(false)
              }}
              onStartSupportChat={(targetUserId) => {
                void startAdminSupportChat(targetUserId).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to open support session'))
              }}
              onRequestConnection={(targetId) => {
                void sendConnectionRequest(targetId).catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to create connection request'))
              }}
              onAcceptRequest={(requestId) => {
                void updateConnectionRequest(requestId, 'accept').catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to update connection request'))
              }}
              onDeclineRequest={(requestId) => {
                void updateConnectionRequest(requestId, 'decline').catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to update connection request'))
              }}
              onCancelRequest={(requestId) => {
                void updateConnectionRequest(requestId, 'cancel').catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to update connection request'))
              }}
            />

            <Dialog
              open={forwardDialogOpen}
              onOpenChange={(open) => {
                setForwardDialogOpen(open)
                if (!open) {
                  setForwardingMessage(null)
                  setForwardTargetChatId(null)
                  setForwardSearch('')
                }
              }}
            >
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>{pick('ارسال مجدد', 'Forward message', 'بیا لېږل')}</DialogTitle>
                    <DialogDescription>
                      {pick(
                        'یک گفت‌وگو را انتخاب کنید تا همین پیام دوباره ارسال شود.',
                        'Pick a chat to forward this message into.',
                        'یو چټ وټاکئ تر څو همدا پیغام بیا ولېږل شي.'
                      )}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                  <div className="relative">
                    <Search
                      className={cn(
                        'pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground',
                        isRTL ? 'right-3' : 'left-3'
                      )}
                    />
                    <Input
                      value={forwardSearch}
                      onChange={(event) => setForwardSearch(event.target.value)}
                      placeholder={pick('جست‌وجوی گفت‌گوها...', 'Search chats...', 'چټونه ولټوئ...')}
                      className={cn('h-11 rounded-2xl border-border bg-background', isRTL ? 'pr-10' : 'pl-10')}
                    />
                  </div>
                  <div className="rounded-2xl border border-border/70">
                    <ScrollArea className="h-72 p-2">
                      <div className="space-y-1">
                        {forwardTargets.map((chat) => {
                          const selected = chat.id === forwardTargetChatId
                          return (
                            <button
                              key={chat.id}
                              type="button"
                              onClick={() => setForwardTargetChatId(chat.id)}
                              className={cn(
                                'flex w-full items-center justify-between gap-3 rounded-2xl border px-3 py-3 text-left transition',
                                selected ? 'border-violet-500/40 bg-violet-500/10' : 'border-transparent hover:bg-muted/40'
                              )}
                            >
                              <div className="min-w-0">
                                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{chatTitle(chat)}</div>
                                <div className="truncate text-xs text-muted-foreground">{chatSubtitle(chat)}</div>
                              </div>
                              {selected ? <Check className="h-4 w-4 text-violet-600 dark:text-violet-300" /> : null}
                            </button>
                          )
                        })}
                        {!forwardTargets.length ? (
                          <div className="p-6 text-center text-sm text-muted-foreground">
                            {pick('گفت‌گوی دیگری برای ارسال مجدد پیدا نشد.', 'No other chats found.', 'نور چټ ونه موندل شو.')}
                          </div>
                        ) : null}
                      </div>
                    </ScrollArea>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setForwardDialogOpen(false)}>
                      {pick('لغو', 'Cancel', 'لغوه')}
                    </Button>
                    <Button
                      type="button"
                      disabled={!forwardTargetChatId || !forwardingMessage || forwardSending}
                      onClick={() => {
                        if (!forwardTargetChatId) return
                        void forwardMessageToChat(forwardTargetChatId).catch((error) =>
                          toast.error(error instanceof Error ? error.message : 'Failed to forward message')
                        )
                      }}
                    >
                      {forwardSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                      {pick('ارسال', 'Forward', 'لېږل')}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </TabsContent>

          <TabsContent id="portal-announcements-panel" value="announcements" className="flex flex-1 flex-col overflow-hidden min-h-0">
            <div className="grid h-full min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-[minmax(280px,320px)_minmax(0,1fr)] xl:grid-cols-[minmax(300px,336px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(320px,352px)_minmax(0,1fr)]">
              {isAdmin ? (
                <Card className="lg:col-span-2 rounded-[28px] border border-white/20 bg-white/40 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-slate-900/40">
                  <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                    <div className="space-y-3">
                      <div>
                        <h3 className="text-lg font-black text-slate-900 dark:text-white">
                          {pick('کنترل مدیریتی پیام‌رسان', 'Messenger admin control', 'د پیغام رسوونکي اداري کنټرول')}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {pick('از همین‌جا پیام همگانی بفرستید یا بخش پشتیبانی را مدیریت کنید. گفتگوهای پشتیبانی مهمان و کاربران عادی در تب «پشتیبانی» در دسترس هستند.', 'Send a broadcast here or manage the support section. Visitor and standard support conversations are available in the "Support" tab.', 'له همدې ځایه عام پیغام واستوئ یا د ملاتړ برخه اداره کړئ. د مېلمنو او عادي کاروونکو د ملاتړ خبرې د «ملاتړ» په ټب کې شتون لري.')}
                        </p>
                      </div>
                      <Textarea
                        value={adminBroadcastDraft}
                        onChange={(event) => setAdminBroadcastDraft(event.target.value)}
                        placeholder={pick('پیام همگانی به همه کاربران فعال...', 'Broadcast message to all active users...', 'ټولو فعالو کاروونکو ته عام پیغام...')}
                        className="min-h-[96px] rounded-2xl border-border/70 bg-background/80"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => setTab('customers')}>
                        <MessageCircle className="mr-2 h-4 w-4" />
                        {pick('بخش پشتیبانی', 'Support section', 'د ملاتړ برخه')}
                      </Button>
                      <Button
                        type="button"
                        disabled={adminBroadcastSending || !adminBroadcastDraft.trim()}
                        onClick={() => {
                          void sendAdminBroadcast().catch((error) =>
                            toast.error(error instanceof Error ? error.message : 'Failed to send broadcast message')
                          )
                        }}
                      >
                        {adminBroadcastSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BellRing className="mr-2 h-4 w-4" />}
                        {pick('ارسال همگانی', 'Broadcast now', 'عام پیغام واستوئ')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}
              <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/40 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-slate-900/40"><CardHeader><CardTitle>{pick('اعلان‌ها و هشدارها', 'Announcements and alerts', 'اعلانونه او خبرتیاوې')}</CardTitle><CardDescription>{pick('پیام‌های همگانی مدیریت، هشدارهای سیستم و اعلان‌های عملیاتی همین‌جا دیده می‌شوند.', 'Admin broadcasts, system warnings, and operational notices appear here.', 'د مدیریت عام پیغامونه، د سیستم خبرتیاوې، او عملياتي اعلانونه دلته ښکاري.')}</CardDescription></CardHeader><CardContent className="flex flex-1 flex-col space-y-4"><div className="grid grid-cols-2 gap-3"><Card className="border-border/70 bg-background shadow-none"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{pick('کل اعلان‌ها', 'Total notices', 'ټول اعلانونه')}</div><div className="mt-2 text-2xl font-black">{notifications.length}</div></CardContent></Card><Card className="border-border/70 bg-background shadow-none"><CardContent className="p-4"><div className="text-xs text-muted-foreground">{pick('خوانده‌نشده', 'Unread', 'نالوستي')}</div><div className="mt-2 text-2xl font-black">{unreadNotifications}</div></CardContent></Card></div><Button variant="outline" className="w-full" disabled={unreadNotifications === 0} onClick={() => { void markAllRead().catch((error) => toast.error(error instanceof Error ? error.message : 'Failed to mark notifications as read')) }}>{pick('خواندن همه اعلان‌ها', 'Mark all as read', 'ټول اعلانونه لوستل شوي وټاکئ')}</Button></CardContent></Card>
              <Card className="flex h-full min-h-0 flex-col overflow-hidden rounded-[28px] border border-white/20 bg-white/40 backdrop-blur-2xl shadow-[0_20px_70px_-15px_rgba(0,0,0,0.3)] dark:border-white/10 dark:bg-slate-900/40"><CardContent className="flex min-h-0 flex-1 flex-col p-5"><ScrollArea className="flex-1 min-h-0"><div className="space-y-3">{notifications.map((notification) => <div key={notification.id} className={`rounded-2xl border p-4 ${notification.read ? 'border-border/70 bg-background' : 'border-amber-300/40 bg-amber-50/70 dark:border-amber-300/15 dark:bg-amber-500/10'}`}><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-slate-900 dark:text-white">{notification.title}</span>{!notification.read ? <Badge className="bg-amber-500 text-white">{pick('جدید', 'New', 'نوی')}</Badge> : null}{notification.action === 'BROADCAST_MESSAGE' ? <Badge variant="outline">{pick('پیام همگانی مدیریت', 'Admin broadcast', 'د مدیریت عام پیغام')}</Badge> : null}</div><p className="mt-2 text-sm leading-7 text-muted-foreground">{notification.message}</p><p className="mt-3 text-xs text-muted-foreground">{formatDate(notification.createdAt, language)}</p></div>)}{!notifications.length ? <div className="rounded-2xl border border-dashed border-border/70 p-8 text-center text-sm text-muted-foreground">{pick('هنوز اعلان یا پیام همگانی جدیدی وجود ندارد.', 'No announcements or broadcasts yet.', 'لا اعلان یا عام پیغام نشته.')}</div> : null}</div></ScrollArea></CardContent></Card>
            </div>
          </TabsContent>
        {/* Bottom Tab Navigation */}
          <div className="sticky bottom-0 z-30 mx-3 mb-2 sm:mx-4 sm:mb-3">
            <div className="relative mx-auto max-w-xs">
              {/* Subtle glass container */}
              <div className="relative overflow-hidden rounded-full border border-white/8 bg-white/50 backdrop-blur-xl shadow-lg dark:border-white/3 dark:bg-slate-900/50">
                <div className="relative flex items-center justify-around p-2">
                  <button
                    onClick={() => setTab('customers')}
                    className={`group relative flex flex-col items-center justify-center gap-1 rounded-full p-2.5 transition-all duration-200 ${
                      tab === 'customers'
                        ? 'bg-white text-slate-900 shadow-md scale-105 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/30 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/20'
                    }`}
                    title={customerTabLabel}
                  >
                    <MessageCircle className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    <span className="text-[9px] font-medium leading-none">{customerTabLabel}</span>
                  </button>

                  <button
                    onClick={() => setTab('operations')}
                    className={`group relative flex flex-col items-center justify-center gap-1 rounded-full p-2.5 transition-all duration-200 ${
                      tab === 'operations'
                        ? 'bg-white text-slate-900 shadow-md scale-105 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/30 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/20'
                    }`}
                    title={pick('داخلی', 'Internal', 'داخلي')}
                  >
                    <Users className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    <span className="text-[9px] font-medium leading-none">{pick('داخلی', 'Internal', 'داخلي')}</span>
                    {unreadInternal > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-medium text-white">
                        {unreadInternal > 99 ? '99+' : unreadInternal}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setTab('announcements')}
                    className={`group relative flex flex-col items-center justify-center gap-1 rounded-full p-2.5 transition-all duration-200 ${
                      tab === 'announcements'
                        ? 'bg-white text-slate-900 shadow-md scale-105 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/30 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-700/20'
                    }`}
                    title={pick('اعلان‌ها', 'Updates', 'اعلانونه')}
                  >
                    <BellRing className="h-4 w-4 transition-transform duration-200 group-hover:scale-110" />
                    <span className="text-[9px] font-medium leading-none">{pick('اعلان‌ها', 'Updates', 'اعلانونه')}</span>
                    {unreadNotifications > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-medium text-white">
                        {unreadNotifications > 99 ? '99+' : unreadNotifications}
                      </span>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </Tabs>
      </div>
    </DashboardLayout>
  )
}
