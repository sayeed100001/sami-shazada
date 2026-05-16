import { Server as SocketIOServer } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from './auth'
import { getConfiguredAppOrigin } from './app-url'

export interface SocketUser {
  id: string
  role: string
  name: string
  email: string
}

export interface RealTimeMessage {
  id: string
  type: 'chat' | 'notification' | 'rate_update' | 'transaction_update'
  data: any
  timestamp: Date
  from?: string
  to?: string
}

class WebSocketManager {
  private io: SocketIOServer | null = null
  private connectedUsers = new Map<string, SocketUser>()

  initialize(server: any) {
    if (this.io) return this.io

    this.io = new SocketIOServer(server, {
      cors: {
        origin: getConfiguredAppOrigin(),
        methods: ['GET', 'POST']
      }
    })

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id)

      socket.on('authenticate', async (token: string) => {
        try {
          // Validate user session
          const user = await this.validateUser(token)
          if (user) {
            this.connectedUsers.set(socket.id, user)
            socket.join(`user_${user.id}`)
            socket.join(`role_${user.role}`)
            
            socket.emit('authenticated', { user })
            console.log(`User ${user.name} authenticated`)
          }
        } catch (error) {
          socket.emit('auth_error', 'Authentication failed')
        }
      })

      socket.on('join_chat', (chatId: string) => {
        socket.join(`chat_${chatId}`)
      })

      socket.on('send_message', (data: any) => {
        const user = this.connectedUsers.get(socket.id)
        if (user) {
          const message: RealTimeMessage = {
            id: Date.now().toString(),
            type: 'chat',
            data,
            timestamp: new Date(),
            from: user.id
          }
          
          this.io?.to(`chat_${data.chatId}`).emit('new_message', message)
        }
      })

      socket.on('disconnect', () => {
        this.connectedUsers.delete(socket.id)
        console.log('Client disconnected:', socket.id)
      })
    })

    return this.io
  }

  private async validateUser(token: string): Promise<SocketUser | null> {
    // Implement token validation logic
    // This is a simplified version
    return null
  }

  // Broadcast rate updates
  broadcastRateUpdate(rates: any) {
    if (this.io) {
      const message: RealTimeMessage = {
        id: Date.now().toString(),
        type: 'rate_update',
        data: rates,
        timestamp: new Date()
      }
      this.io.emit('rate_update', message)
    }
  }

  // Send notification to specific user
  sendNotification(userId: string, notification: any) {
    if (this.io) {
      const message: RealTimeMessage = {
        id: Date.now().toString(),
        type: 'notification',
        data: notification,
        timestamp: new Date(),
        to: userId
      }
      this.io.to(`user_${userId}`).emit('notification', message)
    }
  }

  // Broadcast transaction updates
  broadcastTransactionUpdate(transactionId: string, update: any) {
    if (this.io) {
      const message: RealTimeMessage = {
        id: Date.now().toString(),
        type: 'transaction_update',
        data: { transactionId, ...update },
        timestamp: new Date()
      }
      this.io.emit('transaction_update', message)
    }
  }
}

export const wsManager = new WebSocketManager()
