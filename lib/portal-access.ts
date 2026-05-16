export const PORTAL_ROLES = ['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'] as const

export type PortalUserRole = (typeof PORTAL_ROLES)[number]

export function isPortalRole(role?: string | null): role is PortalUserRole {
  return typeof role === 'string' && PORTAL_ROLES.includes(role as PortalUserRole)
}

export function isPortalOwnerRole(role?: string | null): role is 'SARAF' {
  return role === 'SARAF'
}

export function getPortalRoleLabel(role?: string | null): string {
  switch (role) {
    case 'SARAF':
      return 'صراف'
    case 'BRANCH_MANAGER':
      return 'مدیر شعبه'
    case 'BRANCH_STAFF':
      return 'کارمند شعبه'
    default:
      return 'کاربر'
  }
}
