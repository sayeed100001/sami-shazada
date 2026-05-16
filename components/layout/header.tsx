'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Menu, User, LogOut, Settings, Shield, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { LanguageSwitcher } from './LanguageSwitcher'
import { NotificationBell } from './NotificationBell'
import { useLanguage } from '@/hooks/useLanguage'
import Link from 'next/link'

interface HeaderProps {
  onMenuClick: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const { data: session } = useSession()
  const { t, language } = useLanguage()
  const { theme, setTheme } = useTheme()
  const [key, setKey] = useState(0)
  const [mounted, setMounted] = useState(false)
  const pick = (fa: string, en: string, ps: string) => (language === 'en' ? en : language === 'ps' ? ps : fa)

  useEffect(() => {
    setMounted(true)
    const handleLanguageChange = () => {
      setKey((prev) => prev + 1)
    }

    window.addEventListener('languageChanged', handleLanguageChange)
    window.addEventListener('forceUpdate', handleLanguageChange)

    return () => {
      window.removeEventListener('languageChanged', handleLanguageChange)
      window.removeEventListener('forceUpdate', handleLanguageChange)
    }
  }, [])

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/signin' })
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="destructive">{t('admin')}</Badge>
      case 'SARAF':
        return <Badge variant="default">{t('saraf')}</Badge>
      default:
        return <Badge variant="secondary">{t('user')}</Badge>
    }
  }

  return (
    <header
      key={key}
      className="fixed top-0 left-0 right-0 z-50 flex h-20 items-center justify-between border-b border-gray-200/80 bg-white/95 px-4 shadow-lg backdrop-blur-lg dark:border-gray-700/80 dark:bg-gray-900/95 sm:h-18 sm:px-4 lg:px-6"
    >
      <div className="flex items-center gap-3 sm:gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="lg:hidden h-13 w-13 rounded-xl hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 transition-all duration-200 sm:h-10 sm:w-10"
        >
          <Menu className="h-6 w-6 sm:h-5 sm:w-5" />
        </Button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg sm:h-9 sm:w-9">
            <span className="text-base font-bold text-white sm:text-base">س</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white sm:text-xl lg:text-2xl">
            {t('appName') || 'سرای شهزاده'}
          </h1>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        <LanguageSwitcher />

        {mounted ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="flex h-12 w-12 items-center justify-center rounded-xl text-gray-600 hover:bg-indigo-50/80 dark:text-gray-300 dark:hover:bg-indigo-900/30 transition-all duration-200 sm:h-10 sm:w-10"
          >
            <Sun className="h-6 w-6 rotate-0 scale-100 text-gray-600 transition-all dark:-rotate-90 dark:scale-0 dark:text-gray-300 sm:h-5 sm:w-5" />
            <Moon className="absolute h-6 w-6 rotate-90 scale-0 text-gray-300 transition-all dark:rotate-0 dark:scale-100 sm:h-5 sm:w-5" />
            <span className="sr-only">Toggle theme</span>
          </Button>
        ) : null}

        {!session ? (
          <nav className="hidden items-center gap-1 lg:flex">
            <Button variant="ghost" size="sm" asChild className="rounded-xl">
              <Link href="/sarafs">{pick('صرافان', 'Sarafs', 'صرافان')}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="rounded-xl">
              <Link href="/rates">{pick('نرخ‌ها', 'Rates', 'نرخونه')}</Link>
            </Button>
            <Button variant="ghost" size="sm" asChild className="rounded-xl">
              <Link href="/support">{pick('پشتیبانی', 'Support', 'ملاتړ')}</Link>
            </Button>
          </nav>
        ) : null}

        <NotificationBell />

        {session ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-12 w-12 rounded-xl transition-all duration-200 hover:ring-2 hover:ring-indigo-500/40 hover:bg-indigo-50/80 dark:hover:bg-indigo-900/30 sm:h-10 sm:w-10">
                <Avatar className="h-10 w-10 ring-2 ring-gray-200/50 dark:ring-gray-700/50 shadow-sm sm:h-9 sm:w-9">
                  <AvatarImage src={session.user.avatarUrl || '/placeholder-avatar.svg'} alt={session.user.name || ''} />
                  <AvatarFallback className="bg-gradient-to-br from-indigo-600 to-indigo-700 text-white font-semibold">
                    {session.user.name?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56" align="end" forceMount>
              <div className="flex flex-col space-y-1 p-2">
                <p className="text-sm font-medium leading-none">{session.user.name}</p>
                <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                <div className="pt-1">{getRoleBadge(session.user.role)}</div>
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center text-gray-700 hover:bg-indigo-50/80 dark:text-gray-200 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                  <User className="ml-2 h-4 w-4" />
                  <span>{t('profile')}</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuItem asChild>
                <Link href="/settings" className="flex items-center text-gray-700 hover:bg-indigo-50/80 dark:text-gray-200 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                  <Settings className="ml-2 h-4 w-4" />
                  <span>{t('settings')}</span>
                </Link>
              </DropdownMenuItem>

              {session.user.role === 'ADMIN' ? (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="flex items-center text-gray-700 hover:bg-indigo-50/80 dark:text-gray-200 dark:hover:bg-indigo-900/30 rounded-md transition-colors">
                    <Shield className="ml-2 h-4 w-4" />
                    <span>{t('admin')}</span>
                  </Link>
                </DropdownMenuItem>
              ) : null}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={handleSignOut}
                className="text-gray-700 hover:bg-red-50/80 hover:text-red-600 dark:text-gray-200 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-md transition-colors"
              >
                <LogOut className="ml-2 h-4 w-4" />
                <span>{t('logout')}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild className="hidden rounded-xl sm:inline-flex">
              <Link href="/auth/signin">{pick('ورود', 'Sign in', 'ننوتل')}</Link>
            </Button>
            <Button size="sm" asChild className="rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
              <Link href="/auth/signup">{pick('ثبت نام', 'Sign up', 'ثبت نام')}</Link>
            </Button>
          </div>
        )}
      </div>
    </header>
  )
}
