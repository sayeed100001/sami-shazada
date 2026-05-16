import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

function serializeSarafProfile<T extends {
  licenseNumber?: string | null
  premiumExpiry?: Date | null
  isPremium: boolean
}>(saraf: T) {
  const now = new Date()
  const isPremiumActive = saraf.isPremium && (!saraf.premiumExpiry || saraf.premiumExpiry >= now)

  return {
    ...saraf,
    isPremium: isPremiumActive,
    businessLicense: saraf.licenseNumber || '',
    premiumExpiresAt: saraf.premiumExpiry ? saraf.premiumExpiry.toISOString() : null,
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const saraf = await prisma.saraf.findFirst({
        where: { userId: session.user.id },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      if (!saraf) {
        return NextResponse.json({ error: 'Saraf profile not found' }, { status: 404 })
      }

      return NextResponse.json(serializeSarafProfile(saraf))
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Database operation failed' }, { status: 503 })
    }

  } catch (error) {
    console.error('Profile fetch error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'SARAF') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const businessName = sanitizeInput(body.businessName)
    const businessPhone = sanitizeInput(body.businessPhone)
    const businessAddress = sanitizeInput(body.businessAddress)
    const licenseNumber = sanitizeInput(body.licenseNumber ?? body.businessLicense)

    if (!businessName || !businessPhone || !businessAddress) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    try {
      const saraf = await prisma.saraf.update({
        where: { userId: session.user.id },
        data: {
          businessName,
          businessPhone,
          businessAddress,
          licenseNumber,
          updatedAt: new Date()
        },
        include: {
          user: {
            select: {
              name: true,
              email: true
            }
          }
        }
      })

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'SARAF_PROFILE_UPDATED',
          resource: 'SARAF',
          resourceId: saraf.id,
          details: JSON.stringify({
            businessName,
            businessPhone,
            businessAddress
          })
        }
      })

      return NextResponse.json(serializeSarafProfile(saraf))
    } catch (dbError) {
      console.error('Database error:', dbError)
      return NextResponse.json({ error: 'Database operation failed' }, { status: 503 })
    }

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
