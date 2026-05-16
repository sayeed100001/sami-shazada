import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const sarafId = sanitizeInput(searchParams.get('sarafId') || '')

    if (sarafId) {
      const favorite = await prisma.userFavorite.findUnique({
        where: {
          userId_sarafId: {
            userId: session.user.id,
            sarafId,
          },
        },
        select: { id: true },
      })

      return NextResponse.json({ isFavorite: Boolean(favorite) })
    }

    const favorites = await prisma.userFavorite.findMany({
      where: { userId: session.user.id },
      include: {
        saraf: {
          include: {
            branches: {
              where: { isActive: true },
              take: 1,
              select: {
                city: true,
                country: true,
              },
            },
            user: {
              select: {
                name: true,
                email: true
              }
            },
            _count: {
              select: {
                ratings: true,
              },
            },
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json({
      favorites: favorites.map((favorite) => ({
        id: favorite.id,
        sarafId: favorite.sarafId,
        createdAt: favorite.createdAt.toISOString(),
        saraf: {
          id: favorite.saraf.id,
          businessName: favorite.saraf.businessName,
          city: favorite.saraf.branches[0]?.city || 'Kabul',
          province: favorite.saraf.branches[0]?.country || 'Afghanistan',
          phone: favorite.saraf.businessPhone,
          email: favorite.saraf.user.email,
          rating: favorite.saraf.rating,
          totalRatings: favorite.saraf._count.ratings,
          isVerified: favorite.saraf.status === 'APPROVED' && favorite.saraf.isActive,
          user: {
            name: favorite.saraf.user.name,
          },
        },
      })),
    })

  } catch (error) {
    console.error('Get favorites error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sarafId } = await request.json()
    
    if (!sarafId) {
      return NextResponse.json({ error: 'Saraf ID required' }, { status: 400 })
    }

    const sanitizedSarafId = sanitizeInput(sarafId)

    // Check if saraf exists
    const saraf = await prisma.saraf.findUnique({
      where: { id: sanitizedSarafId }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    // Check if already in favorites
    const existing = await prisma.userFavorite.findUnique({
      where: {
        userId_sarafId: {
          userId: session.user.id,
          sarafId: sanitizedSarafId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Already in favorites' }, { status: 400 })
    }

    // Add to favorites
    const favorite = await prisma.userFavorite.create({
      data: {
        userId: session.user.id,
        sarafId: sanitizedSarafId
      }
    })

    // Create notification
    await prisma.notification.create({
      data: {
        userId: session.user.id,
        title: 'صراف به علاقهمندیها اضافه شد',
        message: `${saraf.businessName} به لیست علاقهمندیهای شما اضافه شد`,
        type: 'success',
        action: 'FAVORITE_ADDED',
        resource: 'SARAF',
        resourceId: sanitizedSarafId
      }
    })

    return NextResponse.json({ success: true, favorite })

  } catch (error) {
    console.error('Add favorite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const sarafId = sanitizeInput(body.sarafId || '')
    
    if (!sarafId) {
      return NextResponse.json({ error: 'Saraf ID required' }, { status: 400 })
    }

    // Delete from favorites
    await prisma.userFavorite.deleteMany({
      where: {
        userId: session.user.id,
        sarafId: sarafId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Remove favorite error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
