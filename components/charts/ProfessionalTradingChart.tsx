'use client';

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { TechnicalIndicators } from '@/lib/technicalIndicators';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface Drawing {
  id: string;
  type: 'line' | 'rectangle' | 'horizontal' | 'vertical' | 'trendline' | 'fibonacci' | 'channel';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  startPrice: number;
  endPrice: number;
  startTime: number;
  endTime: number;
  color: string;
  style?: {
    lineWidth?: number;
    lineDash?: number[];
    opacity?: number;
  };
  fibLevels?: number[];
}

interface TechnicalIndicator {
  id: string;
  name: string;
  namePersian: string;
  type: 'overlay' | 'oscillator' | 'volume';
  color: string;
  enabled: boolean;
  parameters: { [key: string]: number };
  data?: { time: number; value: number | number[] }[];
}

interface ProfessionalTradingChartProps {
  candleData: CandleData[];
  selectedAsset: string;
  precision: number;
  zoomLevel: number;
  chartType: string;
  technicalIndicators?: TechnicalIndicator[];
  onZoomChange: (zoom: number) => void;
  showVolumeProfile?: boolean;
}

export function ProfessionalTradingChart({ 
  candleData, 
  selectedAsset, 
  precision, 
  zoomLevel,
  chartType,
  technicalIndicators = [],
  onZoomChange 
}: ProfessionalTradingChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<Drawing | null>(null);
  const [drawingMode, setDrawingMode] = useState<'none' | 'line' | 'rectangle' | 'horizontal' | 'vertical' | 'trendline' | 'fibonacci' | 'channel' | 'delete'>('none');
  const [viewStartIndex, setViewStartIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [selectedDrawing, setSelectedDrawing] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mousePosition, setMousePosition] = useState<{x: number, y: number} | null>(null);
  const [hoveredCandleIndex, setHoveredCandleIndex] = useState<number | null>(null);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`drawings_${selectedAsset}`);
      if (saved) {
        const parsedDrawings = JSON.parse(saved);
        setDrawings(Array.isArray(parsedDrawings) ? parsedDrawings : []);
      } else {
        setDrawings([]);
      }
    } catch (error) {
      setDrawings([]);
    }
  }, [selectedAsset]);

  useEffect(() => {
    try {
      if (drawings.length > 0) {
        localStorage.setItem(`drawings_${selectedAsset}`, JSON.stringify(drawings));
      } else {
        localStorage.removeItem(`drawings_${selectedAsset}`);
      }
    } catch (error) {
      console.warn('Failed to save drawings: Storage error');
    }
  }, [drawings, selectedAsset]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedDrawing) {
        setDrawings(prev => prev.filter(d => d.id !== selectedDrawing));
        setSelectedDrawing(null);
      }
      if (e.key === 'Escape') {
        setDrawingMode('none');
        setSelectedDrawing(null);
        setCurrentDrawing(null);
        setIsDrawing(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawing]);

  useEffect(() => {
    if (candleData.length > 0) {
      const candlesPerScreen = Math.floor(100 / zoomLevel);
      setViewStartIndex(Math.max(0, candleData.length - candlesPerScreen));
    }
  }, [candleData.length, zoomLevel]);

  const visibleData = useMemo(() => {
    if (candleData.length === 0) return { data: [], startIndex: 0, endIndex: 0 };
    
    const candlesPerScreen = Math.floor(100 / zoomLevel);
    const startIndex = Math.max(0, Math.min(candleData.length - candlesPerScreen, viewStartIndex));
    const endIndex = Math.min(candleData.length, startIndex + candlesPerScreen);
    
    return {
      data: candleData.slice(startIndex, endIndex),
      startIndex,
      endIndex
    };
  }, [candleData, zoomLevel, viewStartIndex]);

  const calculatedIndicators = useMemo(() => {
    if (candleData.length === 0) return {};
    
    // Clean and validate data before calculations
    const cleanData = TechnicalIndicators.cleanData(candleData);
    if (cleanData.length === 0) return {};
    
    const indicators: {[key: string]: any[]} = {};
    
    technicalIndicators.forEach(indicator => {
      if (!indicator.enabled) return;
      
      try {
        let result: any[] = [];
        switch (indicator.id) {
          case 'sma':
            result = TechnicalIndicators.sma(cleanData, indicator.parameters.period || 20);
            break;
          case 'ema':
            result = TechnicalIndicators.ema(cleanData, indicator.parameters.period || 20);
            break;
          case 'rsi':
            result = TechnicalIndicators.rsi(cleanData, indicator.parameters.period || 14);
            break;
          case 'macd':
            const macdResult = TechnicalIndicators.macd(
              cleanData, 
              indicator.parameters.fast || 12,
              indicator.parameters.slow || 26,
              indicator.parameters.signal || 9
            );
            // Convert MACD object to array format for consistency
            result = macdResult.macdLine.map((macd, i) => ({
              time: cleanData[i]?.time || Date.now(),
              value: [macd, macdResult.signalLine[i] || 0, macdResult.histogram[i] || 0]
            }));
            break;
          case 'bb':
            result = TechnicalIndicators.bollingerBands(cleanData, indicator.parameters.period || 20, indicator.parameters.stdDev || 2);
            break;
          case 'vwap':
            result = TechnicalIndicators.vwap(cleanData);
            break;
          case 'stoch':
            const stochResult = TechnicalIndicators.stochastic(cleanData, indicator.parameters.k || 14, indicator.parameters.d || 3);
            // Convert Stochastic object to array format for consistency
            result = stochResult.k.map((k, i) => ({
              time: cleanData[i]?.time || Date.now(),
              value: [k, stochResult.d[i] || 0]
            }));
            break;
        }
        
        if (result && result.length > 0) {
          indicators[indicator.id] = result;
        }
      } catch (error) {
        console.error(`Indicator calculation failed for ${indicator.id}`);
      }
    });
    
    return indicators;
  }, [candleData, technicalIndicators]);

  const getCoordinates = useCallback((mouseX: number, mouseY: number) => {
    const canvas = canvasRef.current;
    if (!canvas || visibleData.data.length === 0) return null;

    const { width, height } = canvas;
    const padding = { 
      top: isMobile ? 5 : 8, 
      right: Math.max(90, Math.min(180, width * 0.22)), 
      bottom: isMobile ? 80 : 100, 
      left: isMobile ? 10 : 15 
    };
    
    const oscillatorCount = technicalIndicators.filter(ind => ind.enabled && ind.type === 'oscillator').length;
    const oscillatorHeight = oscillatorCount > 0 ? Math.min(120, height * 0.25) : 0;
    const volumeHeight = isMobile ? 60 : 80;
    const chartHeight = height - padding.top - padding.bottom - volumeHeight - oscillatorHeight;
    const chartWidth = width - padding.left - padding.right;

    const prices = visibleData.data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.1;

    const relativeX = mouseX - padding.left;
    const relativeY = mouseY - padding.top;
    
    const candleIndex = Math.floor((relativeX / chartWidth) * visibleData.data.length);
    const price = (maxPrice + priceBuffer) - ((relativeY / chartHeight) * (priceRange + 2 * priceBuffer));
    
    if (candleIndex >= 0 && candleIndex < visibleData.data.length) {
      return {
        price,
        time: visibleData.data[candleIndex].time,
        x: mouseX,
        y: mouseY
      };
    }
    
    return null;
  }, [visibleData, isMobile, technicalIndicators]);

  const drawChart = useCallback(() => {
    if (!canvasRef.current || candleData.length === 0 || visibleData.data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    const padding = { 
      top: isMobile ? 5 : 8, 
      right: Math.max(90, Math.min(180, width * 0.22)), 
      bottom: isMobile ? 80 : 100, 
      left: isMobile ? 10 : 15 
    };
    
    const oscillatorCount = technicalIndicators.filter(ind => ind.enabled && ind.type === 'oscillator').length;
    const oscillatorHeight = oscillatorCount > 0 ? Math.min(120, height * 0.25) : 0;
    const volumeHeight = isMobile ? 50 : 70;
    const chartHeight = height - padding.top - padding.bottom - volumeHeight - oscillatorHeight;
    const chartWidth = width - padding.left - padding.right;

    const prices = visibleData.data.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.1;

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    
    for (let i = 0; i <= 10; i++) {
      const y = padding.top + (chartHeight * i) / 10;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
    }

    // TradingView-style right price scale with enhanced labels
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(width - padding.right, 0, padding.right, height);
    
    // Price scale border
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(width - padding.right, 0);
    ctx.lineTo(width - padding.right, height);
    ctx.stroke();
    
    // Enhanced price levels with better spacing
    ctx.font = `${isMobile ? '9' : '10'}px 'Segoe UI', Arial, sans-serif`;
    ctx.textAlign = 'right';
    
    const priceSteps = Math.max(8, Math.min(20, Math.floor(chartHeight / 30)));
    const stepHeight = chartHeight / priceSteps;
    
    for (let i = 0; i <= priceSteps; i++) {
      const price = (maxPrice + priceBuffer) - ((priceRange + 2 * priceBuffer) * i) / priceSteps;
      const y = padding.top + (chartHeight * i) / priceSteps;
      
      // Enhanced horizontal grid lines
      ctx.strokeStyle = i % 5 === 0 ? '#3a3a3a' : '#2a2a2a';
      ctx.lineWidth = i % 5 === 0 ? 1.5 : 1;
      ctx.beginPath();
      ctx.moveTo(width - padding.right, y);
      ctx.lineTo(width, y);
      ctx.stroke();
      
      // Always show price labels with better readability
      const priceText = price.toFixed(precision);
      const textWidth = ctx.measureText(priceText).width;
      const labelHeight = isMobile ? 14 : 16;
      
      ctx.fillStyle = 'rgba(26, 26, 26, 0.95)';
      ctx.fillRect(width - padding.right + 1, y - labelHeight/2, padding.right - 2, labelHeight);
      
      ctx.fillStyle = i % 3 === 0 ? '#fff' : '#bbb';
      ctx.fillText(priceText, width - 4, y + 3);
      
      ctx.strokeStyle = '#555';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width - padding.right, y);
      ctx.lineTo(width - padding.right + 4, y);
      ctx.stroke();
    }
    
    // Add candle price labels on hover/selection
    if (mousePosition && visibleData.data.length > 0) {
      const { x: mouseX, y: mouseY } = mousePosition;
      
      if (mouseX >= padding.left && mouseX <= width - padding.right && 
          mouseY >= padding.top && mouseY <= padding.top + chartHeight) {
        
        // Find the closest candle
        const relativeX = mouseX - padding.left;
        const candleIndex = Math.floor((relativeX / chartWidth) * visibleData.data.length);
        
        if (candleIndex >= 0 && candleIndex < visibleData.data.length) {
          const candle = visibleData.data[candleIndex];
          const candleX = padding.left + (candleIndex + 0.5) * chartWidth / visibleData.data.length;
          
          // Draw OHLC labels for hovered candle
          const ohlcLabels = [
            { label: 'O', value: candle.open, color: '#888' },
            { label: 'H', value: candle.high, color: '#10b981' },
            { label: 'L', value: candle.low, color: '#ef4444' },
            { label: 'C', value: candle.close, color: candle.close >= candle.open ? '#10b981' : '#ef4444' }
          ];
          
          ohlcLabels.forEach((item, index) => {
            const labelY = padding.top + ((maxPrice + priceBuffer - item.value) / (priceRange + 2 * priceBuffer)) * chartHeight;
            

            
            // Price label with enhanced styling
            const labelText = `${item.label}: ${item.value.toFixed(precision)}`;
            const labelWidth = ctx.measureText(labelText).width;
            
            ctx.fillStyle = item.color;
            ctx.fillRect(width - padding.right + 2, labelY - 8, labelWidth + 12, 16);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${isMobile ? '9' : '10'}px 'Segoe UI', Arial, sans-serif`;
            ctx.fillText(labelText, width - padding.right + 6, labelY + 3);
          });
        }
      }
    }
    
    // Current price indicator (without lines)
    if (visibleData.data.length > 0) {
      const currentPrice = visibleData.data[visibleData.data.length - 1].close;
      const currentY = padding.top + ((maxPrice + priceBuffer - currentPrice) / (priceRange + 2 * priceBuffer)) * chartHeight;
      
      // Simple current price indicator
      const currentPriceText = currentPrice.toFixed(precision);
      ctx.font = `bold ${isMobile ? '11' : '12'}px 'Segoe UI', Arial, sans-serif`;
      
      // Neutral color for current price
      ctx.fillStyle = '#3b82f6';
      ctx.fillRect(width - padding.right, currentY - 10, padding.right, 20);
      
      // Simple triangle pointer
      ctx.beginPath();
      ctx.moveTo(width - padding.right, currentY - 8);
      ctx.lineTo(width - padding.right - 8, currentY);
      ctx.lineTo(width - padding.right, currentY + 8);
      ctx.closePath();
      ctx.fill();
      
      // Current price text
      ctx.fillStyle = '#ffffff';
      ctx.textAlign = 'right';
      ctx.fillText(currentPriceText, width - 8, currentY + 4);
    }
    
    // Enhanced crosshair with professional styling
    if (mousePosition && drawingMode === 'none') {
      const { x: mouseX, y: mouseY } = mousePosition;
      
      if (mouseX >= padding.left && mouseX <= width - padding.right && 
          mouseY >= padding.top && mouseY <= padding.top + chartHeight) {
        
        // Enhanced crosshair lines
        ctx.strokeStyle = '#64748b';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 2]);
        
        // Vertical crosshair
        ctx.beginPath();
        ctx.moveTo(mouseX, padding.top);
        ctx.lineTo(mouseX, padding.top + chartHeight);
        ctx.stroke();
        
        // Horizontal crosshair
        ctx.beginPath();
        ctx.moveTo(padding.left, mouseY);
        ctx.lineTo(width - padding.right, mouseY);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        const mousePrice = (maxPrice + priceBuffer) - ((mouseY - padding.top) / chartHeight) * (priceRange + 2 * priceBuffer);
        
        if (mousePrice >= minPrice && mousePrice <= maxPrice) {
          // Enhanced TradingView-style mouse price indicator
          const mousePriceText = mousePrice.toFixed(precision);
          ctx.font = `bold ${isMobile ? '10' : '11'}px 'Segoe UI', Arial, sans-serif`;
          
          // Enhanced mouse price background with border
          ctx.fillStyle = '#4a4a4a';
          ctx.fillRect(width - padding.right, mouseY - 10, padding.right, 20);
          
          // Border for better definition
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 1;
          ctx.strokeRect(width - padding.right, mouseY - 10, padding.right, 20);
          
          // Enhanced left triangle pointer
          ctx.fillStyle = '#4a4a4a';
          ctx.beginPath();
          ctx.moveTo(width - padding.right, mouseY - 8);
          ctx.lineTo(width - padding.right - 8, mouseY);
          ctx.lineTo(width - padding.right, mouseY + 8);
          ctx.closePath();
          ctx.fill();
          
          // Triangle border
          ctx.strokeStyle = '#666';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Enhanced mouse price text with shadow
          ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
          ctx.textAlign = 'right';
          ctx.fillText(mousePriceText, width - 7, mouseY + 4);
          
          ctx.fillStyle = '#ffffff';
          ctx.fillText(mousePriceText, width - 8, mouseY + 3);
          
          // Add time label at bottom
          const relativeX = mouseX - padding.left;
          const candleIndex = Math.floor((relativeX / chartWidth) * visibleData.data.length);
          
          if (candleIndex >= 0 && candleIndex < visibleData.data.length) {
            const candle = visibleData.data[candleIndex];
            const timeText = new Date(candle.time).toLocaleTimeString('fa-IR', { 
              hour: '2-digit', 
              minute: '2-digit' 
            });
            
            const timeTextWidth = ctx.measureText(timeText).width;
            const timeX = Math.max(padding.left, Math.min(width - padding.right - timeTextWidth - 8, mouseX - timeTextWidth / 2));
            const timeY = height - padding.bottom + 15;
            
            // Time label background
            ctx.fillStyle = '#4a4a4a';
            ctx.fillRect(timeX - 4, timeY - 12, timeTextWidth + 8, 20);
            
            // Time label border
            ctx.strokeStyle = '#666';
            ctx.lineWidth = 1;
            ctx.strokeRect(timeX - 4, timeY - 12, timeTextWidth + 8, 20);
            
            // Time text
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.fillText(timeText, timeX, timeY + 2);
          }
        }
      }
    }

    const candleWidth = Math.max(2, chartWidth / visibleData.data.length * 0.8);
    const timeToIndexMap = new Map(candleData.map((c, i) => [c.time, i]));

    // Enhanced chart rendering with multiple chart types
    visibleData.data.forEach((candle, index) => {
      const x = padding.left + (index + 0.5) * chartWidth / visibleData.data.length;
      const openY = padding.top + ((maxPrice + priceBuffer - candle.open) / (priceRange + 2 * priceBuffer)) * chartHeight;
      const closeY = padding.top + ((maxPrice + priceBuffer - candle.close) / (priceRange + 2 * priceBuffer)) * chartHeight;
      const highY = padding.top + ((maxPrice + priceBuffer - candle.high) / (priceRange + 2 * priceBuffer)) * chartHeight;
      const lowY = padding.top + ((maxPrice + priceBuffer - candle.low) / (priceRange + 2 * priceBuffer)) * chartHeight;
      
      const isGreen = candle.close > candle.open;
      const candleColor = isGreen ? '#10b981' : '#ef4444';
      
      // Render based on chart type
      switch (chartType) {
        case 'candlestick':
          ctx.strokeStyle = candleColor;
          ctx.fillStyle = candleColor;
          
          ctx.lineWidth = Math.max(1, candleWidth * 0.1);
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();
          
          const bodyHeight = Math.abs(closeY - openY);
          const bodyY = Math.min(openY, closeY);
          
          ctx.lineWidth = 1;
          if (isGreen) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
            ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
            ctx.strokeStyle = candleColor;
            ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
          } else {
            ctx.fillStyle = candleColor;
            ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, Math.max(1, bodyHeight));
          }
          break;
          
        case 'ohlc':
          ctx.strokeStyle = candleColor;
          ctx.lineWidth = Math.max(1, candleWidth * 0.15);
          
          ctx.beginPath();
          ctx.moveTo(x, highY);
          ctx.lineTo(x, lowY);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x - candleWidth / 3, openY);
          ctx.lineTo(x, openY);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(x, closeY);
          ctx.lineTo(x + candleWidth / 3, closeY);
          ctx.stroke();
          break;
          
        case 'line':
          if (index > 0) {
            const prevX = padding.left + (index - 0.5) * chartWidth / visibleData.data.length;
            const prevCloseY = padding.top + ((maxPrice + priceBuffer - visibleData.data[index - 1].close) / (priceRange + 2 * priceBuffer)) * chartHeight;
            
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(prevX, prevCloseY);
            ctx.lineTo(x, closeY);
            ctx.stroke();
            
            if (zoomLevel > 3) {
              ctx.fillStyle = '#3b82f6';
              ctx.beginPath();
              ctx.arc(x, closeY, 2, 0, 2 * Math.PI);
              ctx.fill();
            }
          }
          break;
          
        case 'area':
          if (index > 0) {
            const prevX = padding.left + (index - 0.5) * chartWidth / visibleData.data.length;
            const prevCloseY = padding.top + ((maxPrice + priceBuffer - visibleData.data[index - 1].close) / (priceRange + 2 * priceBuffer)) * chartHeight;
            const bottomY = padding.top + chartHeight;
            
            const gradient = ctx.createLinearGradient(0, padding.top, 0, bottomY);
            gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
            gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(prevX, prevCloseY);
            ctx.lineTo(x, closeY);
            ctx.lineTo(x, bottomY);
            ctx.lineTo(prevX, bottomY);
            ctx.closePath();
            ctx.fill();
            
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(prevX, prevCloseY);
            ctx.lineTo(x, closeY);
            ctx.stroke();
          }
          break;
          
        case 'heikin-ashi':
          let haOpen, haClose, haHigh, haLow;
          
          if (index === 0) {
            haOpen = (candle.open + candle.close) / 2;
            haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
            haHigh = candle.high;
            haLow = candle.low;
          } else {
            const prevCandle = visibleData.data[index - 1];
            haOpen = (prevCandle.open + prevCandle.close) / 2;
            haClose = (candle.open + candle.high + candle.low + candle.close) / 4;
            haHigh = Math.max(candle.high, haOpen, haClose);
            haLow = Math.min(candle.low, haOpen, haClose);
          }
          
          const haOpenY = padding.top + ((maxPrice + priceBuffer - haOpen) / (priceRange + 2 * priceBuffer)) * chartHeight;
          const haCloseY = padding.top + ((maxPrice + priceBuffer - haClose) / (priceRange + 2 * priceBuffer)) * chartHeight;
          const haHighY = padding.top + ((maxPrice + priceBuffer - haHigh) / (priceRange + 2 * priceBuffer)) * chartHeight;
          const haLowY = padding.top + ((maxPrice + priceBuffer - haLow) / (priceRange + 2 * priceBuffer)) * chartHeight;
          
          const haIsGreen = haClose > haOpen;
          const haColor = haIsGreen ? '#10b981' : '#ef4444';
          
          ctx.strokeStyle = haColor;
          ctx.fillStyle = haColor;
          
          ctx.lineWidth = Math.max(1, candleWidth * 0.1);
          ctx.beginPath();
          ctx.moveTo(x, haHighY);
          ctx.lineTo(x, haLowY);
          ctx.stroke();
          
          const haBodyHeight = Math.abs(haCloseY - haOpenY);
          const haBodyY = Math.min(haOpenY, haCloseY);
          
          ctx.lineWidth = 1;
          if (haIsGreen) {
            ctx.fillStyle = 'rgba(16, 185, 129, 0.1)';
            ctx.fillRect(x - candleWidth / 2, haBodyY, candleWidth, Math.max(1, haBodyHeight));
            ctx.strokeStyle = haColor;
            ctx.strokeRect(x - candleWidth / 2, haBodyY, candleWidth, Math.max(1, haBodyHeight));
          } else {
            ctx.fillStyle = haColor;
            ctx.fillRect(x - candleWidth / 2, haBodyY, candleWidth, Math.max(1, haBodyHeight));
          }
          break;
          
        case 'renko':
          const brickSize = priceRange * 0.01;
          const renkoPrice = Math.round(candle.close / brickSize) * brickSize;
          const renkoY = padding.top + ((maxPrice + priceBuffer - renkoPrice) / (priceRange + 2 * priceBuffer)) * chartHeight;
          const brickHeight = (brickSize / (priceRange + 2 * priceBuffer)) * chartHeight;
          
          const renkoIsGreen = index === 0 || candle.close >= visibleData.data[index - 1].close;
          const renkoColor = renkoIsGreen ? '#10b981' : '#ef4444';
          
          ctx.fillStyle = renkoColor;
          ctx.strokeStyle = renkoColor;
          ctx.lineWidth = 1;
          
          ctx.fillRect(x - candleWidth / 2, renkoY - brickHeight / 2, candleWidth, brickHeight);
          ctx.strokeRect(x - candleWidth / 2, renkoY - brickHeight / 2, candleWidth, brickHeight);
          break;
      }
    });

    // Enhanced technical indicators overlay rendering
    technicalIndicators.forEach(indicator => {
      if (!indicator.enabled || !calculatedIndicators[indicator.id]) return;
      
      const indicatorData = calculatedIndicators[indicator.id];
      if (!indicatorData || indicatorData.length === 0) return;
      
      ctx.strokeStyle = indicator.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.8;
      
      if (indicator.type === 'overlay') {
        // Overlay indicators (SMA, EMA, Bollinger Bands, VWAP)
        switch (indicator.id) {
          case 'sma':
          case 'ema':
          case 'vwap':
            // Single line indicators
            ctx.beginPath();
            let firstPoint = true;
            
            indicatorData.forEach((point: any) => {
              const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
              if (dataIndex >= 0) {
                const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                const y = padding.top + ((maxPrice + priceBuffer - (point.value as number)) / (priceRange + 2 * priceBuffer)) * chartHeight;
                
                if (firstPoint) {
                  ctx.moveTo(x, y);
                  firstPoint = false;
                } else {
                  ctx.lineTo(x, y);
                }
              }
            });
            
            ctx.stroke();
            
            // Add indicator label
            if (indicatorData.length > 0) {
              const lastPoint = indicatorData[indicatorData.length - 1];
              const lastValue = lastPoint.value as number;
              
              ctx.fillStyle = indicator.color;
              ctx.font = 'bold 10px Arial';
              ctx.textAlign = 'left';
              ctx.fillText(
                `${indicator.name}: ${lastValue.toFixed(precision)}`,
                padding.left + 5,
                padding.top + 15 + (Object.keys(calculatedIndicators).indexOf(indicator.id) * 15)
              );
            }
            break;
            
          case 'bb':
            // Bollinger Bands (upper, middle, lower)
            const bbColors = [indicator.color, indicator.color + '80', indicator.color];
            
            for (let bandIndex = 0; bandIndex < 3; bandIndex++) {
              ctx.strokeStyle = bbColors[bandIndex];
              ctx.lineWidth = bandIndex === 1 ? 1 : 2;
              ctx.setLineDash(bandIndex === 1 ? [3, 3] : []);
              
              ctx.beginPath();
              let firstPoint = true;
              
              indicatorData.forEach((point: any) => {
                const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
                if (dataIndex >= 0 && Array.isArray(point.value)) {
                  const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                  const y = padding.top + ((maxPrice + priceBuffer - point.value[bandIndex]) / (priceRange + 2 * priceBuffer)) * chartHeight;
                  
                  if (firstPoint) {
                    ctx.moveTo(x, y);
                    firstPoint = false;
                  } else {
                    ctx.lineTo(x, y);
                  }
                }
              });
              
              ctx.stroke();
              ctx.setLineDash([]);
            }
            
            // Fill area between bands
            if (indicatorData.length > 1) {
              ctx.fillStyle = indicator.color + '10';
              ctx.beginPath();
              
              // Upper band
              indicatorData.forEach((point: any, index: number) => {
                const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
                if (dataIndex >= 0 && Array.isArray(point.value)) {
                  const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                  const y = padding.top + ((maxPrice + priceBuffer - point.value[0]) / (priceRange + 2 * priceBuffer)) * chartHeight;
                  
                  if (index === 0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
              });
              
              // Lower band (reverse order)
              for (let i = indicatorData.length - 1; i >= 0; i--) {
                const point = indicatorData[i];
                const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
                if (dataIndex >= 0 && Array.isArray(point.value)) {
                  const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                  const y = padding.top + ((maxPrice + priceBuffer - point.value[2]) / (priceRange + 2 * priceBuffer)) * chartHeight;
                  ctx.lineTo(x, y);
                }
              }
              
              ctx.closePath();
              ctx.fill();
            }
            break;
        }
      }
      
      ctx.globalAlpha = 1;
    });
    
    // Enhanced volume rendering
    const volumeY = padding.top + chartHeight + 20;
    const maxVolume = Math.max(...visibleData.data.map(d => d.volume));
    
    if (maxVolume > 0) {
      // Volume background
      ctx.fillStyle = 'rgba(30, 41, 59, 0.3)';
      ctx.fillRect(padding.left, volumeY, chartWidth, volumeHeight);
      
      // Volume bars with enhanced styling
      visibleData.data.forEach((candle, index) => {
        const x = padding.left + (index + 0.5) * chartWidth / visibleData.data.length;
        const barHeight = (candle.volume / maxVolume) * volumeHeight;
        const y = volumeY + volumeHeight - barHeight;
        
        const isGreen = candle.close > candle.open;
        const volumeColor = isGreen ? '#10b981' : '#ef4444';
        
        // Volume bar with gradient
        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
        gradient.addColorStop(0, volumeColor + '60');
        gradient.addColorStop(1, volumeColor + '20');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(x - candleWidth / 2, y, candleWidth, barHeight);
        
        // Volume bar border for better definition
        if (zoomLevel > 3) {
          ctx.strokeStyle = volumeColor + '80';
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x - candleWidth / 2, y, candleWidth, barHeight);
        }
      });
      
      // Volume scale labels
      ctx.font = `${isMobile ? '9' : '10'}px 'Segoe UI', Arial, sans-serif`;
      ctx.fillStyle = '#888';
      ctx.textAlign = 'left';
      
      const volumeSteps = 3;
      for (let i = 0; i <= volumeSteps; i++) {
        const volumeValue = (maxVolume * i) / volumeSteps;
        const labelY = volumeY + volumeHeight - (volumeHeight * i) / volumeSteps;
        
        if (volumeValue > 0) {
          const volumeText = volumeValue > 1000000 ? 
            (volumeValue / 1000000).toFixed(1) + 'M' : 
            volumeValue > 1000 ? 
            (volumeValue / 1000).toFixed(1) + 'K' : 
            volumeValue.toFixed(0);
          
          ctx.fillText(volumeText, padding.left + 4, labelY + 3);
        }
      }
    }
    
    // Oscillator indicators rendering (RSI, MACD, Stochastic)
    const oscillatorIndicators = technicalIndicators.filter(ind => ind.enabled && ind.type === 'oscillator');
    if (oscillatorIndicators.length > 0) {
      const oscillatorY = padding.top + chartHeight + volumeHeight + 40;
      const oscillatorHeight = Math.min(120, height * 0.25);
      
      oscillatorIndicators.forEach((indicator, oscIndex) => {
        const indicatorData = calculatedIndicators[indicator.id];
        if (!indicatorData || indicatorData.length === 0) return;
        
        const oscY = oscillatorY + (oscIndex * (oscillatorHeight + 10));
        
        // Oscillator background
        ctx.fillStyle = 'rgba(30, 41, 59, 0.2)';
        ctx.fillRect(padding.left, oscY, chartWidth, oscillatorHeight);
        
        // Oscillator border
        ctx.strokeStyle = '#374151';
        ctx.lineWidth = 1;
        ctx.strokeRect(padding.left, oscY, chartWidth, oscillatorHeight);
        
        switch (indicator.id) {
          case 'rsi':
            // RSI with overbought/oversold levels
            const rsiMax = 100;
            const rsiMin = 0;
            
            // Overbought/Oversold lines
            [70, 30].forEach(level => {
              const levelY = oscY + ((rsiMax - level) / (rsiMax - rsiMin)) * oscillatorHeight;
              ctx.strokeStyle = level === 70 ? '#ef4444' : '#10b981';
              ctx.lineWidth = 1;
              ctx.setLineDash([2, 2]);
              ctx.beginPath();
              ctx.moveTo(padding.left, levelY);
              ctx.lineTo(padding.left + chartWidth, levelY);
              ctx.stroke();
              ctx.setLineDash([]);
              
              // Level labels
              ctx.fillStyle = level === 70 ? '#ef4444' : '#10b981';
              ctx.font = '9px Arial';
              ctx.textAlign = 'left';
              ctx.fillText(level.toString(), padding.left + 2, levelY - 2);
            });
            
            // RSI line
            ctx.strokeStyle = indicator.color;
            ctx.lineWidth = 2;
            ctx.beginPath();
            let firstRSI = true;
            
            indicatorData.forEach((point: any) => {
              const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
              if (dataIndex >= 0) {
                const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                const y = oscY + ((rsiMax - (point.value as number)) / (rsiMax - rsiMin)) * oscillatorHeight;
                
                if (firstRSI) {
                  ctx.moveTo(x, y);
                  firstRSI = false;
                } else {
                  ctx.lineTo(x, y);
                }
              }
            });
            
            ctx.stroke();
            break;
            
          case 'macd':
            // MACD with histogram
            indicatorData.forEach((point: any) => {
              const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
              if (dataIndex >= 0 && Array.isArray(point.value)) {
                const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                const [macd, signal, histogram] = point.value;
                
                // Histogram bars
                const histogramHeight = Math.abs(histogram) * 2;
                const histogramY = oscY + oscillatorHeight / 2;
                
                ctx.fillStyle = histogram >= 0 ? '#10b981' : '#ef4444';
                if (histogram >= 0) {
                  ctx.fillRect(x - candleWidth / 4, histogramY - histogramHeight, candleWidth / 2, histogramHeight);
                } else {
                  ctx.fillRect(x - candleWidth / 4, histogramY, candleWidth / 2, histogramHeight);
                }
              }
            });
            
            // MACD and Signal lines
            ['#3b82f6', '#f59e0b'].forEach((color, lineIndex) => {
              ctx.strokeStyle = color;
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              let firstMACD = true;
              
              indicatorData.forEach((point: any) => {
                const dataIndex = visibleData.data.findIndex(d => d.time === point.time);
                if (dataIndex >= 0 && Array.isArray(point.value)) {
                  const x = padding.left + (dataIndex + 0.5) * chartWidth / visibleData.data.length;
                  const value = point.value[lineIndex]; // MACD or Signal
                  const y = oscY + oscillatorHeight / 2 - (value * 2);
                  
                  if (firstMACD) {
                    ctx.moveTo(x, y);
                    firstMACD = false;
                  } else {
                    ctx.lineTo(x, y);
                  }
                }
              });
              
              ctx.stroke();
            });
            break;
        }
        
        // Oscillator label
        ctx.fillStyle = indicator.color;
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(indicator.name, padding.left + 5, oscY + 15);
      });
    }

    // Enhanced drawings rendering with professional tools
    drawings.forEach(drawing => {
      const isSelected = selectedDrawing === drawing.id;
      const baseColor = isSelected ? '#ffff00' : drawing.color;
      const lineWidth = drawing.style?.lineWidth || (isSelected ? 3 : 2);
      const lineDash = drawing.style?.lineDash || [];
      const opacity = drawing.style?.opacity || 1;
      
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = lineWidth;
      ctx.globalAlpha = opacity;
      ctx.setLineDash(lineDash);
      
      const startDataIndex = timeToIndexMap.get(drawing.startTime);
      const endDataIndex = timeToIndexMap.get(drawing.endTime);
      
      if (startDataIndex !== undefined) {
        const relativeStartIndex = startDataIndex - visibleData.startIndex;
        const relativeEndIndex = endDataIndex !== undefined ? endDataIndex - visibleData.startIndex : relativeStartIndex;
        
        const startX = padding.left + (relativeStartIndex + 0.5) * chartWidth / visibleData.data.length;
        const endX = padding.left + (relativeEndIndex + 0.5) * chartWidth / visibleData.data.length;
        const startY = padding.top + ((maxPrice + priceBuffer - drawing.startPrice) / (priceRange + 2 * priceBuffer)) * chartHeight;
        const endY = padding.top + ((maxPrice + priceBuffer - drawing.endPrice) / (priceRange + 2 * priceBuffer)) * chartHeight;
        
        ctx.beginPath();
        switch (drawing.type) {
          case 'line':
          case 'trendline':
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Add price labels for trendlines
            if (drawing.type === 'trendline' && zoomLevel > 3) {
              ctx.font = '10px Arial';
              ctx.fillStyle = baseColor;
              ctx.textAlign = 'center';
              
              const midX = (startX + endX) / 2;
              const midY = (startY + endY) / 2;
              const angle = Math.atan2(endY - startY, endX - startX);
              const slope = (drawing.endPrice - drawing.startPrice) / (drawing.endTime - drawing.startTime);
              
              ctx.save();
              ctx.translate(midX, midY - 15);
              ctx.rotate(angle);
              ctx.fillText(`Slope: ${(slope * 86400000).toFixed(4)}`, 0, 0);
              ctx.restore();
            }
            break;
            
          case 'horizontal':
            ctx.moveTo(padding.left, startY);
            ctx.lineTo(padding.left + chartWidth, startY);
            ctx.stroke();
            
            // Price label for horizontal line
            ctx.fillStyle = baseColor;
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(drawing.startPrice.toFixed(precision), padding.left + 5, startY - 5);
            break;
            
          case 'vertical':
            ctx.moveTo(startX, padding.top);
            ctx.lineTo(startX, padding.top + chartHeight);
            ctx.stroke();
            
            // Time label for vertical line
            ctx.fillStyle = baseColor;
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            const timeLabel = new Date(drawing.startTime).toLocaleString('fa-IR', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            ctx.fillText(timeLabel, startX, padding.top + 15);
            break;
            
          case 'rectangle':
            const rectX = Math.min(startX, endX);
            const rectY = Math.min(startY, endY);
            const rectWidth = Math.abs(endX - startX);
            const rectHeight = Math.abs(endY - startY);
            
            ctx.strokeRect(rectX, rectY, rectWidth, rectHeight);
            
            // Fill with transparent color
            ctx.fillStyle = baseColor + '20';
            ctx.fillRect(rectX, rectY, rectWidth, rectHeight);
            break;
            
          case 'fibonacci':
            // Fibonacci retracement levels
            const fibLevels = drawing.fibLevels || [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
            const priceRange = Math.abs(drawing.endPrice - drawing.startPrice);
            const isUptrend = drawing.endPrice > drawing.startPrice;
            
            fibLevels.forEach((level, index) => {
              const fibPrice = isUptrend 
                ? drawing.startPrice + (priceRange * level)
                : drawing.startPrice - (priceRange * level);
              
              const fibY = padding.top + ((maxPrice + priceBuffer - fibPrice) / (priceRange + 2 * priceBuffer)) * chartHeight;
              
              // Fibonacci level line
              ctx.strokeStyle = baseColor;
              ctx.lineWidth = level === 0 || level === 1 ? 2 : 1;
              ctx.setLineDash(level === 0.5 ? [5, 5] : []);
              
              ctx.beginPath();
              ctx.moveTo(Math.min(startX, endX), fibY);
              ctx.lineTo(Math.max(startX, endX), fibY);
              ctx.stroke();
              
              // Fibonacci level label
              ctx.fillStyle = baseColor;
              ctx.font = '10px Arial';
              ctx.textAlign = 'left';
              ctx.fillText(`${(level * 100).toFixed(1)}% (${fibPrice.toFixed(precision)})`, 
                          Math.max(startX, endX) + 5, fibY + 3);
            });
            break;
            
          case 'channel':
            // Parallel channel lines
            const channelHeight = Math.abs(endY - startY);
            
            // Main trendline
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
            
            // Parallel line
            ctx.beginPath();
            if (endY > startY) {
              ctx.moveTo(startX, startY - channelHeight);
              ctx.lineTo(endX, endY - channelHeight);
            } else {
              ctx.moveTo(startX, startY + channelHeight);
              ctx.lineTo(endX, endY + channelHeight);
            }
            ctx.stroke();
            
            // Fill channel area
            ctx.fillStyle = baseColor + '15';
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            if (endY > startY) {
              ctx.lineTo(endX, endY - channelHeight);
              ctx.lineTo(startX, startY - channelHeight);
            } else {
              ctx.lineTo(endX, endY + channelHeight);
              ctx.lineTo(startX, startY + channelHeight);
            }
            ctx.closePath();
            ctx.fill();
            break;
        }
        
        // Selection handles
        if (isSelected) {
          ctx.fillStyle = '#ffff00';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 1;
          
          // Start handle
          ctx.fillRect(startX - 4, startY - 4, 8, 8);
          ctx.strokeRect(startX - 4, startY - 4, 8, 8);
          
          // End handle (for applicable drawing types)
          if (!['horizontal', 'vertical'].includes(drawing.type)) {
            ctx.fillRect(endX - 4, endY - 4, 8, 8);
            ctx.strokeRect(endX - 4, endY - 4, 8, 8);
          }
        }
      }
      
      // Reset drawing state
      ctx.globalAlpha = 1;
      ctx.setLineDash([]);
    });

    // Current drawing
    if (currentDrawing) {
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      ctx.beginPath();
      switch (currentDrawing.type) {
        case 'line':
        case 'trendline':
          ctx.moveTo(currentDrawing.startX, currentDrawing.startY);
          ctx.lineTo(currentDrawing.endX, currentDrawing.endY);
          break;
        case 'rectangle':
          const rectWidth = currentDrawing.endX - currentDrawing.startX;
          const rectHeight = currentDrawing.endY - currentDrawing.startY;
          ctx.rect(currentDrawing.startX, currentDrawing.startY, rectWidth, rectHeight);
          break;
        case 'horizontal':
          ctx.moveTo(padding.left, currentDrawing.startY);
          ctx.lineTo(padding.left + chartWidth, currentDrawing.startY);
          break;
        case 'vertical':
          ctx.moveTo(currentDrawing.startX, padding.top);
          ctx.lineTo(currentDrawing.startX, padding.top + chartHeight);
          break;
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

  }, [candleData, chartType, zoomLevel, viewStartIndex, precision, drawings, technicalIndicators, calculatedIndicators, selectedDrawing, visibleData, currentDrawing, isMobile, mousePosition, drawingMode]);

  const handleMouseDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY;
    
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (drawingMode === 'none') {
      setIsDragging(true);
      setLastMousePos({ x, y });
    } else if (drawingMode === 'delete') {
      const clickedDrawing = drawings.find(drawing => {
        if (!drawing.startX || !drawing.startY) return false;
        const distance = Math.sqrt(
          Math.pow(x - drawing.startX, 2) + Math.pow(y - drawing.startY, 2)
        );
        return distance < 20;
      });
      
      if (clickedDrawing) {
        setDrawings(prev => prev.filter(d => d.id !== clickedDrawing.id));
        setDrawingMode('none');
      }
    } else {
      const coords = getCoordinates(x, y);
      if (coords) {
        setIsDrawing(true);
        const newDrawing: Drawing = {
          id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: drawingMode as any,
          startX: x,
          startY: y,
          endX: x,
          endY: y,
          startPrice: coords.price,
          endPrice: coords.price,
          startTime: coords.time,
          endTime: coords.time,
          color: '#3b82f6'
        };
        setCurrentDrawing(newDrawing);
      }
    }
  }, [drawingMode, drawings, getCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : (e as React.MouseEvent).clientY;
    
    if (typeof clientX !== 'number' || typeof clientY !== 'number') return;
    
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    if (!isMobile || drawingMode === 'none') {
      setMousePosition({ x, y });
    }

    if (isDragging && drawingMode === 'none') {
      const deltaX = x - lastMousePos.x;
      const candlesPerScreen = Math.floor(100 / zoomLevel);
      const panDelta = Math.floor(deltaX / (canvas.width / candlesPerScreen));
      
      if (Math.abs(panDelta) > 0) {
        setViewStartIndex(prev => {
          const newStart = prev - panDelta;
          return Math.max(0, Math.min(candleData.length - candlesPerScreen, newStart));
        });
      }
      
      setLastMousePos({ x, y });
    } else if (isDrawing && currentDrawing) {
      const coords = getCoordinates(x, y);
      if (coords) {
        setCurrentDrawing(prev => prev ? {
          ...prev,
          endX: x,
          endY: y,
          endPrice: coords.price,
          endTime: coords.time
        } : null);
      }
    }
  }, [isDragging, isDrawing, lastMousePos, zoomLevel, candleData.length, drawingMode, currentDrawing, getCoordinates, isMobile]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    if (isDrawing && currentDrawing) {
      setDrawings(prev => [...prev, currentDrawing]);
      setCurrentDrawing(null);
      setIsDrawing(false);
      setDrawingMode('none');
    }
  }, [isDrawing, currentDrawing]);

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
    handleMouseUp();
  }, [handleMouseUp]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel * zoomFactor));
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMouseDown(e);
  }, [handleMouseDown]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMouseMove(e);
  }, [handleMouseMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    handleMouseUp();
  }, [handleMouseUp]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let resizeTimeout: NodeJS.Timeout;
    const resizeCanvas = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = rect.width + 'px';
        canvas.style.height = rect.height + 'px';
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.scale(dpr, dpr);
        }
        
        drawChart();
      }, 100);
    };

    resizeCanvas();
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      clearTimeout(resizeTimeout);
      canvas.removeEventListener('wheel', handleWheel);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [drawChart, handleWheel]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      drawChart();
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [drawChart]);

  return (
    <div className="flex-1 bg-gray-950 p-1 sm:p-2 h-full flex flex-col">
      <div className="flex-1 border border-gray-800 rounded bg-gradient-to-br from-gray-900 to-gray-950 flex flex-col">
        <div className="p-1 sm:p-2 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg sm:text-xl font-bold text-white">{selectedAsset}</h3>
              {candleData.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xl sm:text-2xl font-mono text-white">
                    ${candleData[candleData.length - 1].close.toFixed(precision)}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-400 flex space-x-4">
                    <span>O: ${candleData[candleData.length - 1].open.toFixed(precision)}</span>
                    <span>H: ${candleData[candleData.length - 1].high.toFixed(precision)}</span>
                    <span>L: ${candleData[candleData.length - 1].low.toFixed(precision)}</span>
                    <span>V: {candleData[candleData.length - 1].volume.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center space-x-1 space-x-reverse overflow-x-auto">
              {[
                { mode: 'line', label: 'خط', icon: '📏' },
                { mode: 'rectangle', label: 'مستطیل', icon: '⬜' },
                { mode: 'horizontal', label: 'خط افقی', icon: '➖' },
                { mode: 'vertical', label: 'خط عمودی', icon: '|' },
                { mode: 'trendline', label: 'خط روند', icon: '📈' },
                { mode: 'fibonacci', label: 'فیبوناچی', icon: '🌀' },
                { mode: 'channel', label: 'کانال', icon: '📊' }
              ].map(tool => (
                <button
                  key={tool.mode}
                  onClick={() => setDrawingMode(drawingMode === tool.mode ? 'none' : tool.mode as any)}
                  className={`px-2 py-1 rounded text-xs whitespace-nowrap flex items-center space-x-1 space-x-reverse transition-all ${
                    drawingMode === tool.mode 
                      ? 'bg-blue-600 text-white shadow-lg' 
                      : 'bg-gray-700 hover:bg-gray-600'
                  }`}
                  title={tool.label}
                >
                  <span className="text-xs">{tool.icon}</span>
                  <span className="hidden sm:inline">{tool.label}</span>
                </button>
              ))}
              <div className="w-px h-6 bg-gray-600 mx-1"></div>
              <button
                onClick={() => setDrawingMode(drawingMode === 'delete' ? 'none' : 'delete')}
                className={`px-2 py-1 rounded text-xs whitespace-nowrap transition-all ${
                  drawingMode === 'delete' 
                    ? 'bg-orange-600 text-white shadow-lg' 
                    : 'bg-gray-700 hover:bg-gray-600'
                }`}
                title="حذف ابزار"
              >
                🗑️ <span className="hidden sm:inline">حذف</span>
              </button>
              <button
                onClick={() => {
                  if (window.confirm('آیا مطمئن هستید که می‌خواهید همه ابزارها را پاک کنید؟')) {
                    setDrawings([]);
                    try {
                      localStorage.removeItem(`drawings_${selectedAsset}`);
                    } catch (error) {
                      console.warn('Failed to clear drawings from storage');
                    }
                    setDrawingMode('none');
                    setSelectedDrawing(null);
                  }
                }}
                className="px-2 py-1 rounded text-xs bg-red-600 hover:bg-red-500 whitespace-nowrap transition-all"
                title="پاک کردن همه"
              >
                🧹 <span className="hidden sm:inline">پاک کردن</span>
              </button>
            </div>
          </div>
        </div>

        <div ref={containerRef} className="chart-container relative w-full">
          <canvas
            ref={canvasRef}
            className={`w-full h-full select-none ${drawingMode === 'delete' ? 'cursor-pointer' : 'cursor-crosshair'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onTouchStart={isMobile ? handleTouchStart : undefined}
            onTouchMove={isMobile ? handleTouchMove : undefined}
            onTouchEnd={isMobile ? handleTouchEnd : undefined}
            style={{ touchAction: 'none', userSelect: 'none' }}
          />
        </div>
      </div>
    </div>
  );
}