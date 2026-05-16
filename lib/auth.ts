import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'
import { prisma } from './prisma'
import { normalizeOptionalRegistrationPhone, normalizeRegistrationEmail } from './auth-registration'
import { getLoginRateLimitState } from './auth-rate-limit'
import { verifyRecaptchaToken } from './recaptcha'
import {
  isUserSessionActive,
  registerUserSession,
  revokeUserSession,
  touchUserSession,
} from './session-registry'

const SESSION_MAX_AGE = 14 * 24 * 60 * 60 // 14 days
const SESSION_UPDATE_AGE = 12 * 60 * 60 // 12 hours

function sanitizeAuditValue(value: string | null | undefined) {
  return String(value || 'unknown').replace(/[\r\n\t]/g, ' ').slice(0, 255)
}

function getRequestMetadata(req: { headers?: Record<string, string | string[] | undefined> } | undefined) {
  const forwardedFor = req?.headers?.['x-forwarded-for']
  const realIp = req?.headers?.['x-real-ip']
  const userAgent = req?.headers?.['user-agent']

  const ipValue = Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
  const resolvedIp = (ipValue || (Array.isArray(realIp) ? realIp[0] : realIp) || 'unknown').split(',')[0]?.trim()
  const resolvedUserAgent = Array.isArray(userAgent) ? userAgent[0] : userAgent

  return {
    ipAddress: sanitizeAuditValue(resolvedIp),
    userAgent: sanitizeAuditValue(resolvedUserAgent),
  }
}

async function logAuthAudit(data: {
  userId?: string
  action: string
  email?: string
  role?: string
  reason?: string
  ipAddress?: string
  userAgent?: string
}) {
  await prisma.auditLog.create({
    data: {
      userId: data.userId,
      action: data.action,
      resource: 'AUTH',
      details: JSON.stringify({
        email: data.email,
        role: data.role,
        reason: data.reason,
      }),
      ipAddress: data.ipAddress || 'unknown',
      userAgent: data.userAgent || 'unknown',
    }
  }).catch((error) => {
    console.error('Failed to write auth audit log:', error)
  })
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        captchaToken: { label: 'CAPTCHA Token', type: 'text' },
        captchaAction: { label: 'CAPTCHA Action', type: 'text' }
      },
      async authorize(credentials, req) {
        const requestMeta = getRequestMetadata(req)

        if (!credentials?.email || !credentials?.password) {
          console.log('Missing credentials')
          await logAuthAudit({
            action: 'LOGIN_FAILED',
            reason: 'MISSING_CREDENTIALS',
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent,
          })
          return null
        }

        let normalizedIdentifier: string
        let userLookupWhere: { email: string } | { phone: string }
        try {
          const rawIdentifier = String(credentials.email).trim()
          if (rawIdentifier.includes('@')) {
            normalizedIdentifier = normalizeRegistrationEmail(rawIdentifier)
            userLookupWhere = { email: normalizedIdentifier }
          } else {
            const normalizedPhone = normalizeOptionalRegistrationPhone(rawIdentifier)
            if (!normalizedPhone) {
              throw new Error('Invalid phone format')
            }

            normalizedIdentifier = normalizedPhone
            userLookupWhere = { phone: normalizedIdentifier }
          }
        } catch {
          console.log('Invalid login identifier format')
          await logAuthAudit({
            action: 'LOGIN_FAILED',
            email: sanitizeAuditValue(credentials.email),
            reason: 'INVALID_IDENTIFIER',
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent,
          })
          return null
        }

        const recaptchaCheck = await verifyRecaptchaToken({
          token: typeof credentials.captchaToken === 'string' ? credentials.captchaToken : null,
          action: typeof credentials.captchaAction === 'string' ? credentials.captchaAction : 'signin',
          remoteIp: requestMeta.ipAddress,
        })

        if (recaptchaCheck.enabled && !recaptchaCheck.success) {
          await logAuthAudit({
            action: 'LOGIN_BLOCKED',
            email: normalizedIdentifier,
            reason: `CAPTCHA_FAILED:${recaptchaCheck.reason || 'UNKNOWN'}`,
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent,
          })
          throw new Error('Security verification failed. Please try again.')
        }

        const rateLimitState = await getLoginRateLimitState({
          email: normalizedIdentifier,
          ipAddress: requestMeta.ipAddress,
        })

        if (!rateLimitState.allowed) {
          await logAuthAudit({
            action: 'LOGIN_BLOCKED',
            email: normalizedIdentifier,
            reason: 'RATE_LIMIT',
            ipAddress: requestMeta.ipAddress,
            userAgent: requestMeta.userAgent,
          })
          throw new Error('Too many login attempts. Please try again later.')
        }

        try {
          // Connect to database if not connected
          await prisma.$connect()
          
          const user = await prisma.user.findFirst({
            where: userLookupWhere,
            include: { saraf: true }
          })

          if (!user) {
            // Sanitize email for logging to prevent log injection
            const sanitizedEmail = normalizedIdentifier.replace(/[\r\n\t]/g, ' ').slice(0, 100)
            console.log('User not found:', sanitizedEmail)
            await logAuthAudit({
              action: 'LOGIN_FAILED',
              email: sanitizedEmail,
              reason: 'USER_NOT_FOUND',
              ipAddress: requestMeta.ipAddress,
              userAgent: requestMeta.userAgent,
            })
            return null
          }

          const passwordMatch = await bcrypt.compare(credentials.password, user.password)
          
          if (!passwordMatch) {
            // Sanitize email for logging to prevent log injection
            const sanitizedEmail = normalizedIdentifier.replace(/[\r\n\t]/g, ' ').slice(0, 100)
            console.log('Password mismatch for user:', sanitizedEmail)
            await logAuthAudit({
              userId: user.id,
              action: 'LOGIN_FAILED',
              email: sanitizedEmail,
              role: user.role,
              reason: 'INVALID_PASSWORD',
              ipAddress: requestMeta.ipAddress,
              userAgent: requestMeta.userAgent,
            })
            return null
          }

          if (!user.isActive) {
            await logAuthAudit({
              userId: user.id,
              action: 'LOGIN_BLOCKED',
              email: user.email,
              role: user.role,
              reason: 'ACCOUNT_INACTIVE',
              ipAddress: requestMeta.ipAddress,
              userAgent: requestMeta.userAgent,
            })
            throw new Error('Account is deactivated. Please contact support.')
          }

          // Update last login and create audit log
          const sessionId = randomUUID()
          await Promise.all([
            prisma.user.update({
              where: { id: user.id },
              data: { lastLogin: new Date() }
            }),
            registerUserSession({
              userId: user.id,
              sessionId,
              ipAddress: requestMeta.ipAddress,
              userAgent: requestMeta.userAgent,
            }),
            logAuthAudit({
              userId: user.id,
              action: 'LOGIN',
              email: user.email,
              role: user.role,
              ipAddress: requestMeta.ipAddress,
              userAgent: requestMeta.userAgent,
            })
          ]).catch((error) => {
            console.error('Failed to update login info:', error)
          })
          
          // Sanitize user data for logging to prevent log injection
          const sanitizedEmail = user.email.replace(/[\r\n\t]/g, ' ').slice(0, 100)
          const sanitizedRole = user.role.replace(/[\r\n\t]/g, ' ')
          console.log('Successful login for user:', sanitizedEmail, 'Role:', sanitizedRole)
          
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            avatarUrl: user.avatarUrl,
            role: user.role,
            sarafId: user.saraf?.id,
            sarafStatus: user.saraf?.status,
            sessionId
          }
        } catch (error) {
          console.error('Authentication error:', error)
          if (error instanceof Error) {
            throw error
          }
          return null
        }
      }
    })
  ],
  session: {
    strategy: 'jwt',
    maxAge: SESSION_MAX_AGE,
    updateAge: SESSION_UPDATE_AGE,
  },
  jwt: {
    maxAge: SESSION_MAX_AGE,
  },
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.avatarUrl = user.avatarUrl
        token.role = user.role
        token.sarafId = user.sarafId
        token.sarafStatus = user.sarafStatus
        token.sessionId = user.sessionId
        token.iat = Math.floor(Date.now() / 1000)
        token.error = undefined
      }

      if (token.sub && token.sessionId) {
        try {
          const isActive = await isUserSessionActive(token.sub, token.sessionId)
          if (!isActive) {
            return {
              ...token,
              sub: undefined,
              role: undefined,
              sarafId: undefined,
              sarafStatus: undefined,
              sessionId: undefined,
              error: 'SESSION_REVOKED',
            }
          }

          await touchUserSession(token.sub, token.sessionId)
        } catch (error) {
          const sanitizedError = error instanceof Error ? error.message.replace(/[\r\n\t]/g, ' ').slice(0, 200) : 'Unknown error'
          console.error('Session registry validation error:', sanitizedError)
          return {
            ...token,
            sub: undefined,
            role: undefined,
            sarafId: undefined,
            sarafStatus: undefined,
            sessionId: undefined,
            error: 'SESSION_VALIDATION_FAILED',
          }
        }
      }
      
      // Refresh user data on update, and backfill older tokens that are missing role metadata.
      if ((trigger === 'update' || (token.sub && !token.role)) && token.sub) {
        try {
          const user = await prisma.user.findUnique({
            where: { id: token.sub },
            include: { saraf: true }
          })
          
          if (user && user.isActive) {
            token.avatarUrl = user.avatarUrl
            token.role = user.role
            token.sarafId = user.saraf?.id
            token.sarafStatus = user.saraf?.status
          } else if (!user || !user.isActive) {
            return {
              ...token,
              sub: undefined,
              role: undefined,
              sarafId: undefined,
              sarafStatus: undefined,
              sessionId: undefined,
              error: 'SESSION_USER_NOT_AVAILABLE',
            }
          }
        } catch (error) {
          const sanitizedError = error instanceof Error ? error.message.replace(/[\r\n\t]/g, ' ').slice(0, 200) : 'Unknown error'
          console.error('Token refresh error:', sanitizedError)
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user && token.sub && token.role) {
        session.user.id = token.sub
        session.user.role = token.role as string
        session.user.avatarUrl = (token.avatarUrl as string | null | undefined) ?? null
        session.user.sarafId = token.sarafId as string
        session.user.sarafStatus = token.sarafStatus as string
        session.user.sessionId = token.sessionId as string
      }
      session.error = token.error as string | undefined
      return session
    }
  },
  events: {
    async signOut({ token }) {
      if (token?.sub) {
        if (token.sessionId) {
          await revokeUserSession(token.sub, token.sessionId).catch(console.error)
        }

        await prisma.auditLog.create({
          data: {
            userId: token.sub,
            action: 'LOGOUT',
            resource: 'AUTH'
          }
        }).catch(console.error)
      }
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error'
  },
  useSecureCookies: process.env.NODE_ENV === 'production',
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development' && process.env.NEXTAUTH_DEBUG === 'true'
}
