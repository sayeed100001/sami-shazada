export type PortalContact = {
  id: string
  name: string
  email: string
  phone?: string | null
  role: string
  avatarUrl?: string | null
  lastLogin?: string | null
  sarafId?: string | null
  sarafName?: string | null
  sarafPhone?: string | null
  managedBranchNames?: string[]
  staffBranchNames?: string[]
}

export type PortalInternalMessage = {
  id: string
  chatId?: string
  senderId: string
  senderName: string
  message: string
  fileUrl?: string | null
  fileName?: string | null
  createdAt: string
  replyToId?: string | null
  replyToMessage?: string | null
  replyToSenderName?: string | null
  forwardedFromId?: string | null
  deletedAt?: string | null
  deletedById?: string | null
  isRead?: boolean
  isStarred?: boolean
  reactions?: Array<{ userId: string; emoji: string }>
  status?: 'sending' | 'sent' | 'delivered' | 'read'
}

export type PortalInternalChat = {
  id: string
  type: string
  name: string | null
  participants: Array<{
    userId: string
    lastSeen?: string | null
    user: PortalContact
  }>
  messages: PortalInternalMessage[]
  updatedAt: string
  unreadCount: number
}

export type PortalNotificationItem = {
  id: string
  title: string
  message: string
  action?: string | null
  read: boolean
  createdAt: string
}

export type PortalStory = {
  id: string
  caption: string | null
  mediaUrl: string | null
  mediaType: string | null
  backgroundStyle: string | null
  createdAt: string
  expiresAt: string
  seen: boolean
  liked: boolean
  likedType?: string | null
  viewCount: number
  likeCount: number
}

export type PortalStoryGroup = {
  user: PortalContact
  stories: PortalStory[]
  latestAt: string
  unseenCount: number
  allSeen: boolean
}

export type PortalConnectionStatus =
  | 'CONNECTED'
  | 'PENDING_INCOMING'
  | 'PENDING_OUTGOING'
  | 'NONE'

export type PortalDirectoryEntry = PortalContact & {
  connectionStatus: PortalConnectionStatus
  requestId?: string | null
}

export type PortalConnectionRequest = {
  id: string
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'CANCELLED'
  note?: string | null
  createdAt: string
  updatedAt: string
  respondedAt?: string | null
  requester: PortalContact
  target: PortalContact
}
