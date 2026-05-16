export interface RealCommodityData {
  symbol: string
  name: string
  price: number
  change24h: number
  volume24h?: number
  lastUpdate: string
}

export interface RealCryptoData {
  symbol: string
  name: string
  price: number
  change24h: number
  changePercent24h: number
  volume24h: number
  marketCap: number
  lastUpdate: string
}

export async function fetchRealCommodityData(): Promise<RealCommodityData[]> {
  try {
    const response = await fetch('/api/market/commodities', {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return []
    }

    return data.map((item: any) => ({
      symbol: item.symbol,
      name: item.name,
      price: item.price,
      change24h: item.change24h || 0,
      volume24h: item.volume24h || 0,
      lastUpdate: item.lastUpdate || new Date().toISOString(),
    }))
  } catch (error) {
    console.error('Commodity data fetch error:', error)
    return []
  }
}

export async function fetchRealCryptoData(): Promise<RealCryptoData[]> {
  try {
    const response = await fetch('/api/crypto', {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    if (!Array.isArray(data)) {
      return []
    }

    return data.map((coin: any) => ({
      symbol: coin.symbol,
      name: coin.name,
      price: coin.price,
      change24h: coin.change24h || 0,
      changePercent24h: coin.changePercent24h || 0,
      volume24h: coin.volume24h || 0,
      marketCap: coin.marketCap || 0,
      lastUpdate: coin.lastUpdate || new Date().toISOString(),
    }))
  } catch (error) {
    console.error('Crypto data fetch error:', error)
    return []
  }
}

export async function fetchRealForexData(): Promise<any[]> {
  try {
    const response = await fetch('/api/rates', {
      cache: 'no-store',
    })

    if (!response.ok) {
      return []
    }

    const data = await response.json()
    return Array.isArray(data) ? data : []
  } catch (error) {
    console.error('Forex data fetch error:', error)
    return []
  }
}

export class RealTimeDataUpdater {
  private intervals: NodeJS.Timeout[] = []
  private subscribers: Map<string, ((data: any) => void)[]> = new Map()

  subscribe(symbol: string, callback: (data: any) => void) {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, [])
    }
    this.subscribers.get(symbol)!.push(callback)
  }

  unsubscribe(symbol: string, callback: (data: any) => void) {
    const callbacks = this.subscribers.get(symbol)
    if (!callbacks) return

    const index = callbacks.indexOf(callback)
    if (index >= 0) {
      callbacks.splice(index, 1)
    }
  }

  startUpdates() {
    const cryptoInterval = setInterval(async () => {
      const cryptoData = await fetchRealCryptoData()
      cryptoData.forEach((crypto) => {
        const callbacks = this.subscribers.get(crypto.symbol)
        callbacks?.forEach((callback) => callback(crypto))
      })
    }, 10000)

    const forexInterval = setInterval(async () => {
      const forexData = await fetchRealForexData()
      forexData.forEach((rate: any) => {
        const callbacks = this.subscribers.get(`${rate.from}${rate.to}`)
        callbacks?.forEach((callback) => callback(rate))
      })
    }, 30000)

    const commodityInterval = setInterval(async () => {
      const commodityData = await fetchRealCommodityData()
      commodityData.forEach((commodity) => {
        const callbacks = this.subscribers.get(commodity.symbol)
        callbacks?.forEach((callback) => callback(commodity))
      })
    }, 60000)

    this.intervals = [cryptoInterval, forexInterval, commodityInterval]
  }

  stopUpdates() {
    this.intervals.forEach((interval) => clearInterval(interval))
    this.intervals = []
  }
}

export const realTimeUpdater = new RealTimeDataUpdater()
