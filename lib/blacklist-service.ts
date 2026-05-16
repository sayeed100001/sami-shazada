import { prisma } from '@/lib/prisma'
import { normalizePhoneToE164 } from '@/lib/phone'
import { sanitizeInput, validateEmail } from '@/lib/security'

export const BLACKLIST_TYPES = ['PHONE', 'EMAIL', 'NATIONAL_ID'] as const

export type BlacklistType = (typeof BLACKLIST_TYPES)[number]

type BlacklistCandidate = {
  type: BlacklistType
  value: string
}

function normalizeTextValue(value: string) {
  return sanitizeInput(value).replace(/\s+/g, ' ').trim()
}

export function normalizeBlacklistType(value: unknown): BlacklistType {
  const normalized = normalizeTextValue(String(value || '')).toUpperCase()

  if (!BLACKLIST_TYPES.includes(normalized as BlacklistType)) {
    throw new Error('Invalid blacklist type')
  }

  return normalized as BlacklistType
}

export function normalizeBlacklistValue(type: BlacklistType, value: unknown): string {
  const normalized = normalizeTextValue(String(value || ''))
  if (!normalized) {
    throw new Error('Blacklist value is required')
  }

  switch (type) {
    case 'PHONE':
      return normalizePhoneToE164(normalized)
    case 'EMAIL': {
      const email = normalized.toLowerCase()
      if (!validateEmail(email)) {
        throw new Error('Invalid email address')
      }
      return email
    }
    case 'NATIONAL_ID':
    default:
      return normalized.toUpperCase()
  }
}

export function getBlacklistScopeKey(sarafId?: string | null) {
  return sarafId || 'GLOBAL'
}

export async function findBlacklistMatch(options: {
  sarafId?: string | null
  candidates: Array<BlacklistCandidate | null | undefined>
}) {
  const normalizedCandidates = options.candidates
    .filter((candidate): candidate is BlacklistCandidate => Boolean(candidate?.value))
    .map((candidate) => ({
      type: candidate.type,
      normalizedValue: candidate.value,
    }))

  if (normalizedCandidates.length === 0) {
    return null
  }

  const where = options.sarafId
    ? {
        OR: [
          {
            sarafId: options.sarafId,
            OR: normalizedCandidates,
          },
          {
            sarafId: null,
            OR: normalizedCandidates,
          },
        ],
      }
    : {
        sarafId: null,
        OR: normalizedCandidates,
      }

  const matches = await prisma.blacklist.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  if (matches.length === 0) {
    return null
  }

  if (options.sarafId) {
    return (
      matches.find((match) => match.sarafId === options.sarafId) ||
      matches.find((match) => match.sarafId === null) ||
      matches[0]
    )
  }

  return matches[0]
}

export async function assertNotBlacklisted(options: {
  sarafId?: string | null
  candidates: Array<BlacklistCandidate | null | undefined>
}) {
  const match = await findBlacklistMatch(options)
  if (!match) {
    return null
  }

  const scopeLabel = match.sarafId ? 'saraf' : 'global'
  throw new Error(`BLACKLISTED:${match.type}:${scopeLabel}:${match.reason || 'BLOCKED'}`)
}
