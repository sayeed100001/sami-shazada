'use client'

import { useState, useEffect } from 'react'
import { Search, TrendingUp, TrendingDown, Star, Globe, Coins } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Asset {
  symbol: string
  name: string
  nameFa: string
  category: string
  categoryFa: string
  popular: boolean
  description: string
  descriptionFa: string
}

const afghanAssets: Asset[] = [
  // Major Currencies
  { symbol: 'USDAFN', name: 'US Dollar to Afghan Afghani', nameFa: 'دالر امریکا به افغانی', category: 'Currency', categoryFa: 'ارز', popular: true, description: 'Most traded currency pair in Afghanistan', descriptionFa: 'پرمعامله‌ترین جفت ارز در افغانستان' },
  { symbol: 'EURAFN', name: 'Euro to Afghan Afghani', nameFa: 'یورو به افغانی', category: 'Currency', categoryFa: 'ارز', popular: true, description: 'European currency to Afghani', descriptionFa: 'ارز اروپایی به افغانی' },
  { symbol: 'GBPAFN', name: 'British Pound to Afghan Afghani', nameFa: 'پوند انگلیس به افغانی', category: 'Currency', categoryFa: 'ارز', popular: false, description: 'British Pound to Afghani', descriptionFa: 'پوند انگلیس به افغانی' },
  { symbol: 'PKRAFN', name: 'Pakistani Rupee to Afghan Afghani', nameFa: 'روپیه پاکستان به افغانی', category: 'Currency', categoryFa: 'ارز', popular: true, description: 'Regional currency exchange', descriptionFa: 'تبادل ارز منطقه‌ای' },
  { symbol: 'IRRAFN', name: 'Iranian Rial to Afghan Afghani', nameFa: 'ریال ایران به افغانی', category: 'Currency', categoryFa: 'ارز', popular: true, description: 'Neighboring country currency', descriptionFa: 'ارز کشور همسایه' },
  { symbol: 'INRAFN', name: 'Indian Rupee to Afghan Afghani', nameFa: 'روپیه هند به افغانی', category: 'Currency', categoryFa: 'ارز', popular: true, description: 'Indian Rupee to Afghani', descriptionFa: 'روپیه هند به افغانی' },
  
  // Cryptocurrencies
  { symbol: 'BTCUSD', name: 'Bitcoin', nameFa: 'بیت کوین', category: 'Crypto', categoryFa: 'رمزارز', popular: true, description: 'Leading cryptocurrency', descriptionFa: 'رمزارز پیشرو' },
  { symbol: 'ETHUSD', name: 'Ethereum', nameFa: 'اتریوم', category: 'Crypto', categoryFa: 'رمزارز', popular: true, description: 'Smart contract platform', descriptionFa: 'پلتفرم قرارداد هوشمند' },
  { symbol: 'USDTUSD', name: 'Tether', nameFa: 'تتر', category: 'Crypto', categoryFa: 'رمزارز', popular: true, description: 'Stable cryptocurrency', descriptionFa: 'رمزارز پایدار' },
  { symbol: 'BNBUSD', name: 'Binance Coin', nameFa: 'بایننس کوین', category: 'Crypto', categoryFa: 'رمزارز', popular: false, description: 'Exchange token', descriptionFa: 'توکن صرافی' },
  
  // Commodities
  { symbol: 'XAUUSD', name: 'Gold', nameFa: 'طلا', category: 'Commodity', categoryFa: 'کالا', popular: true, description: 'Precious metal trading', descriptionFa: 'معاملات فلز گرانبها' },
  { symbol: 'XAGUSD', name: 'Silver', nameFa: 'نقره', category: 'Commodity', categoryFa: 'کالا', popular: true, description: 'Silver precious metal', descriptionFa: 'فلز گرانبهای نقره' },
  { symbol: 'WTIUSD', name: 'Crude Oil', nameFa: 'نفت خام', category: 'Commodity', categoryFa: 'کالا', popular: false, description: 'Energy commodity', descriptionFa: 'کالای انرژی' },
  
  // Major Forex Pairs
  { symbol: 'EURUSD', name: 'Euro/US Dollar', nameFa: 'یورو/دالر', category: 'Forex', categoryFa: 'فارکس', popular: true, description: 'Major currency pair', descriptionFa: 'جفت ارز اصلی' },
  { symbol: 'GBPUSD', name: 'British Pound/US Dollar', nameFa: 'پوند/دالر', category: 'Forex', categoryFa: 'فارکس', popular: false, description: 'Cable currency pair', descriptionFa: 'جفت ارز کیبل' },
  { symbol: 'USDJPY', name: 'US Dollar/Japanese Yen', nameFa: 'دالر/ین', category: 'Forex', categoryFa: 'فارکس', popular: false, description: 'Asian major pair', descriptionFa: 'جفت ارز اصلی آسیایی' },
  
  // Regional Currencies
  { symbol: 'USDPKR', name: 'US Dollar/Pakistani Rupee', nameFa: 'دالر/روپیه پاکستان', category: 'Regional', categoryFa: 'منطقه‌ای', popular: true, description: 'Regional currency', descriptionFa: 'ارز منطقه‌ای' },
  { symbol: 'USDINR', name: 'US Dollar/Indian Rupee', nameFa: 'دالر/روپیه هند', category: 'Regional', categoryFa: 'منطقه‌ای', popular: true, description: 'South Asian currency', descriptionFa: 'ارز آسیای جنوبی' },
]

interface AfghanAssetSearchProps {
  onAssetSelect: (symbol: string) => void
}

export default function AfghanAssetSearch({ onAssetSelect }: AfghanAssetSearchProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [filteredAssets, setFilteredAssets] = useState<Asset[]>(afghanAssets)

  const categories = [
    { value: 'all', label: 'همه', labelEn: 'All' },
    { value: 'Currency', label: 'ارز', labelEn: 'Currency' },
    { value: 'Crypto', label: 'رمزارز', labelEn: 'Crypto' },
    { value: 'Commodity', label: 'کالا', labelEn: 'Commodity' },
    { value: 'Forex', label: 'فارکس', labelEn: 'Forex' },
    { value: 'Regional', label: 'منطقه‌ای', labelEn: 'Regional' }
  ]

  useEffect(() => {
    let filtered = afghanAssets

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(asset => asset.category === selectedCategory)
    }

    if (searchTerm) {
      filtered = filtered.filter(asset =>
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.nameFa.includes(searchTerm) ||
        asset.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.descriptionFa.includes(searchTerm)
      )
    }

    // Sort by popularity first, then alphabetically
    filtered.sort((a, b) => {
      if (a.popular && !b.popular) return -1
      if (!a.popular && b.popular) return 1
      return a.nameFa.localeCompare(b.nameFa)
    })

    setFilteredAssets(filtered)
  }, [searchTerm, selectedCategory])

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Currency':
      case 'Regional':
        return <Globe className="h-4 w-4" />
      case 'Crypto':
        return <Coins className="h-4 w-4" />
      case 'Commodity':
        return <TrendingUp className="h-4 w-4" />
      case 'Forex':
        return <TrendingDown className="h-4 w-4" />
      default:
        return <Search className="h-4 w-4" />
    }
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Currency':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Crypto':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      case 'Commodity':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Forex':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Regional':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">جستجوی دارایی‌ها</h2>
        <p className="text-muted-foreground">ارزها، رمزارزها و کالاهای مورد نظر خود را پیدا کنید</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="جستجو کنید... (مثال: دالر، بیت کوین، طلا)"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pr-10"
        />
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 justify-center">
        {categories.map((category) => (
          <Button
            key={category.value}
            variant={selectedCategory === category.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory(category.value)}
            className="text-sm"
          >
            {category.label}
          </Button>
        ))}
      </div>

      {/* Popular Assets */}
      {selectedCategory === 'all' && !searchTerm && (
        <div>
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            دارایی‌های محبوب
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {afghanAssets.filter(asset => asset.popular).slice(0, 6).map((asset) => (
              <Card key={asset.symbol} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-4" onClick={() => onAssetSelect(asset.symbol)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getCategoryIcon(asset.category)}
                      <span className="font-semibold">{asset.symbol}</span>
                    </div>
                    <Badge className={getCategoryColor(asset.category)}>
                      {asset.categoryFa}
                    </Badge>
                  </div>
                  <h4 className="font-medium text-sm mb-1">{asset.nameFa}</h4>
                  <p className="text-xs text-muted-foreground">{asset.descriptionFa}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      <div>
        <h3 className="text-lg font-semibold mb-3">
          نتایج جستجو ({filteredAssets.length} مورد)
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
          {filteredAssets.map((asset) => (
            <Card key={asset.symbol} className="cursor-pointer hover:shadow-md transition-shadow">
              <CardContent className="p-4" onClick={() => onAssetSelect(asset.symbol)}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(asset.category)}
                    <span className="font-semibold">{asset.symbol}</span>
                    {asset.popular && <Star className="h-3 w-3 text-yellow-500 fill-current" />}
                  </div>
                  <Badge className={getCategoryColor(asset.category)}>
                    {asset.categoryFa}
                  </Badge>
                </div>
                <h4 className="font-medium text-sm mb-1">{asset.nameFa}</h4>
                <p className="text-xs text-muted-foreground line-clamp-2">{asset.descriptionFa}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {filteredAssets.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>هیچ دارایی‌ای یافت نشد</p>
            <p className="text-sm">لطفاً کلمات کلیدی دیگری امتحان کنید</p>
          </div>
        )}
      </div>
    </div>
  )
}