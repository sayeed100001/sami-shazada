'use client';

import { useEffect, useCallback, useState } from 'react';
import { fetchRealCandleData, fetchRealMarketAssets, CandleData, MarketAsset } from '@/lib/marketDataAPI';

interface RealTimeChartProps {
  selectedAsset: string;
  timeframe: string;
  onDataUpdate: (data: CandleData[]) => void;
  onAssetsUpdate: (assets: MarketAsset[]) => void;
  onConnectionStatusChange: (status: 'connected' | 'disconnected' | 'connecting') => void;
  isRealTime: boolean;
}

export function RealTimeChart({
  selectedAsset,
  timeframe,
  onDataUpdate,
  onAssetsUpdate,
  onConnectionStatusChange,
  isRealTime
}: RealTimeChartProps) {
  const [dataCache, setDataCache] = useState<{[key: string]: CandleData[]}>({});
  const [lastFetch, setLastFetch] = useState<{[key: string]: number}>({});

  // Fetch real candlestick data
  const fetchCandleData = useCallback(async (asset: string, tf: string) => {
    const cacheKey = `${asset}_${tf}`;
    const now = Date.now();
    
    // Check if we have recent data (less than 1 minute old)
    if (dataCache[cacheKey] && lastFetch[cacheKey] && (now - lastFetch[cacheKey]) < 60000) {
      return dataCache[cacheKey];
    }
    
    try {
      onConnectionStatusChange('connecting');
      
      // Fetch real OHLCV data
      const candleData = await fetchRealCandleData(asset, tf);
      
      // Cache the data
      setDataCache(prev => ({ ...prev, [cacheKey]: candleData }));
      setLastFetch(prev => ({ ...prev, [cacheKey]: now }));
      
      onConnectionStatusChange('connected');
      return candleData;
      
    } catch (error) {
      console.error('Failed to fetch candle data:', error);
      onConnectionStatusChange('disconnected');
      return dataCache[cacheKey] || [];
    }
  }, [dataCache, lastFetch, onConnectionStatusChange]);

  // Fetch market assets
  const fetchAssets = useCallback(async () => {
    try {
      const assets = await fetchRealMarketAssets();
      onAssetsUpdate(assets);
    } catch (error) {
      console.error('Failed to fetch assets:', error);
    }
  }, [onAssetsUpdate]);

  // Initialize data
  useEffect(() => {
    fetchAssets();
    
    fetchCandleData(selectedAsset, timeframe).then(data => {
      if (data.length > 0) {
        onDataUpdate(data);
      }
    });
  }, [selectedAsset, timeframe, fetchAssets, fetchCandleData, onDataUpdate]);

  // Real-time updates
  useEffect(() => {
    if (!isRealTime) return;
    
    const interval = setInterval(async () => {
      // Fetch fresh data every 30 seconds
      const freshData = await fetchCandleData(selectedAsset, timeframe);
      if (freshData.length > 0) {
        onDataUpdate(freshData);
      }
      
      // Refresh assets every 2 minutes
      if (Math.random() < 0.1) {
        fetchAssets();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [isRealTime, selectedAsset, timeframe, fetchCandleData, onDataUpdate, fetchAssets]);

  // Update data when asset or timeframe changes
  useEffect(() => {
    const updateData = async () => {
      const data = await fetchCandleData(selectedAsset, timeframe);
      if (data.length > 0) {
        onDataUpdate(data);
      }
    };
    
    updateData();
  }, [selectedAsset, timeframe, fetchCandleData, onDataUpdate]);

  return null;
}