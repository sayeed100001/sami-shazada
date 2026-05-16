import { prisma } from '@/lib/prisma'

export const DEFAULT_USER_SETTINGS = {
  notifications: { email: true, push: false, sms: false, priceAlerts: true, newsUpdates: false },
  privacy: { profileVisible: true, activityVisible: false, dataSharing: false },
  preferences: { language: 'fa', currency: 'AFN', timezone: 'Asia/Kabul', dateFormat: 'persian' },
} as const

export type UserSettings = {
  notifications: {
    email: boolean
    push: boolean
    sms: boolean
    priceAlerts: boolean
    newsUpdates: boolean
  }
  privacy: {
    profileVisible: boolean
    activityVisible: boolean
    dataSharing: boolean
  }
  preferences: {
    language: string
    currency: string
    timezone: string
    dateFormat: string
  }
}

function mergeUserSettings(candidate: unknown): UserSettings {
  if (!candidate || typeof candidate !== 'object') {
    return JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings
  }

  const parsed = candidate as Partial<UserSettings>
  return {
    notifications: {
      ...DEFAULT_USER_SETTINGS.notifications,
      ...(parsed.notifications || {}),
    },
    privacy: {
      ...DEFAULT_USER_SETTINGS.privacy,
      ...(parsed.privacy || {}),
    },
    preferences: {
      ...DEFAULT_USER_SETTINGS.preferences,
      ...(parsed.preferences || {}),
    },
  }
}

export async function getStoredUserSettings(userId: string): Promise<UserSettings> {
  const record = await prisma.systemConfig.findUnique({
    where: { key: `user_settings_${userId}` },
    select: { value: true },
  })

  if (!record?.value) {
    return JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings
  }

  try {
    return mergeUserSettings(JSON.parse(record.value))
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_USER_SETTINGS)) as UserSettings
  }
}

export function normalizeUserSettings(input: unknown): UserSettings {
  return mergeUserSettings(input)
}
