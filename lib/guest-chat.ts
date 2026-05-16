export const GUEST_CHAT_ID_PREFIX = 'guest_'

export function toGuestChatSessionRef(id: string) {
  return `${GUEST_CHAT_ID_PREFIX}${id}`
}

export function fromGuestChatSessionRef(value: string) {
  return value.startsWith(GUEST_CHAT_ID_PREFIX)
    ? value.slice(GUEST_CHAT_ID_PREFIX.length)
    : null
}

export function isGuestChatSessionRef(value: string) {
  return fromGuestChatSessionRef(value) !== null
}

export function normalizeOptionalContact(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function getGuestDisplayContact(email: string | null, phone: string | null) {
  return email || phone || ''
}

type GuestChatMessageLike = {
  id: string
  sessionId: string
  senderType: string
  senderUserId?: string | null
  senderName: string
  message: string
  fileUrl?: string | null
  fileName?: string | null
  isRead: boolean
  createdAt: Date
}

export function normalizeGuestChatMessage(message: GuestChatMessageLike) {
  return {
    ...message,
    timestamp: message.createdAt,
    senderRole: message.senderType,
  }
}
