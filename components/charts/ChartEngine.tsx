'use client';

import { useRef, useEffect, useCallback } from 'react';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap?: number;
}

interface TechnicalIndicator {
  id: string;
  name: string;
  type: 'overlay' | 'oscillator' | 'volume';
  color: string;
  enabled: boolean;
  parameters: { [key: string]: number };
  data?: { time: number; value: number | number[] }[];
}

interface DrawingObject {
  id: string;
  type: string;
  startTime: number;
  endTime: number;
  startPrice: number;
  endPrice: number;
  color: string;
  points: { x: number; y: number; time: number; price: number }[];
}

interface ChartEngineProps {
  candleData: CandleData[];
  chartType: string;
  indicators: TechnicalIndicator[];
  drawings: DrawingObject[];
  zoomLevel: number;
  panOffset: number;
  crosshair: { x: number; y: number; visible: boolean; price: number; time: number };
  onCrosshairUpdate: (crosshair: any) => void;
  onCanvasInteraction: (event: string, data: any) => void;
  theme: 'dark' | 'light';
  precision: number;
}

type SeriesPoint = { time: number; value: number }
type SeriesPointMulti = { time: number; value: number[] }
type IndicatorPoint = { time: number; value: number | number[] }

export function ChartEngine({
  candleData,
  chartType,
  indicators,
  drawings,
  zoomLevel,
  panOffset,
  crosshair,
  onCrosshairUpdate,
  onCanvasInteraction,
  theme,
  precision
}: ChartEngineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  // Professional color schemes
  const colors = {
    dark: {
      background: '#0f172a',
      grid: '#1e293b',
      text: '#e2e8f0',
      textSecondary: '#64748b',
      bullish: '#10b981',
      bearish: '#ef4444',
      volume: '#374151',
      crosshair: '#6b7280'
    },
    light: {
      background: '#ffffff',
      grid: '#f1f5f9',
      text: '#1e293b',
      textSecondary: '#64748b',
      bullish: '#059669',
      bearish: '#dc2626',
      volume: '#e5e7eb',
      crosshair: '#6b7280'
    }
  };

  const currentColors = colors[theme];

  // Technical Analysis Calculations
  const calculateSMA = useCallback((data: CandleData[], period: number) => {
    const result: SeriesPoint[] = [];
    for (let i = period - 1; i < data.length; i++) {
      const sum = data.slice(i - period + 1, i + 1).reduce((acc, candle) => acc + candle.close, 0);
      result.push({
        time: data[i].time,
        value: sum / period
      });
    }
    return result;
  }, []);

  const calculateEMA = useCallback((data: CandleData[], period: number) => {
    const result: SeriesPoint[] = [];
    const multiplier = 2 / (period + 1);
    let ema = data[0]?.close || 0;
    
    for (let i = 0; i < data.length; i++) {
      ema = (data[i].close - ema) * multiplier + ema;
      result.push({
        time: data[i].time,
        value: ema
      });
    }
    return result;
  }, []);

  const calculateBollingerBands = useCallback((data: CandleData[], period: number, deviation: number) => {
    const sma = calculateSMA(data, period);
    const result: SeriesPointMulti[] = [];
    
    for (let i = period - 1; i < data.length; i++) {
      const slice = data.slice(i - period + 1, i + 1);
      const mean = sma[i - period + 1].value;
      const variance = slice.reduce((acc, candle) => acc + Math.pow(candle.close - mean, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      result.push({
        time: data[i].time,
        value: [
          mean + (stdDev * deviation), // Upper band
          mean,                        // Middle band (SMA)
          mean - (stdDev * deviation)  // Lower band
        ]
      });
    }
    return result;
  }, [calculateSMA]);

  const calculateRSI = useCallback((data: CandleData[], period: number) => {
    const result: SeriesPoint[] = [];
    const gains: number[] = [];
    const losses: number[] = [];
    
    for (let i = 1; i < data.length; i++) {
      const change = data[i].close - data[i - 1].close;
      gains.push(change > 0 ? change : 0);
      losses.push(change < 0 ? Math.abs(change) : 0);
    }
    
    for (let i = period - 1; i < gains.length; i++) {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const rs = avgGain / (avgLoss || 1);
      const rsi = 100 - (100 / (1 + rs));
      
      result.push({
        time: data[i + 1].time,
        value: rsi
      });
    }
    return result;
  }, []);

  const calculateMACD = useCallback((data: CandleData[], fastPeriod: number, slowPeriod: number, signalPeriod: number) => {
    const fastEMA = calculateEMA(data, fastPeriod);
    const slowEMA = calculateEMA(data, slowPeriod);
    const macdLine: SeriesPoint[] = [];
    
    const startIndex = Math.max(fastEMA.length, slowEMA.length) - Math.min(fastEMA.length, slowEMA.length);
    
    for (let i = startIndex; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push({
        time: fastEMA[i].time,
        value: fastEMA[i].value - slowEMA[i].value
      });
    }
    
    const signalLine = calculateEMA(macdLine.map(m => ({ time: m.time, close: m.value, open: m.value, high: m.value, low: m.value, volume: 0 })), signalPeriod);
    
    const result: SeriesPointMulti[] = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      result.push({
        time: macdLine[i].time,
        value: [
          macdLine[i].value,                                    // MACD line
          signalLine[i].value,                                  // Signal line
          macdLine[i].value - signalLine[i].value               // Histogram
        ]
      });
    }
    return result;
  }, [calculateEMA]);

  const calculateVWAP = useCallback((data: CandleData[]) => {
    const result: SeriesPoint[] = [];
    let cumulativeTPV = 0; // Typical Price * Volume
    let cumulativeVolume = 0;
    
    for (let i = 0; i < data.length; i++) {
      const typicalPrice = (data[i].high + data[i].low + data[i].close) / 3;
      cumulativeTPV += typicalPrice * data[i].volume;
      cumulativeVolume += data[i].volume;
      
      result.push({
        time: data[i].time,
        value: cumulativeVolume > 0 ? cumulativeTPV / cumulativeVolume : typicalPrice
      });
    }
    return result;
  }, []);

  // Calculate all indicators
  const calculateIndicators = useCallback(() => {
    const updatedIndicators = indicators.map(indicator => {
      if (!indicator.enabled || candleData.length === 0) return indicator;
      
      let data: IndicatorPoint[] = [];
      switch (indicator.id) {
        case 'sma':
          data = calculateSMA(candleData, indicator.parameters.period);
          break;
        case 'ema':
          data = calculateEMA(candleData, indicator.parameters.period);
          break;
        case 'wma':
          // Weighted Moving Average calculation
          data = [];
          const period = indicator.parameters.period;
          for (let i = period - 1; i < candleData.length; i++) {
            let weightedSum = 0;
            let weightSum = 0;
            for (let j = 0; j < period; j++) {
              const weight = j + 1;
              weightedSum += candleData[i - j].close * weight;
              weightSum += weight;
            }
            data.push({
              time: candleData[i].time,
              value: weightedSum / weightSum
            });
          }
          break;
        case 'bollinger':
          data = calculateBollingerBands(candleData, indicator.parameters.period, indicator.parameters.deviation);
          break;
        case 'rsi':
          data = calculateRSI(candleData, indicator.parameters.period);
          break;
        case 'macd':
          data = calculateMACD(candleData, indicator.parameters.fast, indicator.parameters.slow, indicator.parameters.signal);
          break;
        case 'vwap':
          data = calculateVWAP(candleData);
          break;
        default:
          data = [];
      }
      
      return { ...indicator, data };
    });
    
    return updatedIndicators;
  }, [candleData, indicators, calculateSMA, calculateEMA, calculateBollingerBands, calculateRSI, calculateMACD, calculateVWAP]);

  // Professional chart rendering
  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size for high DPI displays
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    // Clear canvas
    ctx.fillStyle = currentColors.background;
    ctx.fillRect(0, 0, width, height);

    const padding = { top: 20, right: 80, bottom: 60, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const volumeHeight = indicators.find(i => i.id === 'volume' && i.enabled) ? 80 : 0;
    const oscillatorHeight = indicators.filter(i => i.type === 'oscillator' && i.enabled).length * 60;
    const chartHeight = height - padding.top - padding.bottom - volumeHeight - oscillatorHeight;

    // Calculate price range
    const visibleData = candleData.slice(Math.max(0, candleData.length - Math.floor(100 / zoomLevel) + panOffset));
    const prices = visibleData.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.1;

    // Helper functions
    const getX = (index: number) => padding.left + (index * chartWidth) / visibleData.length;
    const getY = (price: number) => padding.top + ((maxPrice + priceBuffer - price) / (priceRange + 2 * priceBuffer)) * chartHeight;
    const getCandleWidth = () => Math.max(1, (chartWidth / visibleData.length) * 0.8);

    // Draw grid
    ctx.strokeStyle = currentColors.grid;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }
    
    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = padding.left + (chartWidth * i) / 10;
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
    }

    // Draw price labels
    ctx.fillStyle = currentColors.textSecondary;
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 10; i++) {
      const price = (maxPrice + priceBuffer) - ((priceRange + 2 * priceBuffer) * i) / 10;
      const y = padding.top + (chartHeight * i) / 10;
      ctx.fillText(price.toFixed(precision), width - padding.right + 5, y + 4);
    }

    // Draw time labels
    ctx.textAlign = 'center';
    for (let i = 0; i < visibleData.length; i += Math.max(1, Math.floor(visibleData.length / 8))) {
      const x = getX(i);
      const time = new Date(visibleData[i].time);
      const timeStr = time.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });
      ctx.fillText(timeStr, x, height - padding.bottom + 20);
    }

    // Calculate and draw indicators first (overlays)
    const calculatedIndicators = calculateIndicators();
    
    calculatedIndicators.forEach(indicator => {
      if (!indicator.enabled || !indicator.data || indicator.type !== 'overlay') return;
      
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 2;
      
      if (indicator.id === 'bollinger') {
        // Draw Bollinger Bands
        indicator.data?.forEach((point, index) => {
          if (Array.isArray(point.value)) {
            const x = getX(index);
            const upperY = getY(point.value[0]);
            const middleY = getY(point.value[1]);
            const lowerY = getY(point.value[2]);
            
            // Upper band
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            if (index === 0) ctx.moveTo(x, upperY);
            else ctx.lineTo(x, upperY);
            if (index === (indicator.data?.length || 0) - 1) ctx.stroke();
            
            // Lower band
            ctx.beginPath();
            if (index === 0) ctx.moveTo(x, lowerY);
            else ctx.lineTo(x, lowerY);
            if (index === (indicator.data?.length || 0) - 1) ctx.stroke();
            
            // Fill between bands
            ctx.globalAlpha = 0.1;
            ctx.fillStyle = indicator.color;
            if (index > 0 && indicator.data) {
              const prevX = getX(index - 1);
              const prevUpper = getY((indicator.data[index - 1].value as number[])[0]);
              const prevLower = getY((indicator.data[index - 1].value as number[])[2]);
              
              ctx.beginPath();
              ctx.moveTo(prevX, prevUpper);
              ctx.lineTo(x, upperY);
              ctx.lineTo(x, lowerY);
              ctx.lineTo(prevX, prevLower);
              ctx.closePath();
              ctx.fill();
            }
            ctx.globalAlpha = 1;
          }
        });
      } else {
        // Draw simple line indicators
        ctx.beginPath();
        indicator.data?.forEach((point, index) => {
          const x = getX(index);
          const y = getY(typeof point.value === 'number' ? point.value : point.value[0]);
          if (index === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
    });

    // Draw candlesticks or other chart types
    visibleData.forEach((candle, index) => {
      const x = getX(index);
      const candleWidth = getCandleWidth();
      
      if (chartType === 'candlestick') {
        const openY = getY(candle.open);
        const closeY = getY(candle.close);
        const highY = getY(candle.high);
        const lowY = getY(candle.low);
        
        const isGreen = candle.close > candle.open;
        ctx.strokeStyle = isGreen ? currentColors.bullish : currentColors.bearish;
        ctx.fillStyle = isGreen ? currentColors.bullish : currentColors.bearish;
        
        // Draw wick
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();
        
        // Draw body
        const bodyHeight = Math.abs(closeY - openY);
        const bodyY = Math.min(openY, closeY);
        
        if (isGreen) {
          ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
        } else {
          ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
        }
        
      } else if (chartType === 'line') {
        ctx.strokeStyle = currentColors.bullish;
        ctx.lineWidth = 2;
        const y = getY(candle.close);
        
        if (index === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        if (index === visibleData.length - 1) {
          ctx.stroke();
        }
        
      } else if (chartType === 'area') {
        ctx.strokeStyle = currentColors.bullish;
        ctx.fillStyle = currentColors.bullish + '20';
        ctx.lineWidth = 2;
        const y = getY(candle.close);
        
        if (index === 0) {
          ctx.beginPath();
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
        
        if (index === visibleData.length - 1) {
          ctx.lineTo(x, padding.top + chartHeight);
          ctx.lineTo(padding.left, padding.top + chartHeight);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
      }
    });

    // Draw volume bars
    const volumeIndicator = calculatedIndicators.find(i => i.id === 'volume' && i.enabled);
    if (volumeIndicator && volumeHeight > 0) {
      const maxVolume = Math.max(...visibleData.map(d => d.volume));
      const volumeY = padding.top + chartHeight + 10;
      
      visibleData.forEach((candle, index) => {
        const x = getX(index);
        const candleWidth = getCandleWidth();
        const barHeight = (candle.volume / maxVolume) * (volumeHeight - 10);
        const y = volumeY + volumeHeight - 10 - barHeight;
        
        ctx.fillStyle = candle.close > candle.open ? currentColors.bullish + '60' : currentColors.bearish + '60';
        ctx.fillRect(x - candleWidth / 2, y, candleWidth, barHeight);
      });
    }

    // Draw crosshair
    if (crosshair.visible) {
      ctx.strokeStyle = currentColors.crosshair;
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      
      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.x, padding.top);
      ctx.lineTo(crosshair.x, height - padding.bottom);
      ctx.stroke();
      
      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(padding.left, crosshair.y);
      ctx.lineTo(width - padding.right, crosshair.y);
      ctx.stroke();
      
      ctx.setLineDash([]);
    }

  }, [candleData, chartType, indicators, drawings, zoomLevel, panOffset, crosshair, currentColors, precision, calculateIndicators]);

  // Mouse interaction handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Calculate price and time from mouse position
    const padding = { top: 20, right: 80, bottom: 60, left: 20 };
    const chartWidth = canvas.width - padding.left - padding.right;
    const volumeHeight = indicators.find(i => i.id === 'volume' && i.enabled) ? 80 : 0;
    const oscillatorHeight = indicators.filter(i => i.type === 'oscillator' && i.enabled).length * 60;
    const chartHeight = canvas.height - padding.top - padding.bottom - volumeHeight - oscillatorHeight;

    if (candleData.length > 0) {
      const visibleData = candleData.slice(Math.max(0, candleData.length - Math.floor(100 / zoomLevel) + panOffset));
      const prices = visibleData.flatMap(d => [d.high, d.low]);
      const maxPrice = Math.max(...prices);
      const minPrice = Math.min(...prices);
      const priceRange = maxPrice - minPrice;
      const priceBuffer = priceRange * 0.1;

      const price = (maxPrice + priceBuffer) - ((y - padding.top) / chartHeight) * (priceRange + 2 * priceBuffer);
      const timeIndex = Math.floor(((x - padding.left) / chartWidth) * visibleData.length);
      const time = visibleData[Math.max(0, Math.min(timeIndex, visibleData.length - 1))]?.time || 0;

      onCrosshairUpdate({ x, y, visible: true, price, time });
    }
  }, [candleData, indicators, zoomLevel, panOffset, onCrosshairUpdate]);

  const handleMouseLeave = useCallback(() => {
    onCrosshairUpdate({ x: 0, y: 0, visible: false, price: 0, time: 0 });
  }, [onCrosshairUpdate]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    onCanvasInteraction('click', { x, y });
  }, [onCanvasInteraction]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      drawChart();
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [drawChart]);

  // Canvas resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = container.clientHeight;
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full cursor-crosshair"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{ background: 'transparent' }}
    />
  );
}
