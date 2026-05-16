import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { ExternalAPIService, type ExternalApiRecord } from '@/lib/external-api-service'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  return session
}

function getRequestMeta(request: NextRequest) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
  }
}

async function writeAuditLog(
  userId: string,
  action: string,
  resourceId: string,
  details: Record<string, unknown>,
  request: NextRequest
) {
  const meta = getRequestMeta(request)

  await prisma.auditLog.create({
    data: {
      userId,
      action,
      resource: 'EXTERNAL_API',
      resourceId,
      details: JSON.stringify(details),
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    },
  })
}

export async function GET() {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apis = await ExternalAPIService.listApis()
    return NextResponse.json({ apis })
  } catch (error) {
    console.error('Error loading external APIs:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<ExternalApiRecord>
    const created = await ExternalAPIService.createApi(body)

    await writeAuditLog(
      session.user.id,
      'EXTERNAL_API_CREATED',
      created.key,
      {
        key: created.key,
        name: created.name,
        category: created.category,
        source: created.source,
      },
      request
    )

    return NextResponse.json({ success: true, api: created }, { status: 201 })
  } catch (error) {
    console.error('Error creating external API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('exists') ? 409 : 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as Partial<ExternalApiRecord> & { key?: string }
    if (!body.key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const updated = await ExternalAPIService.updateApi(body.key, body)

    await writeAuditLog(
      session.user.id,
      'EXTERNAL_API_UPDATED',
      updated.key,
      {
        key: updated.key,
        enabled: updated.enabled,
        baseUrl: updated.baseUrl,
        apiKeysCount: updated.apiKeys.length,
        fieldKeys: Object.keys(updated.fields),
      },
      request
    )

    return NextResponse.json({ success: true, api: updated })
  } catch (error) {
    console.error('Error updating external API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = (await request.json()) as { key?: string }
    if (!body.key) {
      return NextResponse.json({ error: 'API key is required' }, { status: 400 })
    }

    const deleted = await ExternalAPIService.deleteApi(body.key)

    await writeAuditLog(
      session.user.id,
      'EXTERNAL_API_DELETED',
      deleted.key,
      {
        key: deleted.key,
        name: deleted.name,
        source: deleted.source,
      },
      request
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting external API:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: error instanceof Error && error.message.includes('not found') ? 404 : 500 }
    )
  }
}
