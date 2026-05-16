import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

function maskApiKey(rawKey: string | undefined): string | null {
  if (!rawKey || rawKey.length < 8) return null
  return `${rawKey.substring(0, 8)}...${rawKey.substring(rawKey.length - 4)}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const apiKeyConfigs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'api_key_' } }
    })

    const apiKeys = apiKeyConfigs.map(config => {
      const data = JSON.parse(decryptConfigValue(config.key, config.value))
      return {
        id: config.key.replace('api_key_', ''),
        name: data.name,
        maskedKey: maskApiKey(data.key),
        permissions: data.permissions || [],
        isActive: data.isActive !== false,
        lastUsed: data.lastUsed || null,
        createdAt: data.createdAt,
        createdBy: data.createdBy
      }
    })

    return NextResponse.json(apiKeys)
  } catch (error) {
    console.error('Error fetching API keys:', error)
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
    const { name, permissions } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const apiKey = `sk_${crypto.randomBytes(32).toString('hex')}`
    const keyId = crypto.randomBytes(16).toString('hex')

    const keyData = {
      name,
      key: apiKey,
      permissions: permissions || [],
      isActive: true,
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
      lastUsed: null
    }

    await prisma.systemConfig.create({
      data: {
        key: `api_key_${keyId}`,
        value: encryptConfigValue(`api_key_${keyId}`, JSON.stringify(keyData)),
        description: `API Key: ${name}`
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'API_KEY_CREATED',
        resource: 'API_KEY',
        resourceId: keyId,
        details: JSON.stringify({ name, permissions }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ 
      success: true, 
      key: apiKey,
      apiKey: {
        id: keyId,
        name,
        key: apiKey,
        permissions,
        createdAt: keyData.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating API key:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
