'use client'

import { ReactNode } from 'react'

interface SimpleLayoutProps {
  children: ReactNode
}

export function SimpleLayout({ children }: SimpleLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {children}
    </div>
  )
}