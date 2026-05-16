import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

function maskSecret(secret: string | undefined): string | null {
  if (!secret || secret.length < 10) return null
  return `${secret.substring(0, 6)}...${secret.substring(secret.length - 4)}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhookConfigs = await prisma.systemConfig.findMany({
      where: { key: { startsWith: 'webhook_' } }
    })

    const webhooks = webhookConfigs.map(config => {
      const data = JSON.parse(decryptConfigValue(config.key, config.value))
      return {
        id: config.key.replace('webhook_', ''),
        name: data.name,
        url: data.url,
        events: data.events || [],
        isActive: data.isActive !== false,
        secretMasked: maskSecret(data.secret),
        hasSecret: Boolean(data.secret),
        lastTriggered: data.lastTriggered || null,
        successCount: data.successCount || 0,
        failureCount: data.failureCount || 0,
        createdAt: data.createdAt,
        createdBy: data.createdBy
      }
    })

    return NextResponse.json({ webhooks })
  } catch (error) {
    console.error('Error fetching webhooks:', error)
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
    const { name, url, events } = body

    if (!url || !events || events.length === 0) {
      return NextResponse.json({ error: 'URL and events are required' }, { status: 400 })
    }

    let normalizedUrl: string
    let derivedName = name

    try {
      const parsedUrl = new URL(url)
      normalizedUrl = parsedUrl.toString()
      derivedName = derivedName?.trim() || parsedUrl.hostname
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL' }, { status: 400 })
    }

    const webhookId = crypto.randomBytes(16).toString('hex')
    const secret = `whsec_${crypto.randomBytes(32).toString('hex')}`

    const webhookData = {
      name: derivedName,
      url: normalizedUrl,
      events,
      secret,
      isActive: true,
      successCount: 0,
      failureCount: 0,
      createdAt: new Date().toISOString(),
      createdBy: session.user.id,
      lastTriggered: null
    }

    await prisma.systemConfig.create({
      data: {
        key: `webhook_${webhookId}`,
        value: encryptConfigValue(`webhook_${webhookId}`, JSON.stringify(webhookData)),
        description: `Webhook: ${derivedName}`
      }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'WEBHOOK_CREATED',
        resource: 'WEBHOOK',
        resourceId: webhookId,
        details: JSON.stringify({ name: derivedName, url: normalizedUrl, events }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ 
      success: true, 
      webhook: {
        id: webhookId,
        name: derivedName,
        url: normalizedUrl,
        events,
        secret,
        createdAt: webhookData.createdAt
      }
    })
  } catch (error) {
    console.error('Error creating webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
