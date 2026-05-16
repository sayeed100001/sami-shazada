'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowRight, CheckCircle, Gift, Shield, Zap } from 'lucide-react'
import Link from 'next/link'
import { useLanguage } from '@/hooks/useLanguage'

export function CTASection() {
  const { t } = useLanguage()

  const benefits = [
    {
      icon: Zap,
      title: 'دسترسی سریع',
      description: 'به نرخهای لحظهای و بهترین صرافان'
    },
    {
      icon: Gift,
      title: 'پاداش ثبت نام',
      description: 'بونوس ویژه برای کاربران جدید'
    },
    {
      icon: Shield,
      title: 'امنیت کامل',
      description: 'تراکنشهای امن و محافظت شده'
    }
  ]

  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-600 p-8 md:p-12 shadow-2xl">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff12_1px,transparent_1px),linear-gradient(to_bottom,#ffffff12_1px,transparent_1px)] bg-[size:24px_24px]" />
      
      {/* Gradient Orbs */}
      <div className="absolute -top-10 -right-10 w-64 h-64 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      
      <div className="relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-4">
            <Gift className="h-4 w-4 text-white" />
            <span className="text-sm font-semibold text-white">پیشنهاد ویژه</span>
          </div>
          
          <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
            همین حالا عضو شوید!
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto mb-8">
            با ثبت نام رایگان، از تمام امکانات پلتفرم استفاده کنید و از پاداشهای ویژه بهرهمند شوید
          </p>
        </div>

        {/* Benefits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {benefits.map((benefit, index) => (
            <div
              key={index}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20 hover:bg-white/15 transition-all group"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/20 rounded-xl group-hover:scale-110 transition-transform">
                  <benefit.icon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-white mb-1 text-sm">{benefit.title}</h3>
                  <p className="text-xs text-white/80">{benefit.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            asChild
            size="lg"
            className="bg-white text-purple-600 hover:bg-white/90 font-bold shadow-xl hover:shadow-2xl transition-all group text-base dark:text-purple-600"
          >
            <Link href="/auth/signup">
              ثبت نام رایگان
              <ArrowRight className="mr-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </Button>
          
          <Button
            asChild
            size="lg"
            variant="outline"
            className="bg-white/10 text-white border-white/30 hover:bg-white/20 backdrop-blur-sm font-bold text-base"
          >
            <Link href="/sarafs">
              مشاهده صرافان
            </Link>
          </Button>
        </div>

        {/* Trust Indicators */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-white/80 text-sm">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>بدون هزینه ثبت نام</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>فعالسازی فوری</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            <span>پشتیبانی 24/7</span>
          </div>
        </div>
      </div>
    </div>
  )
}
