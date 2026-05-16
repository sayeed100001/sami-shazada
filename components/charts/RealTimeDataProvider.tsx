'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface MarketData {
  symbol: string
  price: number
  change24h: number
  volume: number
  timestamp: number
}

interface RealTimeContextType {
  data: Map<string, MarketData>
  subscribe: (symbol: string) => void
  unsubscribe: (symbol: string) => void
}

const RealTimeContext = createContext<RealTimeContextType | null>(null)

export function RealTimeDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Map<string, MarketData>>(new Map())
  const [subscriptions, setSubscriptions] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (subscriptions.size === 0) return

    const interval = setInterval(async () => {
      try {
        const [cryptoRes, ratesRes] = await Promise.all([
          fetch('/api/crypto'),
          fetch('/api/rates')
        ])
        const [cryptoData, ratesData] = await Promise.all([
          cryptoRes.json(),
          ratesRes.json()
        ])

        setData(prevData => {
          const newData = new Map(prevData)
        
        cryptoData.forEach((crypto: any) => {
          const symbol = `${crypto.symbol}/USD`
          if (subscriptions.has(symbol)) {
            newData.set(symbol, {
              symbol,
              price: crypto.price,
              change24h: crypto.change24h,
              volume: crypto.volume24h || 0,
              timestamp: Date.now()
            })
          }
        })

        ratesData.slice(0, 5).forEach((rate: any) => {
          const symbol = `${rate.from}/${rate.to}`
          if (subscriptions.has(symbol)) {
            newData.set(symbol, {
              symbol,
              price: rate.rate,
              change24h: 0,
              volume: 0,
              timestamp: Date.now()
            })
          }
        })

          return newData
        })
      } catch (error) {
        console.error('Real-time data fetch error:', error)
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [subscriptions])

  const subscribe = (symbol: string) => {
    setSubscriptions(prev => new Set([...Array.from(prev), symbol]))
  }

  const unsubscribe = (symbol: string) => {
    setSubscriptions(prev => {
      const newSet = new Set(prev)
      newSet.delete(symbol)
      return newSet
    })
  }

  return (
    <RealTimeContext.Provider value={{ data, subscribe, unsubscribe }}>
      {children}
    </RealTimeContext.Provider>
  )
}

export function useRealTimeData() {
  const context = useContext(RealTimeContext)
  if (!context) {
    throw new Error('useRealTimeData must be used within RealTimeDataProvider')
  }
  return context
}