'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableHeaderProps {
  children: React.ReactNode
  className?: string
}

interface ResponsiveTableCellProps {
  children: React.ReactNode
  className?: string
  hideOn?: 'sm' | 'md' | 'lg' | 'xl'
  showOn?: 'sm' | 'md' | 'lg' | 'xl'
  minWidth?: string
}

export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className="overflow-x-auto">
      <Table className={className}>
        {children}
      </Table>
    </div>
  )
}

export function ResponsiveTableHeader({ children, className }: ResponsiveTableHeaderProps) {
  return (
    <TableHeader className={className}>
      {children}
    </TableHeader>
  )
}

export function ResponsiveTableCell({ 
  children, 
  className, 
  hideOn, 
  showOn, 
  minWidth 
}: ResponsiveTableCellProps) {
  const hideClasses = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell', 
    lg: 'hidden lg:table-cell',
    xl: 'hidden xl:table-cell'
  }

  const showClasses = {
    sm: 'table-cell sm:hidden',
    md: 'table-cell md:hidden',
    lg: 'table-cell lg:hidden', 
    xl: 'table-cell xl:hidden'
  }

  const responsiveClass = hideOn ? hideClasses[hideOn] : showOn ? showClasses[showOn] : ''
  const widthClass = minWidth ? `min-w-[${minWidth}]` : ''

  return (
    <TableCell className={cn(responsiveClass, widthClass, className)}>
      {children}
    </TableCell>
  )
}

export function ResponsiveTableHead({ 
  children, 
  className, 
  hideOn, 
  showOn, 
  minWidth 
}: ResponsiveTableCellProps) {
  const hideClasses = {
    sm: 'hidden sm:table-cell',
    md: 'hidden md:table-cell',
    lg: 'hidden lg:table-cell', 
    xl: 'hidden xl:table-cell'
  }

  const showClasses = {
    sm: 'table-cell sm:hidden',
    md: 'table-cell md:hidden',
    lg: 'table-cell lg:hidden',
    xl: 'table-cell xl:hidden'
  }

  const responsiveClass = hideOn ? hideClasses[hideOn] : showOn ? showClasses[showOn] : ''
  const widthClass = minWidth ? `min-w-[${minWidth}]` : ''

  return (
    <TableHead className={cn(responsiveClass, widthClass, className)}>
      {children}
    </TableHead>
  )
}

export { TableBody, TableRow }