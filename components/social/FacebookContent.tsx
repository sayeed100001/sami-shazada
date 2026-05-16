'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Facebook, ExternalLink } from 'lucide-react'

interface FacebookContentProps {
  limit?: number
  showHeader?: boolean
}

export function FacebookContent({ limit = 5, showHeader = true }: FacebookContentProps) {
  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Facebook className="h-5 w-5 text-blue-600" />
            محتوای اجتماعی
          </h3>
        </div>
      )}
      
      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Facebook className="h-5 w-5 text-blue-600" />
              د افغانستان بانک
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://www.facebook.com/p/د-افغانستان-بانک-100089735481547/', '_blank')}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              مشاهده صفحه
            </Button>
          </div>
          <div className="p-4 text-center">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <Facebook className="h-12 w-12 text-blue-600 mx-auto mb-3" />
              <h4 className="font-semibold text-gray-900 mb-2">د افغانستان بانک</h4>
              <p className="text-gray-600 text-sm mb-4">
                برای مشاهده آخرین اخبار و اطلاعات د افغانستان بانک، صفحه فیسبوک را ببینید
              </p>
              <Button 
                onClick={() => window.open('https://www.facebook.com/p/د-افغانستان-بانک-100089735481547/', '_blank')}
                className="w-full"
              >
                <Facebook className="h-4 w-4 mr-2" />
                مشاهده در فیسبوک
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}