'use client'

import { Award, Gem, Gift, Heart, Send, Share2, TrendingUp, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { SocialAchievement } from '@/lib/social-features'

const ICONS = {
  Send,
  Heart,
  Gift,
  TrendingUp,
  Gem,
  Users,
  Share2,
  Award,
  ArrowRightLeft: TrendingUp,
  BadgePlus: Award,
} as const

interface AchievementStripProps {
  achievements: SocialAchievement[]
  unlockedOnly?: boolean
}

export function AchievementStrip({ achievements, unlockedOnly = false }: AchievementStripProps) {
  const visibleAchievements = unlockedOnly ? achievements.filter((achievement) => achievement.unlocked) : achievements

  if (visibleAchievements.length === 0) {
    return <p className="text-sm text-muted-foreground">No achievements unlocked yet.</p>
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visibleAchievements.map((achievement) => {
        const Icon = ICONS[achievement.icon as keyof typeof ICONS] || Award
        return (
          <Badge
            key={achievement.id}
            variant={achievement.unlocked ? 'default' : 'outline'}
            className="flex items-center gap-2 rounded-full px-3 py-1"
            title={achievement.description}
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{achievement.title}</span>
          </Badge>
        )
      })}
    </div>
  )
}
