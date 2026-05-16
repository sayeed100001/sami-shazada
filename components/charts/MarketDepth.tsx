'use client';

import { useRef, useEffect, useCallback } from 'react';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface MarketDepthProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  currentPrice: number;
  height?: number;
  theme?: 'dark' | 'light';
}

export function MarketDepth({ 
  bids, 
  asks, 
  currentPrice, 
  height = 200, 
  theme = 'dark' 
}: MarketDepthProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const colors = {
    dark: {
      background: '#1f2937',
      grid: '#374151',
      text: '#e5e7eb',
      textSecondary: '#9ca3af',
      bid: '#10b981',
      ask: '#ef4444',
      currentPrice: '#f59e0b',
      bidFill: 'rgba(16, 185, 129, 0.2)',
      askFill: 'rgba(239, 68, 68, 0.2)'
    },
    light: {
      background: '#ffffff',
      grid: '#e5e7eb',
      text: '#1f2937',
      textSecondary: '#6b7280',
      bid: '#059669',
      ask: '#dc2626',
      currentPrice: '#d97706',
      bidFill: 'rgba(5, 150, 105, 0.2)',
      askFill: 'rgba(220, 38, 38, 0.2)'
    }
  };

  const currentColors = colors[theme];

  const drawMarketDepth = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || bids.length === 0 || asks.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height: canvasHeight } = canvas;
    const dpr = window.devicePixelRatio || 1;
    
    // Set canvas size for high DPI displays
    canvas.width = width * dpr;
    canvas.height = canvasHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = canvasHeight + 'px';

    // Clear canvas
    ctx.fillStyle = currentColors.background;
    ctx.fillRect(0, 0, width, canvasHeight);

    const padding = { top: 20, right: 60, bottom: 30, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = canvasHeight - padding.top - padding.bottom;

    // Combine and sort all orders by price
    const allOrders = [
      ...bids.map(bid => ({ ...bid, side: 'bid' as const })),
      ...asks.map(ask => ({ ...ask, side: 'ask' as const }))
    ].sort((a, b) => a.price - b.price);

    if (allOrders.length === 0) return;

    // Calculate price range
    const minPrice = Math.min(...allOrders.map(o => o.price));
    const maxPrice = Math.max(...allOrders.map(o => o.price));
    const priceRange = maxPrice - minPrice;
    const priceBuffer = priceRange * 0.05;

    // Calculate cumulative volumes
    const maxVolume = Math.max(...allOrders.map(o => o.total));

    // Helper functions
    const getX = (price: number) => 
      padding.left + ((price - minPrice + priceBuffer) / (priceRange + 2 * priceBuffer)) * chartWidth;
    
    const getY = (volume: number) => 
      padding.top + chartHeight - (volume / maxVolume) * chartHeight;

    // Draw grid
    ctx.strokeStyle = currentColors.grid;
    ctx.lineWidth = 1;
    
    // Horizontal grid lines (volume levels)
    for (let i = 0; i <= 5; i++) {
      const volume = (maxVolume * i) / 5;
      const y = getY(volume);
      
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(width - padding.right, y);
      ctx.stroke();
      
      // Volume labels
      ctx.fillStyle = currentColors.textSecondary;
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(volume.toFixed(0), padding.left - 5, y + 3);
    }

    // Vertical grid lines (price levels)
    for (let i = 0; i <= 10; i++) {
      const price = minPrice + (priceRange * i) / 10;
      const x = getX(price);
      
      ctx.beginPath();
      ctx.moveTo(x, padding.top);
      ctx.lineTo(x, padding.top + chartHeight);
      ctx.stroke();
      
      // Price labels
      ctx.fillStyle = currentColors.textSecondary;
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(price.toFixed(4), x, canvasHeight - padding.bottom + 15);
    }

    // Draw bid area (left side of current price)
    const bidOrders = allOrders.filter(o => o.side === 'bid' && o.price <= currentPrice);
    if (bidOrders.length > 0) {
      ctx.fillStyle = currentColors.bidFill;
      ctx.strokeStyle = currentColors.bid;
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(getX(bidOrders[0].price), padding.top + chartHeight);
      
      bidOrders.forEach((order, index) => {
        const x = getX(order.price);
        const y = getY(order.total);
        
        if (index === 0) {
          ctx.lineTo(x, y);
        } else {
          // Step function
          const prevX = getX(bidOrders[index - 1].price);
          ctx.lineTo(prevX, y);
          ctx.lineTo(x, y);
        }
      });
      
      // Close the area
      const lastBid = bidOrders[bidOrders.length - 1];
      ctx.lineTo(getX(lastBid.price), padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();
      
      // Draw the line
      ctx.beginPath();
      ctx.moveTo(getX(bidOrders[0].price), getY(bidOrders[0].total));
      bidOrders.forEach((order, index) => {
        const x = getX(order.price);
        const y = getY(order.total);
        
        if (index > 0) {
          const prevX = getX(bidOrders[index - 1].price);
          ctx.lineTo(prevX, y);
        }
        ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw ask area (right side of current price)
    const askOrders = allOrders.filter(o => o.side === 'ask' && o.price >= currentPrice);
    if (askOrders.length > 0) {
      ctx.fillStyle = currentColors.askFill;
      ctx.strokeStyle = currentColors.ask;
      ctx.lineWidth = 2;
      
      ctx.beginPath();
      ctx.moveTo(getX(askOrders[0].price), padding.top + chartHeight);
      
      askOrders.forEach((order, index) => {
        const x = getX(order.price);
        const y = getY(order.total);
        
        if (index === 0) {
          ctx.lineTo(x, y);
        } else {
          // Step function
          const prevX = getX(askOrders[index - 1].price);
          ctx.lineTo(prevX, y);
          ctx.lineTo(x, y);
        }
      });
      
      // Close the area
      const lastAsk = askOrders[askOrders.length - 1];
      ctx.lineTo(getX(lastAsk.price), padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();
      
      // Draw the line
      ctx.beginPath();
      ctx.moveTo(getX(askOrders[0].price), getY(askOrders[0].total));
      askOrders.forEach((order, index) => {
        const x = getX(order.price);
        const y = getY(order.total);
        
        if (index > 0) {
          const prevX = getX(askOrders[index - 1].price);
          ctx.lineTo(prevX, y);
        }
        ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw current price line
    const currentPriceX = getX(currentPrice);
    ctx.strokeStyle = currentColors.currentPrice;
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    
    ctx.beginPath();
    ctx.moveTo(currentPriceX, padding.top);
    ctx.lineTo(currentPriceX, padding.top + chartHeight);
    ctx.stroke();
    ctx.setLineDash([]);

    // Current price label
    ctx.fillStyle = currentColors.currentPrice;
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      currentPrice.toFixed(4), 
      currentPriceX, 
      padding.top - 5
    );

    // Draw legend
    const legendY = padding.top + 10;
    const legendSpacing = 80;
    
    // Bid legend
    ctx.fillStyle = currentColors.bid;
    ctx.fillRect(padding.left, legendY, 12, 8);
    ctx.fillStyle = currentColors.text;
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('خرید', padding.left + 16, legendY + 7);
    
    // Ask legend
    ctx.fillStyle = currentColors.ask;
    ctx.fillRect(padding.left + legendSpacing, legendY, 12, 8);
    ctx.fillStyle = currentColors.text;
    ctx.fillText('فروش', padding.left + legendSpacing + 16, legendY + 7);

    // Title
    ctx.fillStyle = currentColors.text;
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('عمق بازار', width / 2, 15);

  }, [bids, asks, currentPrice, currentColors]);

  // Canvas resize handler
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      if (canvas) {
        const container = canvas.parentElement;
        if (container) {
          canvas.width = container.clientWidth;
          canvas.height = height;
          drawMarketDepth();
        }
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [height, drawMarketDepth]);

  // Redraw when data changes
  useEffect(() => {
    drawMarketDepth();
  }, [drawMarketDepth]);

  return (
    <div className="w-full bg-gray-900 rounded-lg border border-gray-700">
      <canvas
        ref={canvasRef}
        className="w-full cursor-crosshair"
        style={{ height: `${height}px` }}
      />
    </div>
  );
}