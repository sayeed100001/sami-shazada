'use client';

import { useRef, useEffect, useCallback, useState } from 'react';

interface CandleData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface DrawingTool {
  id: string;
  type: 'line' | 'rectangle' | 'fibonacci';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  completed: boolean;
}

interface ProfessionalChartProps {
  candleData: CandleData[];
  chartType: string;
  selectedAsset: string;
  precision: number;
  zoomLevel: number;
  onZoomChange: (zoom: number) => void;
}

export function ProfessionalChart({ 
  candleData, 
  chartType, 
  selectedAsset, 
  precision, 
  zoomLevel,
  onZoomChange 
}: ProfessionalChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [panOffset, setPanOffset] = useState(0);
  const [drawings, setDrawings] = useState<DrawingTool[]>([]);
  const [currentDrawing, setCurrentDrawing] = useState<DrawingTool | null>(null);
  const [drawingMode, setDrawingMode] = useState<'none' | 'line' | 'rectangle' | 'fibonacci'>('none');
  const [isDragging, setIsDragging] = useState(false);
  const [lastMouseX, setLastMouseX] = useState(0);

  const drawChart = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || candleData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // Chart dimensions
    const padding = { top: 20, right: 80, bottom: 60, left: 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom - 80; // Reserve space for volume

    // Calculate visible data range
    const candlesPerScreen = Math.floor(100 / zoomLevel);
    const startIndex = Math.max(0, candleData.length - candlesPerScreen + panOffset);
    const endIndex = Math.min(candleData.length, startIndex + candlesPerScreen);
    const visibleData = candleData.slice(startIndex, endIndex);

    if (visibleData.length === 0) return;

    // Calculate price range
    const prices = visibleData.flatMap(d => [d.high, d.low]);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.1;

    // Helper functions
    const getX = (index: number) => padding.left + (index * chartWidth) / visibleData.length;
    const getY = (price: number) => padding.top + ((maxPrice + priceBuffer - price) / (priceRange + 2 * priceBuffer)) * chartHeight;
    const getCandleWidth = () => Math.max(2, (chartWidth / visibleData.length) * 0.8);

    // Draw background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = '#1e293b';
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
    ctx.fillStyle = '#64748b';
    ctx.font = '12px monospace';
    ctx.textAlign = 'left';
    for (let i = 0; i <= 10; i++) {
      const price = (maxPrice + priceBuffer) - ((priceRange + 2 * priceBuffer) * i) / 10;
      const y = padding.top + (chartHeight * i) / 10;
      ctx.fillText(price.toFixed(precision), width - padding.right + 5, y + 4);
    }

    // Draw candlesticks
    visibleData.forEach((candle, index) => {
      const x = getX(index);
      const candleWidth = getCandleWidth();
      
      const openY = getY(candle.open);
      const closeY = getY(candle.close);
      const highY = getY(candle.high);
      const lowY = getY(candle.low);
      
      const isGreen = candle.close > candle.open;
      ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
      ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
      
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
    });

    // Draw volume bars
    const volumeY = padding.top + chartHeight + 20;
    const volumeHeight = 60;
    const maxVolume = Math.max(...visibleData.map(d => d.volume));
    
    visibleData.forEach((candle, index) => {
      const x = getX(index);
      const candleWidth = getCandleWidth();
      const barHeight = (candle.volume / maxVolume) * volumeHeight;
      const y = volumeY + volumeHeight - barHeight;
      
      ctx.fillStyle = candle.close > candle.open ? '#10b98140' : '#ef444440';
      ctx.fillRect(x - candleWidth / 2, y, candleWidth, barHeight);
    });

    // Draw existing drawings
    drawings.forEach(drawing => {
      ctx.strokeStyle = drawing.color;
      ctx.lineWidth = 2;
      
      if (drawing.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(drawing.startX, drawing.startY);
        ctx.lineTo(drawing.endX, drawing.endY);
        ctx.stroke();
      } else if (drawing.type === 'rectangle') {
        ctx.strokeRect(
          Math.min(drawing.startX, drawing.endX),
          Math.min(drawing.startY, drawing.endY),
          Math.abs(drawing.endX - drawing.startX),
          Math.abs(drawing.endY - drawing.startY)
        );
      } else if (drawing.type === 'fibonacci') {
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
        const startY = drawing.startY;
        const endY = drawing.endY;
        const height = endY - startY;
        
        levels.forEach(level => {
          const y = startY + height * level;
          ctx.beginPath();
          ctx.moveTo(drawing.startX, y);
          ctx.lineTo(drawing.endX, y);
          ctx.stroke();
          
          // Draw level label
          ctx.fillStyle = drawing.color;
          ctx.font = '10px monospace';
          ctx.fillText(`${(level * 100).toFixed(1)}%`, drawing.endX + 5, y + 3);
        });
      }
    });

    // Draw current drawing
    if (currentDrawing) {
      ctx.strokeStyle = currentDrawing.color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      
      if (currentDrawing.type === 'line') {
        ctx.beginPath();
        ctx.moveTo(currentDrawing.startX, currentDrawing.startY);
        ctx.lineTo(currentDrawing.endX, currentDrawing.endY);
        ctx.stroke();
      } else if (currentDrawing.type === 'rectangle') {
        ctx.strokeRect(
          Math.min(currentDrawing.startX, currentDrawing.endX),
          Math.min(currentDrawing.startY, currentDrawing.endY),
          Math.abs(currentDrawing.endX - currentDrawing.startX),
          Math.abs(currentDrawing.endY - currentDrawing.startY)
        );
      }
      
      ctx.setLineDash([]);
    }

  }, [candleData, chartType, precision, zoomLevel, panOffset, drawings, currentDrawing]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (drawingMode !== 'none') {
      const newDrawing: DrawingTool = {
        id: Date.now().toString(),
        type: drawingMode,
        startX: x,
        startY: y,
        endX: x,
        endY: y,
        color: '#3b82f6',
        completed: false
      };
      setCurrentDrawing(newDrawing);
    } else {
      setIsDragging(true);
      setLastMouseX(x);
    }
  }, [drawingMode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (currentDrawing) {
      setCurrentDrawing(prev => prev ? { ...prev, endX: x, endY: y } : null);
    } else if (isDragging) {
      const deltaX = x - lastMouseX;
      const candlesPerScreen = Math.floor(100 / zoomLevel);
      const panDelta = Math.floor(deltaX / (canvas.width / candlesPerScreen));
      setPanOffset(prev => Math.max(-candleData.length + candlesPerScreen, Math.min(0, prev - panDelta)));
      setLastMouseX(x);
    }
  }, [currentDrawing, isDragging, lastMouseX, zoomLevel, candleData.length]);

  const handleMouseUp = useCallback(() => {
    if (currentDrawing) {
      setDrawings(prev => [...prev, { ...currentDrawing, completed: true }]);
      setCurrentDrawing(null);
      setDrawingMode('none');
    }
    setIsDragging(false);
  }, [currentDrawing]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(10, zoomLevel * zoomFactor));
    onZoomChange(newZoom);
  }, [zoomLevel, onZoomChange]);

  useEffect(() => {
    drawChart();
  }, [drawChart]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        drawChart();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [drawChart]);

  return (
    <div className="flex-1 bg-gray-950 p-4">
      <div className="h-full border border-gray-800 rounded-lg bg-gradient-to-br from-gray-900 to-gray-950">
        {/* Chart Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-white">{selectedAsset}</h3>
              {candleData.length > 0 && (
                <div className="flex items-center space-x-4 space-x-reverse mt-2">
                  <span className="text-2xl font-mono text-white">
                    ${candleData[candleData.length - 1].close.toFixed(precision)}
                  </span>
                </div>
              )}
            </div>
            
            {/* Drawing Tools */}
            <div className="flex items-center space-x-2 space-x-reverse">
              <button
                onClick={() => setDrawingMode(drawingMode === 'line' ? 'none' : 'line')}
                className={`p-2 rounded ${drawingMode === 'line' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-500`}
              >
                📈
              </button>
              <button
                onClick={() => setDrawingMode(drawingMode === 'rectangle' ? 'none' : 'rectangle')}
                className={`p-2 rounded ${drawingMode === 'rectangle' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-500`}
              >
                ▭
              </button>
              <button
                onClick={() => setDrawingMode(drawingMode === 'fibonacci' ? 'none' : 'fibonacci')}
                className={`p-2 rounded ${drawingMode === 'fibonacci' ? 'bg-blue-600' : 'bg-gray-700'} hover:bg-blue-500`}
              >
                🌀
              </button>
              <button
                onClick={() => {
                  setDrawings([]);
                  setCurrentDrawing(null);
                  setDrawingMode('none');
                }}
                className="p-2 rounded bg-red-600 hover:bg-red-500"
              >
                🗑️
              </button>
            </div>
          </div>
        </div>

        {/* Chart Canvas */}
        <div className="relative h-96">
          <canvas
            ref={canvasRef}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          />
          
          {/* Chart Controls */}
          <div className="absolute bottom-4 right-4 flex items-center space-x-2 bg-gray-800 rounded-lg p-2">
            <span className="text-xs text-gray-400">Zoom: {(zoomLevel * 100).toFixed(0)}%</span>
            <button
              onClick={() => onZoomChange(Math.min(10, zoomLevel * 1.2))}
              className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              +
            </button>
            <button
              onClick={() => onZoomChange(Math.max(0.1, zoomLevel * 0.8))}
              className="p-1 bg-gray-700 hover:bg-gray-600 rounded"
            >
              -
            </button>
            <button
              onClick={() => {
                onZoomChange(1);
                setPanOffset(0);
              }}
              className="p-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
            >
              Reset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}