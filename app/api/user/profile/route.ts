import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'
import bcrypt from 'bcryptjs'
import { normalizeOptionalRegistrationPhone, normalizeRegistrationName } from '@/lib/auth-registration'
import { ConfigEnforcer } from '@/lib/config-enforcer'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isVerified: true,
        createdAt: true,
        lastLogin: true,
        saraf: {
          select: {
            id: true,
            businessName: true,
            businessAddress: true,
            businessPhone: true,
            status: true,
            rating: true,
            totalTransactions: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(user)

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch profile' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Sanitize inputs
    const updateData: any = {}
    
    if (body.name) {
      try {
        updateData.name = normalizeRegistrationName(body.name)
      } catch {
        return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
      }
    }
    
    if (body.phone) {
      try {
        updateData.phone = normalizeOptionalRegistrationPhone(body.phone)
      } catch {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }
    } else if (body.phone === null || body.phone === '') {
      updateData.phone = null
    }

    if (body.avatarUrl !== undefined) {
      updateData.avatarUrl = body.avatarUrl ? sanitizeInput(body.avatarUrl) : null
    }
    
    // Handle password change
    if (body.currentPassword && body.newPassword) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      })
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 })
      }
      
      const passwordMatch = await bcrypt.compare(body.currentPassword, user.password)
      if (!passwordMatch) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
      }

      const passwordValidation = await ConfigEnforcer.validatePassword(body.newPassword)
      if (!passwordValidation.valid) {
        return NextResponse.json({ error: passwordValidation.errors[0] || 'Invalid password' }, { status: 400 })
      }
      
      updateData.password = await bcrypt.hash(body.newPassword, 12)
    }

    // Update user
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        role: true,
        isActive: true,
        isVerified: true,
        updatedAt: true
      }
    })

    // Create audit log
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PROFILE_UPDATED',
        resource: 'USER',
        resourceId: session.user.id,
        details: JSON.stringify({
          updatedFields: Object.keys(updateData)
        })
      }
    })

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully'
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { error: 'Failed to update profile' },
      { status: 500 }
    )
  }
}
