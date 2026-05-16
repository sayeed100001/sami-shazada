import { useState, useEffect, useCallback } from 'react'
import { useRealTime } from '@/contexts/RealTimeContext'
import { RealCommodityData, RealCryptoData, fetchRealCommodityData, fetchRealCryptoData, fetchRealForexData } from '@/lib/realMarketData'
import { RateLimiter } from '@/lib/errorHandling'

// Rate limiters for API calls
const commodityLimiter = new RateLimiter(10, 60000) // 10 requests per minute
const cryptoLimiter = new RateLimiter(30, 60000) // 30 requests per minute
const forexLimiter = new RateLimiter(60, 60000) // 60 requests per minute

// Hook for real-time commodity data
export function useRealTimeCommodities(refreshInterval = 60000) {
  const { rates } = useRealTime()
  const [commodities, setCommodities] = useState<RealCommodityData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!commodityLimiter.canMakeRequest()) {
      const waitTime = commodityLimiter.getTimeToNextRequest()
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    try {
      const data = await fetchRealCommodityData()
      setCommodities(data)
      setError(null)
    } catch (err: any) {
      setError(err)
      console.error('Failed to fetch commodity data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  // Update commodities when receiving real-time updates
  useEffect(() => {
    const commodityRates = rates.filter(r => r.type === 'commodity')
    if (commodityRates.length > 0) {
      setCommodities(prev => {
        const updated = [...prev]
        commodityRates.forEach(rate => {
          const index = updated.findIndex(c => c.symbol === rate.symbol)
          if (index >= 0) {
            updated[index] = { ...updated[index], ...rate }
          }
        })
        return updated
      })
    }
  }, [rates])

  return { commodities, loading, error, refresh: fetchData }
}

// Hook for real-time crypto data
export function useRealTimeCrypto(refreshInterval = 30000) {
  const { rates } = useRealTime()
  const [cryptos, setCryptos] = useState<RealCryptoData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!cryptoLimiter.canMakeRequest()) {
      const waitTime = cryptoLimiter.getTimeToNextRequest()
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    try {
      const data = await fetchRealCryptoData()
      setCryptos(data)
      setError(null)
    } catch (err: any) {
      setError(err)
      console.error('Failed to fetch crypto data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  // Update cryptos when receiving real-time updates
  useEffect(() => {
    const cryptoRates = rates.filter(r => r.type === 'crypto')
    if (cryptoRates.length > 0) {
      setCryptos(prev => {
        const updated = [...prev]
        cryptoRates.forEach(rate => {
          const index = updated.findIndex(c => c.symbol === rate.symbol)
          if (index >= 0) {
            updated[index] = { ...updated[index], ...rate }
          }
        })
        return updated
      })
    }
  }, [rates])

  return { cryptos, loading, error, refresh: fetchData }
}

// Hook for real-time forex data
export function useRealTimeForex(refreshInterval = 60000) {
  const { rates } = useRealTime()
  const [forexRates, setForexRates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    if (!forexLimiter.canMakeRequest()) {
      const waitTime = forexLimiter.getTimeToNextRequest()
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }

    try {
      const data = await fetchRealForexData()
      setForexRates(data)
      setError(null)
    } catch (err: any) {
      setError(err)
      console.error('Failed to fetch forex data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, refreshInterval)
    return () => clearInterval(interval)
  }, [fetchData, refreshInterval])

  // Update forex rates when receiving real-time updates
  useEffect(() => {
    const forexUpdates = rates.filter(r => r.type === 'forex')
    if (forexUpdates.length > 0) {
      setForexRates(prev => {
        const updated = [...prev]
        forexUpdates.forEach(rate => {
          const index = updated.findIndex(r => 
            r.from === rate.from && r.to === rate.to
          )
          if (index >= 0) {
            updated[index] = { ...updated[index], ...rate }
          }
        })
        return updated
      })
    }
  }, [rates])

  return { forexRates, loading, error, refresh: fetchData }
}