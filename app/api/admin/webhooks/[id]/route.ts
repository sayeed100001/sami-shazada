import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

export const dynamic = 'force-dynamic'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Webhooks are stored in SystemConfig with key pattern: webhook_{id}
    const webhookConfig = await prisma.systemConfig.findUnique({
      where: { key: `webhook_${params.id}` }
    })

    if (!webhookConfig) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const webhookData = JSON.parse(decryptConfigValue(webhookConfig.key, webhookConfig.value))

    await prisma.systemConfig.delete({
      where: { key: `webhook_${params.id}` }
    })

    // Log the action
    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: 'WEBHOOK_DELETED',
        resource: 'WEBHOOK',
        resourceId: params.id,
        details: JSON.stringify({
          url: webhookData.url,
          events: webhookData.events
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({ success: true, message: 'Webhook deleted successfully' })
  } catch (error) {
    console.error('Error deleting webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const webhookConfig = await prisma.systemConfig.findUnique({
      where: { key: `webhook_${params.id}` }
    })

    if (!webhookConfig) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const body = await request.json()
    const { isActive } = body

    if (typeof isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be a boolean' }, { status: 400 })
    }

    const webhookData = JSON.parse(decryptConfigValue(webhookConfig.key, webhookConfig.value))
    webhookData.isActive = isActive
    webhookData.updatedAt = new Date().toISOString()

    await prisma.systemConfig.update({
      where: { key: `webhook_${params.id}` },
      data: { value: encryptConfigValue(`webhook_${params.id}`, JSON.stringify(webhookData)) }
    })

    await prisma.auditLog.create({
      data: {
        userId: session.user.id,
        action: isActive ? 'WEBHOOK_ENABLED' : 'WEBHOOK_DISABLED',
        resource: 'WEBHOOK',
        resourceId: params.id,
        details: JSON.stringify({
          url: webhookData.url,
          isActive
        }),
        ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      webhook: {
        id: params.id,
        isActive
      }
    })
  } catch (error) {
    console.error('Error updating webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { action } = body

    if (action !== 'test') {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Get webhook data
    const webhookConfig = await prisma.systemConfig.findUnique({
      where: { key: `webhook_${params.id}` }
    })

    if (!webhookConfig) {
      return NextResponse.json({ error: 'Webhook not found' }, { status: 404 })
    }

    const webhookData = JSON.parse(decryptConfigValue(webhookConfig.key, webhookConfig.value))

    // Prepare test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Shahzada Admin Panel',
        webhookId: params.id,
        webhookName: webhookData.name,
        testBy: session.user.email
      }
    }

    // Send test webhook
    try {
      const webhookResponse = await fetch(webhookData.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': generateWebhookSignature(testPayload, webhookData.secret || ''),
          'User-Agent': 'Shahzada-Webhook/1.0'
        },
        body: JSON.stringify(testPayload),
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const responseText = await webhookResponse.text()

      // Update webhook stats
      webhookData.lastTriggered = new Date().toISOString()
      webhookData.lastTestedAt = webhookData.lastTriggered
      webhookData.lastTestStatus = webhookResponse.ok ? 'success' : 'failed'
      webhookData.successCount = (webhookData.successCount || 0) + (webhookResponse.ok ? 1 : 0)
      webhookData.failureCount = (webhookData.failureCount || 0) + (webhookResponse.ok ? 0 : 1)
      webhookData.lastTestResponse = {
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        body: responseText.substring(0, 500) // Limit response size
      }

      await prisma.systemConfig.update({
        where: { key: `webhook_${params.id}` },
        data: { value: encryptConfigValue(`webhook_${params.id}`, JSON.stringify(webhookData)) }
      })

      // Log the test
      await prisma.auditLog.create({
        data: {
          userId: session.user.id,
          action: 'WEBHOOK_TESTED',
          resource: 'WEBHOOK',
          resourceId: params.id,
          details: JSON.stringify({
            url: webhookData.url,
            status: webhookResponse.status,
            success: webhookResponse.ok
          }),
          ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown'
        }
      })

      return NextResponse.json({
        success: webhookResponse.ok,
        status: webhookResponse.status,
        statusText: webhookResponse.statusText,
        response: responseText.substring(0, 500),
        message: webhookResponse.ok ? 'Webhook test successful' : 'Webhook test failed'
      })

    } catch (fetchError: any) {
      // Update webhook with error
      webhookData.lastTriggered = new Date().toISOString()
      webhookData.lastTestedAt = webhookData.lastTriggered
      webhookData.lastTestStatus = 'error'
      webhookData.failureCount = (webhookData.failureCount || 0) + 1
      webhookData.lastTestResponse = {
        error: fetchError.message
      }

      await prisma.systemConfig.update({
        where: { key: `webhook_${params.id}` },
        data: { value: encryptConfigValue(`webhook_${params.id}`, JSON.stringify(webhookData)) }
      })

      return NextResponse.json({
        success: false,
        error: fetchError.message,
        message: 'Failed to send webhook request'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Error testing webhook:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Generate HMAC signature for webhook
function generateWebhookSignature(payload: any, secret: string): string {
  if (!secret) return ''
  
  try {
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(JSON.stringify(payload))
    return hmac.digest('hex')
  } catch (error) {
    console.error('Error generating webhook signature:', error)
    return ''
  }
}
