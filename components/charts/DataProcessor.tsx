'use client';

import { useCallback, useEffect, useState } from 'react';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
  trades?: number;
}

interface MarketAsset {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  volume24h?: number;
  marketCap?: number;
  high24h?: number;
  low24h?: number;
  trend: 'up' | 'down' | 'neutral';
  type: 'crypto' | 'forex' | 'commodity' | 'stock';
  sector?: string;
  exchange?: string;
  lastUpdate?: string;
}

interface DataProcessorProps {
  selectedAsset: string;
  timeframe: string;
  onDataUpdate: (data: CandleData[]) => void;
  onAssetsUpdate: (assets: MarketAsset[]) => void;
  onConnectionStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => void;
  isRealTime: boolean;
}

export function DataProcessor({
  selectedAsset,
  timeframe,
  onDataUpdate,
  onAssetsUpdate,
  onConnectionStatusChange,
  isRealTime
}: DataProcessorProps) {
  const [priceHistory, setPriceHistory] = useState<{[key: string]: CandleData[]}>({});
  const [lastPrices, setLastPrices] = useState<{[key: string]: number}>({});
  const [wsConnection, setWsConnection] = useState<WebSocket | null>(null);

  // Timeframe configurations
  const TIMEFRAMES = {
    '1s': 1000,
    '5s': 5000,
    '15s': 15000,
    '30s': 30000,
    '1m': 60000,
    '3m': 180000,
    '5m': 300000,
    '15m': 900000,
    '30m': 1800000,
    '1h': 3600000,
    '2h': 7200000,
    '4h': 14400000,
    '6h': 21600000,
    '8h': 28800000,
    '12h': 43200000,
    '1d': 86400000,
    '3d': 259200000,
    '1w': 604800000,
    '1M': 2592000000
  };

  // Enhanced market data fetching
  const fetchMarketData = useCallback(async () => {
    try {
      onConnectionStatusChange('connecting');
      
      const [cryptoRes, ratesRes, marketRes, commoditiesRes] = await Promise.all([
        fetch('/api/crypto', { 
          headers: { 'Cache-Control': 'no-cache' },
          next: { revalidate: 0 }
        }),
        fetch('/api/rates', { 
          headers: { 'Cache-Control': 'no-cache' },
          next: { revalidate: 0 }
        }),
        fetch('/api/market/overview', { 
          headers: { 'Cache-Control': 'no-cache' },
          next: { revalidate: 0 }
        }),
        fetch('/api/market/commodities', { 
          headers: { 'Cache-Control': 'no-cache' },
          next: { revalidate: 0 }
        }).catch(() => ({ json: () => [] }))
      ]);

      const [cryptoData, ratesData, marketData, commoditiesData] = await Promise.all([
        cryptoRes.json(),
        ratesRes.json(),
        marketRes.json(),
        commoditiesRes.json()
      ]);

      const assets: MarketAsset[] = [];

      // Process cryptocurrency data
      if (Array.isArray(cryptoData)) {
        cryptoData.forEach((crypto: any) => {
          const symbol = `${crypto.symbol}/USD`;
          assets.push({
            symbol,
            name: crypto.name,
            price: crypto.price,
            change24h: crypto.change24h,
            changePercent24h: crypto.changePercent24h,
            volume24h: crypto.volume24h,
            marketCap: crypto.marketCap,
            high24h: crypto.price * (1 + Math.random() * 0.05 + 0.02),
            low24h: crypto.price * (1 - Math.random() * 0.05 - 0.02),
            trend: crypto.changePercent24h > 0.1 ? 'up' : crypto.changePercent24h < -0.1 ? 'down' : 'neutral',
            type: 'crypto',
            sector: 'Cryptocurrency',
            exchange: getExchangeForSymbol(symbol),
            lastUpdate: crypto.lastUpdate || new Date().toISOString()
          });
          
          // Store last price for real-time updates
          setLastPrices(prev => ({ ...prev, [symbol]: crypto.price }));
        });
      }

      // Process forex data with major pairs
      if (Array.isArray(ratesData)) {
        const majorPairs = [
          'USDAFN', 'USDEUR', 'USDGBP', 'USDPKR', 'USDJPY', 'USDCAD', 
          'USDAUD', 'USDCHF', 'USDCNY', 'USDSEK', 'USDNOK', 'USDDKK',
          'EURUSD', 'GBPUSD', 'AUDUSD', 'NZDUSD', 'USDSGD', 'USDHKD'
        ];
        
        ratesData
          .filter((rate: any) => majorPairs.includes(`${rate.from}${rate.to}`))
          .forEach((rate: any) => {
            const symbol = `${rate.from}/${rate.to}`;
            const dailyChange = (Math.random() - 0.5) * rate.rate * 0.02;
            const dailyChangePercent = (dailyChange / rate.rate) * 100;
            
            assets.push({
              symbol,
              name: getForexPairName(rate.from, rate.to),
              price: rate.rate,
              change24h: dailyChange,
              changePercent24h: dailyChangePercent,
              volume24h: Math.random() * 5000000000 + 1000000000,
              high24h: rate.rate * (1 + Math.random() * 0.015 + 0.005),
              low24h: rate.rate * (1 - Math.random() * 0.015 - 0.005),
              trend: dailyChangePercent > 0.05 ? 'up' : dailyChangePercent < -0.05 ? 'down' : 'neutral',
              type: 'forex',
              sector: 'Foreign Exchange',
              exchange: 'Interbank',
              lastUpdate: rate.lastUpdate || new Date().toISOString()
            });
            
            setLastPrices(prev => ({ ...prev, [symbol]: rate.rate }));
          });
      }

      // Process commodities data
      const commodities = [
        { symbol: 'GOLD/USD', name: 'طلا', basePrice: 2034.50 },
        { symbol: 'SILVER/USD', name: 'نقره', basePrice: 24.85 },
        { symbol: 'OIL/USD', name: 'نفت خام', basePrice: 78.45 },
        { symbol: 'COPPER/USD', name: 'مس', basePrice: 3.85 },
        { symbol: 'WHEAT/USD', name: 'گندم', basePrice: 6.25 },
        { symbol: 'CORN/USD', name: 'ذرت', basePrice: 4.85 }
      ];

      commodities.forEach(commodity => {
        const dailyChange = (Math.random() - 0.5) * commodity.basePrice * 0.03;
        const dailyChangePercent = (dailyChange / commodity.basePrice) * 100;
        
        assets.push({
          symbol: commodity.symbol,
          name: commodity.name,
          price: commodity.basePrice + dailyChange,
          change24h: dailyChange,
          changePercent24h: dailyChangePercent,
          volume24h: Math.random() * 100000000 + 10000000,
          high24h: commodity.basePrice * (1 + Math.random() * 0.04 + 0.01),
          low24h: commodity.basePrice * (1 - Math.random() * 0.04 - 0.01),
          trend: dailyChangePercent > 0.1 ? 'up' : dailyChangePercent < -0.1 ? 'down' : 'neutral',
          type: 'commodity',
          sector: 'Commodities',
          exchange: 'COMEX',
          lastUpdate: new Date().toISOString()
        });
        
        setLastPrices(prev => ({ ...prev, [commodity.symbol]: commodity.basePrice + dailyChange }));
      });

      // Process market overview data
      if (Array.isArray(marketData)) {
        marketData.forEach((market: any) => {
          if (!assets.find(a => a.symbol === market.symbol)) {
            assets.push({
              symbol: market.symbol,
              name: market.name,
              price: market.price,
              change24h: market.change24h,
              changePercent24h: market.changePercent24h,
              volume24h: Math.random() * 500000000 + 50000000,
              high24h: market.price * (1 + Math.random() * 0.03 + 0.01),
              low24h: market.price * (1 - Math.random() * 0.03 - 0.01),
              trend: market.trend,
              type: market.symbol.includes('GOLD') || market.symbol.includes('XAU') ? 'commodity' : 'forex',
              sector: market.symbol.includes('GOLD') ? 'Precious Metals' : 'Foreign Exchange',
              exchange: market.symbol.includes('GOLD') ? 'COMEX' : 'Interbank'
            });
            
            setLastPrices(prev => ({ ...prev, [market.symbol]: market.price }));
          }
        });
      }

      onAssetsUpdate(assets);
      onConnectionStatusChange('connected');
      
    } catch (error) {
      console.error('Failed to fetch market data:', error);
      onConnectionStatusChange('disconnected');
      
      // Fallback to cached data or default data
      const fallbackAssets: MarketAsset[] = [
        {
          symbol: 'BTC/USD',
          name: 'بیت کوین',
          price: 43250.00,
          change24h: 1250.50,
          changePercent24h: 2.98,
          volume24h: 25000000000,
          marketCap: 850000000000,
          high24h: 44500.00,
          low24h: 41800.00,
          trend: 'up',
          type: 'crypto',
          sector: 'Cryptocurrency',
          exchange: 'Binance'
        },
        {
          symbol: 'USD/AFN',
          name: 'دلار به افغانی',
          price: 70.85,
          change24h: 0.15,
          changePercent24h: 0.21,
          volume24h: 50000000,
          high24h: 71.20,
          low24h: 70.45,
          trend: 'up',
          type: 'forex',
          sector: 'Foreign Exchange',
          exchange: 'Interbank'
        }
      ];
      
      onAssetsUpdate(fallbackAssets);
    }
  }, [onAssetsUpdate, onConnectionStatusChange]);

  // Generate professional candlestick data
  const generateCandleData = useCallback((asset: string, timeframeMs: number) => {
    const cacheKey = `${asset}_${timeframe}`;
    
    // Return cached data if available and recent
    if (priceHistory[cacheKey] && priceHistory[cacheKey].length > 0) {
      const lastCandle = priceHistory[cacheKey][priceHistory[cacheKey].length - 1];
      const timeSinceLastCandle = Date.now() - lastCandle.time;
      if (timeSinceLastCandle < timeframeMs) {
        return priceHistory[cacheKey];
      }
    }
    
    const data: CandleData[] = [];
    const basePrice = lastPrices[asset] || getBasePriceForAsset(asset);
    let currentPrice = basePrice;
    const now = Date.now();
    
    // Generate 2000 candles for comprehensive history
    for (let i = 0; i < 2000; i++) {
      const candleTime = now - (2000 - i) * timeframeMs;
      
      // Calculate realistic price movement
      const volatility = getVolatilityForAsset(asset);
      const trendFactor = getTrendFactorForAsset(asset, i);
      const randomFactor = (Math.random() - 0.5) * 2;
      
      const open = currentPrice;
      const priceChange = currentPrice * volatility * (trendFactor + randomFactor * 0.5) * 0.01;
      const close = Math.max(0.01, open + priceChange);
      
      // Generate realistic high/low based on volatility
      const highLowRange = Math.abs(close - open) * (1 + Math.random());
      const high = Math.max(open, close) + highLowRange * Math.random();
      const low = Math.min(open, close) - highLowRange * Math.random();
      
      // Generate volume with realistic patterns
      const baseVolume = getBaseVolumeForAsset(asset);
      const volumeVariation = 0.5 + Math.random() * 1.5;
      const timeOfDayFactor = getTimeOfDayVolumeFactor(candleTime);
      const volume = baseVolume * volumeVariation * timeOfDayFactor;
      
      // Calculate VWAP (Volume Weighted Average Price)
      const typicalPrice = (high + low + close) / 3;
      const vwap = i === 0 ? typicalPrice : 
        (data[i - 1].vwap! * data[i - 1].volume + typicalPrice * volume) / 
        (data[i - 1].volume + volume);
      
      data.push({
        time: candleTime,
        open: Math.max(0.01, open),
        high: Math.max(0.01, high),
        low: Math.max(0.01, low),
        close: Math.max(0.01, close),
        volume: Math.max(1, volume),
        vwap,
        trades: Math.floor(volume / (Math.random() * 100 + 50))
      });
      
      currentPrice = close;
    }
    
    // Cache the generated data
    setPriceHistory(prev => ({ ...prev, [cacheKey]: data }));
    
    return data;
  }, [priceHistory, lastPrices, timeframe]);

  // Real-time data simulation
  const simulateRealTimeUpdates = useCallback(() => {
    if (!isRealTime) return;
    
    const cacheKey = `${selectedAsset}_${timeframe}`;
    const existingData = priceHistory[cacheKey];
    
    if (!existingData || existingData.length === 0) return;
    
    const timeframeMs = TIMEFRAMES[timeframe as keyof typeof TIMEFRAMES] || 3600000;
    const now = Date.now();
    const lastCandle = existingData[existingData.length - 1];
    const timeSinceLastCandle = now - lastCandle.time;
    
    if (timeSinceLastCandle >= timeframeMs) {
      // Create new candle
      const volatility = getVolatilityForAsset(selectedAsset);
      const trendFactor = getTrendFactorForAsset(selectedAsset, existingData.length);
      const randomFactor = (Math.random() - 0.5) * 2;
      
      const open = lastCandle.close;
      const priceChange = open * volatility * (trendFactor + randomFactor * 0.5) * 0.01;
      const close = Math.max(0.01, open + priceChange);
      
      const highLowRange = Math.abs(close - open) * (1 + Math.random());
      const high = Math.max(open, close) + highLowRange * Math.random();
      const low = Math.min(open, close) - highLowRange * Math.random();
      
      const baseVolume = getBaseVolumeForAsset(selectedAsset);
      const volumeVariation = 0.5 + Math.random() * 1.5;
      const timeOfDayFactor = getTimeOfDayVolumeFactor(now);
      const volume = baseVolume * volumeVariation * timeOfDayFactor;
      
      const typicalPrice = (high + low + close) / 3;
      const vwap = (lastCandle.vwap! * lastCandle.volume + typicalPrice * volume) / 
        (lastCandle.volume + volume);
      
      const newCandle: CandleData = {
        time: now,
        open: Math.max(0.01, open),
        high: Math.max(0.01, high),
        low: Math.max(0.01, low),
        close: Math.max(0.01, close),
        volume: Math.max(1, volume),
        vwap,
        trades: Math.floor(volume / (Math.random() * 100 + 50))
      };
      
      const updatedData = [...existingData.slice(1), newCandle];
      setPriceHistory(prev => ({ ...prev, [cacheKey]: updatedData }));
      onDataUpdate(updatedData);
      
    } else {
      // Update current candle
      const updatedData = [...existingData];
      const currentCandle = updatedData[updatedData.length - 1];
      
      const volatility = getVolatilityForAsset(selectedAsset) * 0.1;
      const priceChange = currentCandle.close * volatility * (Math.random() - 0.5) * 0.01;
      const newClose = Math.max(0.01, currentCandle.close + priceChange);
      
      currentCandle.close = newClose;
      currentCandle.high = Math.max(currentCandle.high, newClose);
      currentCandle.low = Math.min(currentCandle.low, newClose);
      currentCandle.volume += Math.random() * 1000;
      
      const typicalPrice = (currentCandle.high + currentCandle.low + currentCandle.close) / 3;
      currentCandle.vwap = typicalPrice; // Simplified VWAP update
      
      setPriceHistory(prev => ({ ...prev, [cacheKey]: updatedData }));
      onDataUpdate(updatedData);
    }
  }, [selectedAsset, timeframe, priceHistory, isRealTime, onDataUpdate]);

  // Helper functions
  const getExchangeForSymbol = (symbol: string): string => {
    if (symbol.includes('BTC') || symbol.includes('ETH')) return 'Binance';
    if (symbol.includes('USD')) return 'Coinbase';
    return 'Kraken';
  };

  const getForexPairName = (from: string, to: string): string => {
    const names: { [key: string]: string } = {
      'USD': 'دلار آمریکا',
      'AFN': 'افغانی',
      'EUR': 'یورو',
      'GBP': 'پوند انگلیس',
      'JPY': 'ین ژاپن',
      'PKR': 'روپیه پاکستان',
      'CAD': 'دلار کانادا',
      'AUD': 'دلار استرالیا',
      'CHF': 'فرانک سوئیس'
    };
    return `${names[from] || from} به ${names[to] || to}`;
  };

  const getBasePriceForAsset = (asset: string): number => {
    if (asset.includes('BTC')) return 43250;
    if (asset.includes('ETH')) return 2680;
    if (asset.includes('USD/AFN')) return 70.85;
    if (asset.includes('GOLD')) return 2034.50;
    return 100;
  };

  const getVolatilityForAsset = (asset: string): number => {
    if (asset.includes('BTC') || asset.includes('ETH')) return 3.0;
    if (asset.includes('GOLD') || asset.includes('SILVER')) return 1.5;
    if (asset.includes('USD')) return 0.5;
    return 1.0;
  };

  const getTrendFactorForAsset = (asset: string, index: number): number => {
    // Simulate market trends
    const cycleFactor = Math.sin(index * 0.01) * 0.5;
    const trendFactor = Math.sin(index * 0.001) * 0.3;
    return cycleFactor + trendFactor;
  };

  const getBaseVolumeForAsset = (asset: string): number => {
    if (asset.includes('BTC')) return 50000;
    if (asset.includes('ETH')) return 30000;
    if (asset.includes('USD')) return 100000;
    return 10000;
  };

  const getTimeOfDayVolumeFactor = (timestamp: number): number => {
    const hour = new Date(timestamp).getHours();
    // Higher volume during market hours
    if (hour >= 9 && hour <= 16) return 1.5;
    if (hour >= 17 && hour <= 21) return 1.2;
    return 0.8;
  };

  // Initialize data
  useEffect(() => {
    fetchMarketData();
  }, [fetchMarketData]);

  // Generate candle data when asset or timeframe changes
  useEffect(() => {
    const timeframeMs = TIMEFRAMES[timeframe as keyof typeof TIMEFRAMES] || 3600000;
    const data = generateCandleData(selectedAsset, timeframeMs);
    onDataUpdate(data);
  }, [selectedAsset, timeframe, generateCandleData, onDataUpdate]);

  // Real-time updates
  useEffect(() => {
    if (!isRealTime) return;
    
    const interval = setInterval(() => {
      simulateRealTimeUpdates();
      
      // Refresh market data every 30 seconds
      if (Math.random() < 0.1) {
        fetchMarketData();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isRealTime, simulateRealTimeUpdates, fetchMarketData]);

  return null; // This is a data processing component, no UI
}