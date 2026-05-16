import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ApiResponse } from '@/lib/api-response'
import { ConfigService } from '@/lib/config-service'

function getClientIp(headers: Headers): string | undefined {
  return headers.get('x-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip') || undefined
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return ApiResponse.error('Unauthorized', 401, 'UNAUTHORIZED')
    }

    const termsEnabled = (await ConfigService.get('terms_enabled', 'true')) !== 'false'
    if (!termsEnabled) {
      return ApiResponse.ok({ accepted: false, reason: 'TERMS_DISABLED' })
    }

    const documentKey = (await ConfigService.get('terms_current_key', 'terms_v1')) || 'terms_v1'

    await prisma.termsAcceptance.upsert({
      where: { userId_documentKey: { userId: session.user.id, documentKey } },
      update: {},
      create: {
        userId: session.user.id,
        documentKey,
        ipAddress: getClientIp(request.headers),
        userAgent: request.headers.get('user-agent') || undefined,
      },
    })

    return ApiResponse.ok({ accepted: true, documentKey })
  } catch (error) {
    console.error('Terms accept error:', error)
    return ApiResponse.error('Internal server error', 500, 'INTERNAL_ERROR')
  }
}

