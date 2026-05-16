import crypto from 'crypto'
import { prisma } from './prisma'

interface WebhookPayload {
  event: string
  data: any
  timestamp: number
}

interface WebhookConfig {
  url: string
  secret: string
  maxRetries?: number
  retryDelayMs?: number
}

const DEFAULT_MAX_RETRIES = 3
const DEFAULT_RETRY_DELAY_MS = 5000

// Generate webhook signature
function generateSignature(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex')
}

// Verify webhook signature
export function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const expectedSignature = generateSignature(payload, secret)
  const actualBuffer = Buffer.from(signature)
  const expectedBuffer = Buffer.from(expectedSignature)

  if (actualBuffer.length !== expectedBuffer.length) {
    return false
  }

  return crypto.timingSafeEqual(
    actualBuffer,
    expectedBuffer
  )
}

// Send webhook with retry logic
export async function sendWebhook(
  config: WebhookConfig,
  payload: WebhookPayload
): Promise<{ success: boolean; attempts: number; error?: string }> {
  const maxRetries = config.maxRetries ?? DEFAULT_MAX_RETRIES
  const retryDelay = config.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS

  const payloadString = JSON.stringify(payload)
  const signature = generateSignature(payloadString, config.secret)

  let lastError: string | undefined
  let attempts = 0

  for (let i = 0; i <= maxRetries; i++) {
    attempts++

    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Timestamp': payload.timestamp.toString(),
          'User-Agent': 'Saray-Shahzada-Webhook/1.0'
        },
        body: payloadString,
        signal: AbortSignal.timeout(30000) // 30 second timeout
      })

      if (response.ok) {
        // Log successful webhook
        await prisma.auditLog.create({
          data: {
            action: 'WEBHOOK_SENT',
            resource: 'WEBHOOK',
            details: JSON.stringify({
              url: config.url,
              event: payload.event,
              attempts,
              status: response.status
            })
          }
        }).catch(console.error)

        return { success: true, attempts }
      }

      lastError = `HTTP ${response.status}: ${await response.text().catch(() => 'Unknown error')}`
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Unknown error'
    }

    // Wait before retry (except on last attempt)
    if (i < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, retryDelay * (i + 1)))
    }
  }

  // Log failed webhook
  await prisma.auditLog.create({
    data: {
      action: 'WEBHOOK_FAILED',
      resource: 'WEBHOOK',
      details: JSON.stringify({
        url: config.url,
        event: payload.event,
        attempts,
        error: lastError
      })
    }
  }).catch(console.error)

  return { success: false, attempts, error: lastError }
}

// Send webhook for transaction events
export async function sendTransactionWebhook(
  webhookUrl: string,
  webhookSecret: string,
  event: 'transaction.created' | 'transaction.completed' | 'transaction.cancelled',
  transaction: any
) {
  return sendWebhook(
    { url: webhookUrl, secret: webhookSecret },
    {
      event,
      data: {
        id: transaction.id,
        referenceCode: transaction.referenceCode,
        type: transaction.type,
        status: transaction.status,
        fromAmount: transaction.fromAmount,
        toAmount: transaction.toAmount,
        fromCurrency: transaction.fromCurrency,
        toCurrency: transaction.toCurrency,
        createdAt: transaction.createdAt
      },
      timestamp: Date.now()
    }
  )
}

// Send webhook for credit events
export async function sendCreditWebhook(
  webhookUrl: string,
  webhookSecret: string,
  event: 'credit.purchased' | 'credit.approved' | 'credit.used',
  creditTransaction: any
) {
  return sendWebhook(
    { url: webhookUrl, secret: webhookSecret },
    {
      event,
      data: {
        id: creditTransaction.id,
        sarafId: creditTransaction.sarafId,
        type: creditTransaction.type,
        amount: creditTransaction.amount,
        balance: creditTransaction.balance,
        status: creditTransaction.status,
        createdAt: creditTransaction.createdAt
      },
      timestamp: Date.now()
    }
  )
}

// Send webhook for subscription events
export async function sendSubscriptionWebhook(
  webhookUrl: string,
  webhookSecret: string,
  event: 'subscription.created' | 'subscription.activated' | 'subscription.expired',
  subscription: any
) {
  return sendWebhook(
    { url: webhookUrl, secret: webhookSecret },
    {
      event,
      data: {
        id: subscription.id,
        sarafId: subscription.sarafId,
        packageType: subscription.packageType,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        createdAt: subscription.requestedAt
      },
      timestamp: Date.now()
    }
  )
}
