'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { useLanguage } from '@/hooks/useLanguage'
import type { Language } from '@/lib/i18n'

interface SarafFollowButtonProps {
  sarafId: string
  sarafName: string
  initialFollowerCount?: number
  showCount?: boolean
  className?: string
  callbackUrl?: string
}

function pick(language: Language, fa: string, en: string, ps: string) {
  return language === 'en' ? en : language === 'ps' ? ps : fa
}

export function SarafFollowButton({
  sarafId,
  sarafName,
  initialFollowerCount = 0,
  showCount = true,
  className,
  callbackUrl,
}: SarafFollowButtonProps) {
  const router = useRouter()
  const { data: session, status } = useSession()
  const { language } = useLanguage()
  const [isFollowing, setIsFollowing] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(initialFollowerCount)

  useEffect(() => {
    setFollowerCount(initialFollowerCount)
  }, [initialFollowerCount])

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false
    fetch(`/api/user/favorites?sarafId=${encodeURIComponent(sarafId)}`, { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!cancelled && data) {
          setIsFollowing(Boolean(data.isFavorite))
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [sarafId, status])

  const toggleFollow = async () => {
    if (!session?.user?.id) {
      const target = callbackUrl || `/sarafs/${sarafId}`
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(target)}`)
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch('/api/user/favorites', {
        method: isFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sarafId }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || 'Request failed')
      }

      setIsFollowing((previous) => !previous)
      setFollowerCount((previous) => Math.max(0, previous + (isFollowing ? -1 : 1)))
      toast.success(
        isFollowing
          ? pick(language as Language, `${sarafName} از علاقه‌مندی‌های شما حذف شد.`, `${sarafName} was removed from your favorites.`, `${sarafName} ستاسو له خوښو څخه لرې شو.`)
          : pick(language as Language, `${sarafName} به علاقه‌مندی‌های شما اضافه شد.`, `${sarafName} was added to your favorites.`, `${sarafName} ستاسو خوښو ته اضافه شو.`)
      )
    } catch (error) {
      const fallbackMessage = pick(
        language as Language,
        'به‌روزرسانی علاقه‌مندی ممکن نشد.',
        'Unable to update favorites.',
        'خوښې تازه نه شوې.'
      )
      toast.error(error instanceof Error ? error.message : fallbackMessage)
    } finally {
      setIsLoading(false)
    }
  }

  const label = isFollowing
    ? pick(language as Language, 'در علاقه‌مندی‌ها', 'Favorited', 'په خوښو کې')
    : pick(language as Language, 'افزودن به علاقه‌مندی', 'Add to favorites', 'خوښو ته اضافه کړئ')

  return (
    <Button
      type="button"
      variant={isFollowing ? 'default' : 'outline'}
      className={className}
      onClick={toggleFollow}
      disabled={isLoading}
    >
      <Heart className={`h-4 w-4 ${showCount ? 'mr-2' : ''} ${isFollowing ? 'fill-current' : ''}`} />
      {showCount ? `${label}${followerCount > 0 ? ` (${followerCount})` : ''}` : label}
    </Button>
  )
}
