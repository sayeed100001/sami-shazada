'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  ArrowRightLeft,
  BarChart3,
  Ban,
  Building2,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Coins,
  Heart,
  Home,
  Inbox,
  LogOut,
  MessageSquare,
  Settings,
  Shield,
  Trophy,
  User,
  DollarSign,
  TrendingUp,
  Share2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/useLanguage'

interface StreamlinedSidebarProps {
  isOpen: boolean
  onClose: () => void
  onToggleCollapse?: () => void
  userRole: string
  collapsed?: boolean
}

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const EXPANDED_WIDTH_CLASS = 'lg:w-[17rem]'
const COLLAPSED_WIDTH_CLASS = 'lg:w-[5.5rem]'

export function StreamlinedSidebar({
  isOpen,
  onClose,
  onToggleCollapse,
  userRole,
  collapsed = false,
}: StreamlinedSidebarProps) {
  const pathname = usePathname() ?? ''
  const router = useRouter()
  const { t, language } = useLanguage()
  const [key, setKey] = useState(0)

  const isRTL = language === 'fa' || language === 'ps'
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  useEffect(() => {
    const handleLanguageChange = () => {
      setKey((prev) => prev + 1)
    }
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  const handleNavigation = (href: string) => {
    router.push(href)
    onClose()
  }

  const handleSignOut = async () => {
    if (userRole === 'VISITOR') {
      router.push('/auth/signin')
      return
    }

    await signOut({ callbackUrl: '/' })
  }

  const roleLabel = useMemo(() => {
    switch (userRole) {
      case 'ADMIN':
        return t('admin')
      case 'SARAF':
        return t('saraf')
      case 'BRANCH_MANAGER':
        return pick('مدیر شعبه', 'Branch Manager', 'د څانګې مدیر')
      case 'BRANCH_STAFF':
        return pick('کارمند شعبه', 'Branch Staff', 'د څانګې کارکوونکی')
      case 'USER':
        return t('user')
      default:
        return pick('بازدیدکننده', 'Visitor', 'کتونکی')
    }
  }, [pick, t, userRole])

  const sectionLabel = pick('ناوبری', 'Navigation', 'ناوبري')
  const toolLabel = pick('ابزارها', 'Tools', 'وسيلې')
  const platformSubtitle = pick('پلتفرم جامع مالی افغانستان', 'Afghanistan financial platform', 'د افغانستان مالي پلاتفورم')
  const dashboardLabel = t('dashboard')

  const portalItems: NavItem[] = (() => {
    switch (userRole) {
      case 'ADMIN':
        return [
          { name: t('adminPanel'), href: '/admin', icon: Shield },
          { name: t('admin.users'), href: '/admin/users', icon: User },
          { name: t('admin.transactions'), href: '/admin/transactions', icon: DollarSign },
          { name: t('admin.sarafs'), href: '/admin/sarafs', icon: Building2 },
          { name: pick('پیام‌رسان متمرکز', 'Unified Messenger', 'د شبکې پیغام رسوونکی'), href: '/portal/internal-chat?tab=customers', icon: MessageSquare },
          { name: t('admin.reports'), href: '/admin/reports', icon: BarChart3 },
          { name: t('settings'), href: '/settings', icon: Settings },
        ]
      case 'SARAF':
      case 'BRANCH_MANAGER':
      case 'BRANCH_STAFF':
        return [
          { name: t('portal'), href: '/portal', icon: Building2 },
          { name: t('portal.hawala'), href: '/portal/hawala', icon: DollarSign },
          ...(userRole === 'SARAF'
            ? [{ name: pick('درخواست‌های حواله', 'Hawala Requests', 'د حوالې غوښتنې'), href: '/portal/hawala-requests', icon: Inbox }]
            : []),
          { name: t('portal.transactions'), href: '/portal/transactions', icon: TrendingUp },
          { name: t('portal.exchange'), href: '/portal/exchange', icon: ArrowRightLeft },
          { name: t('portal.branches'), href: '/portal/branches', icon: Building2 },
          { name: pick('پیام‌رسان', 'Messenger', 'پیغام رسوونکی'), href: '/portal/internal-chat', icon: MessageSquare },
          { name: pick('بلک لیست', 'Blacklist', 'تور لېست'), href: '/portal/blacklist', icon: Ban },
          { name: t('settings'), href: '/settings', icon: Settings },
        ]
      case 'USER':
        return [
          { name: t('user'), href: '/user', icon: User },
          { name: pick('پیام‌رسان', 'Messenger', 'پیغام رسوونکی'), href: '/portal/internal-chat', icon: MessageSquare },
          { name: pick('ثبت حواله', 'New Hawala', 'نوې حواله'), href: '/hawala', icon: DollarSign },
          { name: t('portal.exchange'), href: '/user/exchange', icon: ArrowRightLeft },
          { name: t('user.transactions'), href: '/user/transactions', icon: TrendingUp },
          { name: t('user.favorites'), href: '/user/favorites', icon: Heart },
          { name: pick('مرکز اجتماعی', 'Social Hub', 'ټولنیز مرکز'), href: '/user/social', icon: Share2 },
          { name: pick('جدول رتبه‌بندی', 'Leaderboard', 'درجه بندي'), href: '/community/leaderboard', icon: Trophy },
          { name: t('profile'), href: '/profile', icon: User },
        ]
      default:
        return [{ name: t('nav.login'), href: '/auth/signin', icon: User }]
    }
  })()

  const toolItems: NavItem[] = [
    { name: t('charts'), href: '/charts', icon: BarChart3 },
    { name: t('crypto'), href: '/crypto', icon: Coins },
    { name: t('commodities'), href: '/commodities', icon: TrendingUp },
    { name: t('calculator'), href: '/calculator', icon: Calculator },
    { name: t('settings'), href: '/settings', icon: Settings },
  ]

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon
    const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)

    return (
      <button
        key={`${item.href}-${item.name}`}
        type="button"
        onClick={() => handleNavigation(item.href)}
        title={collapsed ? item.name : undefined}
        className={cn(
          'group w-full rounded-2xl transition-all duration-200',
          collapsed
            ? 'mx-auto flex h-11 w-11 items-center justify-center'
            : 'flex items-center gap-3 px-4 py-3',
          isActive
            ? collapsed
              ? 'bg-[linear-gradient(135deg,#4f46e5,#6d28d9)] text-white shadow-[0_14px_28px_-16px_rgba(79,70,229,0.95)]'
              : 'bg-[linear-gradient(135deg,#4f46e5,#6d28d9)] text-white shadow-[0_18px_34px_-18px_rgba(79,70,229,0.95)]'
            : 'text-slate-600 hover:bg-violet-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5 dark:hover:text-white'
        )}
      >
        {collapsed ? (
          <Icon className="h-5 w-5" />
        ) : isRTL ? (
          <>
            <span className="flex-1 truncate text-right text-[15px] font-semibold">{item.name}</span>
            <Icon className="h-5 w-5 shrink-0" />
          </>
        ) : (
          <>
            <Icon className="h-5 w-5 shrink-0" />
            <span className="flex-1 truncate text-left text-[15px] font-semibold">{item.name}</span>
          </>
        )}
      </button>
    )
  }

  const renderSection = (label: string, items: NavItem[], bordered = false) => {
    if (!items.length) return null

    return (
      <section className={cn('space-y-3', bordered && 'border-t border-slate-200/80 pt-5 dark:border-slate-800')}>
        {!collapsed ? (
          <div className="px-4">
            <div className="text-[11px] font-bold tracking-[0.18em] text-slate-400 dark:text-slate-500">{label}</div>
          </div>
        ) : null}
        <div className="space-y-1.5">{items.map(renderNavItem)}</div>
      </section>
    )
  }

  const topToggleIcon = collapsed
    ? null
    : isRTL
      ? <ChevronRight className="h-4.5 w-4.5" />
      : <ChevronLeft className="h-4.5 w-4.5" />

  const SidebarContent = () => (
    <div
      key={key}
      className="flex h-full flex-col bg-white text-slate-900 dark:bg-[#0b1120] dark:text-white"
    >
      <div className="border-b border-slate-200/80 px-4 py-5 dark:border-slate-800">
        {collapsed ? (
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#6d28d9)] text-xl font-black text-white shadow-[0_18px_30px_-18px_rgba(79,70,229,0.95)]">
              {pick('س', 'S', 'س')}
            </div>
          </div>
        ) : isRTL ? (
          <div className="flex items-start gap-3">
            {onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={pick('جمع کردن نوار کناری', 'Collapse sidebar', 'اړخيز پټه راټوله کړئ')}
                className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white lg:flex"
              >
                {topToggleIcon}
              </button>
            ) : null}
            <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#6d28d9)] text-xl font-black text-white shadow-[0_18px_30px_-18px_rgba(79,70,229,0.95)]">
                {pick('س', 'S', 'س')}
              </div>
              <div className="min-w-0 flex-1 text-right">
                <div className="truncate text-[1.05rem] font-black text-slate-900 dark:text-white">{t('appName')}</div>
                <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{platformSubtitle}</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#4f46e5,#6d28d9)] text-xl font-black text-white shadow-[0_18px_30px_-18px_rgba(79,70,229,0.95)]">
                {pick('س', 'S', 'س')}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[1.05rem] font-black text-slate-900 dark:text-white">{t('appName')}</div>
                <div className="mt-1 truncate text-sm text-slate-500 dark:text-slate-400">{platformSubtitle}</div>
              </div>
            </div>
            {onToggleCollapse ? (
              <button
                type="button"
                onClick={onToggleCollapse}
                aria-label={pick('جمع کردن نوار کناری', 'Collapse sidebar', 'اړخيز پټه راټوله کړئ')}
                className="mt-1 hidden h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white lg:flex"
              >
                {topToggleIcon}
              </button>
            ) : null}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        <div className="space-y-5">
          <div className="space-y-1.5">{renderNavItem({ name: dashboardLabel, href: '/', icon: Home })}</div>
          {renderSection(sectionLabel, portalItems, true)}
          {renderSection(toolLabel, toolItems, true)}
        </div>
      </div>

      <div className="border-t border-slate-200/80 px-3 py-4 dark:border-slate-800">
        {!collapsed ? (
          <div className="mb-3 px-2">
            <div className={cn('flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400', isRTL && 'justify-end')}>
              <span className="h-2.5 w-2.5 rounded-full bg-violet-500" />
              <span>{roleLabel}</span>
            </div>
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleSignOut}
          title={collapsed ? (userRole === 'VISITOR' ? t('nav.login') : t('logout')) : undefined}
          className={cn(
            'group w-full rounded-2xl text-slate-600 transition-all duration-200 hover:bg-rose-50 hover:text-rose-700 dark:text-slate-300 dark:hover:bg-rose-500/10 dark:hover:text-rose-200',
            collapsed ? 'mx-auto flex h-11 w-11 items-center justify-center' : 'flex items-center gap-3 px-4 py-3'
          )}
        >
          {collapsed ? (
            <LogOut className="h-5 w-5" />
          ) : isRTL ? (
            <>
              <span className="flex-1 text-right text-[15px] font-semibold">{userRole === 'VISITOR' ? t('nav.login') : t('logout')}</span>
              <LogOut className="h-5 w-5 shrink-0" />
            </>
          ) : (
            <>
              <LogOut className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-left text-[15px] font-semibold">{userRole === 'VISITOR' ? t('nav.login') : t('logout')}</span>
            </>
          )}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <div
        className={cn(
          'hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:pt-14 xl:pt-16',
          isRTL ? 'lg:right-0' : 'lg:left-0',
          collapsed ? COLLAPSED_WIDTH_CLASS : EXPANDED_WIDTH_CLASS
        )}
      >
        <div className={cn(
          'flex h-full w-full flex-col overflow-hidden border-slate-200/80 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:shadow-[0_22px_60px_-40px_rgba(2,6,23,0.82)]',
          isRTL ? 'border-l' : 'border-r'
        )}>
          <SidebarContent />
        </div>
      </div>

      <div
        className={cn(
          'fixed inset-y-0 z-50 w-[17rem] transform overflow-hidden border-slate-200/80 shadow-[0_22px_60px_-40px_rgba(15,23,42,0.28)] transition-transform duration-300 ease-out lg:hidden dark:border-slate-800 dark:shadow-[0_22px_60px_-40px_rgba(2,6,23,0.82)]',
          isRTL ? 'right-0 border-l' : 'left-0 border-r',
          isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full'
        )}
      >
        <SidebarContent />
      </div>
    </>
  )
}
