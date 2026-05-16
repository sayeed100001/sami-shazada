import { prisma } from './prisma'
import { cacheGet, cacheSet, isRedisAvailable } from './redis'

interface LockoutState {
  attempts: number
  lockedUntil: number | null
  lastAttempt: number
}

const MAX_LOGIN_ATTEMPTS = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000 // 30 minutes
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// In-memory fallback
const inMemoryLockouts = new Map<string, LockoutState>()

function getLockoutKey(identifier: string): string {
  return `lockout:${identifier}`
}

export async function getLoginAttempts(identifier: string): Promise<LockoutState> {
  const key = getLockoutKey(identifier)

  if (isRedisAvailable()) {
    const cached = await cacheGet<LockoutState>(key)
    if (cached) return cached
  } else {
    const cached = inMemoryLockouts.get(key)
    if (cached) return cached
  }

  return {
    attempts: 0,
    lockedUntil: null,
    lastAttempt: 0
  }
}

export async function recordFailedLogin(identifier: string): Promise<LockoutState> {
  const state = await getLoginAttempts(identifier)
  const now = Date.now()

  // Reset if window expired
  if (now - state.lastAttempt > ATTEMPT_WINDOW_MS) {
    state.attempts = 1
  } else {
    state.attempts++
  }

  state.lastAttempt = now

  // Lock account if max attempts reached
  if (state.attempts >= MAX_LOGIN_ATTEMPTS) {
    state.lockedUntil = now + LOCKOUT_DURATION_MS

    // Log to audit
    await prisma.auditLog.create({
      data: {
        action: 'ACCOUNT_LOCKED',
        resource: 'AUTH',
        details: JSON.stringify({
          identifier,
          attempts: state.attempts,
          lockedUntil: new Date(state.lockedUntil).toISOString()
        })
      }
    }).catch(console.error)
  }

  const key = getLockoutKey(identifier)
  const ttlSeconds = Math.ceil(LOCKOUT_DURATION_MS / 1000)

  if (isRedisAvailable()) {
    await cacheSet(key, state, ttlSeconds)
  } else {
    inMemoryLockouts.set(key, state)
    setTimeout(() => inMemoryLockouts.delete(key), LOCKOUT_DURATION_MS)
  }

  return state
}

export async function recordSuccessfulLogin(identifier: string): Promise<void> {
  const key = getLockoutKey(identifier)

  if (isRedisAvailable()) {
    await cacheSet(key, {
      attempts: 0,
      lockedUntil: null,
      lastAttempt: Date.now()
    }, 60)
  } else {
    inMemoryLockouts.delete(key)
  }
}

export async function isAccountLocked(identifier: string): Promise<{
  locked: boolean
  remainingTime?: number
}> {
  const state = await getLoginAttempts(identifier)
  const now = Date.now()

  if (state.lockedUntil && state.lockedUntil > now) {
    return {
      locked: true,
      remainingTime: Math.ceil((state.lockedUntil - now) / 1000)
    }
  }

  return { locked: false }
}

export async function unlockAccount(identifier: string): Promise<void> {
  const key = getLockoutKey(identifier)

  if (isRedisAvailable()) {
    await cacheSet(key, {
      attempts: 0,
      lockedUntil: null,
      lastAttempt: 0
    }, 60)
  } else {
    inMemoryLockouts.delete(key)
  }

  await prisma.auditLog.create({
    data: {
      action: 'ACCOUNT_UNLOCKED',
      resource: 'AUTH',
      details: JSON.stringify({ identifier })
    }
  }).catch(console.error)
}
