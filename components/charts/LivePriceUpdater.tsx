'use client';

import { useEffect, useCallback } from 'react';

interface LivePriceUpdaterProps {
  selectedAsset: string;
  candleData: any[];
  onDataUpdate: (data: any[]) => void;
  isRealTime: boolean;
}

export function LivePriceUpdater({
  selectedAsset,
  candleData,
  onDataUpdate,
  isRealTime
}: LivePriceUpdaterProps) {

  // Real-time price updates using WebSocket simulation
  const updateLivePrice = useCallback(async () => {
    if (!isRealTime || candleData.length === 0) return;
    
    try {
      let newPrice = candleData[candleData.length - 1].close;
      
      // Try to get real current price from API
      if (selectedAsset.includes('BTC')) {
        const res = await fetch('/api/crypto');
        const data = await res.json();
        const btc = data.find((c: any) => c.symbol === 'BTC');
        if (btc && Math.abs(btc.price - newPrice) / newPrice > 0.001) {
          newPrice = btc.price;
        }
      } else if (selectedAsset.includes('ETH')) {
        const res = await fetch('/api/crypto');
        const data = await res.json();
        const eth = data.find((c: any) => c.symbol === 'ETH');
        if (eth && Math.abs(eth.price - newPrice) / newPrice > 0.001) {
          newPrice = eth.price;
        }
      } else if (selectedAsset.includes('USD/AFN')) {
        const res = await fetch('/api/rates');
        const data = await res.json();
        const rate = data.find((r: any) => r.from === 'USD' && r.to === 'AFN');
        if (rate && Math.abs(rate.rate - newPrice) / newPrice > 0.001) {
          newPrice = rate.rate;
        }
      }
      
      // Update the last candle with new price
      const updatedData = [...candleData];
      const lastCandle = updatedData[updatedData.length - 1];
      
      // Small realistic price movement
      const volatility = selectedAsset.includes('BTC') ? 0.0005 : 
                        selectedAsset.includes('ETH') ? 0.0008 : 0.0002;
      const priceChange = (Math.random() - 0.5) * newPrice * volatility;
      
      lastCandle.close = Math.max(0.01, newPrice + priceChange);
      lastCandle.high = Math.max(lastCandle.high, lastCandle.close);
      lastCandle.low = Math.min(lastCandle.low, lastCandle.close);
      lastCandle.volume += Math.random() * 1000;
      
      onDataUpdate(updatedData);
      
    } catch (error) {
      console.error('Failed to update live price:', error);
    }
  }, [selectedAsset, candleData, onDataUpdate, isRealTime]);

  // Set up real-time updates
  useEffect(() => {
    if (!isRealTime) return;
    
    const interval = setInterval(updateLivePrice, 3000); // Update every 3 seconds
    
    return () => clearInterval(interval);
  }, [isRealTime, updateLivePrice]);

  return null;
}