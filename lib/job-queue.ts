import { EmailService } from './email-service'
import { SMSService } from './sms-service'

/**
 * PRODUCTION JOB QUEUE SYSTEM
 * Handles async tasks with retry logic and priority
 */

interface Job<T = any> {
  id: string
  type: string
  data: T
  priority: number
  attempts: number
  maxAttempts: number
  createdAt: number
  scheduledFor?: number
  error?: string
}

interface QueueStats {
  pending: number
  processing: number
  completed: number
  failed: number
  totalProcessed: number
  averageProcessingTime: number
}

type JobHandler<T = any> = (data: T) => Promise<void>

class JobQueue {
  private queues: Map<string, Job[]>
  private processing: Set<string>
  private handlers: Map<string, JobHandler>
  private stats: QueueStats
  private processingTimes: number[]
  private isProcessing: boolean
  private concurrency: number

  constructor(concurrency = 10) {
    this.queues = new Map()
    this.processing = new Set()
    this.handlers = new Map()
    this.stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalProcessed: 0,
      averageProcessingTime: 0
    }
    this.processingTimes = []
    this.isProcessing = false
    this.concurrency = concurrency
  }

  /**
   * Register a job handler
   */
  registerHandler<T>(type: string, handler: JobHandler<T>): void {
    this.handlers.set(type, handler)
  }

  /**
   * Add job to queue
   */
  async add<T>(
    type: string,
    data: T,
    options: {
      priority?: number
      maxAttempts?: number
      delay?: number
    } = {}
  ): Promise<string> {
    const job: Job<T> = {
      id: this.generateId(),
      type,
      data,
      priority: options.priority || 0,
      attempts: 0,
      maxAttempts: options.maxAttempts || 3,
      createdAt: Date.now(),
      scheduledFor: options.delay ? Date.now() + options.delay : undefined
    }

    if (!this.queues.has(type)) {
      this.queues.set(type, [])
    }

    const queue = this.queues.get(type)!
    queue.push(job)
    
    // Sort by priority (higher first)
    queue.sort((a, b) => b.priority - a.priority)
    
    this.stats.pending++

    // Start processing if not already
    if (!this.isProcessing) {
      this.startProcessing()
    }

    return job.id
  }

  /**
   * Start processing jobs
   */
  private async startProcessing(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true

    while (this.stats.pending > 0 || this.processing.size > 0) {
      // Process up to concurrency limit
      while (this.processing.size < this.concurrency && this.stats.pending > 0) {
        const job = this.getNextJob()
        if (!job) break

        this.processJob(job)
      }

      // Wait a bit before checking again
      await this.sleep(100)
    }

    this.isProcessing = false
  }

  /**
   * Get next job to process
   */
  private getNextJob(): Job | null {
    const now = Date.now()

    const queues: Job[][] = []
    this.queues.forEach(queue => queues.push(queue))

    for (const queue of queues) {
      for (let i = 0; i < queue.length; i++) {
        const job = queue[i]
        
        // Skip if scheduled for future
        if (job.scheduledFor && job.scheduledFor > now) {
          continue
        }

        // Skip if already processing
        if (this.processing.has(job.id)) {
          continue
        }

        // Remove from queue
        queue.splice(i, 1)
        this.stats.pending--
        
        return job
      }
    }

    return null
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<void> {
    this.processing.add(job.id)
    this.stats.processing++

    const startTime = Date.now()

    try {
      const handler = this.handlers.get(job.type)
      
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.type}`)
      }

      await handler(job.data)

      // Success
      this.stats.completed++
      this.stats.totalProcessed++
      
      const processingTime = Date.now() - startTime
      this.processingTimes.push(processingTime)
      
      // Keep only last 1000 times
      if (this.processingTimes.length > 1000) {
        this.processingTimes.shift()
      }
      
      this.updateAverageProcessingTime()

    } catch (error) {
      job.attempts++
      job.error = error instanceof Error ? error.message : String(error)

      console.error(`[Queue] Job ${job.id} failed (attempt ${job.attempts}/${job.maxAttempts}):`, error)

      // Retry if not exceeded max attempts
      if (job.attempts < job.maxAttempts) {
        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, job.attempts), 30000)
        job.scheduledFor = Date.now() + delay
        
        // Add back to queue
        const queue = this.queues.get(job.type)
        if (queue) {
          queue.push(job)
          this.stats.pending++
        }
      } else {
        this.stats.failed++
        this.stats.totalProcessed++
        
        // Log failed job
        console.error(`[Queue] Job ${job.id} permanently failed after ${job.attempts} attempts`)
      }
    } finally {
      this.processing.delete(job.id)
      this.stats.processing--
    }
  }

  /**
   * Update average processing time
   */
  private updateAverageProcessingTime(): void {
    if (this.processingTimes.length === 0) {
      this.stats.averageProcessingTime = 0
      return
    }

    const sum = this.processingTimes.reduce((a, b) => a + b, 0)
    this.stats.averageProcessingTime = Math.round(sum / this.processingTimes.length)
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    return { ...this.stats }
  }

  /**
   * Clear all queues
   */
  clear(): void {
    this.queues.clear()
    this.processing.clear()
    this.stats = {
      pending: 0,
      processing: 0,
      completed: 0,
      failed: 0,
      totalProcessed: 0,
      averageProcessingTime: 0
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    const suffix = globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Date.now().toString(36)
    return `job_${Date.now()}_${suffix}`
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Singleton instance
const queue = new JobQueue(20) // 20 concurrent jobs

// Register common job handlers
queue.registerHandler('send-email', async (data: { to: string; subject: string; html: string; text?: string }) => {
  console.log(`[Queue] Sending email to ${data.to}`)
  const result = await EmailService.sendEmail(data.to, data.subject, data.html, data.text)
  if (!result.success) {
    const errorMsg = (result as any).error || (result as any).message || 'Email sending failed'
    throw new Error(errorMsg)
  }
})

queue.registerHandler('send-sms', async (data: { phone: string; message: string }) => {
  console.log(`[Queue] Sending SMS to ${data.phone}`)
  const result = await SMSService.sendSMS(data.phone, data.message)
  if (!result.success) {
    const errorMsg = (result as any).error || (result as any).message || 'SMS sending failed'
    throw new Error(errorMsg)
  }
})

queue.registerHandler('send-whatsapp', async (data: { phone: string; message: string }) => {
  console.log(`[Queue] Sending WhatsApp to ${data.phone}`)
  // TODO: Integrate with WhatsApp Business API
  await new Promise(resolve => setTimeout(resolve, 100))
})

queue.registerHandler('process-transaction', async (data: { transactionId: string }) => {
  console.log(`[Queue] Processing transaction ${data.transactionId}`)
  // Transaction processing logic
  await new Promise(resolve => setTimeout(resolve, 200))
})

queue.registerHandler('update-statistics', async (data: { sarafId: string }) => {
  console.log(`[Queue] Updating statistics for saraf ${data.sarafId}`)
  // Statistics update logic
  await new Promise(resolve => setTimeout(resolve, 150))
})

queue.registerHandler('generate-report', async (data: { reportId: string; type: string }) => {
  console.log(`[Queue] Generating ${data.type} report ${data.reportId}`)
  // Report generation logic
  await new Promise(resolve => setTimeout(resolve, 500))
})

export { queue, JobQueue }
export default queue
