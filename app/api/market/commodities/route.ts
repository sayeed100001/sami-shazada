import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { aggregateCandles, getStoredCandles, storePriceSnapshot } from '@/lib/market-history';
import { fetchRealHistoricalData } from '@/lib/realHistoricalData';
import { ExternalAPIService } from '@/lib/external-api-service';

interface CommodityData {
  symbol: string;
  name: string;
  price: number;
  priceAfn?: number | null;
  change24h: number;
  changePercent24h: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  trend: 'up' | 'down' | 'neutral';
  lastUpdate: string;
  unit: string;
  exchange: string;
}

const COMMODITIES_CONFIG = [
  { symbol: 'XAUUSD', name: 'Gold', namePersian: 'طلا', basePrice: 2034.50, unit: 'oz', exchange: 'COMEX' },
  { symbol: 'XAGUSD', name: 'Silver', namePersian: 'نقره', basePrice: 24.85, unit: 'oz', exchange: 'COMEX' },
  { symbol: 'WTIUSD', name: 'Crude Oil WTI', namePersian: 'نفت خام', basePrice: 78.45, unit: 'barrel', exchange: 'NYMEX' },
  { symbol: 'BRENTUSD', name: 'Brent Oil', namePersian: 'نفت برنت', basePrice: 82.15, unit: 'barrel', exchange: 'ICE' },
  { symbol: 'XPTUSD', name: 'Platinum', namePersian: 'پلاتین', basePrice: 945.30, unit: 'oz', exchange: 'NYMEX' },
  { symbol: 'XPDUSD', name: 'Palladium', namePersian: 'پالادیوم', basePrice: 1285.75, unit: 'oz', exchange: 'NYMEX' },
  { symbol: 'COPPER', name: 'Copper', namePersian: 'مس', basePrice: 3.85, unit: 'lb', exchange: 'COMEX' },
  { symbol: 'WHEAT', name: 'Wheat', namePersian: 'گندم', basePrice: 625.50, unit: 'bushel', exchange: 'CBOT' },
  { symbol: 'CORN', name: 'Corn', namePersian: 'ذرت', basePrice: 485.25, unit: 'bushel', exchange: 'CBOT' },
  { symbol: 'SOYBEANS', name: 'Soybeans', namePersian: 'سویا', basePrice: 1345.80, unit: 'bushel', exchange: 'CBOT' },
  { symbol: 'SUGAR', name: 'Sugar', namePersian: 'شکر', basePrice: 21.45, unit: 'lb', exchange: 'ICE' },
  { symbol: 'COFFEE', name: 'Coffee', namePersian: 'قهوه', basePrice: 168.75, unit: 'lb', exchange: 'ICE' },
  { symbol: 'COCOA', name: 'Cocoa', namePersian: 'کاکائو', basePrice: 3245.60, unit: 'ton', exchange: 'ICE' },
  { symbol: 'COTTON', name: 'Cotton', namePersian: 'پنبه', basePrice: 72.85, unit: 'lb', exchange: 'ICE' },
  { symbol: 'NATGAS', name: 'Natural Gas', namePersian: 'گاز طبیعی', basePrice: 2.85, unit: 'MMBtu', exchange: 'NYMEX' },
  { symbol: 'HEATING', name: 'Heating Oil', namePersian: 'نفت گرمایشی', basePrice: 2.45, unit: 'gallon', exchange: 'NYMEX' }
];

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
let commoditiesCache: { data: CommodityData[], timestamp: number } | null = null;

export const dynamic = 'force-dynamic';

function calculateTrend(changePercent: number): 'up' | 'down' | 'neutral' {
  if (changePercent > 0.1) return 'up';
  if (changePercent < -0.1) return 'down';
  return 'neutral';
}

async function fetchFromMetalsAPI(): Promise<Partial<CommodityData>[]> {
  const config = await ExternalAPIService.getMetalsAPIConfig()
  
  if (!config.enabled || !config.apiKey) {
    throw new Error('Metals API not configured')
  }
  
  try {
    const response = await fetch(
      `${config.baseUrl}/v1/spot`,
      {
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Accept': 'application/json'
        },
        next: { revalidate: 300 }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Metals API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    return [
      {
        symbol: 'XAUUSD',
        price: data.gold?.price || 2034.50,
        change24h: data.gold?.change || 0,
        changePercent24h: data.gold?.changePercent || 0
      },
      {
        symbol: 'XAGUSD',
        price: data.silver?.price || 24.85,
        change24h: data.silver?.change || 0,
        changePercent24h: data.silver?.changePercent || 0
      }
    ];
  } catch (error) {
    console.warn('Metals API failed:', error);
    return [];
  }
}

async function fetchFromCommodityAPI(): Promise<Partial<CommodityData>[]> {
  const config = await ExternalAPIService.getCommoditiesAPIConfig()
  
  if (!config.enabled || !config.apiKey) {
    throw new Error('Commodity API not configured')
  }
  
  try {
    const symbols = ['BRENTOIL', 'WTIOIL', 'NATGAS', 'WHEAT', 'CORN'];
    const response = await fetch(
      `${config.baseUrl}/latest?access_key=${config.apiKey}&base=USD&symbols=${symbols.join(',')}`,
      {
        headers: {
          'Accept': 'application/json'
        },
        next: { revalidate: 300 }
      }
    );
    
    if (!response.ok) {
      throw new Error(`Commodity API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.success || !data.rates) {
      throw new Error('Invalid commodity API response');
    }
    
    return Object.entries(data.rates).map(([symbol, price]) => ({
      symbol: symbol === 'BRENTOIL' ? 'BRENTUSD' : symbol === 'WTIOIL' ? 'WTIUSD' : symbol,
      price: 1 / (price as number), // API returns inverse rates
      change24h: 0, // Would need historical data
      changePercent24h: 0
    }));
  } catch (error) {
    console.warn('Commodity API failed:', error);
    return [];
  }
}

async function fetchRealCommodityPrices(): Promise<CommodityData[]> {
  const results: CommodityData[] = []
  
  const config = await ExternalAPIService.getYahooFinanceConfig()
  
  if (!config.enabled) {
    return results
  }
  
  try {
    const symbols = ['GC=F', 'SI=F', 'CL=F', 'BZ=F', 'NG=F', 'HG=F']
    const promises = symbols.map(async (symbol) => {
      try {
        const response = await fetch(`${config.baseUrl}/${symbol}`, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
          next: { revalidate: 300 }
        })
        
        if (response.ok) {
          const data = await response.json()
          const result = data.chart?.result?.[0]
          if (result) {
            const meta = result.meta
            const quote = result.indicators?.quote?.[0]
            
            const commoditySymbol = getCommoditySymbol(symbol)
            return {
              symbol: commoditySymbol,
              name: getCommodityName(commoditySymbol),
              price: meta.regularMarketPrice || meta.previousClose || 0,
              change24h: (meta.regularMarketPrice || 0) - (meta.previousClose || 0),
              changePercent24h: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 || 0,
              volume24h: meta.regularMarketVolume || 0,
              high24h: meta.regularMarketDayHigh || meta.regularMarketPrice || 0,
              low24h: meta.regularMarketDayLow || meta.regularMarketPrice || 0,
              trend: calculateTrend(((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100 || 0),
              lastUpdate: new Date().toISOString(),
              unit: getUnit(getCommoditySymbol(symbol)),
              exchange: 'COMEX'
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to fetch ${symbol}:`, error)
      }
      return null
    })
    
    const commodityResults = await Promise.all(promises)
    results.push(...commodityResults.filter(Boolean) as CommodityData[])
    
  } catch (error) {
    console.error('Real commodity fetch failed:', error)
  }
  
  return results
}

function getCommoditySymbol(yahooSymbol: string): string {
  const map: {[key: string]: string} = {
    'GC=F': 'XAUUSD',
    'SI=F': 'XAGUSD', 
    'CL=F': 'WTIUSD',
    'BZ=F': 'BRENTUSD',
    'NG=F': 'NATGAS',
    'HG=F': 'COPPER'
  }
  return map[yahooSymbol] || yahooSymbol
}

function getCommodityName(symbol: string): string {
  const names: {[key: string]: string} = {
    'XAUUSD': 'Gold',
    'XAGUSD': 'Silver', 
    'WTIUSD': 'Crude Oil WTI',
    'BRENTUSD': 'Brent Oil',
    'NATGAS': 'Natural Gas',
    'COPPER': 'Copper'
  }
  return names[symbol] || symbol
}

function getUnit(symbol: string): string {
  const units: {[key: string]: string} = {
    'XAUUSD': 'oz', 'XAGUSD': 'oz', 'WTIUSD': 'barrel',
    'BRENTUSD': 'barrel', 'NATGAS': 'MMBtu', 'COPPER': 'lb'
  }
  return units[symbol] || 'unit'
}

function generateFallbackData(): CommodityData[] {
  return []
}

export async function GET(request: NextRequest) {
  try {
    // Check cache first
    if (commoditiesCache && Date.now() - commoditiesCache.timestamp < CACHE_DURATION) {
      return NextResponse.json(commoditiesCache.data, {
        headers: {
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
          'X-Cache': 'HIT'
        }
      });
    }

    let commoditiesData: CommodityData[] = await fetchRealCommodityPrices();

    // If live fetch failed, fall back to last-known DB data (real but potentially stale)
    if (commoditiesData.length === 0) {
      const stored = await prisma.marketData.findMany({
        where: { type: 'commodity' },
        orderBy: { lastUpdate: 'desc' },
        take: 200
      });

      if (stored.length === 0) {
        return NextResponse.json({ error: 'Commodities unavailable' }, { status: 503 });
      }

      commoditiesData = stored.map((row) => ({
        symbol: row.symbol,
        name: row.name,
        price: row.price,
        change24h: row.change24h,
        changePercent24h: row.changePercent24h,
        volume24h: row.volume24h || 0,
        high24h: row.price,
        low24h: row.price,
        trend: calculateTrend(row.changePercent24h),
        lastUpdate: row.lastUpdate.toISOString(),
        unit: getUnit(row.symbol),
        exchange: COMMODITIES_CONFIG.find((c) => c.symbol === row.symbol)?.exchange || 'unknown'
      }));
    }

    // USD → AFN for display conversion (best-effort)
    let usdAfnRate: number | null = null;
    const usdAfn = await prisma.marketData.findUnique({
      where: { symbol_type: { symbol: 'USDAFN', type: 'forex' } },
      select: { price: true }
    });
    if (usdAfn?.price) {
      usdAfnRate = usdAfn.price;
    } else {
      try {
        const config = await ExternalAPIService.getExchangeRateConfig()
        if (config.enabled) {
          const res = await fetch(`${config.baseUrl}/latest/USD`, {
            headers: ExternalAPIService.buildHeaders(config.apiKey),
            next: { revalidate: 300 },
            signal: AbortSignal.timeout(8000)
          });
          if (res.ok) {
            const data = await res.json();
            const rate = data?.rates?.AFN;
            if (typeof rate === 'number' && Number.isFinite(rate) && rate > 0) {
              usdAfnRate = rate;
            }
          }
        }
      } catch {
        // ignore
      }
    }

    const responseData: CommodityData[] = commoditiesData.map((c) => ({
      ...c,
      priceAfn: usdAfnRate ? c.price * usdAfnRate : null
    }));
    
    // Update cache
    commoditiesCache = {
      data: responseData,
      timestamp: Date.now()
    };
    
    // Store in database for historical tracking
    try {
      for (const commodity of commoditiesData) {
        await prisma.marketData.upsert({
          where: {
            symbol_type: {
              symbol: commodity.symbol,
              type: 'commodity'
            }
          },
          update: {
            name: commodity.name,
            price: commodity.price,
            change24h: commodity.change24h,
            changePercent24h: commodity.changePercent24h,
            volume24h: commodity.volume24h,
            lastUpdate: new Date()
          },
          create: {
            symbol: commodity.symbol,
            type: 'commodity',
            name: commodity.name,
            price: commodity.price,
            change24h: commodity.change24h,
            changePercent24h: commodity.changePercent24h,
            volume24h: commodity.volume24h
          }
        });

        await storePriceSnapshot({
          symbol: commodity.symbol,
          name: commodity.name,
          type: 'commodity',
          price: commodity.price,
          volume: commodity.volume24h,
        });
      }
    } catch (dbError) {
      console.warn('Failed to store commodities data in database:', dbError);
    }
    
    return NextResponse.json(responseData, {
      headers: {
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=600',
        'X-Cache': 'MISS'
      }
    });
    
  } catch (error) {
    console.error('Commodities API error:', error);
    
    if (commoditiesCache?.data) {
      return NextResponse.json(commoditiesCache.data, {
        headers: {
          'Cache-Control': 'public, max-age=60',
          'X-Cache': 'ERROR-CACHE'
        }
      });
    }

    try {
      const stored = await prisma.marketData.findMany({
        where: { type: 'commodity' },
        orderBy: { lastUpdate: 'desc' },
        take: 200
      });

      if (stored.length > 0) {
        return NextResponse.json(
          stored.map((row) => ({
            symbol: row.symbol,
            name: row.name,
            price: row.price,
            change24h: row.change24h,
            changePercent24h: row.changePercent24h,
            volume24h: row.volume24h || 0,
            high24h: row.price,
            low24h: row.price,
            trend: calculateTrend(row.changePercent24h),
            lastUpdate: row.lastUpdate.toISOString(),
            unit: getUnit(row.symbol),
            exchange: COMMODITIES_CONFIG.find((c) => c.symbol === row.symbol)?.exchange || 'unknown',
            priceAfn: null
          })),
          {
            headers: {
              'Cache-Control': 'public, max-age=60',
              'X-Cache': 'ERROR-DB'
            }
          }
        );
      }
    } catch (dbError) {
      console.error('Commodities DB fallback failed:', dbError);
    }

    return NextResponse.json({ error: 'Commodities unavailable' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({} as Record<string, unknown>))
    const symbol = typeof body.symbol === 'string' ? body.symbol.toUpperCase().replace(/[\/\s]/g, '') : 'XAUUSD'
    const timeframe = typeof body.timeframe === 'string' ? body.timeframe : '1d'
    const requestedLimit = typeof body.limit === 'number' ? body.limit : Number(body.limit || 180)
    const limit = Number.isFinite(requestedLimit) ? Math.min(Math.max(requestedLimit, 1), 365) : 180

    const supportedSymbols = new Set(['XAUUSD', 'XAGUSD', 'WTIUSD', 'BRENTUSD', 'NATGAS', 'COPPER'])
    if (!supportedSymbols.has(symbol)) {
      return NextResponse.json({ error: 'Unsupported commodity symbol' }, { status: 400 })
    }

    const storedHistory = await getStoredCandles(symbol, Math.max(limit, 30), '1h')
    const aggregatedStored = aggregateCandles(storedHistory, timeframe)

    if (aggregatedStored.length > 0) {
      return NextResponse.json({
        symbol,
        timeframe,
        source: 'database',
        candles: aggregatedStored.slice(-limit),
        count: aggregatedStored.slice(-limit).length,
      })
    }

    const candles = await fetchRealHistoricalData(symbol, timeframe, limit)
    if (candles.length === 0) {
      return NextResponse.json(
        { error: 'Commodity history unavailable for this symbol' },
        { status: 503 }
      )
    }

    return NextResponse.json({
      symbol,
      timeframe,
      source: 'live',
      candles,
      count: candles.length,
    })
  } catch (error) {
    console.error('Commodity history error:', error)
    return NextResponse.json({ error: 'Failed to fetch commodity history' }, { status: 500 })
  }
}
