import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'PENDING'
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {}
    if (status && status !== 'ALL') {
      where.status = status
    }
    where.type = 'PURCHASE' // Only show purchase requests

    const [requests, total] = await Promise.all([
      prisma.creditTransaction.findMany({
        where,
        include: {
          saraf: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.creditTransaction.count({ where })
    ])

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching credit requests:', error)
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
    const { requestId, action, notes } = body

    if (!requestId || !action) {
      return NextResponse.json({ error: 'Request ID and action are required' }, { status: 400 })
    }

    const creditRequest = await prisma.creditTransaction.findUnique({
      where: { id: requestId },
      include: {
        saraf: {
          include: {
            user: true
          }
        }
      }
    })

    if (!creditRequest) {
      return NextResponse.json({ error: 'Credit request not found' }, { status: 404 })
    }

    if (creditRequest.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request already processed' }, { status: 400 })
    }

    if (action === 'approve') {
      // Start transaction
      const result = await prisma.$transaction(async (tx) => {
        // Update credit request
        const updatedRequest = await tx.creditTransaction.update({
          where: { id: requestId },
          data: {
            status: 'APPROVED',
            approvedBy: session.user.id,
            approvedAt: new Date(),
            description: notes || creditRequest.description
          }
        })

        // Update saraf credit balance
        const updatedSaraf = await tx.saraf.update({
          where: { id: creditRequest.sarafId },
          data: {
            creditBalance: {
              increment: creditRequest.amount
            }
          }
        })

        // Create notification
        await tx.notification.create({
          data: {
            userId: creditRequest.saraf.userId,
            title: 'درخواست کریدیت تایید شد',
            message: `درخواست خرید ${creditRequest.amount} کریدیت شما تایید شد. موجودی جدید: ${updatedSaraf.creditBalance}`,
            type: 'success',
            action: 'VIEW_CREDITS',
            resource: 'CREDIT',
            resourceId: requestId
          }
        })

        return { request: updatedRequest, saraf: updatedSaraf }
      })

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREDIT_REQUEST_APPROVED',
          resource: 'CREDIT_TRANSACTION',
          resourceId: requestId,
          details: JSON.stringify({
            sarafId: creditRequest.sarafId,
            amount: creditRequest.amount,
            newBalance: result.saraf.creditBalance,
            notes
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({ success: true, data: result })

    } else if (action === 'reject') {
      // Update credit request
      const updatedRequest = await prisma.creditTransaction.update({
        where: { id: requestId },
        data: {
          status: 'REJECTED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
          description: notes || creditRequest.description
        }
      })

      // Create notification
      await prisma.notification.create({
        data: {
          userId: creditRequest.saraf.userId,
          title: 'درخواست کریدیت رد شد',
          message: `متأسفانه درخواست خرید ${creditRequest.amount} کریدیت شما رد شد. ${notes ? `دلیل: ${notes}` : ''}`,
          type: 'error',
          action: 'CONTACT_SUPPORT',
          resource: 'CREDIT',
          resourceId: requestId
        }
      })

      // Log the action
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'CREDIT_REQUEST_REJECTED',
          resource: 'CREDIT_TRANSACTION',
          resourceId: requestId,
          details: JSON.stringify({
            sarafId: creditRequest.sarafId,
            amount: creditRequest.amount,
            notes
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({ success: true, data: updatedRequest })
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error processing credit request:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
