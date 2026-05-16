'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

export default function AdminEmergencyLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast.error('ایمیل یا رمز عبور اشتباه است')
      } else if (result?.ok) {
        toast.success('ورود موفقیتآمیز')
        router.push('/admin')
        router.refresh()
      }
    } catch (error) {
      toast.error('خطا در ورود')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-900 via-red-800 to-orange-900 p-4">
      <Card className="w-full max-w-md border-2 border-red-500 shadow-2xl">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <AlertTriangle className="h-12 w-12 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-red-600">
            ورود اضطراری ادمین
          </CardTitle>
          <CardDescription className="text-base">
            این صفحه فقط برای ادمین در حالت تعمیر است
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل ادمین</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@sarayshahzada.af"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="text-left"
                dir="ltr"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">رمز عبور</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="text-left"
                dir="ltr"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700"
              disabled={isLoading}
            >
              {isLoading ? 'در حال ورود...' : 'ورود اضطراری'}
            </Button>
          </form>
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              ⚠️ هشدار امنیتی
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• این صفحه فقط برای ادمین است</li>
              <li>• پس از ورود، حالت تعمیر را غیرفعال کنید</li>
              <li>• URL این صفحه را با کسی به اشتراک نگذارید</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
