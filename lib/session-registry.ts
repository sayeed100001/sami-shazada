import { prisma } from '@/lib/prisma'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

export type StoredSession = {
  id: string
  createdAt: string
  lastSeenAt: string
  ipAddress: string
  userAgent: string
  revokedAt?: string | null
}

const SESSION_CONFIG_PREFIX = 'session_registry_'
const SESSION_CACHE_TTL_MS = 30 * 1000
const SESSION_TOUCH_INTERVAL_MS = 15 * 60 * 1000
const MAX_STORED_SESSIONS = 20

const sessionCache = new Map<string, { expiresAt: number; sessions: StoredSession[] }>()

function getSessionConfigKey(userId: string) {
  return `${SESSION_CONFIG_PREFIX}${userId}`
}

function normalizeSessions(sessions: StoredSession[]) {
  return sessions
    .filter((session) => session.id && session.createdAt && session.lastSeenAt)
    .sort((left, right) => new Date(right.lastSeenAt).getTime() - new Date(left.lastSeenAt).getTime())
    .slice(0, MAX_STORED_SESSIONS)
}

async function readUserSessions(userId: string) {
  const cacheKey = getSessionConfigKey(userId)
  const cached = sessionCache.get(cacheKey)
  if (cached && cached.expiresAt > Date.now()) {
    return cached.sessions
  }

  const config = await prisma.systemConfig.findUnique({
    where: { key: cacheKey }
  })

  if (!config?.value) {
    return []
  }

  try {
    const rawValue = decryptConfigValue(cacheKey, config.value)
    const parsed = JSON.parse(rawValue) as StoredSession[]
    const normalized = normalizeSessions(Array.isArray(parsed) ? parsed : [])
    sessionCache.set(cacheKey, {
      expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
      sessions: normalized
    })
    return normalized
  } catch {
    return []
  }
}

async function writeUserSessions(userId: string, sessions: StoredSession[]) {
  const cacheKey = getSessionConfigKey(userId)
  const normalized = normalizeSessions(sessions)
  const serialized = JSON.stringify(normalized)
  const encrypted = encryptConfigValue(cacheKey, serialized)

  await prisma.systemConfig.upsert({
    where: { key: cacheKey },
    update: {
      value: encrypted,
      description: 'Active user sessions'
    },
    create: {
      key: cacheKey,
      value: encrypted,
      description: 'Active user sessions'
    }
  })

  sessionCache.set(cacheKey, {
    expiresAt: Date.now() + SESSION_CACHE_TTL_MS,
    sessions: normalized
  })
}

export async function registerUserSession(input: {
  userId: string
  sessionId: string
  ipAddress?: string
  userAgent?: string
}) {
  const existingSessions = await readUserSessions(input.userId)
  const now = new Date().toISOString()

  const updatedSessions = existingSessions.filter((session) => session.id !== input.sessionId)
  updatedSessions.unshift({
    id: input.sessionId,
    createdAt: now,
    lastSeenAt: now,
    ipAddress: String(input.ipAddress || 'unknown').slice(0, 255),
    userAgent: String(input.userAgent || 'unknown').slice(0, 255),
    revokedAt: null,
  })

  await writeUserSessions(input.userId, updatedSessions)
}

export async function listUserSessions(userId: string) {
  return readUserSessions(userId)
}

export async function touchUserSession(userId: string, sessionId: string) {
  const sessions = await readUserSessions(userId)
  const target = sessions.find((session) => session.id === sessionId && !session.revokedAt)

  if (!target) {
    return
  }

  const now = Date.now()
  if (now - new Date(target.lastSeenAt).getTime() < SESSION_TOUCH_INTERVAL_MS) {
    return
  }

  target.lastSeenAt = new Date(now).toISOString()
  await writeUserSessions(userId, sessions)
}

export async function isUserSessionActive(userId: string, sessionId: string) {
  const sessions = await readUserSessions(userId)
  const current = sessions.find((session) => session.id === sessionId)
  return Boolean(current && !current.revokedAt)
}

export async function revokeUserSession(userId: string, sessionId: string) {
  const sessions = await readUserSessions(userId)
  const now = new Date().toISOString()
  const updated = sessions.map((session) => (
    session.id === sessionId
      ? { ...session, revokedAt: now }
      : session
  ))

  await writeUserSessions(userId, updated)
}

export async function revokeOtherUserSessions(userId: string, currentSessionId?: string) {
  const sessions = await readUserSessions(userId)
  const now = new Date().toISOString()
  const updated = sessions.map((session) => (
    session.id !== currentSessionId && !session.revokedAt
      ? { ...session, revokedAt: now }
      : session
  ))

  await writeUserSessions(userId, updated)
}
