import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { caseInsensitiveContains } from '@/lib/prisma-filters'
import { sanitizeInput } from '@/lib/security'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['USER', 'SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'ADMIN'] as const
const CREATABLE_ROLES = ['USER', 'ADMIN'] as const

function normalizeRequiredString(value: unknown) {
  return typeof value === 'string' ? sanitizeInput(value).trim() : ''
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = sanitizeInput(value).trim()
  return normalized || null
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Math.min(100, parseInt(searchParams.get('page') || '1')))
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10')))
    const search = sanitizeInput(searchParams.get('search') || '').substring(0, 50)
    const role = sanitizeInput(searchParams.get('role') || '').substring(0, 20)

    if (role && role !== 'ALL' && !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Invalid role filter' }, { status: 400 })
    }

    const skip = (page - 1) * limit

    try {
      // Build where clause
      const where: any = {}
      if (search) {
        where.OR = [
          { name: caseInsensitiveContains(search) },
          { email: caseInsensitiveContains(search) },
          { phone: caseInsensitiveContains(search) }
        ]
      }
      if (role && role !== 'ALL') {
        where.role = role
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
            role: true,
            isActive: true,
            createdAt: true,
            lastLogin: true,
            saraf: {
              select: {
                id: true,
                businessName: true,
                status: true,
                rating: true
              }
            },
            _count: {
              select: {
                transactions: true,
                notifications: true
              }
            }
          },
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
      ])

      return NextResponse.json({
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      })
    } catch (dbError) {
      console.error('Database error in admin users:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch users from database' },
        { status: 503 }
      )
    }

  } catch (error) {
    console.error('Admin users fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Sanitize inputs
    const email = normalizeRequiredString(body.email).toLowerCase()
    const name = normalizeRequiredString(body.name)
    const phone = normalizeOptionalString(body.phone)
    const role = normalizeRequiredString(body.role)
    const password = body.password

    // Validation
    if (!email || !name || !password || !role) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    if (!ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    if (!CREATABLE_ROLES.includes(role as (typeof CREATABLE_ROLES)[number])) {
      return NextResponse.json(
        {
          error:
            role === 'SARAF'
              ? 'Create saraf accounts through the saraf onboarding flow so the linked business profile is created.'
              : 'Branch staff and branch manager accounts must be provisioned from branch management so branch assignments stay consistent.',
        },
        { status: 400 }
      )
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 })
    }

    if (phone) {
      const existingPhone = await prisma.user.findUnique({
        where: { phone }
      })

      if (existingPhone) {
        return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 })
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        name,
        phone,
        role: role as any,
        password: hashedPassword
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_CREATED',
        resource: 'USER',
        resourceId: user.id,
        details: JSON.stringify({
          email: user.email,
          name: user.name,
          role: user.role
        })
      }
    })

    return NextResponse.json({
      success: true,
      user
    })

  } catch (error) {
    console.error('User creation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
