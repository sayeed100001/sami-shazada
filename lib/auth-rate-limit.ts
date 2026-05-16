import { prisma } from '@/lib/prisma'

const AUTH_WINDOW_MS = 15 * 60 * 1000
const MAX_LOGIN_ATTEMPTS = 5
const FAILED_ACTIONS = ['LOGIN_FAILED', 'LOGIN_BLOCKED']

function buildEmailNeedle(email: string) {
  return `"email":"${email.replace(/"/g, '\\"')}"`
}

function getWindowStart() {
  return new Date(Date.now() - AUTH_WINDOW_MS)
}

async function getFailureCountByEmail(email: string) {
  const windowStart = getWindowStart()
  const detailNeedle = buildEmailNeedle(email)

  const lastSuccess = await prisma.auditLog.findFirst({
    where: {
      action: 'LOGIN',
      resource: 'AUTH',
      createdAt: { gte: windowStart },
      details: { contains: detailNeedle },
    },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })

  const failureStart = lastSuccess?.createdAt && lastSuccess.createdAt > windowStart
    ? lastSuccess.createdAt
    : windowStart

  return prisma.auditLog.count({
    where: {
      action: { in: FAILED_ACTIONS },
      resource: 'AUTH',
      createdAt: { gte: failureStart },
      details: { contains: detailNeedle },
    },
  })
}

async function getFailureCountByIp(ipAddress: string) {
  if (!ipAddress || ipAddress === 'unknown') {
    return 0
  }

  return prisma.auditLog.count({
    where: {
      action: { in: FAILED_ACTIONS },
      resource: 'AUTH',
      createdAt: { gte: getWindowStart() },
      ipAddress,
    },
  })
}

export async function getLoginRateLimitState(input: {
  email: string
  ipAddress?: string
}) {
  const [emailFailures, ipFailures] = await Promise.all([
    getFailureCountByEmail(input.email),
    getFailureCountByIp(input.ipAddress || 'unknown'),
  ])

  const attempts = Math.max(emailFailures, ipFailures)

  return {
    attempts,
    maxAttempts: MAX_LOGIN_ATTEMPTS,
    allowed: attempts < MAX_LOGIN_ATTEMPTS,
    remaining: Math.max(0, MAX_LOGIN_ATTEMPTS - attempts),
    windowMs: AUTH_WINDOW_MS,
  }
}
