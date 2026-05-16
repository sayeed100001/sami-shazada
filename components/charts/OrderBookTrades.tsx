'use client';

import { useState, useEffect, useCallback } from 'react';
import { TrendingUp, TrendingDown, Clock, Volume2, Activity, DollarSign } from 'lucide-react';

interface OrderBookEntry {
  price: number;
  size: number;
  total: number;
}

interface OrderBook {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
  spread: number;
  lastUpdate: number;
}

interface Trade {
  id: string;
  time: number;
  price: number;
  size: number;
  side: 'buy' | 'sell';
}

interface OrderBookTradesProps {
  selectedAsset: string;
  currentPrice: number;
  isVisible: boolean;
  onToggle: () => void;
}

export function OrderBookTrades({ selectedAsset, currentPrice, isVisible, onToggle }: OrderBookTradesProps) {
  const [orderBook, setOrderBook] = useState<OrderBook | null>(null);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<'orderbook' | 'trades'>('orderbook');
  const [priceFilter, setPriceFilter] = useState<'all' | 'near'>('near');

  // Generate realistic order book data
  const generateOrderBook = useCallback((basePrice: number) => {
    const bids: OrderBookEntry[] = [];
    const asks: OrderBookEntry[] = [];
    
    let totalBids = 0;
    let totalAsks = 0;
    
    // Generate bids (buy orders) - prices below current price
    for (let i = 0; i < 25; i++) {
      const priceOffset = (i + 1) * (0.0001 + Math.random() * 0.0005);
      const price = basePrice * (1 - priceOffset);
      const size = Math.random() * 50 + 1;
      totalBids += size;
      bids.push({ 
        price: Number(price.toFixed(8)), 
        size: Number(size.toFixed(4)), 
        total: Number(totalBids.toFixed(4)) 
      });
    }
    
    // Generate asks (sell orders) - prices above current price
    for (let i = 0; i < 25; i++) {
      const priceOffset = (i + 1) * (0.0001 + Math.random() * 0.0005);
      const price = basePrice * (1 + priceOffset);
      const size = Math.random() * 50 + 1;
      totalAsks += size;
      asks.push({ 
        price: Number(price.toFixed(8)), 
        size: Number(size.toFixed(4)), 
        total: Number(totalAsks.toFixed(4)) 
      });
    }
    
    // Sort bids descending (highest price first)
    bids.sort((a, b) => b.price - a.price);
    
    setOrderBook({
      bids,
      asks,
      spread: asks[0]?.price - bids[0]?.price || 0,
      lastUpdate: Date.now()
    });
  }, []);

  // Generate realistic trades data
  const generateRecentTrades = useCallback((basePrice: number) => {
    const trades: Trade[] = [];
    const now = Date.now();
    
    for (let i = 0; i < 100; i++) {
      const timeOffset = i * (1000 + Math.random() * 5000); // Random intervals
      const priceVariation = (Math.random() - 0.5) * 0.002; // ±0.2% variation
      const price = basePrice * (1 + priceVariation);
      const size = Math.random() * 10 + 0.01;
      const side = Math.random() > 0.5 ? 'buy' : 'sell';
      
      trades.push({
        id: `trade_${now}_${i}`,
        time: now - timeOffset,
        price: Number(price.toFixed(8)),
        size: Number(size.toFixed(6)),
        side
      });
    }
    
    // Sort by time descending (most recent first)
    trades.sort((a, b) => b.time - a.time);
    setRecentTrades(trades);
  }, []);

  // Update data when asset or price changes
  useEffect(() => {
    if (currentPrice > 0) {
      generateOrderBook(currentPrice);
      generateRecentTrades(currentPrice);
    }
  }, [selectedAsset, currentPrice, generateOrderBook, generateRecentTrades]);

  // Real-time updates simulation
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentPrice > 0) {
        // Update order book occasionally
        if (Math.random() < 0.3) {
          generateOrderBook(currentPrice * (1 + (Math.random() - 0.5) * 0.001));
        }
        
        // Add new trades more frequently
        if (Math.random() < 0.7) {
          const newTrade: Trade = {
            id: `trade_${Date.now()}_${Math.random()}`,
            time: Date.now(),
            price: currentPrice * (1 + (Math.random() - 0.5) * 0.001),
            size: Math.random() * 5 + 0.01,
            side: Math.random() > 0.5 ? 'buy' : 'sell'
          };
          
          setRecentTrades(prev => [newTrade, ...prev.slice(0, 99)]);
        }
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentPrice, generateOrderBook]);

  if (!isVisible) return null;

  const formatPrice = (price: number) => {
    if (price >= 1000) return price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(8);
  };

  const formatSize = (size: number) => {
    if (size >= 1000) return (size / 1000).toFixed(1) + 'K';
    return size.toFixed(4);
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('fa-IR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const getSpreadPercentage = () => {
    if (!orderBook || !orderBook.bids[0] || !orderBook.asks[0]) return 0;
    return ((orderBook.spread / orderBook.bids[0].price) * 100);
  };

  const filteredBids = orderBook?.bids.slice(0, priceFilter === 'near' ? 10 : 25) || [];
  const filteredAsks = orderBook?.asks.slice(0, priceFilter === 'near' ? 10 : 25) || [];
  const filteredTrades = recentTrades.slice(0, priceFilter === 'near' ? 20 : 50);

  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-white">دفتر سفارشات و معاملات</h3>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Tabs */}
        <div className="flex space-x-1 space-x-reverse">
          <button
            onClick={() => setActiveTab('orderbook')}
            className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
              activeTab === 'orderbook' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            دفتر سفارشات
          </button>
          <button
            onClick={() => setActiveTab('trades')}
            className={`flex-1 px-3 py-2 text-sm rounded transition-colors ${
              activeTab === 'trades' 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
          >
            معاملات اخیر
          </button>
        </div>
        
        {/* Filter */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex space-x-1 space-x-reverse">
            <button
              onClick={() => setPriceFilter('near')}
              className={`px-2 py-1 text-xs rounded ${
                priceFilter === 'near' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              نزدیک
            </button>
            <button
              onClick={() => setPriceFilter('all')}
              className={`px-2 py-1 text-xs rounded ${
                priceFilter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
              }`}
            >
              همه
            </button>
          </div>
          
          {orderBook && (
            <div className="text-xs text-gray-400">
              اسپرد: {getSpreadPercentage().toFixed(3)}%
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'orderbook' && orderBook && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 bg-gray-800 text-xs text-gray-400 grid grid-cols-3 gap-2">
              <span className="text-right">قیمت</span>
              <span className="text-center">مقدار</span>
              <span className="text-left">مجموع</span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              {/* Asks (Sell Orders) */}
              <div className="space-y-px">
                {filteredAsks.reverse().map((ask, index) => {
                  const intensity = Math.min(ask.size / 100, 1);
                  return (
                    <div
                      key={`ask-${index}`}
                      className="px-3 py-1 text-xs grid grid-cols-3 gap-2 hover:bg-gray-800 transition-colors relative"
                      style={{
                        background: `linear-gradient(to left, rgba(239, 68, 68, ${intensity * 0.1}) ${intensity * 100}%, transparent ${intensity * 100}%)`
                      }}
                    >
                      <span className="text-red-400 font-mono text-right">{formatPrice(ask.price)}</span>
                      <span className="text-gray-300 font-mono text-center">{formatSize(ask.size)}</span>
                      <span className="text-gray-400 font-mono text-left">{formatSize(ask.total)}</span>
                    </div>
                  );
                })}
              </div>
              
              {/* Current Price */}
              <div className="px-3 py-2 bg-gray-800 border-y border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-lg font-bold text-white font-mono">
                    {formatPrice(currentPrice)}
                  </span>
                  <span className="text-xs text-gray-400">قیمت فعلی</span>
                </div>
                {orderBook.spread > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    اسپرد: {formatPrice(orderBook.spread)}
                  </div>
                )}
              </div>
              
              {/* Bids (Buy Orders) */}
              <div className="space-y-px">
                {filteredBids.map((bid, index) => {
                  const intensity = Math.min(bid.size / 100, 1);
                  return (
                    <div
                      key={`bid-${index}`}
                      className="px-3 py-1 text-xs grid grid-cols-3 gap-2 hover:bg-gray-800 transition-colors relative"
                      style={{
                        background: `linear-gradient(to left, rgba(16, 185, 129, ${intensity * 0.1}) ${intensity * 100}%, transparent ${intensity * 100}%)`
                      }}
                    >
                      <span className="text-green-400 font-mono text-right">{formatPrice(bid.price)}</span>
                      <span className="text-gray-300 font-mono text-center">{formatSize(bid.size)}</span>
                      <span className="text-gray-400 font-mono text-left">{formatSize(bid.total)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trades' && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="px-3 py-2 bg-gray-800 text-xs text-gray-400 grid grid-cols-4 gap-2">
              <span className="text-right">زمان</span>
              <span className="text-center">قیمت</span>
              <span className="text-center">مقدار</span>
              <span className="text-left">نوع</span>
            </div>
            
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-px">
                {filteredTrades.map((trade, index) => (
                  <div
                    key={trade.id}
                    className="px-3 py-1 text-xs grid grid-cols-4 gap-2 hover:bg-gray-800 transition-colors"
                  >
                    <span className="text-gray-400 font-mono text-right">
                      {formatTime(trade.time)}
                    </span>
                    <span className={`font-mono text-center ${
                      trade.side === 'buy' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {formatPrice(trade.price)}
                    </span>
                    <span className="text-gray-300 font-mono text-center">
                      {formatSize(trade.size)}
                    </span>
                    <div className="text-left">
                      {trade.side === 'buy' ? (
                        <span className="inline-flex items-center text-green-400">
                          <TrendingUp className="w-3 h-3 ml-1" />
                          خرید
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-red-400">
                          <TrendingDown className="w-3 h-3 ml-1" />
                          فروش
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Trade Statistics */}
            <div className="p-3 border-t border-gray-800 bg-gray-850">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <div className="text-gray-400 mb-1">حجم خرید (24س)</div>
                  <div className="text-green-400 font-mono">
                    {formatSize(filteredTrades.filter(t => t.side === 'buy').reduce((sum, t) => sum + t.size, 0))}
                  </div>
                </div>
                <div>
                  <div className="text-gray-400 mb-1">حجم فروش (24س)</div>
                  <div className="text-red-400 font-mono">
                    {formatSize(filteredTrades.filter(t => t.side === 'sell').reduce((sum, t) => sum + t.size, 0))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}