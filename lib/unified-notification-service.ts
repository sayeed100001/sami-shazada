import { prisma } from './prisma'
import { sanitizeInput, sanitizeLogData, validateEmail } from './security'
import { normalizePhoneToE164 } from './phone'
import queue from './job-queue'

/**
 * UNIFIED NOTIFICATION SERVICE
 * Single source of truth for all notifications
 * Uses job queue for async processing with retry logic
 */

export interface NotificationData {
  type: 'SMS' | 'EMAIL' | 'PUSH' | 'DATABASE'
  recipient: string
  message: string
  subject?: string
  transactionId?: string
  userId?: string
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  metadata?: Record<string, any>
}

export interface DatabaseNotificationData {
  userId: string
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error' | 'transaction'
  action?: string
  resource?: string
  resourceId?: string
  data?: any
}

export class UnifiedNotificationService {
  /**
   * Send notification via specified channel
   */
  async sendNotification(notification: NotificationData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const sanitizedRecipient = sanitizeInput(notification.recipient)
      const sanitizedMessage = sanitizeInput(notification.message)
      const sanitizedSubject = notification.subject ? sanitizeInput(notification.subject) : 'Saray Shahzada Notification'
      
      if (!sanitizedRecipient || !sanitizedMessage) {
        return { success: false, error: 'Invalid recipient or message' }
      }
      
      // Store notification attempt in audit log
      const dbNotification = await prisma.auditLog.create({
        data: {
          action: 'NOTIFICATION_SEND',
          resource: 'notification',
          resourceId: notification.transactionId,
          userId: notification.userId,
          details: sanitizeLogData({
            type: notification.type,
            recipient: sanitizedRecipient,
            priority: notification.priority || 'MEDIUM',
            messageLength: sanitizedMessage.length
          })
        }
      })
      
      let jobId: string | null = null
      
      switch (notification.type) {
        case 'SMS':
          jobId = await this.sendSMS(sanitizedRecipient, sanitizedMessage, notification.priority)
          break
        case 'EMAIL':
          jobId = await this.sendEmail(sanitizedRecipient, sanitizedMessage, sanitizedSubject, notification.priority)
          break
        case 'PUSH':
          jobId = await this.sendPush(sanitizedRecipient, sanitizedMessage, notification.priority)
          break
        case 'DATABASE':
          // Database notifications are synchronous
          return { success: false, error: 'Use sendDatabaseNotification for database notifications' }
      }
      
      // Update audit log with job ID
      if (jobId) {
        await prisma.auditLog.update({
          where: { id: dbNotification.id },
          data: {
            details: sanitizeLogData({
              type: notification.type,
              recipient: sanitizedRecipient,
              priority: notification.priority || 'MEDIUM',
              messageLength: sanitizedMessage.length,
              jobId,
              queued: true
            })
          }
        }).catch(() => null) // Don't fail if audit update fails
      }
      
      return { success: true, id: jobId || dbNotification.id }
      
    } catch (error) {
      console.error('Unified notification service error:', error)
      return { success: false, error: String(error) }
    }
  }
  
  /**
   * Send SMS via job queue
   */
  private async sendSMS(phone: string, message: string, priority?: string): Promise<string> {
    try {
      const cleanPhone = normalizePhoneToE164(phone)
      const jobPriority = this.getPriorityValue(priority)
      
      const jobId = await queue.add('send-sms', {
        phone: cleanPhone,
        message: message.slice(0, 1000) // SMS limit
      }, { priority: jobPriority, maxAttempts: 3 })
      
      return jobId
    } catch (error) {
      throw new Error(`Invalid phone number format: ${error}`)
    }
  }
  
  /**
   * Send Email via job queue
   */
  private async sendEmail(email: string, message: string, subject: string, priority?: string): Promise<string> {
    if (!validateEmail(email)) {
      throw new Error('Invalid email address')
    }

    const jobPriority = this.getPriorityValue(priority)
    
    const jobId = await queue.add('send-email', {
      to: email,
      subject: subject || 'Saray Shahzada Notification',
      text: message.slice(0, 10_000),
      html: `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.6">
        <pre style="white-space:pre-wrap;margin:0">${message
          .slice(0, 10_000)
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')}</pre>
      </div>`
    }, { priority: jobPriority, maxAttempts: 3 })
    
    return jobId
  }
  
  /**
   * Send Push notification via job queue
   */
  private async sendPush(deviceId: string, message: string, priority?: string): Promise<string> {
    const jobPriority = this.getPriorityValue(priority)
    
    // TODO: Implement push notification when ready
    const jobId = await queue.add('send-push', {
      deviceId,
      message
    }, { priority: jobPriority, maxAttempts: 2 })
    
    return jobId
  }
  
  /**
   * Send database notification (synchronous)
   */
  async sendDatabaseNotification(data: DatabaseNotificationData): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          title: data.title,
          message: data.message,
          type: data.type || 'info',
          action: data.action,
          resource: data.resource,
          resourceId: data.resourceId,
          data: data.data ? JSON.stringify(data.data) : null
        }
      })
      
      return { success: true, id: notification.id }
    } catch (error: any) {
      console.error('Database notification error:', error)
      return { success: false, error: error.message }
    }
  }
  
  /**
   * Send notification to multiple users
   */
  async sendToMultipleUsers(userIds: string[], data: Omit<DatabaseNotificationData, 'userId'>): Promise<{
    total: number
    successful: number
    failed: number
  }> {
    const results = await Promise.allSettled(
      userIds.map(userId => this.sendDatabaseNotification({ ...data, userId }))
    )

    return {
      total: userIds.length,
      successful: results.filter(r => r.status === 'fulfilled' && r.value.success).length,
      failed: results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
    }
  }
  
  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      await prisma.notification.updateMany({
        where: {
          id: notificationId,
          userId
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
      return { success: true }
    } catch (error: any) {
      return { success: false }
    }
  }
  
  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string): Promise<{ success: boolean }> {
    try {
      await prisma.notification.updateMany({
        where: {
          userId,
          read: false
        },
        data: {
          read: true,
          readAt: new Date()
        }
      })
      return { success: true }
    } catch (error: any) {
      return { success: false }
    }
  }
  
  /**
   * Get unread count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const count = await prisma.notification.count({
        where: {
          userId,
          read: false
        }
      })
      return count
    } catch (error: any) {
      return 0
    }
  }
  
  /**
   * Delete notification
   */
  async deleteNotification(notificationId: string, userId: string): Promise<{ success: boolean }> {
    try {
      await prisma.notification.deleteMany({
        where: {
          id: notificationId,
          userId
        }
      })
      return { success: true }
    } catch (error: any) {
      return { success: false }
    }
  }
  
  /**
   * Convert priority string to number
   */
  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'URGENT': return 10
      case 'HIGH': return 7
      case 'MEDIUM': return 5
      case 'LOW': return 2
      default: return 5
    }
  }
}

// Export singleton instance
export const unifiedNotificationService = new UnifiedNotificationService()
