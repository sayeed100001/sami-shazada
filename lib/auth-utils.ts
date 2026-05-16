import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { NextResponse } from 'next/server'

export async function checkAdminAuth() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return { error: 'Not authenticated', status: 401 }
    }
    if (session.user.role !== 'ADMIN') {
      return { error: 'Insufficient permissions', status: 403 }
    }
    return { session, status: 200 }
  } catch (error) {
    console.error('Auth check error:', error)
    return { error: 'Authentication failed', status: 500 }
  }
}

export async function checkUserAuth() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return { error: 'Not authenticated', status: 401 }
    }
    return { session, status: 200 }
  } catch (error) {
    console.error('Auth check error:', error)
    return { error: 'Authentication failed', status: 500 }
  }
}

export async function checkSarafAuth() {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return { error: 'Not authenticated', status: 401 }
    }
    if (!['SARAF', 'ADMIN'].includes(session.user.role)) {
      return { error: 'Insufficient permissions', status: 403 }
    }
    return { session, status: 200 }
  } catch (error) {
    console.error('Auth check error:', error)
    return { error: 'Authentication failed', status: 500 }
  }
}