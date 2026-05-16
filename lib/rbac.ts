import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'

export type UserRole = 'USER' | 'SARAF' | 'ADMIN'
export type Permission = 
  | 'READ_USERS' 
  | 'WRITE_USERS' 
  | 'DELETE_USERS'
  | 'READ_SARAFS' 
  | 'WRITE_SARAFS' 
  | 'DELETE_SARAFS'
  | 'READ_TRANSACTIONS' 
  | 'WRITE_TRANSACTIONS' 
  | 'DELETE_TRANSACTIONS'
  | 'READ_RATES' 
  | 'WRITE_RATES'
  | 'READ_REPORTS' 
  | 'WRITE_REPORTS'
  | 'SYSTEM_CONFIG'
  | 'AUDIT_LOGS'
  | 'MANAGE_CONTENT'
  | 'MANAGE_PROMOTIONS'

// Role-based permissions matrix
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  USER: [
    'READ_SARAFS',
    'READ_RATES',
    'READ_TRANSACTIONS' // Only own transactions
  ],
  SARAF: [
    'READ_SARAFS',
    'READ_RATES',
    'WRITE_RATES', // Own rates only
    'READ_TRANSACTIONS', // Own transactions only
    'WRITE_TRANSACTIONS', // Own transactions only
    'READ_REPORTS' // Own reports only
  ],
  ADMIN: [
    'READ_USERS',
    'WRITE_USERS',
    'DELETE_USERS',
    'READ_SARAFS',
    'WRITE_SARAFS',
    'DELETE_SARAFS',
    'READ_TRANSACTIONS',
    'WRITE_TRANSACTIONS',
    'DELETE_TRANSACTIONS',
    'READ_RATES',
    'WRITE_RATES',
    'READ_REPORTS',
    'WRITE_REPORTS',
    'SYSTEM_CONFIG',
    'AUDIT_LOGS',
    'MANAGE_CONTENT',
    'MANAGE_PROMOTIONS'
  ]
}

// Protected routes configuration
const PROTECTED_ROUTES: Record<string, { roles: UserRole[], permissions?: Permission[] }> = {
  '/admin': { roles: ['ADMIN'] },
  '/admin/users': { roles: ['ADMIN'], permissions: ['READ_USERS'] },
  '/admin/sarafs': { roles: ['ADMIN'], permissions: ['READ_SARAFS'] },
  '/admin/transactions': { roles: ['ADMIN'], permissions: ['READ_TRANSACTIONS'] },
  '/admin/reports': { roles: ['ADMIN'], permissions: ['READ_REPORTS'] },
  '/admin/system': { roles: ['ADMIN'], permissions: ['SYSTEM_CONFIG'] },
  '/admin/content': { roles: ['ADMIN'], permissions: ['MANAGE_CONTENT'] },
  '/admin/promotions': { roles: ['ADMIN'], permissions: ['MANAGE_PROMOTIONS'] },
  '/portal': { roles: ['SARAF'] },
  '/portal/rates': { roles: ['SARAF'], permissions: ['WRITE_RATES'] },
  '/portal/transactions': { roles: ['SARAF'], permissions: ['READ_TRANSACTIONS'] },
  '/portal/reports': { roles: ['SARAF'], permissions: ['READ_REPORTS'] },
  '/portal/hawala': { roles: ['SARAF'], permissions: ['WRITE_TRANSACTIONS'] },
  '/profile': { roles: ['USER', 'SARAF', 'ADMIN'] },
  '/user': { roles: ['USER'] },
  '/user/social': { roles: ['USER'] },
  '/user/favorites': { roles: ['USER'] },
  '/community/leaderboard': { roles: ['USER', 'SARAF', 'ADMIN'] },
  '/user/transactions': { roles: ['USER', 'SARAF', 'ADMIN'], permissions: ['READ_TRANSACTIONS'] }
}

// API route permissions
const API_PERMISSIONS: Record<string, { methods: Record<string, Permission[]> }> = {
  '/api/admin/users': {
    methods: {
      'GET': ['READ_USERS'],
      'POST': ['WRITE_USERS'],
      'PUT': ['WRITE_USERS'],
      'DELETE': ['DELETE_USERS']
    }
  },
  '/api/admin/sarafs': {
    methods: {
      'GET': ['READ_SARAFS'],
      'POST': ['WRITE_SARAFS'],
      'PUT': ['WRITE_SARAFS'],
      'DELETE': ['DELETE_SARAFS']
    }
  },
  '/api/admin/transactions': {
    methods: {
      'GET': ['READ_TRANSACTIONS'],
      'POST': ['WRITE_TRANSACTIONS'],
      'PUT': ['WRITE_TRANSACTIONS'],
      'DELETE': ['DELETE_TRANSACTIONS']
    }
  },
  '/api/portal/rates': {
    methods: {
      'GET': ['READ_RATES'],
      'POST': ['WRITE_RATES'],
      'PUT': ['WRITE_RATES'],
      'DELETE': ['WRITE_RATES']
    }
  },
  '/api/portal/transactions': {
    methods: {
      'GET': ['READ_TRANSACTIONS'],
      'POST': ['WRITE_TRANSACTIONS'],
      'PUT': ['WRITE_TRANSACTIONS']
    }
  }
}

export function hasPermission(userRole: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false
}

export function hasAnyPermission(userRole: UserRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission))
}

export function canAccessRoute(userRole: UserRole, pathname: string): boolean {
  const route = PROTECTED_ROUTES[pathname]
  if (!route) return true // Public route
  
  if (!route.roles.includes(userRole)) return false
  
  if (route.permissions) {
    return hasAnyPermission(userRole, route.permissions)
  }
  
  return true
}

export function canAccessAPI(userRole: UserRole, pathname: string, method: string): boolean {
  const apiRoute = API_PERMISSIONS[pathname]
  if (!apiRoute) return true // No specific permissions required
  
  const requiredPermissions = apiRoute.methods[method.toUpperCase()]
  if (!requiredPermissions) return true
  
  return hasAnyPermission(userRole, requiredPermissions)
}

export async function requireAuth(request: NextRequest): Promise<{ user: any; error?: string }> {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user) {
      return { user: null, error: 'Authentication required' }
    }
    
    return { user: session.user }
  } catch (error) {
    return { user: null, error: 'Authentication failed' }
  }
}

export async function requireRole(request: NextRequest, allowedRoles: UserRole[]): Promise<{ user: any; error?: string }> {
  const { user, error } = await requireAuth(request)
  
  if (error || !user) {
    return { user: null, error: error || 'Authentication required' }
  }
  
  if (!allowedRoles.includes(user.role)) {
    return { user: null, error: 'Insufficient permissions' }
  }
  
  return { user }
}

export async function requirePermission(request: NextRequest, permission: Permission): Promise<{ user: any; error?: string }> {
  const { user, error } = await requireAuth(request)
  
  if (error || !user) {
    return { user: null, error: error || 'Authentication required' }
  }
  
  if (!hasPermission(user.role, permission)) {
    return { user: null, error: 'Insufficient permissions' }
  }
  
  return { user }
}

// Middleware helper for API routes
export function withAuth(handler: Function, options?: { roles?: UserRole[], permissions?: Permission[] }) {
  return async (request: NextRequest, context?: any) => {
    try {
      const { user, error } = await requireAuth(request)
      
      if (error || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      if (options?.roles && !options.roles.includes(user.role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      if (options?.permissions && !hasAnyPermission(user.role, options.permissions)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      
      return handler(request, context)
    } catch (error) {
      console.error('Auth middleware error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}

// Client-side permission checker
export function usePermissions(userRole: UserRole) {
  return {
    can: (permission: Permission) => hasPermission(userRole, permission),
    canAny: (permissions: Permission[]) => hasAnyPermission(userRole, permissions),
    canAccess: (pathname: string) => canAccessRoute(userRole, pathname),
    isAdmin: () => userRole === 'ADMIN',
    isSaraf: () => userRole === 'SARAF',
    isUser: () => userRole === 'USER'
  }
}

// Resource ownership validation
export async function validateResourceOwnership(
  userId: string, 
  resourceType: 'transaction' | 'saraf' | 'rate', 
  resourceId: string
): Promise<boolean> {
  try {
    const { prisma } = await import('./prisma')
    
    switch (resourceType) {
      case 'transaction':
        const transaction = await prisma.transaction.findFirst({
          where: {
            id: resourceId,
            OR: [
              { senderId: userId },
              { saraf: { userId } }
            ]
          }
        })
        return !!transaction
        
      case 'saraf':
        const saraf = await prisma.saraf.findFirst({
          where: {
            id: resourceId,
            userId
          }
        })
        return !!saraf
        
      case 'rate':
        const rate = await prisma.rate.findFirst({
          where: {
            id: resourceId,
            saraf: { userId }
          }
        })
        return !!rate
        
      default:
        return false
    }
  } catch (error) {
    console.error('Resource ownership validation error:', error)
    return false
  }
}
