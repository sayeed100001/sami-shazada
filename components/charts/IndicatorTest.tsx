'use client';

import { useEffect, useState } from 'react';
import { TechnicalIndicators } from '@/lib/technicalIndicators';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function IndicatorTest() {
  const [testResults, setTestResults] = useState<string[]>([]);

  useEffect(() => {
    // Generate test data
    const testData: CandleData[] = [];
    let price = 100;
    
    for (let i = 0; i < 50; i++) {
      const change = (Math.random() - 0.5) * 2;
      const open = price;
      const close = price + change;
      const high = Math.max(open, close) + Math.random();
      const low = Math.min(open, close) - Math.random();
      
      testData.push({
        time: Date.now() + i * 60000,
        open,
        high,
        low,
        close,
        volume: 1000 + Math.random() * 5000
      });
      
      price = close;
    }

    const results: string[] = [];

    try {
      // Test SMA
      const sma = TechnicalIndicators.sma(testData, 10);
      results.push(`SMA: ${sma.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${sma.length} points)`);

      // Test EMA
      const ema = TechnicalIndicators.ema(testData, 10);
      results.push(`EMA: ${ema.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${ema.length} points)`);

      // Test RSI
      const rsi = TechnicalIndicators.rsi(testData, 14);
      results.push(`RSI: ${rsi.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${rsi.length} points)`);

      // Test MACD
      const macd = TechnicalIndicators.macd(testData, 12, 26, 9);
      results.push(`MACD: ${macd.macdLine.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${macd.macdLine.length} points)`);

      // Test Bollinger Bands
      const bb = TechnicalIndicators.bollingerBands(testData, 20, 2);
      results.push(`Bollinger Bands: ${bb.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${bb.length} points)`);

      // Test VWAP
      const vwap = TechnicalIndicators.vwap(testData);
      results.push(`VWAP: ${vwap.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${vwap.length} points)`);

      // Test Stochastic
      const stoch = TechnicalIndicators.stochastic(testData, 14, 3);
      results.push(`Stochastic: ${stoch.k.length > 0 ? 'WORKING ✓' : 'FAILED ✗'} (${stoch.k.length} points)`);

    } catch (error) {
      results.push(`ERROR: ${error}`);
    }

    setTestResults(results);
  }, []);

  return (
    <div className="fixed top-4 right-4 bg-gray-800 p-4 rounded-lg border border-gray-600 z-50 max-w-xs">
      <h3 className="text-white font-bold mb-2">Indicator Test Results</h3>
      <div className="space-y-1 text-xs">
        {testResults.map((result, index) => (
          <div key={index} className={`${result.includes('WORKING') ? 'text-green-400' : result.includes('FAILED') ? 'text-red-400' : 'text-yellow-400'}`}>
            {result}
          </div>
        ))}
      </div>
    </div>
  );
}