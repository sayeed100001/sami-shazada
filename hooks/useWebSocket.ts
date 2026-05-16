import { useEffect, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { useSession } from 'next-auth/react'
import { RealTimeMessage } from '@/lib/websocket'

export function useWebSocket() {
  const { data: session } = useSession()
  const [socket, setSocket] = useState<Socket | null>(null)
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<RealTimeMessage[]>([])

  useEffect(() => {
    if (!session?.user) return

    const newSocket = io(process.env.NEXT_PUBLIC_WS_URL || window.location.origin, {
      transports: ['websocket', 'polling']
    })

    newSocket.on('connect', () => {
      setConnected(true)
      // Authenticate with session token
      newSocket.emit('authenticate', session.user.id)
    })

    newSocket.on('authenticated', (data) => {
      console.log('WebSocket authenticated:', data.user.name)
    })

    newSocket.on('disconnect', () => {
      setConnected(false)
    })

    newSocket.on('new_message', (message: RealTimeMessage) => {
      setMessages(prev => [...prev, message])
    })

    newSocket.on('notification', (message: RealTimeMessage) => {
      // Handle notifications
      console.log('New notification:', message.data)
    })

    newSocket.on('rate_update', (message: RealTimeMessage) => {
      // Handle rate updates
      console.log('Rate update:', message.data)
    })

    newSocket.on('transaction_update', (message: RealTimeMessage) => {
      // Handle transaction updates
      console.log('Transaction update:', message.data)
    })

    setSocket(newSocket)

    return () => {
      newSocket.close()
    }
  }, [session])

  const sendMessage = (chatId: string, content: string) => {
    if (socket && connected) {
      socket.emit('send_message', { chatId, content })
    }
  }

  const joinChat = (chatId: string) => {
    if (socket && connected) {
      socket.emit('join_chat', chatId)
    }
  }

  return {
    socket,
    connected,
    messages,
    sendMessage,
    joinChat
  }
}