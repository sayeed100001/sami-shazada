import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

function maskApiKey(rawKey: string | undefined): string | null {
  if (!rawKey || rawKey.length < 8) return null
  return `${rawKey.substring(0, 8)}...${rawKey.substring(rawKey.length - 4)}`
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, we'll store API keys in SystemConfig with key pattern: api_key_{id}
    const apiKeyConfig = await prisma.systemConfig.findUnique({
      where: { key: `api_key_${params.id}` }
    })

    if (!apiKeyConfig) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    // Parse the stored API key data
    const apiKeyData = JSON.parse(decryptConfigValue(apiKeyConfig.key, apiKeyConfig.value))

    // Delete the API key
    await prisma.systemConfig.delete({
      where: { key: `api_key_${params.id}` }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'API_KEY_DELETED',
        resource: 'API_KEY',
        resourceId: params.id,
        details: JSON.stringify({
          name: apiKeyData.name,
          deletedAt: new Date().toISOString()
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, message: 'API key deleted successfully' })
  } catch (error) {
    console.error('Error deleting API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, isActive, permissions } = body

    const apiKeyConfig = await prisma.systemConfig.findUnique({
      where: { key: `api_key_${params.id}` }
    })

    if (!apiKeyConfig) {
      return NextResponse.json({ error: 'API key not found' }, { status: 404 })
    }

    const apiKeyData = JSON.parse(decryptConfigValue(apiKeyConfig.key, apiKeyConfig.value))

    // Update API key data
    if (name !== undefined) apiKeyData.name = name
    if (isActive !== undefined) apiKeyData.isActive = isActive
    if (permissions !== undefined) apiKeyData.permissions = permissions
    apiKeyData.updatedAt = new Date().toISOString()

    await prisma.systemConfig.update({
      where: { key: `api_key_${params.id}` },
      data: { value: encryptConfigValue(`api_key_${params.id}`, JSON.stringify(apiKeyData)) }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'API_KEY_UPDATED',
        resource: 'API_KEY',
        resourceId: params.id,
        details: JSON.stringify({
          name: apiKeyData.name,
          changes: { name, isActive, permissions }
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      apiKey: {
        id: params.id,
        name: apiKeyData.name,
        maskedKey: maskApiKey(apiKeyData.key),
        permissions: apiKeyData.permissions || [],
        isActive: apiKeyData.isActive !== false,
        createdAt: apiKeyData.createdAt,
        createdBy: apiKeyData.createdBy,
        updatedAt: apiKeyData.updatedAt || null
      }
    })
  } catch (error) {
    console.error('Error updating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
