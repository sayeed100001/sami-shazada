'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Info, Clock, Globe, TrendingUp } from 'lucide-react'

interface AssetInfoProps {
  symbol: string
}

const assetInfo: Record<string, {
  nameFa: string
  description: string
  marketHours: string
  tips: string[]
  category: string
  categoryFa: string
}> = {
  'USDAFN': {
    nameFa: 'دالر امریکا به افغانی',
    description: 'نرخ تبادل دالر امریکا به افغانی - مهمترین جفت ارز برای تجارت در افغانستان',
    marketHours: '24 ساعته، 5 روز هفته',
    tips: ['نرخ تحت تأثیر سیاست‌های بانک مرکزی', 'مناسب برای تجارت روزانه', 'حجم معاملات بالا'],
    category: 'Currency',
    categoryFa: 'ارز'
  },
  'BTCUSD': {
    nameFa: 'بیت کوین',
    description: 'اولین و بزرگترین رمزارز جهان - دارایی دیجیتال با نوسانات بالا',
    marketHours: '24 ساعته، 7 روز هفته',
    tips: ['نوسانات بالا', 'مناسب برای سرمایه‌گذاری بلندمدت', 'تحت تأثیر اخبار تکنولوژی'],
    category: 'Crypto',
    categoryFa: 'رمزارز'
  },
  'XAUUSD': {
    nameFa: 'طلا',
    description: 'فلز گرانبهای طلا - پناهگاه امن در زمان بحران‌های اقتصادی',
    marketHours: '24 ساعته، 5 روز هفته',
    tips: ['پناهگاه امن', 'محافظت در برابر تورم', 'تحت تأثیر نرخ بهره'],
    category: 'Commodity',
    categoryFa: 'کالا'
  },
  'ETHUSD': {
    nameFa: 'اتریوم',
    description: 'پلتفرم قراردادهای هوشمند - دومین رمزارز بزرگ جهان',
    marketHours: '24 ساعته، 7 روز هفته',
    tips: ['پلتفرم قراردادهای هوشمند', 'تحت تأثیر DeFi', 'نوسانات متوسط تا بالا'],
    category: 'Crypto',
    categoryFa: 'رمزارز'
  },
  'EURUSD': {
    nameFa: 'یورو به دالر',
    description: 'مهمترین جفت ارز جهان - نماینده اقتصاد اروپا در برابر آمریکا',
    marketHours: '24 ساعته، 5 روز هفته',
    tips: ['بیشترین حجم معاملات', 'اسپرد پایین', 'مناسب برای مبتدیان'],
    category: 'Forex',
    categoryFa: 'فارکس'
  }
}

export default function AssetInfo({ symbol }: AssetInfoProps) {
  const info = assetInfo[symbol]
  
  if (!info) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Info className="h-4 w-4" />
            <span className="text-sm">اطلاعات این نماد در دسترس نیست</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{info.nameFa}</CardTitle>
          <Badge variant="secondary">{info.categoryFa}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">{info.description}</p>
        
        <div className="flex items-center gap-2 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">ساعات بازار:</span>
          <span>{info.marketHours}</span>
        </div>
        
        <div>
          <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            نکات مهم
          </h4>
          <ul className="space-y-1">
            {info.tips.map((tip, index) => (
              <li key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                <div className="w-1 h-1 bg-primary rounded-full" />
                {tip}
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}