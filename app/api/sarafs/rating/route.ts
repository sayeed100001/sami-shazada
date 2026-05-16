import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { sarafId, rating, comment } = await request.json()
    const ratingValue = Number(rating)
    
    if (!sarafId || !Number.isFinite(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      return NextResponse.json({ error: 'Invalid rating data' }, { status: 400 })
    }

    const sanitizedSarafId = sanitizeInput(sarafId)
    const sanitizedComment = sanitizeInput(comment || '')
    const normalizedRating = Math.round(ratingValue)

    const saraf = await prisma.saraf.findUnique({
      where: { id: sanitizedSarafId },
      select: {
        id: true,
        userId: true
      }
    })

    if (!saraf) {
      return NextResponse.json({ error: 'Saraf not found' }, { status: 404 })
    }

    if (saraf.userId === session.user.id) {
      return NextResponse.json({ error: 'You cannot rate your own saraf' }, { status: 400 })
    }

    const completedTransactions = await prisma.transaction.count({
      where: {
        senderId: session.user.id,
        sarafId: sanitizedSarafId,
        status: 'COMPLETED'
      }
    })

    const isVerified = completedTransactions > 0

    await prisma.sarafRating.upsert({
      where: {
        userId_sarafId: {
          userId: session.user.id,
          sarafId: sanitizedSarafId
        }
      },
      create: {
        userId: session.user.id,
        sarafId: sanitizedSarafId,
        rating: normalizedRating,
        comment: sanitizedComment || null,
        isVerified
      },
      update: {
        rating: normalizedRating,
        comment: sanitizedComment || null,
        isVerified
      }
    })

    const aggregates = await prisma.sarafRating.aggregate({
      where: {
        sarafId: sanitizedSarafId
      },
      _avg: {
        rating: true
      },
      _count: {
        id: true
      }
    })

    const averageRating = aggregates._avg.rating || 0
    const totalRatings = aggregates._count.id

    await prisma.saraf.update({
      where: { id: sanitizedSarafId },
      data: { rating: averageRating }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'SARAF_RATING_UPSERTED',
        resource: 'SARAF_RATING',
        resourceId: sanitizedSarafId,
        details: JSON.stringify({
          rating: normalizedRating,
          isVerified,
          totalRatings
        })
      }
    })

    return NextResponse.json({
      success: true,
      averageRating,
      totalRatings,
      isVerified
    })

  } catch (error) {
    console.error('Saraf rating error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
