'use client'

import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Gift, Percent, Trophy, Star, Zap, Crown, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export function IncentiveSection() {
  const { data: session } = useSession()

  // Don't show if user is already logged in
  if (session?.user) {
    return null
  }

  const benefits = [
    {
      icon: Percent,
      title: 'تخفیف ۲۰٪ اولین حواله',
      description: 'با ثبت‌نام، اولین حواله خود را با ۲۰٪ تخفیف ارسال کنید',
      color: 'from-green-500 to-emerald-600',
      badge: 'ویژه'
    },
    {
      icon: Gift,
      title: 'جایزه ثبت‌نام',
      description: '۱۰۰ امتیاز هدیه برای هر کاربر جدید',
      color: 'from-blue-500 to-cyan-600',
      badge: 'رایگان'
    },
    {
      icon: Trophy,
      title: 'برنامه وفاداری',
      description: 'با هر تراکنش امتیاز بگیرید و جوایز نقدی دریافت کنید',
      color: 'from-purple-500 to-pink-600',
      badge: 'جدید'
    },
    {
      icon: Crown,
      title: 'عضویت VIP',
      description: 'دسترسی به نرخ‌های ویژه و پشتیبانی اختصاصی',
      color: 'from-yellow-500 to-orange-600',
      badge: 'پریمیوم'
    }
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-1 shadow-2xl">
      <div className="absolute inset-0 bg-grid-white/[0.05] bg-[size:20px_20px]"></div>
      
      <Card className="border-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm">
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col lg:flex-row items-center gap-6">
            {/* Right Side - Call to Action */}
            <div className="flex-1 text-center lg:text-right">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white text-sm font-bold mb-4 shadow-lg animate-bounce">
                <Zap className="h-4 w-4" />
                پیشنهاد ویژه!
              </div>
              
              <h2 className="text-3xl md:text-4xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600">
                همین الان ثبت‌نام کنید!
              </h2>
              
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-6">
                با عضویت در سرای شهزاده از تخفیف‌ها، جوایز و امتیازات ویژه بهره‌مند شوید
              </p>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 text-lg px-8"
                  asChild
                >
                  <Link href="/auth/signup">
                    <Star className="ml-2 h-5 w-5" />
                    ثبت‌نام رایگان
                  </Link>
                </Button>
                
                <Button 
                  size="lg" 
                  variant="outline"
                  className="border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-lg px-8"
                  asChild
                >
                  <Link href="/auth/signin">
                    ورود به حساب
                    <ArrowLeft className="mr-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                بیش از <span className="font-bold text-indigo-600">۱۰,۰۰۰+</span> کاربر فعال
              </p>
            </div>
            
            {/* Left Side - Benefits Grid */}
            <div className="flex-1 w-full">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {benefits.map((benefit, index) => (
                  <div
                    key={index}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-xl blur-xl"
                      style={{
                        background: `linear-gradient(to right, var(--tw-gradient-stops))`,
                      }}
                    ></div>
                    
                    <Card className="relative border-2 hover:border-indigo-300 dark:hover:border-indigo-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${benefit.color} flex items-center justify-center flex-shrink-0 shadow-lg`}>
                            <benefit.icon className="h-6 w-6 text-white" />
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-sm">{benefit.title}</h3>
                              <Badge variant="secondary" className="text-xs">
                                {benefit.badge}
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed">
                              {benefit.description}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {/* Bottom Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8 pt-6 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-indigo-600 persian-numbers">۲۰٪</div>
              <div className="text-xs text-muted-foreground">تخفیف اولین حواله</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600 persian-numbers">۱۰۰</div>
              <div className="text-xs text-muted-foreground">امتیاز هدیه</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-pink-600 persian-numbers">۲۴/۷</div>
              <div className="text-xs text-muted-foreground">پشتیبانی آنلاین</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
