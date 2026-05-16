'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/hooks/useLanguage'
import {
  BarChart3,
  BookOpen,
  Building,
  Calculator,
  Coins,
  CreditCard,
  DollarSign,
  FileText,
  LayoutDashboard,
  MessageSquare,
  Package,
  Percent,
  Settings,
  Share2,
  Shield,
  Sparkles,
  Star,
  TrendingUp,
  Trophy,
  User,
  Users,
} from 'lucide-react'

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
  userRole?: string
  collapsed?: boolean
}

type NavItem = {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles: string[]
}

function getRoleTone(role?: string) {
  switch (role) {
    case 'ADMIN':
      return 'bg-rose-400'
    case 'SARAF':
      return 'bg-cyan-400'
    case 'USER':
      return 'bg-emerald-400'
    default:
      return 'bg-slate-400'
  }
}

export function Sidebar({ className, isOpen, collapsed, userRole }: SidebarProps) {
  const { data: session } = useSession()
  const pathname = usePathname() ?? ''
  const { t, language } = useLanguage()
  const [key, setKey] = useState(0)

  const isRTL = language === 'fa' || language === 'ps'
  const role = userRole || session?.user?.role
  const roleTone = getRoleTone(role)
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  useEffect(() => {
    const handleLanguageChange = () => {
      setKey((prev) => prev + 1)
    }
    window.addEventListener('languageChanged', handleLanguageChange)
    return () => window.removeEventListener('languageChanged', handleLanguageChange)
  }, [])

  const navigation: NavItem[] = [
    { name: t('dashboard'), href: '/', icon: LayoutDashboard, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('charts'), href: '/charts', icon: BarChart3, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('crypto'), href: '/crypto', icon: Coins, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('commodities'), href: '/commodities', icon: Package, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('calculator'), href: '/calculator', icon: Calculator, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('rates'), href: '/rates', icon: TrendingUp, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('hawala'), href: '/hawala', icon: CreditCard, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('sarafs'), href: '/sarafs', icon: Building, roles: ['USER', 'SARAF', 'ADMIN'] },
    { name: t('education'), href: '/education', icon: BookOpen, roles: ['USER', 'SARAF', 'ADMIN'] },
  ]

  const userNavigation: NavItem[] = [
    { name: t('user.dashboard'), href: '/user', icon: User, roles: ['USER'] },
    { name: pick('پیام‌رسان', 'Messenger', 'پیغام رسوونکی'), href: '/portal/internal-chat', icon: MessageSquare, roles: ['USER'] },
    { name: t('profile'), href: '/profile', icon: User, roles: ['USER'] },
    { name: pick('مرکز اجتماعی', 'Social Hub', 'ټولنیز مرکز'), href: '/user/social', icon: Share2, roles: ['USER'] },
    { name: t('user.transactions'), href: '/user/transactions', icon: DollarSign, roles: ['USER'] },
    { name: t('user.favorites'), href: '/user/favorites', icon: Building, roles: ['USER'] },
    { name: pick('جدول رتبه‌بندی', 'Leaderboard', 'درجه بندي'), href: '/community/leaderboard', icon: Trophy, roles: ['USER'] },
  ]

  const sarafNavigation: NavItem[] = [
    { name: t('portal.dashboard'), href: '/portal', icon: Building, roles: ['SARAF'] },
    { name: t('portal.hawala'), href: '/portal/hawala', icon: CreditCard, roles: ['SARAF'] },
    { name: t('portal.branches'), href: '/portal/branches', icon: Building, roles: ['SARAF'] },
    { name: t('portal.transactions'), href: '/portal/transactions', icon: DollarSign, roles: ['SARAF'] },
    { name: t('portal.rates'), href: '/portal/rates', icon: TrendingUp, roles: ['SARAF'] },
    { name: t('portal.messages'), href: '/portal/internal-chat', icon: MessageSquare, roles: ['SARAF', 'BRANCH_MANAGER', 'BRANCH_STAFF'] },
    { name: pick('پروموشن‌ها', 'Promotions', 'پروموشنونه'), href: '/portal/promotions', icon: Sparkles, roles: ['SARAF'] },
    { name: t('portal.reports'), href: '/portal/reports', icon: FileText, roles: ['SARAF'] },
  ]

  const adminNavigation: NavItem[] = [
    { name: t('admin.dashboard'), href: '/admin', icon: Shield, roles: ['ADMIN'] },
    { name: t('admin.users'), href: '/admin/users', icon: Users, roles: ['ADMIN'] },
    { name: t('admin.sarafs'), href: '/admin/sarafs', icon: Building, roles: ['ADMIN'] },
    { name: t('admin.transactions'), href: '/admin/transactions', icon: DollarSign, roles: ['ADMIN'] },
    { name: pick('پیام‌رسان متمرکز', 'Unified Messenger', 'د شبکې پیغام رسوونکی'), href: '/portal/internal-chat?tab=customers', icon: MessageSquare, roles: ['ADMIN'] },
    { name: pick('پروموشن‌ها', 'Promotions', 'پروموشنونه'), href: '/admin/promotions', icon: Sparkles, roles: ['ADMIN'] },
    { name: t('admin.education'), href: '/admin/education', icon: BookOpen, roles: ['ADMIN'] },
    { name: t('admin.commissionSettings'), href: '/admin/commission-settings', icon: Percent, roles: ['ADMIN'] },
    { name: 'صرافان داشبورد', href: '/admin/featured-sarafs', icon: Star, roles: ['ADMIN'] },
    { name: t('admin.reports'), href: '/admin/reports', icon: FileText, roles: ['ADMIN'] },
    { name: t('admin.system'), href: '/admin/system', icon: Settings, roles: ['ADMIN'] },
  ]

  const roleLabel = useMemo(() => {
    switch (role) {
      case 'ADMIN':
        return t('admin')
      case 'SARAF':
        return t('saraf')
      case 'USER':
        return t('user')
      default:
        return pick('بازدیدکننده', 'Visitor', 'کتونکی')
    }
  }, [pick, role, t])

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href))
  const canAccess = (roles: string[]) => !!session?.user?.role && roles.includes(session.user.role)

  const renderNavLink = (item: NavItem, tone: 'portal' | 'market') => {
    const Icon = item.icon
    const active = isActive(item.href)

    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.name : undefined}
        className={cn(
          'group relative overflow-hidden rounded-[20px] border transition-all duration-300',
          collapsed ? 'flex h-12 items-center justify-center' : 'flex items-center gap-3 px-3 py-3',
          active
            ? tone === 'portal'
              ? 'border-cyan-300/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.22),rgba(59,130,246,0.16))] text-white shadow-[0_18px_45px_-28px_rgba(14,165,233,0.85)]'
              : 'border-violet-300/30 bg-[linear-gradient(135deg,rgba(168,85,247,0.2),rgba(99,102,241,0.16))] text-white shadow-[0_18px_45px_-28px_rgba(99,102,241,0.85)]'
            : 'border-white/8 bg-white/[0.04] text-slate-300 hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.075] hover:text-white'
        )}
      >
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12),transparent_44%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <span
          className={cn(
            'relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border transition-colors duration-300',
            active
              ? 'border-white/18 bg-white/14 text-white'
              : 'border-white/8 bg-black/10 text-slate-300 group-hover:border-white/14 group-hover:bg-white/10 group-hover:text-white'
          )}
        >
          <Icon className="h-4.5 w-4.5" />
        </span>
        {!collapsed ? (
          <div className="relative min-w-0 flex-1">
            <div className="truncate font-semibold">{item.name}</div>
            <div className="mt-0.5 truncate text-[11px] text-slate-400 group-hover:text-slate-300">
              {tone === 'portal'
                ? pick('بخش‌های اختصاصی', 'Private workspace', 'ځانګړې برخې')
                : pick('ابزارهای بازار', 'Market tools', 'د بازار وسيلې')}
            </div>
          </div>
        ) : null}
      </Link>
    )
  }

  const renderSection = (title: string, subtitle: string, items: NavItem[], tone: 'portal' | 'market') => {
    const visible = items.filter((item) => canAccess(item.roles))
    if (!visible.length) return null

    return (
      <section className="space-y-3">
        {!collapsed ? (
          <div className="px-2">
            <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">{title}</div>
            <div className="mt-1 text-xs text-slate-400">{subtitle}</div>
          </div>
        ) : null}
        <div className="space-y-2">{visible.map((item) => renderNavLink(item, tone))}</div>
      </section>
    )
  }

  return (
    <aside
      key={key}
      className={cn(
        'fixed top-16 z-40 h-[calc(100vh-4rem)] overflow-hidden transition-all duration-300',
        'bg-[linear-gradient(180deg,rgba(3,7,18,0.98),rgba(15,23,42,0.98)_35%,rgba(8,47,73,0.98)_100%)] shadow-[0_30px_80px_-50px_rgba(2,6,23,0.95)]',
        isRTL ? 'right-0 border-l border-white/10' : 'left-0 border-r border-white/10',
        collapsed ? 'w-20' : 'w-72',
        isOpen ? 'translate-x-0' : isRTL ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0',
        className
      )}
    >
      <div className="flex h-full flex-col text-white">
        <div className="relative overflow-hidden border-b border-white/10 px-3 pb-4 pt-5">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.18),transparent_34%)]" />
          <div className={cn('relative flex items-start gap-3', collapsed && 'justify-center')}>
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-gradient-to-br from-cyan-400 via-sky-500 to-indigo-600 shadow-xl">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-cyan-100">
                  <Sparkles className="h-3.5 w-3.5" />
                  {pick('ناوبری هوشمند', 'Premium navigation', 'هوښيار ناوبري')}
                </div>
                <div className="mt-3 text-lg font-black">{t('appName')}</div>
                <div className="mt-1 flex items-center gap-2 text-sm text-slate-300">
                  <span className={cn('h-2.5 w-2.5 rounded-full', roleTone)} />
                  {roleLabel}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {renderSection(
            pick('بازار و سیستم', 'Market and system', 'بازار او سيستم'),
            pick('صفحه‌های عمومی و ابزارهای روزانه', 'Shared surfaces and daily tools', 'شريکې پاڼې او ورځني وسيلې'),
            navigation,
            'market'
          )}

          {session?.user?.role === 'USER'
            ? renderSection(
                t('user.dashboard'),
                pick('پرتال شخصی و مسیرهای اجتماعی', 'Personal portal and social flows', 'شخصي پورټل او ټولنيزې لارې'),
                userNavigation,
                'portal'
              )
            : null}

          {session?.user?.role === 'SARAF'
            ? renderSection(
                t('portal'),
                pick('عملیات صرافی و پیام‌ها', 'Saraf operations and messages', 'د صرافۍ عمليات او پيغامونه'),
                sarafNavigation,
                'portal'
              )
            : null}

          {session?.user?.role === 'ADMIN'
            ? renderSection(
                t('adminPanel'),
                pick('کنترل، گزارش و نظارت سیستم', 'Control, reports, and system oversight', 'کنټرول، راپورونه او څارنه'),
                adminNavigation,
                'portal'
              )
            : null}
        </div>
      </div>
    </aside>
  )
}
