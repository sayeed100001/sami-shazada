export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export class TechnicalIndicators {
  // Helper method to clean and validate candle data
  static cleanData(data: CandleData[]): CandleData[] {
    if (!Array.isArray(data)) return []
    
    return data.filter(candle => 
      candle && 
      typeof candle.open === 'number' && 
      typeof candle.high === 'number' && 
      typeof candle.low === 'number' && 
      typeof candle.close === 'number' && 
      typeof candle.volume === 'number' &&
      !isNaN(candle.open) && 
      !isNaN(candle.high) && 
      !isNaN(candle.low) && 
      !isNaN(candle.close) && 
      !isNaN(candle.volume) &&
      candle.high >= candle.low &&
      candle.high >= Math.max(candle.open, candle.close) &&
      candle.low <= Math.min(candle.open, candle.close) &&
      candle.volume >= 0
    )
  }

  // Helper method to extract close prices from candle data
  static extractCloses(data: CandleData[]): number[] {
    return data.map(candle => candle.close)
  }

  // Helper method to extract highs from candle data
  static extractHighs(data: CandleData[]): number[] {
    return data.map(candle => candle.high)
  }

  // Helper method to extract lows from candle data
  static extractLows(data: CandleData[]): number[] {
    return data.map(candle => candle.low)
  }

  // Overloaded SMA method to handle both number arrays and CandleData arrays
  static sma(data: number[] | CandleData[], period: number): number[] {
    const prices = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' 
      ? this.extractCloses(data as CandleData[]) 
      : data as number[]
    if (!prices.length || period <= 0 || period > prices.length) return []
    const result: number[] = []
    for (let i = period - 1; i < prices.length; i++) {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0)
      result.push(Number((sum / period).toFixed(8)))
    }
    return result
  }

  static ema(data: number[] | CandleData[], period: number): number[] {
    const prices = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' 
      ? this.extractCloses(data as CandleData[]) 
      : data as number[]
    if (!prices.length || period <= 0) return []
    const result: number[] = []
    const multiplier = 2 / (period + 1)
    
    const smaFirst = prices.slice(0, period).reduce((a, b) => a + b, 0) / period
    result[period - 1] = smaFirst
    
    for (let i = period; i < prices.length; i++) {
      result[i] = Number(((prices[i] * multiplier) + (result[i - 1] * (1 - multiplier))).toFixed(8))
    }
    return result
  }

  static rsi(data: number[] | CandleData[], period: number = 14): number[] {
    const prices = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' 
      ? this.extractCloses(data as CandleData[]) 
      : data as number[]
    if (!prices.length || period <= 0 || prices.length < period + 1) return []
    
    const gains: number[] = []
    const losses: number[] = []
    
    for (let i = 1; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1]
      gains.push(change > 0 ? change : 0)
      losses.push(change < 0 ? Math.abs(change) : 0)
    }
    
    const result: number[] = []
    let avgGain = gains.slice(0, period).reduce((a, b) => a + b, 0) / period
    let avgLoss = losses.slice(0, period).reduce((a, b) => a + b, 0) / period
    
    for (let i = period; i < gains.length; i++) {
      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
      result.push(Number((100 - (100 / (1 + rs))).toFixed(2)))
      
      avgGain = ((avgGain * (period - 1)) + gains[i]) / period
      avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period
    }
    
    return result
  }

  static macd(data: number[] | CandleData[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9) {
    const fastEMA = this.ema(data, fastPeriod)
    const slowEMA = this.ema(data, slowPeriod)
    
    const macdLine: number[] = []
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push(Number((fastEMA[i] - slowEMA[i]).toFixed(8)))
    }
    
    const signalLine = this.ema(macdLine, signalPeriod)
    const histogram = macdLine.map((val, i) => Number((val - (signalLine[i] || 0)).toFixed(8)))
    
    return { macdLine, signalLine, histogram }
  }

  static bollingerBands(data: number[] | CandleData[], period: number = 20, stdDev: number = 2) {
    const prices = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' 
      ? this.extractCloses(data as CandleData[]) 
      : data as number[]
    if (!prices.length || period <= 0 || prices.length < period) return []
    
    const sma = this.sma(prices, period)
    const bands: Array<{ upper: number; middle: number; lower: number }> = []
    
    for (let i = period - 1; i < prices.length; i++) {
      const slice = prices.slice(i - period + 1, i + 1)
      const avg = sma[i - period + 1]
      const variance = slice.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / period
      const std = Math.sqrt(variance)
      
      bands.push({
        upper: Number((avg + (std * stdDev)).toFixed(8)),
        middle: Number(avg.toFixed(8)),
        lower: Number((avg - (std * stdDev)).toFixed(8))
      })
    }
    
    return bands
  }
  
  static stochastic(data: CandleData[] | {high: number[], low: number[], close: number[]}, kPeriod: number = 14, dPeriod: number = 3): {k: number[], d: number[]} {
    let high: number[], low: number[], close: number[]
    
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'high' in data[0]) {
      // CandleData array
      const candleData = data as CandleData[]
      high = this.extractHighs(candleData)
      low = this.extractLows(candleData)
      close = this.extractCloses(candleData)
    } else {
      // Legacy format
      const legacyData = data as {high: number[], low: number[], close: number[]}
      high = legacyData.high
      low = legacyData.low
      close = legacyData.close
    }
    if (!high.length || high.length !== low.length || low.length !== close.length) return {k: [], d: []}
    
    const k: number[] = []
    
    for (let i = kPeriod - 1; i < close.length; i++) {
      const highestHigh = Math.max(...high.slice(i - kPeriod + 1, i + 1))
      const lowestLow = Math.min(...low.slice(i - kPeriod + 1, i + 1))
      const currentClose = close[i]
      
      const kValue = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100
      k.push(Number(kValue.toFixed(2)))
    }
    
    const d = this.sma(k, dPeriod)
    
    return { k, d }
  }
  
  static atr(data: CandleData[] | {high: number[], low: number[], close: number[]}, period: number = 14): number[] {
    let high: number[], low: number[], close: number[]
    
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'high' in data[0]) {
      // CandleData array
      const candleData = data as CandleData[]
      high = this.extractHighs(candleData)
      low = this.extractLows(candleData)
      close = this.extractCloses(candleData)
    } else {
      // Legacy format
      const legacyData = data as {high: number[], low: number[], close: number[]}
      high = legacyData.high
      low = legacyData.low
      close = legacyData.close
    }
    if (!high.length || high.length !== low.length || low.length !== close.length || high.length < 2) return []
    
    const trueRanges: number[] = []
    
    for (let i = 1; i < high.length; i++) {
      const tr1 = high[i] - low[i]
      const tr2 = Math.abs(high[i] - close[i - 1])
      const tr3 = Math.abs(low[i] - close[i - 1])
      trueRanges.push(Math.max(tr1, tr2, tr3))
    }
    
    return this.sma(trueRanges, period)
  }
  
  static williams(data: CandleData[] | {high: number[], low: number[], close: number[]}, period: number = 14): number[] {
    let high: number[], low: number[], close: number[]
    
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' && 'high' in data[0]) {
      // CandleData array
      const candleData = data as CandleData[]
      high = this.extractHighs(candleData)
      low = this.extractLows(candleData)
      close = this.extractCloses(candleData)
    } else {
      // Legacy format
      const legacyData = data as {high: number[], low: number[], close: number[]}
      high = legacyData.high
      low = legacyData.low
      close = legacyData.close
    }
    if (!high.length || high.length !== low.length || low.length !== close.length) return []
    
    const result: number[] = []
    
    for (let i = period - 1; i < close.length; i++) {
      const highestHigh = Math.max(...high.slice(i - period + 1, i + 1))
      const lowestLow = Math.min(...low.slice(i - period + 1, i + 1))
      const currentClose = close[i]
      
      const williams = ((highestHigh - currentClose) / (highestHigh - lowestLow)) * -100
      result.push(Number(williams.toFixed(2)))
    }
    
    return result
  }

  static vwap(data: CandleData[]): number[] {
    if (!data.length) return []
    
    const result: number[] = []
    let cumulativeVolume = 0
    let cumulativeVolumePrice = 0
    
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3
      const volumePrice = typicalPrice * data[i].volume
      
      cumulativeVolumePrice += volumePrice
      cumulativeVolume += data[i].volume
      
      const vwap = cumulativeVolume > 0 ? cumulativeVolumePrice / cumulativeVolume : typicalPrice
      result.push(Number(vwap.toFixed(8)))
    }
    
    return result
  }
}
