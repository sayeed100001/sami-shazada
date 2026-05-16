'use client'

import { cn } from '@/lib/utils'

interface TypingIndicatorProps {
  userName?: string
  language: string
  className?: string
}

export function TypingIndicator({ userName, language, className }: TypingIndicatorProps) {
  const pick = (fa: string, en: string, ps: string) =>
    language === 'en' ? en : language === 'ps' ? ps : fa

  return (
    <div className={cn('flex items-center gap-2 px-4 py-2', className)}>
      <div className="flex items-center gap-1 rounded-[18px] border border-white/12 bg-slate-950/55 px-4 py-3 backdrop-blur-md dark:bg-slate-800/90">
        <div className="flex gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-white/60 [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-white/60" />
        </div>
        {userName && (
          <span className="ml-2 text-xs text-white/60">
            {userName} {pick('در حال نوشتن...', 'is typing...', 'لیکي...')}
          </span>
        )}
      </div>
    </div>
  )
}
