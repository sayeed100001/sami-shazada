import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
import { prisma } from './prisma'
import { getConfiguredAppOrigin } from './app-url'

let io: SocketIOServer | null = null
const websocketEnabled = process.env.ENABLE_WEBSOCKET_SERVER === 'true'
const websocketToken = process.env.WEBSOCKET_SERVER_TOKEN || ''

export function initializeWebSocket(httpServer: HTTPServer) {
  if (!websocketEnabled) {
    console.warn('[WEBSOCKET] Server is disabled. Set ENABLE_WEBSOCKET_SERVER=true to enable.')
    return null
  }

  if (io) return io

  io = new SocketIOServer(httpServer, {
    cors: {
      origin: getConfiguredAppOrigin(),
      methods: ['GET', 'POST'],
      credentials: true
    },
    path: '/api/socket',
    transports: ['websocket', 'polling']
  })

  io.on('connection', (socket) => {
    const authenticated = socket.handshake.auth?.token === websocketToken && websocketToken.length >= 16

    if (!authenticated) {
      socket.emit('error', 'Unauthorized websocket connection')
      socket.disconnect(true)
      return
    }

    console.log('Client connected:', socket.id)

    // Join chat session room
    socket.on('join-chat', (sessionId: string) => {
      socket.join(`chat:${sessionId}`)
      console.log(`Socket ${socket.id} joined chat:${sessionId}`)
    })

    // Leave chat session room
    socket.on('leave-chat', (sessionId: string) => {
      socket.leave(`chat:${sessionId}`)
      console.log(`Socket ${socket.id} left chat:${sessionId}`)
    })

    // Join internal chat room
    socket.on('join-internal-chat', (chatId: string) => {
      socket.join(`internal-chat:${chatId}`)
      console.log(`Socket ${socket.id} joined internal-chat:${chatId}`)
    })

    // Leave internal chat room
    socket.on('leave-internal-chat', (chatId: string) => {
      socket.leave(`internal-chat:${chatId}`)
      console.log(`Socket ${socket.id} left internal-chat:${chatId}`)
    })

    // Typing indicator
    socket.on('typing', (data: { sessionId: string; userName: string }) => {
      socket.to(`chat:${data.sessionId}`).emit('user-typing', {
        userName: data.userName
      })
    })

    // Stop typing indicator
    socket.on('stop-typing', (data: { sessionId: string }) => {
      socket.to(`chat:${data.sessionId}`).emit('user-stop-typing')
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  return io
}

export function getWebSocketServer(): SocketIOServer | null {
  return io
}

// Emit new message to chat session
export function emitChatMessage(sessionId: string, message: any) {
  if (!io) return
  io.to(`chat:${sessionId}`).emit('new-message', message)
}

// Emit new internal chat message
export function emitInternalChatMessage(chatId: string, message: any) {
  if (!io) return
  io.to(`internal-chat:${chatId}`).emit('new-internal-message', message)
}

// Emit message read status
export function emitMessageRead(sessionId: string, messageId: string) {
  if (!io) return
  io.to(`chat:${sessionId}`).emit('message-read', { messageId })
}

// Emit notification to user
export function emitNotification(userId: string, notification: any) {
  if (!io) return
  io.to(`user:${userId}`).emit('notification', notification)
}
