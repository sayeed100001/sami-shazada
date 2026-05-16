'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Star, MessageSquare, ThumbsUp } from 'lucide-react'
import { toast } from 'sonner'

interface Rating {
  id: string
  rating: number
  comment: string | null
  userName: string
  createdAt: string
  isVerified: boolean
}

interface SarafVotingProps {
  sarafId: string
}

export function SarafVoting({ sarafId }: SarafVotingProps) {
  const { data: session } = useSession()
  const [ratings, setRatings] = useState<Rating[]>([])
  const [userRating, setUserRating] = useState<number>(0)
  const [userComment, setUserComment] = useState('')
  const [existingUserRating, setExistingUserRating] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [averageRating, setAverageRating] = useState(0)
  const [totalRatings, setTotalRatings] = useState(0)
  const [canRate, setCanRate] = useState(false)

  useEffect(() => {
    fetchRatings()
  }, [sarafId])

  const fetchRatings = async () => {
    try {
      const response = await fetch(`/api/sarafs/${sarafId}/vote`)
      if (response.ok) {
        const data = await response.json()
        setRatings(data.ratings)
        setExistingUserRating(data.userRating)
        setAverageRating(data.averageRating)
        setTotalRatings(data.totalRatings)
        setCanRate(data.canRate || false)
        
        if (data.userRating) {
          setUserRating(data.userRating.rating)
          setUserComment(data.userRating.comment || '')
        }
      }
    } catch (error) {
      console.error('Failed to fetch ratings:', error)
    } finally {
      setLoading(false)
    }
  }

  const submitRating = async () => {
    if (!session) {
      toast.error('برای امتیازدهی باید وارد شوید')
      return
    }

    if (userRating === 0) {
      toast.error('لطفاً امتیاز خود را انتخاب کنید')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/sarafs/${sarafId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating: userRating,
          comment: userComment.trim() || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(existingUserRating ? 'امتیاز شما بروزرسانی شد' : 'امتیاز شما ثبت شد')
        setAverageRating(data.newAverageRating)
        fetchRatings()
      } else {
        const error = await response.json()
        toast.error(error.error || 'خطا در ثبت امتیاز')
      }
    } catch (error) {
      toast.error('خطا در ارسال امتیاز')
    } finally {
      setSubmitting(false)
    }
  }

  const renderStars = (rating: number, interactive = false, size = 'h-5 w-5') => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${size} cursor-pointer transition-colors ${
          i < rating 
            ? 'text-yellow-400 fill-current' 
            : 'text-gray-300 hover:text-yellow-200'
        }`}
        onClick={interactive ? () => setUserRating(i + 1) : undefined}
      />
    ))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-6 bg-muted rounded w-1/3"></div>
            <div className="h-20 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-400" />
            امتیاز و نظرات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className="text-center">
              <div className="text-3xl font-bold persian-numbers">{averageRating.toFixed(1)}</div>
              <div className="flex items-center justify-center gap-1 mb-1">
                {renderStars(Math.round(averageRating))}
              </div>
              <div className="text-sm text-muted-foreground persian-numbers">
                از {totalRatings} نظر
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {session && canRate && (
        <Card>
          <CardHeader>
            <CardTitle>
              {existingUserRating ? 'ویرایش امتیاز شما' : 'امتیاز خود را ثبت کنید'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">امتیاز:</label>
              <div className="flex items-center gap-1">
                {renderStars(userRating, true, 'h-8 w-8')}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">نظر (اختیاری):</label>
              <Textarea
                value={userComment}
                onChange={(e) => setUserComment(e.target.value)}
                placeholder="نظر خود را در مورد این صرافی بنویسید..."
                rows={3}
              />
            </div>
            
            <Button 
              onClick={submitRating}
              disabled={submitting || userRating === 0}
              className="w-full"
            >
              {submitting ? 'در حال ثبت...' : (existingUserRating ? 'بروزرسانی امتیاز' : 'ثبت امتیاز')}
            </Button>
          </CardContent>
        </Card>
      )}
      
      {session && !canRate && (
        <Card>
          <CardContent className="p-6 text-center">
            <div className="text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium mb-2">برای ثبت نظر و امتیازدهی</p>
              <p className="text-sm">شما باید حداقل یک حواله تکمیل شده با این صراف داشته باشید</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            نظرات کاربران ({totalRatings})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {ratings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>هنوز نظری ثبت نشده است</p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div key={rating.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rating.userName}</span>
                      {rating.isVerified && (
                        <Badge variant="secondary" className="text-xs">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          تایید شده
                        </Badge>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 mb-1">
                        {renderStars(rating.rating, false, 'h-4 w-4')}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(rating.createdAt)}
                      </span>
                    </div>
                  </div>
                  {rating.comment && (
                    <p className="text-muted-foreground text-sm">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}