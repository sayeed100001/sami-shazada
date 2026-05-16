import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) return ApiResponse.unauthorized('Unauthorized')
    if (session.user.role !== 'SARAF') return ApiResponse.forbidden('Forbidden')

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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const skip = (page - 1) * limit

    const [requests, total] = await Promise.all([
      prisma.transaction.findMany({
        where: {
          sarafId,
          type: 'HAWALA_REQUEST',
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.transaction.count({
        where: {
          sarafId,
          type: 'HAWALA_REQUEST',
        },
      })
    ])

    return ApiResponse.ok({
      requests: requests.map((req) => ({
        id: req.id,
        referenceCode: req.referenceCode,
        senderId: req.senderId,
        status: req.status,
        fromAmount: req.fromAmount,
        toAmount: req.toAmount,
        fromCurrency: req.fromCurrency,
        toCurrency: req.toCurrency,
        rate: req.rate,
        senderName: req.senderName,
        senderPhone: req.senderPhone,
        receiverName: req.receiverName,
        receiverPhone: req.receiverPhone,
        receiverCity: req.receiverCity,
        receiverCountry: req.receiverCountry,
        notes: req.notes,
        createdAt: req.createdAt,
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    console.error('Fetch hawala requests error:', error)
    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}
