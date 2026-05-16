import { prisma } from '@/lib/prisma'
import crypto from 'crypto'
import { decryptConfigValue, encryptConfigValue } from '@/lib/system-config-security'

export class WebhookService {
  static async trigger(event: string, data: any) {
    try {
      const webhookConfigs = await prisma.systemConfig.findMany({
        where: { key: { startsWith: 'webhook_' } }
      })

      const webhooks = webhookConfigs
        .map(config => {
          try {
            const webhookData = JSON.parse(decryptConfigValue(config.key, config.value))
            return {
              id: config.key.replace('webhook_', ''),
              ...webhookData
            }
          } catch {
            return null
          }
        })
        .filter(w => w && w.isActive && w.events.includes(event))

      const results = await Promise.allSettled(
        webhooks.map(webhook => this.sendWebhook(webhook, event, data))
      )

      return results
    } catch (error) {
      console.error('Webhook trigger error:', error)
      return []
    }
  }

  private static async sendWebhook(webhook: any, event: string, data: any) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      data
    }

    let lastError: Error | null = null

    for (const attempt of [1, 2, 3]) {
      try {
        const signature = this.generateSignature(payload, webhook.secret || '')

        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': signature,
            'X-Webhook-Event': event,
            'User-Agent': 'Shahzada-Webhook/1.0'
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(10000)
        })

        if (!response.ok && response.status >= 500 && attempt < 3) {
          await this.sleep(attempt * 500)
          continue
        }

        await this.updateWebhookStats(webhook.id, response.ok)

        return {
          success: response.ok,
          status: response.status,
          webhookId: webhook.id
        }
      } catch (error: any) {
        lastError = error instanceof Error ? error : new Error('Webhook delivery failed')

        if (attempt < 3) {
          await this.sleep(attempt * 500)
          continue
        }
      }
    }

    await this.updateWebhookStats(webhook.id, false)

    return {
      success: false,
      error: lastError?.message || 'Webhook delivery failed',
      webhookId: webhook.id
    }
  }

  private static generateSignature(payload: any, secret: string): string {
    if (!secret) return ''
    
    try {
      const hmac = crypto.createHmac('sha256', secret)
      hmac.update(JSON.stringify(payload))
      return hmac.digest('hex')
    } catch {
      return ''
    }
  }

  private static async updateWebhookStats(webhookId: string, success: boolean) {
    try {
      const config = await prisma.systemConfig.findUnique({
        where: { key: `webhook_${webhookId}` }
      })

      if (!config) return

      const webhookData = JSON.parse(decryptConfigValue(config.key, config.value))
      webhookData.lastTriggered = new Date().toISOString()
      
      if (success) {
        webhookData.successCount = (webhookData.successCount || 0) + 1
      } else {
        webhookData.failureCount = (webhookData.failureCount || 0) + 1
      }

      await prisma.systemConfig.update({
        where: { key: `webhook_${webhookId}` },
        data: { value: encryptConfigValue(`webhook_${webhookId}`, JSON.stringify(webhookData)) }
      })
    } catch (error) {
      console.error('Error updating webhook stats:', error)
    }
  }

  private static sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

export const triggerWebhook = WebhookService.trigger.bind(WebhookService)
