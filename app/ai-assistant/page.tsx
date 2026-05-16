'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Bot, Send, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [inputMessage, setInputMessage] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  // Fetch available models
  const { data: models } = useQuery({
    queryKey: ['openrouter-models'],
    queryFn: async () => {
      const response = await fetch('/api/openrouter')
      if (!response.ok) throw new Error('Failed to fetch models')
      return response.json()
    }
  })

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputMessage('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/openrouter', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: inputMessage,
          model: selectedModel
        })
      })

      if (!response.ok) throw new Error('Failed to get AI response')

      const data = await response.json()
      
      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Error sending message:', error)
      const errorMessage: Message = {
        role: 'assistant',
        content: 'متأسفانه خطایی رخ داده است. لطفاً دوباره تلاش کنید.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-4">
            دستیار هوش مصنوعی
          </h1>
          <p className="text-lg text-muted-foreground">
            از دستیار هوش مصنوعی برای سوالات مالی و تحلیل بازار استفاده کنید
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Model Selection */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                انتخاب مدل
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="انتخاب مدل AI" />
                </SelectTrigger>
                <SelectContent>
                  {models?.models?.map((model: any) => (
                    <SelectItem key={model.model} value={model.model}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>گفتگو با دستیار هوش مصنوعی</CardTitle>
              <CardDescription>
                سوالات خود را در مورد بازار مالی، ارزهای دیجیتال و تحلیل‌های اقتصادی بپرسید
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Messages */}
              <div className="h-96 overflow-y-auto border rounded-lg p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground">
                    <Bot className="h-12 w-12 mx-auto mb-4" />
                    <p>سلام! من دستیار هوش مصنوعی سرای شهزاده هستم.</p>
                    <p>چگونه می‌توانم به شما کمک کنم؟</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}
                      >
                        <p className="text-sm">{message.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {message.timestamp.toLocaleTimeString('fa-AF')}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="bg-muted px-4 py-2 rounded-lg">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="flex gap-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="پیام خود را بنویسید..."
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  disabled={isLoading}
                />
                <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim()}>
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* Quick Questions */}
              <div className="space-y-2">
                <p className="text-sm font-medium">سوالات پیشنهادی:</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    'قیمت بیت کوین چقدر است؟',
                    'نرخ دلار به افغانی چیست؟',
                    'تحلیل بازار طلا',
                    'پیش‌بینی قیمت ارزهای دیجیتال'
                  ].map((question) => (
                    <Button
                      key={question}
                      variant="outline"
                      size="sm"
                      onClick={() => setInputMessage(question)}
                      disabled={isLoading}
                    >
                      {question}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}