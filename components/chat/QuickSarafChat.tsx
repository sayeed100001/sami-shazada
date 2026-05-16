'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { X, Send, MessageCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface QuickSarafChatProps {
  sarafId: string
  onClose: () => void
}

interface Message {
  id: string
  text: string
  sender: 'user' | 'saraf'
  timestamp: Date
}

export function QuickSarafChat({ sarafId, onClose }: QuickSarafChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    // Simulate connection
    setIsConnected(true)
    
    // Add welcome message
    setMessages([{
      id: '1',
      text: 'سلام! چطور می‌تونم کمکتون کنم؟',
      sender: 'saraf',
      timestamp: new Date()
    }])
  }, [sarafId])

  const sendMessage = () => {
    if (!newMessage.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      text: newMessage,
      sender: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setNewMessage('')

    // Simulate saraf response
    setTimeout(() => {
      const responses = [
        'ممنون از پیامتون. در حال بررسی درخواستتون هستم.',
        'نرخ‌های فعلی رو براتون چک می‌کنم.',
        'لطفاً مقدار مورد نظرتون رو بگید.',
        'می‌تونید به دفتر ما مراجعه کنید یا آنلاین انجام بدید.'
      ]
      
      const sarafMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: responses[Math.floor(Math.random() * responses.length)],
        sender: 'saraf',
        timestamp: new Date()
      }
      
      setMessages(prev => [...prev, sarafMessage])
    }, 1000)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md h-96 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              گفتگو با صراف
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'}>
                {isConnected ? 'متصل' : 'قطع'}
              </Badge>
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="flex-1 flex flex-col p-4">
          <div className="flex-1 overflow-y-auto space-y-3 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-3 py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {message.timestamp.toLocaleTimeString('fa-AF', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="پیام خود را بنویسید..."
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={!newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}