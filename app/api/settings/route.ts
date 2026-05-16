import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ConfigEnforcer } from '@/lib/config-enforcer'
import {
  normalizeOptionalRegistrationPhone,
  normalizeRegistrationName,
} from '@/lib/auth-registration'
import { listUserSessions, revokeOtherUserSessions } from '@/lib/session-registry'
import { DEFAULT_USER_SETTINGS, normalizeUserSettings } from '@/lib/user-settings'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const [user, rewardSummary, savedSettingsRecord] = await Promise.all([
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatarUrl: true,
            role: true,
            isActive: true,
            isVerified: true,
            createdAt: true,
            lastLogin: true,
          }
        }),
        prisma.userReward.aggregate({
          where: { userId: session.user.id, isUsed: false, OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }] },
          _count: true,
        }),
        prisma.systemConfig.findUnique({ where: { key: `user_settings_${session.user.id}` } })
      ])

      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }

      const savedSettings = savedSettingsRecord ? normalizeUserSettings(JSON.parse(savedSettingsRecord.value)) : null

      const settings = {
        user: savedSettings ?? DEFAULT_USER_SETTINGS,
        profile: user,
        rewards: { active: rewardSummary._count },
        security: {
          twoFactorEnabled: await ConfigEnforcer.isTwoFactorEnabled(),
          activeSessions: (await listUserSessions(session.user.id)).map((activeSession) => ({
            ...activeSession,
            isCurrent: activeSession.id === session.user.sessionId
          }))
        }
      }

      return NextResponse.json(settings)

    } catch (dbError) {
      console.error('Database error in settings:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

  } catch (error) {
    console.error('Settings fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { profile, user: userSettings, system: systemSettings } = body

    try {
      // Update user profile if provided
      if (profile) {
        const updateData: Record<string, unknown> = {}

        if (profile.name) {
          try {
            updateData.name = normalizeRegistrationName(profile.name)
          } catch {
            return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
          }
        }

        if (profile.phone !== undefined) {
          if (!profile.phone) {
            updateData.phone = null
          } else {
            try {
              updateData.phone = normalizeOptionalRegistrationPhone(profile.phone)
            } catch {
              return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
            }
          }
        }

        if (profile.avatarUrl !== undefined) {
          updateData.avatarUrl = profile.avatarUrl ? String(profile.avatarUrl).trim() : null
        }

        // Handle password change
        if (profile.newPassword && profile.currentPassword) {
          const bcrypt = require('bcryptjs')
          const user = await prisma.user.findUnique({
            where: { id: session.user.id },
            select: { password: true }
          })

          if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 })
          }

          const isValid = await bcrypt.compare(profile.currentPassword, user.password)
          if (!isValid) {
            return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
          }

          const passwordValidation = await ConfigEnforcer.validatePassword(profile.newPassword)
          if (!passwordValidation.valid) {
            return NextResponse.json({ error: passwordValidation.errors[0] || 'Invalid password' }, { status: 400 })
          }

          updateData.password = await bcrypt.hash(profile.newPassword, 12)
        }

        if (Object.keys(updateData).length > 0) {
          await prisma.user.update({ where: { id: session.user.id }, data: updateData })

          if (profile.newPassword && profile.currentPassword) {
            await revokeOtherUserSessions(session.user.id, session.user.sessionId)
          }
        }
      }

      // Persist user settings (notifications, privacy, preferences) to DB
      if (userSettings) {
        const settingsKey = `user_settings_${session.user.id}`
        await prisma.systemConfig.upsert({
          where: { key: settingsKey },
          update: { value: JSON.stringify(userSettings) },
          create: { key: settingsKey, value: JSON.stringify(userSettings), description: `User settings for ${session.user.id}` }
        })
      }

      // Update system settings if user is admin
      if (systemSettings && session.user.role === 'ADMIN') {
        for (const [key, value] of Object.entries(systemSettings)) {
          await prisma.systemConfig.upsert({
            where: { key },
            update: { value: String(value) },
            create: { key, value: String(value), description: `Updated by ${session.user.name}` }
          })
        }
      }

      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SETTINGS_UPDATED',
          resource: 'USER_SETTINGS',
          resourceId: session.user.id,
          details: JSON.stringify({ userSettings: !!userSettings, systemSettings: !!systemSettings })
        }
      })

      return NextResponse.json({ success: true })

    } catch (dbError) {
      console.error('Database error in settings update:', dbError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
