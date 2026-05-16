'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useWebSocket } from '@/hooks/useWebSocket'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Send, Phone, Video, MoreVertical } from 'lucide-react'
import { i18n } from '@/lib/i18n-enhanced'

interface Message {
  id: string
  content: string
  senderId: string
  senderName: string
  timestamp: Date
  type: 'text' | 'image' | 'file'
  status: 'sent' | 'delivered' | 'read'
}

interface ChatUser {
  id: string
  name: string
  avatar?: string
  role: 'user' | 'saraf'
  isOnline: boolean
  lastSeen?: Date
}

interface RealTimeSarafChatProps {
  sarafId: string
  userId: string
}

export function RealTimeSarafChat({ sarafId, userId }: RealTimeSarafChatProps) {
  const { data: session } = useSession()
  const { socket, connected, sendMessage, joinChat } = useWebSocket()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [chatUser, setChatUser] = useState<ChatUser | null>(null)
  const [isTyping, setIsTyping] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatId = `${userId}-${sarafId}`

  useEffect(() => {
    if (connected && socket) {
      joinChat(chatId)
      loadChatHistory()
      loadChatUser()
    }
  }, [connected, socket, chatId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const loadChatHistory = async () => {
    try {
      const response = await fetch(`/api/saraf-chat/history?chatId=${chatId}`)
      if (response.ok) {
        const history = await response.json()
        setMessages(history)
      }
    } catch (error) {
      console.error('Failed to load chat history:', error)
    }
  }

  const loadChatUser = async () => {
    try {
      const response = await fetch(`/api/sarafs/${sarafId}`)
      if (response.ok) {
        const saraf = await response.json()
        setChatUser({
          id: saraf.id,
          name: saraf.businessName || saraf.name,
          avatar: saraf.avatar,
          role: 'saraf',
          isOnline: saraf.isOnline || false,
          lastSeen: saraf.lastSeen ? new Date(saraf.lastSeen) : undefined
        })
      }
    } catch (error) {
      console.error('Failed to load chat user:', error)
    }
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !connected) return

    const message: Message = {
      id: Date.now().toString(),
      content: newMessage,
      senderId: session?.user?.id || userId,
      senderName: session?.user?.name || 'User',
      timestamp: new Date(),
      type: 'text',
      status: 'sent'
    }

    // Optimistic update
    setMessages(prev => [...prev, message])
    setNewMessage('')

    // Send via WebSocket
    sendMessage(chatId, newMessage)

    // Save to database
    try {
      await fetch('/api/saraf-chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId,
          content: newMessage,
          senderId: session?.user?.id || userId,
          receiverId: sarafId
        })
      })
    } catch (error) {
      console.error('Failed to save message:', error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat(i18n.getLanguage(), {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-gray-400'
      case 'delivered': return 'text-blue-400'
      case 'read': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <Card className="h-[600px] flex flex-col">
      {/* Chat Header */}
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarImage src={chatUser?.avatar} />
              <AvatarFallback>
                {chatUser?.name?.charAt(0) || 'S'}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">
                {chatUser?.name || i18n.t('common.loading')}
              </CardTitle>
              <div className="flex items-center space-x-2">
                <Badge 
                  variant={chatUser?.isOnline ? 'default' : 'secondary'}
                  className="text-xs"
                >
                  {chatUser?.isOnline ? i18n.t('chat.online') : i18n.t('chat.offline')}
                </Badge>
                {!chatUser?.isOnline && chatUser?.lastSeen && (
                  <span className="text-xs text-muted-foreground">
                    {i18n.t('chat.lastSeen')}: {formatTime(chatUser.lastSeen)}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm">
              <Phone className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Video className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>

      {/* Messages Area */}
      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.senderId === (session?.user?.id || userId)
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-3 py-2 ${
                    message.senderId === (session?.user?.id || userId)
                      ? 'bg-primary text-white dark:text-white'
                      : 'bg-muted text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs opacity-70">
                      {formatTime(message.timestamp)}
                    </span>
                    {message.senderId === (session?.user?.id || userId) && (
                      <span className={`text-xs ${getStatusColor(message.status)}`}>
                        ✓{message.status === 'read' ? '✓' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-lg px-3 py-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </CardContent>

      {/* Message Input */}
      <div className="p-4 border-t">
        <div className="flex items-center space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={i18n.t('chat.typeMessage')}
            className="flex-1"
            disabled={!connected}
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !connected}
            size="sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!connected && (
          <p className="text-xs text-muted-foreground mt-1">
            {i18n.t('chat.connecting')}
          </p>
        )}
      </div>
    </Card>
  )
}
