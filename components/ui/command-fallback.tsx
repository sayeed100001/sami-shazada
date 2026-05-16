'use client'

import * as React from 'react'
import { Search, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// Fallback Command components when cmdk fails
const CommandFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onValueChange?: (value: string) => void
  }
>(({ className, children, value, onValueChange, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
))
CommandFallback.displayName = "CommandFallback"

const CommandInputFallback = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement> & {
    onValueChange?: (value: string) => void
  }
>(({ className, onValueChange, ...props }, ref) => (
  <div className="flex items-center border-b px-3">
    <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
    <Input
      ref={ref}
      className={cn(
        "flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0",
        className
      )}
      onChange={(e) => {
        onValueChange?.(e.target.value)
        props.onChange?.(e)
      }}
      {...props}
    />
  </div>
))
CommandInputFallback.displayName = "CommandInputFallback"

const CommandListFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
    {...props}
  />
))
CommandListFallback.displayName = "CommandListFallback"

const CommandEmptyFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("py-6 text-center text-sm", className)}
    {...props}
  />
))
CommandEmptyFallback.displayName = "CommandEmptyFallback"

const CommandGroupFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "overflow-hidden p-1 text-foreground",
      className
    )}
    {...props}
  />
))
CommandGroupFallback.displayName = "CommandGroupFallback"

const CommandItemFallback = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    value?: string
    onSelect?: (value: string) => void
    disabled?: boolean
  }
>(({ className, value, onSelect, disabled, children, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground",
      disabled && "pointer-events-none opacity-50",
      className
    )}
    onClick={() => !disabled && value && onSelect?.(value)}
    {...props}
  >
    {children}
  </div>
))
CommandItemFallback.displayName = "CommandItemFallback"

export {
  CommandFallback as Command,
  CommandInputFallback as CommandInput,
  CommandListFallback as CommandList,
  CommandEmptyFallback as CommandEmpty,
  CommandGroupFallback as CommandGroup,
  CommandItemFallback as CommandItem,
}