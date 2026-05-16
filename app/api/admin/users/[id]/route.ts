import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export const dynamic = 'force-dynamic'

const ALLOWED_ROLES = ['USER', 'SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF', 'ADMIN'] as const

function normalizeRequiredString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim()
  return normalized || null
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        vipLevel: true,
        vipPoints: true,
        totalTransactions: true,
        createdAt: true,
        lastLogin: true,
        saraf: {
          select: {
            id: true,
            businessName: true,
            status: true,
            rating: true,
            isPremium: true
          }
        },
        _count: {
          select: {
            transactions: true,
            notifications: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error fetching user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, email, phone, role, isActive, isVerified, vipLevel, password } = body

    if (role !== undefined && !ALLOWED_ROLES.includes(role as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const existingUser = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        saraf: {
          select: {
            id: true,
          }
        },
        managedBranches: {
          select: { id: true },
          take: 1
        },
        branchStaff: {
          select: { id: true },
          take: 1
        }
      }
    })

    if (!existingUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const normalizedEmail = email !== undefined ? normalizeRequiredString(email).toLowerCase() : undefined
    const normalizedName = name !== undefined ? normalizeRequiredString(name) : undefined
    const normalizedPhone = phone !== undefined ? normalizeOptionalString(phone) : undefined

    if (normalizedEmail !== undefined && !normalizedEmail) {
      return NextResponse.json({ error: 'Email cannot be empty' }, { status: 400 })
    }

    if (normalizedName !== undefined && !normalizedName) {
      return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 })
    }

    if (normalizedEmail && normalizedEmail !== existingUser.email) {
      const duplicateEmail = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      })

      if (duplicateEmail) {
        return NextResponse.json({ error: 'Email already exists' }, { status: 409 })
      }
    }

    if (normalizedPhone !== undefined && normalizedPhone !== existingUser.phone) {
      if (normalizedPhone) {
        const duplicatePhone = await prisma.user.findUnique({
          where: { phone: normalizedPhone }
        })

        if (duplicatePhone) {
          return NextResponse.json({ error: 'Phone number already exists' }, { status: 409 })
        }
      }
    }

    if (role !== undefined && role !== existingUser.role) {
      const hasSarafProfile = Boolean(existingUser.saraf)
      const managesBranch = existingUser.managedBranches.length > 0
      const hasBranchAssignment = existingUser.branchStaff.length > 0

      if (existingUser.role === 'SARAF' && hasSarafProfile) {
        return NextResponse.json(
          { error: 'Remove the linked saraf profile before changing this user to another role.' },
          { status: 400 }
        )
      }

      if (existingUser.role === 'BRANCH_MANAGER' && managesBranch) {
        return NextResponse.json(
          { error: 'Reassign or remove managed branches before changing this user role.' },
          { status: 400 }
        )
      }

      if (existingUser.role === 'BRANCH_STAFF' && hasBranchAssignment) {
        return NextResponse.json(
          { error: 'Remove branch staff assignments before changing this user role.' },
          { status: 400 }
        )
      }

      if (role === 'SARAF' && !hasSarafProfile) {
        return NextResponse.json(
          { error: 'Cannot assign SARAF role without a linked saraf profile.' },
          { status: 400 }
        )
      }

      if (role === 'BRANCH_MANAGER' && !managesBranch) {
        return NextResponse.json(
          { error: 'Cannot assign BRANCH_MANAGER role without a managed branch.' },
          { status: 400 }
        )
      }

      if (role === 'BRANCH_STAFF' && !hasBranchAssignment) {
        return NextResponse.json(
          { error: 'Cannot assign BRANCH_STAFF role without a branch assignment.' },
          { status: 400 }
        )
      }
    }

    // Build update data
    const updateData: any = {}
    if (normalizedName !== undefined) updateData.name = normalizedName
    if (normalizedEmail !== undefined) updateData.email = normalizedEmail
    if (normalizedPhone !== undefined) updateData.phone = normalizedPhone
    if (role !== undefined) updateData.role = role
    if (isActive !== undefined) updateData.isActive = isActive
    if (isVerified !== undefined) updateData.isVerified = isVerified
    if (vipLevel !== undefined) updateData.vipLevel = vipLevel
    
    // Hash password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 12)
    }

    const user = await prisma.user.update({
      where: { id: params.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        isActive: true,
        isVerified: true,
        vipLevel: true,
        createdAt: true
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_UPDATED',
        resource: 'USER',
        resourceId: params.id,
        details: JSON.stringify({
          changes: updateData,
          userName: user.name,
          userEmail: user.email
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Send notification to user
    if (isActive === false) {
      await prisma.notification.create({
        data: {
          userId: params.id,
          title: 'حساب شما غیرفعال شد',
          message: 'حساب کاربری شما توسط مدیریت غیرفعال شد. برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.',
          type: 'warning',
          action: 'CONTACT_SUPPORT'
        }
      })
    } else if (isActive === true) {
      await prisma.notification.create({
        data: {
          userId: params.id,
          title: 'حساب شما فعال شد',
          message: 'حساب کاربری شما توسط مدیریت فعال شد.',
          type: 'success'
        }
      })
    }

    return NextResponse.json({ success: true, user })
  } catch (error) {
    console.error('Error updating user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Prevent self-deletion
    if (session.user.id === params.id) {
      return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        _count: {
          select: {
            transactions: true
          }
        },
        saraf: {
          select: {
            id: true,
            businessName: true,
          }
        },
        managedBranches: {
          select: { id: true },
          take: 1
        },
        branchStaff: {
          select: { id: true },
          take: 1
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user has transactions
    const hasOperationalLinks =
      Boolean(user.saraf) ||
      user.managedBranches.length > 0 ||
      user.branchStaff.length > 0

    if (user._count.transactions > 0 || hasOperationalLinks) {
      return NextResponse.json(
        {
          error:
            user._count.transactions > 0
              ? 'Cannot delete user with existing transactions. Please deactivate instead.'
              : 'Cannot delete user with linked saraf or branch assignments. Remove those links first.',
        },
        { status: 400 }
      )
    }

    // Delete user (cascade will handle related records)
    await prisma.user.delete({
      where: { id: params.id }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'USER_DELETED',
        resource: 'USER',
        resourceId: params.id,
        details: JSON.stringify({
          userName: user.name,
          userEmail: user.email,
          userRole: user.role
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
