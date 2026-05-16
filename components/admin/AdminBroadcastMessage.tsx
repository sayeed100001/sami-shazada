'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { MessageSquare, Send, Users, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface BroadcastResult {
  userId: string
  userName: string
  messageId?: string
  success: boolean
  error?: string
}

export function AdminBroadcastMessage() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [targetRole, setTargetRole] = useState('ALL')
  const [sending, setSending] = useState(false)
  const [results, setResults] = useState<BroadcastResult[]>([])
  const [showResults, setShowResults] = useState(false)

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || sending) return

    setSending(true)
    setResults([])
    setShowResults(false)

    try {
      const response = await fetch('/api/admin/chat/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          targetRole: targetRole === 'ALL' ? null : targetRole
        })
      })

      if (!response.ok) throw new Error('Failed to send broadcast')

      const data = await response.json()
      setResults(data.results || [])
      setShowResults(true)
      
      toast.success(`پیام به ${data.totalSent} کاربر ارسال شد`)
      
      if (data.totalFailed > 0) {
        toast.warning(`${data.totalFailed} پیام ارسال نشد`)
      }

      setMessage('')
      
    } catch (error) {
      toast.error('خطا در ارسال پیام همگانی')
    } finally {
      setSending(false)
    }
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      ALL: 'همه کاربران',
      USER: 'کاربران عادی',
      SARAF: 'صرافان',
      ADMIN: 'مدیران'
    }
    return labels[role as keyof typeof labels] || role
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          ارسال پیام همگانی
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            ارسال پیام همگانی
          </DialogTitle>
          <DialogDescription>
            پیام خود را به گروه مورد نظر ارسال کنید
          </DialogDescription>
        </DialogHeader>

        {!showResults ? (
          <form onSubmit={handleSendBroadcast} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="targetRole">گروه هدف</Label>
              <Select value={targetRole} onValueChange={setTargetRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">همه کاربران</SelectItem>
                  <SelectItem value="USER">کاربران عادی</SelectItem>
                  <SelectItem value="SARAF">صرافان</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">متن پیام</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="متن پیام همگانی خود را بنویسید..."
                rows={4}
                required
                disabled={sending}
              />
              <div className="text-sm text-muted-foreground">
                {message.length}/500 کاراکتر
              </div>
            </div>

            <Alert>
              <Users className="h-4 w-4" />
              <AlertDescription>
                این پیام به {getRoleLabel(targetRole)} ارسال خواهد شد و در چت آنها نمایش داده می‌شود.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={!message.trim() || sending}>
                <Send className="h-4 w-4 mr-2" />
                {sending ? 'در حال ارسال...' : 'ارسال پیام'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">نتایج ارسال</h3>
              <div className="flex gap-2">
                <Badge variant="default" className="bg-green-500">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  موفق: {results.filter(r => r.success).length}
                </Badge>
                <Badge variant="destructive">
                  <XCircle className="h-3 w-3 mr-1" />
                  ناموفق: {results.filter(r => !r.success).length}
                </Badge>
              </div>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded-lg border ${
                    result.success 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{result.userName}</span>
                    {result.success ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                  {result.error && (
                    <p className="text-sm text-red-600 mt-1">{result.error}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowResults(false)
                  setResults([])
                }}
              >
                ارسال پیام جدید
              </Button>
              <Button onClick={() => setIsOpen(false)}>
                بستن
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}