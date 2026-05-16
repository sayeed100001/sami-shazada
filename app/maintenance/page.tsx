'use client'

import { Construction, RefreshCw } from 'lucide-react'
import { useSystemConfig } from '@/hooks/useSystemConfig'

export default function MaintenancePage() {
  const { config } = useSystemConfig()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-950 p-4">
      <div className="max-w-2xl w-full">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f12_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f12_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob" />
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000" />
        
        <div className="relative z-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 md:p-12 shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-2xl animate-pulse">
                <Construction className="w-12 h-12 text-white" />
              </div>
              <div className="absolute inset-0 w-24 h-24 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full animate-ping opacity-20" />
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-black text-center mb-4">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-purple-200">
              سیستم در حال تعمیر
            </span>
          </h1>
          
          <p className="text-xl text-blue-100/90 text-center mb-8">
            ما در حال بهبود سیستم برای ارائه خدمات بهتر به شما هستیم
          </p>
          
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 mb-8">
            <p className="text-white/80 text-center leading-relaxed">
              سیستم به زودی بازگشایی خواهد شد. از صبر و شکیبایی شما سپاسگزاریم.
              <br />
              برای اطلاعات بیشتر با پشتیبانی تماس بگیرید.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <p className="text-white/60 text-sm mb-1">ایمیل پشتیبانی</p>
              <p className="text-white font-semibold">{config.support_email || 'support@sarayshahzada.af'}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-sm rounded-xl p-4 border border-white/10 text-center">
              <p className="text-white/60 text-sm mb-1">تلفن پشتیبانی</p>
              <p className="text-white font-semibold persian-numbers">{config.contact_phone || '+93 700 000 000'}</p>
            </div>
          </div>
          
          <div className="flex justify-center">
            <button
              onClick={() => window.location.reload()}
              className="group flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            >
              <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
              بررسی مجدد
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
