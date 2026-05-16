'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Building, Star, Phone, MapPin, ArrowRight } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'

interface Saraf {
  id: string
  businessName: string
  businessAddress: string
  businessPhone: string
  rating: number
  totalTransactions: number
  isActive: boolean
  isPremium: boolean
  rates: {
    fromCurrency: string
    toCurrency: string
    buyRate: number
    sellRate: number
  }[]
}

export function SarafDirectory() {
  const { data: sarafs, isLoading } = useQuery({
    queryKey: ['saraf-directory-featured'],
    queryFn: async (): Promise<Saraf[]> => {
      const response = await fetch('/api/sarafs/directory?featured=true')
      if (!response.ok) throw new Error('Failed to fetch sarafs')
      const data = await response.json()
      return data.sarafs || data
    },
    refetchInterval: 10 * 60 * 1000,
  })

  const { data: directoryTitle } = useQuery({
    queryKey: ['saraf-directory-title'],
    queryFn: async (): Promise<string> => {
      try {
        const response = await fetch('/api/system/config/saraf_directory_title')
        if (!response.ok) return 'صرافان معتبر'
        const data = await response.json()
        return data.value || 'صرافان معتبر'
      } catch {
        return 'صرافان معتبر'
      }
    },
    refetchInterval: 5 * 60 * 1000, // 5 minutes
  })

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-3 w-3 ${
          i < Math.floor(rating) 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300'
        }`}
      />
    ))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            <CardTitle>{directoryTitle || 'صرافان معتبر'}</CardTitle>
          </div>
          <Button size="sm" variant="outline" asChild>
            <Link href="/sarafs">
              مشاهده همه
              <ArrowRight className="h-4 w-4 mr-2" />
            </Link>
          </Button>
        </div>
        <CardDescription>صرافان معتبر و تایید شده</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-24 bg-muted rounded-lg"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {sarafs?.slice(0, 3).map((saraf) => (
              <div
                key={saraf.id}
                className="p-4 border rounded-lg hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{saraf.businessName}</h3>
                    {saraf.isPremium && (
                      <Badge variant="default" className="text-xs">
                        ممتاز
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {renderStars(saraf.rating)}
                    <span className="text-sm font-medium persian-numbers">
                      {saraf.rating.toFixed(1)}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{saraf.businessAddress}</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span className="persian-numbers">{saraf.businessPhone}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span>تراکنش‌های انجام شده: {saraf.totalTransactions}</span>
                    <Badge variant="outline" className="text-xs">
                      {saraf.isActive ? 'فعال' : 'غیرفعال'}
                    </Badge>
                  </div>
                </div>

                {saraf.rates.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <div className="text-xs text-muted-foreground mb-2">نرخ‌های فعلی:</div>
                    <div className="grid grid-cols-1 gap-1">
                      {saraf.rates.slice(0, 2).map((rate) => (
                        <div key={`${rate.fromCurrency}-${rate.toCurrency}`} className="flex justify-between text-xs">
                          <span>{rate.fromCurrency}/{rate.toCurrency}</span>
                          <div className="persian-numbers">
                            خرید: {rate.buyRate} - فروش: {rate.sellRate}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-3 pt-3 border-t">
                  <Button size="sm" className="w-full" asChild>
                    <Link href={`/sarafs/${saraf.id}`}>
                      مشاهده جزئیات
                    </Link>
                  </Button>
                </div>
              </div>
            ))}

            <div className="text-center pt-4">
              <Button variant="outline" asChild>
                <Link href="/sarafs">
                  مشاهده همه صرافان
                </Link>
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}