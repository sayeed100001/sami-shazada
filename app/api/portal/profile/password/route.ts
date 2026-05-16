import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { validatePasswordStrength } from '@/lib/validation'

export const dynamic = 'force-dynamic'

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currentPassword, newPassword } = body

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'رمز عبور فعلی و جدید الزامی است' }, { status: 400 })
    }

    // Validate new password strength
    const passwordValidation = validatePasswordStrength(newPassword)
    if (!passwordValidation.isValid) {
      return NextResponse.json({ 
        error: 'رمز عبور ضعیف است: ' + passwordValidation.errors.join(', ') 
      }, { status: 400 })
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true }
    })

    if (!user) {
      return NextResponse.json({ error: 'کاربر یافت نشد' }, { status: 404 })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: 'رمز عبور فعلی اشتباه است' }, { status: 400 })
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: session.user.id },
      data: { 
        password: hashedPassword,
        updatedAt: new Date()
      }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'PASSWORD_CHANGED',
        resource: 'USER',
        resourceId: session.user.id,
        details: JSON.stringify({ timestamp: new Date().toISOString() })
      }
    })

    return NextResponse.json({ success: true, message: 'رمز عبور با موفقیت تغییر کرد' })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'خطای سرور' }, { status: 500 })
  }
}
