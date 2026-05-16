'use client'

import { WorkingTradingView } from './WorkingTradingView'

interface RealTradingViewProps {
  symbol: string
  interval?: string
  theme?: 'light' | 'dark'
  height?: string | number
}

function normalizeInterval(interval: string) {
  const value = interval.trim()

  if (/^\\d+[mM]$/.test(value)) return value.toLowerCase()
  if (/^\\d+[hHdDwW]$/.test(value)) return value.toUpperCase()

  return value
}

export function RealTradingView({
  symbol,
  interval = '1H',
  height
}: RealTradingViewProps) {
  const normalizedInterval = normalizeInterval(interval)
  const style = height
    ? { height: typeof height === 'number' ? `${height}px` : height }
    : undefined

  return (
    <div className="w-full" style={style}>
      <WorkingTradingView symbol={symbol} interval={normalizedInterval} />
    </div>
  )
}

