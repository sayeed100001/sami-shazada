'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface MobileResponsiveLayoutProps {
  children: ReactNode
  className?: string
  containerType?: 'default' | 'admin' | 'portal' | 'charts'
}

export function MobileResponsiveLayout({ 
  children, 
  className,
  containerType = 'default'
}: MobileResponsiveLayoutProps) {
  const containerClasses = {
    default: 'space-y-3 sm:space-y-4 lg:space-y-6 p-2 sm:p-4 lg:p-6',
    admin: 'space-y-3 sm:space-y-6 p-2 sm:p-4 lg:p-6 admin-container',
    portal: 'space-y-4 sm:space-y-6 lg:space-y-8 p-2 sm:p-4 lg:p-6 portal-container',
    charts: 'min-h-screen w-full overflow-x-hidden charts-container'
  }

  return (
    <div className={cn(
      'min-h-screen w-full overflow-x-hidden',
      containerClasses[containerType],
      className
    )}>
      {children}
    </div>
  )
}

interface MobileTableProps {
  children: ReactNode
  className?: string
}

export function MobileTable({ children, className }: MobileTableProps) {
  return (
    <div className="mobile-table-wrapper">
      <div className={cn('mobile-table', className)}>
        {children}
      </div>
    </div>
  )
}

interface MobileGridProps {
  children: ReactNode
  cols?: 1 | 2 | 3 | 4
  className?: string
}

export function MobileGrid({ children, cols = 1, className }: MobileGridProps) {
  const gridClasses = {
    1: 'mobile-grid-1',
    2: 'mobile-grid-2', 
    3: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6',
    4: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-6'
  }

  return (
    <div className={cn(gridClasses[cols], className)}>
      {children}
    </div>
  )
}

interface MobileDialogProps {
  children: ReactNode
  className?: string
}

export function MobileDialog({ children, className }: MobileDialogProps) {
  return (
    <div className={cn('mobile-dialog', className)}>
      {children}
    </div>
  )
}

interface MobileFormProps {
  children: ReactNode
  className?: string
}

export function MobileForm({ children, className }: MobileFormProps) {
  return (
    <div className={cn('mobile-form space-y-3 sm:space-y-4', className)}>
      {children}
    </div>
  )
}