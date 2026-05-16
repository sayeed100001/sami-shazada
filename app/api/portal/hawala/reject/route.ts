import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { sanitizeInput } from '@/lib/security'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return ApiResponse.unauthorized('Unauthorized')
    if (session.user.role !== 'SARAF') return ApiResponse.forbidden('Forbidden')

    const body = await request.json()
    const requestId = sanitizeInput(body?.requestId)
    const reason = body?.reason ? sanitizeInput(body.reason) : null

    if (!requestId) {
      return ApiResponse.error('Request ID required', 400, 'VALIDATION_ERROR')
    }

    const sarafId =
      session.user.sarafId ||
      (await prisma.saraf
        .findUnique({
          where: { userId: session.user.id },
          select: { id: true },
        })
        .then((saraf) => saraf?.id))

    if (!sarafId) {
      return ApiResponse.notFound('Saraf not found')
    }

    const hawalaRequest = await prisma.transaction.findFirst({
      where: {
        id: requestId,
        sarafId,
        type: 'HAWALA_REQUEST',
        status: 'PENDING',
      },
    })

    if (!hawalaRequest) {
      return ApiResponse.notFound('Request not found or already processed')
    }

    const rejectionNote = reason
      ? `${hawalaRequest.notes || ''}\nRejected by saraf: ${reason}`.trim()
      : `${hawalaRequest.notes || ''}\nRejected by saraf`.trim()

    const updated = await prisma.$transaction(async (tx) => {
      const updateResult = await tx.transaction.updateMany({
        where: {
          id: requestId,
          sarafId,
          type: 'HAWALA_REQUEST',
          status: 'PENDING',
        },
        data: {
          status: 'CANCELLED',
          notes: rejectionNote,
        },
      })

      if (updateResult.count !== 1) {
        return null
      }

      if (hawalaRequest.senderId) {
        await tx.notification.create({
          data: {
            userId: hawalaRequest.senderId,
            title: 'Hawala request rejected',
            message: `Request ${hawalaRequest.referenceCode} was rejected by the selected saraf.`,
            type: 'transaction',
            action: 'HAWALA_REJECTED',
            resource: 'TRANSACTION',
            resourceId: hawalaRequest.id,
          },
        })
      }

      await tx.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'HAWALA_REJECTED',
          resource: 'TRANSACTION',
          resourceId: hawalaRequest.id,
          details: JSON.stringify({
            referenceCode: hawalaRequest.referenceCode,
            reason,
          }),
        },
      })

      return true
    })

    if (!updated) {
      return ApiResponse.notFound('Request not found or already processed')
    }

    return ApiResponse.ok({ message: 'Request rejected successfully' })
  } catch (error) {
    console.error('Reject hawala request error:', error)
    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}
